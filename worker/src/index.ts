/**
 * Achis de Amor — AI Proxy Worker
 *
 * Cloudflare Worker that handles AI features for the app:
 *   - Image generation via Cloudflare Workers AI (Flux 1 Schnell, free)
 *     Optionally falls back to OpenAI DALL-E if OPENAI_API_KEY is set.
 *   - Pattern cleaning via Anthropic Claude.
 *   - Image analysis via Anthropic Claude Vision.
 *
 * All keys stay server-side; the frontend only sees this Worker's URL.
 *
 * Endpoints:
 *   POST /generate-image    — generate a realistic photo of the amigurumi
 *   POST /clean-pattern     — clean up and structure a raw pattern with Claude
 *   POST /analyze-image     — analyze an image with Claude Vision
 *
 * Secrets needed (via `wrangler secret put`):
 *   ANTHROPIC_API_KEY  — required
 *   OPENAI_API_KEY     — optional (enables DALL-E as alternative model)
 *
 * Optional `var` config:
 *   ALLOWED_ORIGIN — origin to allow in CORS (defaults to *)
 */

interface Env {
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY?: string;
  AI: { run: (model: string, inputs: Record<string, unknown>) => Promise<ReadableStream | { image?: string; description?: string }> };
  ALLOWED_ORIGIN?: string;
}

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const OPENAI_IMAGES_API = 'https://api.openai.com/v1/images/generations';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN || '*';
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return jsonError('Method not allowed', 405, corsHeaders);
    }

    const url = new URL(request.url);
    try {
      switch (url.pathname) {
        case '/generate-image':
          return await handleGenerateImage(request, env, corsHeaders);
        case '/clean-pattern':
          return await handleCleanPattern(request, env, corsHeaders);
        case '/analyze-image':
          return await handleAnalyzeImage(request, env, corsHeaders);
        case '/health':
          return jsonOK({ status: 'ok' }, corsHeaders);
        default:
          return jsonError(`Unknown endpoint: ${url.pathname}`, 404, corsHeaders);
      }
    } catch (err) {
      console.error('Worker error:', err);
      return jsonError(err instanceof Error ? err.message : 'Internal error', 500, corsHeaders);
    }
  },
};

// ─── /generate-image ──────────────────────────────────────────────────────

interface GenerateImageRequest {
  /** The parsed pattern text (or raw text). */
  patternText: string;
  /** Optional descriptive name like "left foot of dinosaur amigurumi" */
  pieceDescription?: string;
  /** Color (hex or natural language). */
  color?: string;
  /** Approximate finished size in cm */
  sizeCm?: { width: number; height: number };
  /**
   * Image generation model:
   *   - "flux"   → Cloudflare Workers AI Flux 1 Schnell (default, free)
   *   - "dall-e" → OpenAI DALL-E 3 (requires OPENAI_API_KEY secret)
   */
  model?: 'flux' | 'dall-e' | 'dall-e-3' | 'dall-e-2';
  /**
   * Optional base64-encoded PNG of the 3D render. When present, we run
   * img2img instead of pure text-to-image to preserve the silhouette of
   * the actual pattern.
   */
  inputImageBase64?: string;
}

async function handleGenerateImage(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const body = (await request.json()) as GenerateImageRequest;

  // Step 1: build a vivid prompt with Claude (already NSFW-sanitized)
  const prompt = await buildImagePromptWithClaude(body, env);

  // Step 2: if a 3D render seed was provided, prefer img2img — it preserves
  // the actual silhouette of the pattern. Fall back to text-to-image on
  // any error.
  if (body.inputImageBase64) {
    try {
      return await generateWithImg2Img(prompt, body.inputImageBase64, env, corsHeaders);
    } catch (err) {
      console.warn('img2img failed, falling back to flux:', err);
      // Fall through to flux below.
    }
  }

  // Step 3: text-to-image fallback paths
  const wantsDallE = body.model === 'dall-e' || body.model === 'dall-e-3' || body.model === 'dall-e-2';
  const useDallE = wantsDallE && !!env.OPENAI_API_KEY;

  if (useDallE) {
    return generateWithDallE(prompt, body.model || 'dall-e-3', env, corsHeaders);
  }

  return generateWithFlux(prompt, env, corsHeaders);
}

/**
 * Img2img: takes the 3D render as a seed and asks Stable Diffusion to keep
 * the silhouette while making the texture/material look like real yarn.
 * Strength is tuned to preserve shape (~0.55) — too low and nothing changes,
 * too high and it ignores the seed and generates a generic amigurumi.
 */
async function generateWithImg2Img(
  prompt: string,
  inputBase64: string,
  env: Env,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const safePrompt = sanitizeForImagePrompt(prompt);
  // Decode base64 (strip data-URL prefix if present)
  const cleanB64 = inputBase64.replace(/^data:image\/[^;]+;base64,/, '');
  const binary = atob(cleanB64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const result = (await env.AI.run('@cf/runwayml/stable-diffusion-v1-5-img2img', {
    prompt: safePrompt,
    image: Array.from(bytes),
    strength: 0.55,
    num_steps: 20,
    guidance: 7.5,
  })) as ReadableStream | { image?: string };

  let base64: string;
  if (typeof result === 'object' && 'image' in result && typeof result.image === 'string') {
    base64 = result.image;
  } else {
    const buf = await new Response(result as ReadableStream).arrayBuffer();
    const out = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < out.length; i++) bin += String.fromCharCode(out[i]);
    base64 = btoa(bin);
  }

  return jsonOK(
    {
      imageUrl: `data:image/png;base64,${base64}`,
      prompt: safePrompt,
      model: 'sd-1.5-img2img',
      usedImg2Img: true,
    },
    corsHeaders,
  );
}

/**
 * NSFW trigger words that Flux 1 Schnell's filter false-positives on, even
 * when they refer to a benign amigurumi piece (e.g., a crochet figurine that
 * happens to wear a tiny pair of underwear). We replace them with neutral
 * descriptive language before sending anything to the image model.
 */
const NSFW_TRIGGER_REPLACEMENTS: Array<[RegExp, string]> = [
  // Portuguese (Brazilian) — common in patterns from designers like Dudu
  [/\bcueca[s]?\b/gi, 'small piece'],
  [/\bcalcinha[s]?\b/gi, 'small piece'],
  [/\bsuti[ãa][s]?\b/gi, 'small piece'],
  [/\bbiquini[s]?\b/gi, 'small piece'],
  // Spanish
  [/\bcalzon(?:cillo)?[es]*\b/gi, 'small piece'],
  [/\btanga[s]?\b/gi, 'small piece'],
  [/\bbombacha[s]?\b/gi, 'small piece'],
  [/\bsost[eé]n[es]?\b/gi, 'small piece'],
  // English
  [/\bunderwear\b/gi, 'small piece'],
  [/\bunderpants?\b/gi, 'small piece'],
  [/\bpantie?s?\b/gi, 'small piece'],
  [/\bthong[s]?\b/gi, 'small piece'],
  [/\bbra[s]?\b/gi, 'small ornament'],
  [/\bbrief[s]?\b/gi, 'small piece'],
  [/\bboxer[s]?\b/gi, 'small piece'],
  [/\blingerie\b/gi, 'small piece'],
  [/\bnaked\b/gi, 'plain'],
  [/\bnude\b/gi, 'plain'],
];

function sanitizeForImagePrompt(text: string): string {
  let cleaned = text;
  for (const [pattern, replacement] of NSFW_TRIGGER_REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  return cleaned;
}

/**
 * Extract a brief shape summary from raw pattern text (round counts only).
 * We use this instead of sending the full pattern text to the image model,
 * since pattern instructions often contain language that triggers NSFW
 * filters even when the finished piece is completely benign.
 */
function extractShapeSummary(patternText: string): string {
  const counts: number[] = [];
  const matches = patternText.matchAll(/[\(\[](\d+)\s*(?:sts?|stitches?|puntos?|ptos?)?[\)\]]/gi);
  for (const m of matches) counts.push(parseInt(m[1], 10));
  if (counts.length === 0) return 'small rounded crochet piece';
  const max = Math.max(...counts);
  const min = Math.min(...counts);
  const last = counts[counts.length - 1];
  const total = counts.length;
  if (last < max * 0.3) {
    return `closed shape, ${total} rounds, peaks at ${max} stitches and tapers down (sphere or dome)`;
  }
  if ((max - min) < max * 0.2) {
    return `cylindrical shape, ${total} rounds, roughly ${max} stitches per round`;
  }
  return `${total} rounds, ranging ${min}–${max} stitches, expanding then narrowing`;
}

const GENERIC_FALLBACK_PROMPT =
  'A small handmade amigurumi crochet figurine on a white background, soft DK cotton yarn, visible V-shaped stitch texture, photorealistic studio photo, soft directional lighting, slight drop shadow, no text, no humans';

async function generateWithFlux(
  prompt: string,
  env: Env,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  // Sanitize again right before sending — defense in depth.
  const safePrompt = sanitizeForImagePrompt(prompt);
  try {
    return await runFluxOnce(safePrompt, env, corsHeaders, false);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Flux returns "3030: Input prompt contains NSFW content." for false positives
    // on benign amigurumi descriptions. Retry once with a generic fallback prompt.
    if (/3030|NSFW/i.test(msg)) {
      console.warn('Flux NSFW filter triggered — retrying with generic prompt');
      return await runFluxOnce(GENERIC_FALLBACK_PROMPT, env, corsHeaders, true);
    }
    throw err;
  }
}

async function runFluxOnce(
  prompt: string,
  env: Env,
  corsHeaders: Record<string, string>,
  isFallback: boolean,
): Promise<Response> {
  const result = (await env.AI.run('@cf/black-forest-labs/flux-1-schnell', {
    prompt,
    num_steps: 4,
  })) as { image?: string } | ReadableStream;

  let base64: string;
  if (typeof result === 'object' && 'image' in result && typeof result.image === 'string') {
    base64 = result.image;
  } else {
    // Fallback: read stream into base64
    const buf = await new Response(result as ReadableStream).arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    base64 = btoa(bin);
  }

  const dataUrl = `data:image/png;base64,${base64}`;
  return jsonOK(
    {
      imageUrl: dataUrl,
      prompt,
      model: 'flux-1-schnell',
      usedFallback: isFallback,
    },
    corsHeaders,
  );
}

async function generateWithDallE(
  prompt: string,
  modelName: string,
  env: Env,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  if (!env.OPENAI_API_KEY) {
    return jsonError('OPENAI_API_KEY not configured', 500, corsHeaders);
  }
  const dalleRes = await fetch(OPENAI_IMAGES_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelName === 'dall-e' ? 'dall-e-3' : modelName,
      prompt,
      size: '1024x1024',
      quality: 'standard',
      n: 1,
    }),
  });

  if (!dalleRes.ok) {
    const err = await dalleRes.text();
    return jsonError(`DALL-E error: ${err}`, dalleRes.status, corsHeaders);
  }

  const dalleData = (await dalleRes.json()) as { data: Array<{ url: string; revised_prompt?: string }> };
  return jsonOK(
    {
      imageUrl: dalleData.data[0].url,
      revisedPrompt: dalleData.data[0].revised_prompt,
      prompt,
      model: 'dall-e-3',
    },
    corsHeaders,
  );
}

async function buildImagePromptWithClaude(req: GenerateImageRequest, env: Env): Promise<string> {
  const sizeText = req.sizeCm
    ? `, approximately ${req.sizeCm.width.toFixed(1)} × ${req.sizeCm.height.toFixed(1)} cm`
    : '';
  const colorText = req.color ? ` in ${req.color} color` : '';
  // Sanitize the piece description — strip any clothing/undergarment terms
  // that could leak through to Flux's NSFW filter.
  const desc = sanitizeForImagePrompt(req.pieceDescription || 'amigurumi piece');

  // We do NOT pass the raw pattern text to Claude. Pattern instructions often
  // contain words (clothing, body parts, etc.) that Flux's NSFW filter
  // misinterprets, even when the finished piece is completely benign.
  // Instead we extract a shape summary (round counts only).
  const shapeSummary = extractShapeSummary(req.patternText);

  const userMsg = `Generate ONE concise image-generation prompt (max 80 words) for a finished amigurumi (crochet stuffed toy) piece.

Piece: ${desc}${sizeText}${colorText}.
Shape clue: ${shapeSummary}

Strict guidelines for the prompt you write:
- Describe ONLY the finished crochet object as a generic decorative figurine — NEVER as clothing, undergarments, lingerie, swimwear, or accessories
- Mention "amigurumi crochet" explicitly
- Specify "soft DK cotton yarn" texture and visible V-shaped stitches
- Studio photography style: white background, soft directional lighting, slight shadow
- Be specific about the SHAPE (cylindrical, oval, round, dome, etc.)
- AVOID any words referring to body parts, clothing, undergarments, or anatomy — describe ONLY as a small handmade decorative crochet object
- No text, no logos, no humans, no hands

Output: ONLY the image prompt itself, no preamble or explanation.`;

  const claudeRes = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 250,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });

  if (!claudeRes.ok) {
    const err = await claudeRes.text();
    throw new Error(`Claude prompt build failed: ${err}`);
  }

  const data = (await claudeRes.json()) as { content: Array<{ text: string }> };
  // Sanitize Claude's response too — defense in depth in case it slipped in
  // a flagged term despite the instructions.
  return sanitizeForImagePrompt(data.content[0].text.trim());
}

// ─── /clean-pattern ───────────────────────────────────────────────────────

async function handleCleanPattern(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const body = (await request.json()) as {
    patternText: string;
    targetLanguage?: 'es' | 'en';
    pieceMode?: 'split' | 'merge';
  };
  const lang = body.targetLanguage || 'es';
  const pieceMode = body.pieceMode || 'split';
  const pieceModeRule = pieceMode === 'merge'
    ? `Output ALL rounds as a SINGLE piece named "${lang === 'es' ? 'pieza' : 'main'}" — do NOT split into multiple pieces, even if the source uses section headers. Concatenate everything in source order.`
    : `If the source has explicit piece headers (Head, Body, Arms, Cabeça, Corpo, Braços, etc.), preserve them as separate pieces. If the source has NO piece headers (it's just a sequence of rounds), output ONE piece named "${lang === 'es' ? 'pieza' : 'main'}" containing ALL rounds in order. Do NOT invent piece sections.`;

  const userMsg = `You're a strict format cleaner for amigurumi crochet patterns from messy PDF/scanned text. Your job is to clean FORMAT ONLY — never alter the pattern's actual content.

ABSOLUTE RULES (violating any of these is a critical error):
1. NEVER change stitch counts. If a round says "(36)", the cleaned round MUST also say "(36)".
2. NEVER add, remove, merge, or split operations. Preserve every operation exactly as written.
3. NEVER "fix" apparent inconsistencies in the math. If R5 says "(1 sc, inc) x 6 (18)" but the count seems off, leave it as-is. The user needs to see the original.
4. NEVER skip rounds. If the source has C01, C02, ..., C92, the output must contain ALL 92 rounds.
5. Preserve the original numbering scheme (C01, R5, V12, Vuelta 8, etc). Just normalize formatting around it.

WHAT YOU CAN AND SHOULD DO:
- Remove obvious junk: page numbers on their own (e.g., "06"), headers/footers, copyright notices, broken hyphenation across line breaks ("au-\\nmento" → "aumento")
- Fix line breaks: if a round was split across lines, join it back to one line.
- Fix typos in stitch abbreviations (e.g., "p b" → "pb", "5C" → "sc") but only when unambiguous.
- Detect piece sections (Head, Body, Arms, Legs, etc) when explicitly named in the source. Do NOT invent piece sections.
- Extract clearly-stated annotations (color changes, stuffing notes, eye placement, sewing) from non-round prose lines.

OUTPUT FORMAT — JSON only, no preamble, no explanation:
{
  "pieces": [
    {
      "name": "Head",
      "count": 1,
      "rounds": ["${lang === 'es' ? 'V1: 6 pb (6)' : 'R1: 6 sc (6)'}", "${lang === 'es' ? 'V2: 6 aum (12)' : 'R2: 6 inc (12)'}"],
      "annotations": [
        {"round": 5, "type": "color_change", "text": "..."}
      ]
    }
  ],
  "materials": { "yarn": "...", "hookMm": 3.5 }
}

PIECE STRUCTURE RULE: ${pieceModeRule}

Input pattern:
${body.patternText.slice(0, 5000)}`;

  const claudeRes = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      // Big patterns (Dudu, etc.) need a lot of room. Haiku is cheap so we
      // overshoot rather than risk truncated JSON.
      max_tokens: 16000,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });

  if (!claudeRes.ok) {
    const err = await claudeRes.text();
    return jsonError(`Claude error: ${err}`, claudeRes.status, corsHeaders);
  }

  const data = (await claudeRes.json()) as { content: Array<{ text: string }> };
  const raw = data.content[0].text.trim();
  const parsed = parseJsonLenient(raw);
  return jsonOK(parsed, corsHeaders);
}

/**
 * Parse JSON from an LLM response with progressive fallbacks:
 *   1. Direct parse of the largest {...} block
 *   2. Strip trailing commas (common LLM mistake)
 *   3. Truncate to last balanced closing brace and try again
 *   4. As a last resort, return { raw } so the frontend can show the text
 */
function parseJsonLenient(raw: string): unknown {
  const stripped = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) return { error: 'No JSON object found', raw: stripped };

  const candidate = match[0];

  // Attempt 1: direct parse
  try {
    return JSON.parse(candidate);
  } catch {}

  // Attempt 2: strip trailing commas before } or ]
  try {
    const noTrailing = candidate.replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(noTrailing);
  } catch {}

  // Attempt 3: truncate to last balanced closing brace
  try {
    const trimmed = truncateToBalanced(candidate);
    if (trimmed) {
      const noTrailing = trimmed.replace(/,(\s*[}\]])/g, '$1');
      return JSON.parse(noTrailing);
    }
  } catch {}

  // Attempt 4: give up and return raw
  return { error: 'Could not parse JSON from AI response', raw: stripped };
}

/**
 * Walk through the string tracking brace depth (respecting strings/escapes),
 * and return the substring up to the last point where depth returned to 0.
 * Useful when the LLM ran out of tokens mid-array.
 */
function truncateToBalanced(s: string): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;
  let lastBalanced = -1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) { escape = false; continue; }
    if (inString) {
      if (c === '\\') escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; continue; }
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') {
      depth--;
      if (depth === 0) lastBalanced = i;
    }
  }
  return lastBalanced > 0 ? s.slice(0, lastBalanced + 1) : null;
}

// ─── /analyze-image ───────────────────────────────────────────────────────

async function handleAnalyzeImage(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const body = (await request.json()) as { imageBase64: string; mediaType?: string };
  const mediaType = body.mediaType || 'image/jpeg';

  const claudeRes = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: body.imageBase64 },
            },
            {
              type: 'text',
              text: `This is a photo from an amigurumi crochet pattern PDF. Identify:
1. What animal or object is shown
2. Its parts visible (head, body, legs, etc.)
3. Approximate dimensions if a hand is in frame for scale
4. Color palette
5. Any text labels or pattern notation visible

Output as JSON: { "subject": "...", "parts": [...], "colors": [...], "estimatedSize": "...", "notes": "..." }`,
            },
          ],
        },
      ],
    }),
  });

  if (!claudeRes.ok) {
    const err = await claudeRes.text();
    return jsonError(`Claude vision error: ${err}`, claudeRes.status, corsHeaders);
  }

  const data = (await claudeRes.json()) as { content: Array<{ text: string }> };
  const raw = data.content[0].text.trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw };
  return jsonOK(parsed, corsHeaders);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function jsonOK(data: unknown, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}

function jsonError(message: string, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}
