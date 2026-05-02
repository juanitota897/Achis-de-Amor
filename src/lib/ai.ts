/**
 * AI client — talks to the deployed Cloudflare Worker.
 *
 * The Worker URL is configured by the user in Settings. Without a configured
 * URL, AI features are disabled and the app works fully without them.
 */

export interface GenerateImageRequest {
  patternText: string;
  pieceDescription?: string;
  color?: string;
  sizeCm?: { width: number; height: number };
  /** "flux" (default, free via Cloudflare AI) or "dall-e" (requires OpenAI key in worker). */
  model?: 'flux' | 'dall-e';
  /**
   * Optional base64-encoded PNG of the 3D render to use as a seed.
   * When present, the worker uses img2img to preserve the silhouette and only
   * add yarn realism, instead of generating from scratch (which often
   * hallucinates a generic amigurumi unrelated to the actual pattern).
   */
  inputImageBase64?: string;
}

export interface GenerateImageResponse {
  imageUrl: string;
  prompt: string;
  revisedPrompt?: string;
}

export async function generateImage(
  workerUrl: string,
  req: GenerateImageRequest,
): Promise<GenerateImageResponse> {
  if (!workerUrl) throw new Error('AI worker not configured. Set the URL in Settings.');
  const url = `${workerUrl.replace(/\/+$/, '')}/generate-image`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI worker error (${res.status}): ${err}`);
  }
  return res.json();
}

export async function checkWorkerHealth(workerUrl: string): Promise<boolean> {
  if (!workerUrl) return false;
  try {
    // The worker only accepts POST to most endpoints; we just check if /health responds
    const url = `${workerUrl.replace(/\/+$/, '')}/health`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface CleanPatternResponse {
  pieces: Array<{
    name: string;
    count: number;
    rounds: string[];
    annotations: Array<{ round: number; type: string; text: string }>;
  }>;
  materials?: { yarn?: string; hookMm?: number };
  error?: string;
  raw?: string;
}

export async function cleanPattern(
  workerUrl: string,
  patternText: string,
  targetLanguage: 'es' | 'en' = 'es',
  /**
   * - "split": preserve the source's piece structure (Cabeça, Corpo, Braços, ...)
   * - "merge": output everything as one piece named "pieza"/"main"
   */
  pieceMode: 'split' | 'merge' = 'split',
): Promise<CleanPatternResponse> {
  if (!workerUrl) throw new Error('AI worker not configured.');
  const url = `${workerUrl.replace(/\/+$/, '')}/clean-pattern`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patternText, targetLanguage, pieceMode }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI worker error (${res.status}): ${err}`);
  }
  return res.json();
}
