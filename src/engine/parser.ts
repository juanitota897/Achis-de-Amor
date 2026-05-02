/**
 * Pattern parser.
 *
 * Reads raw pattern text (in Spanish or English, in any of the common
 * notation styles seen in real patterns) and produces a structured Pattern.
 *
 * The parser is tolerant: when something doesn't match the expected
 * grammar, it produces a ValidationError but keeps going where possible.
 *
 * Supported syntaxes (all auto-detected):
 *   "Rnd 1: 6 sc in magic ring (6)"
 *   "Rnd 1. 6 sc in MR [6]"
 *   "1) 6 sc in magic ring (6)"
 *   "Vuelta 1: 6 pb en AM (6)"
 *   "V1: 6 pb en AM"
 *
 * Supported operation forms:
 *   "6 sc"
 *   "6sc"
 *   "(inc) * 6"
 *   "(1 sc, inc) * 6"
 *   "(1 sc, inc) x 6"
 *   "[2 sc, inc] 6 times"
 *   "*1 sc, inc* 6"
 *   "Rnd 5-10: 30 sc"        → expands to 6 identical rounds
 *   "Rnd 30: BLO: ..."       → BLO/FLO modifier
 *   "Change to white. ..."   → color change (recorded but not enforced)
 */

import type {
  Pattern,
  Piece,
  Round,
  Operation,
  StitchType,
  RoundModifier,
  StartingMethod,
  ValidationError,
  Language,
  MaterialSpec,
} from './types';
import { resolveStitch, STITCHES } from './stitches';
import { extractAnnotations } from './annotations';
import type { Annotation } from './types';

// ─── Public API ───────────────────────────────────────────────────────────

export interface ParseOptions {
  /** Hint about the language. 'auto' lets the parser detect it. */
  language?: Language | 'auto';
  /** Default materials when not declared in the pattern. */
  defaultMaterials?: MaterialSpec;
}

export const DEFAULT_MATERIALS: MaterialSpec = {
  yarnCyc: 3,
  hookMm: 3.5,
  tension: 1.0,
};

/**
 * Parse a pattern text into a structured Pattern.
 */
export function parsePattern(text: string, options: ParseOptions = {}): Pattern {
  const lang = options.language === 'auto' || !options.language
    ? detectLanguage(text)
    : options.language;

  const lines = preprocessLines(text);
  const errors: ValidationError[] = [];

  // Extract metadata (name, designer)
  const metadata = extractMetadata(lines);

  // Split into piece sections by detecting headers
  const sections = splitIntoSections(lines, lang);

  // Parse each section as a Piece
  const pieces: Piece[] = [];
  for (const section of sections) {
    const piece = parsePiece(section, lang, errors);
    if (piece) pieces.push(piece);
  }

  // If no pieces detected at all, treat the whole thing as one piece named "main"
  if (pieces.length === 0) {
    const fallback = parsePiece(
      { name: lang === 'es' ? 'pieza' : 'main', count: 1, lines },
      lang,
      errors,
    );
    if (fallback) pieces.push(fallback);
  }

  return {
    metadata: {
      ...metadata,
      sourceLanguage: lang,
    },
    pieces,
    assembly: [],
    materials: options.defaultMaterials ?? DEFAULT_MATERIALS,
    colors: [],
    errors,
    sourceText: text,
  };
}

// ─── Language detection ───────────────────────────────────────────────────

const SPANISH_HINTS = [
  'vuelta',
  'punto bajo',
  'punto alto',
  'aumento',
  'disminuc',
  'cabeza',
  'cuerpo',
  'oreja',
  'pierna',
  'brazo',
  'anillo mágico',
  'anillo magico',
  ' am ',
  '\nv1',
  '\nv2',
  ' pb ',
  ' aum ',
  ' dism ',
];

const ENGLISH_HINTS = [
  'round',
  'rnd',
  'single crochet',
  'magic ring',
  'increase',
  'decrease',
  'head',
  'body',
  'ear',
  'leg',
  'arm',
  ' sc ',
  ' inc ',
  ' dec ',
  '\nrnd ',
];

function detectLanguage(text: string): 'es' | 'en' {
  const lower = `\n${text.toLowerCase()}\n`;
  let esScore = 0;
  let enScore = 0;
  for (const hint of SPANISH_HINTS) if (lower.includes(hint)) esScore++;
  for (const hint of ENGLISH_HINTS) if (lower.includes(hint)) enScore++;
  return esScore > enScore ? 'es' : 'en';
}

// ─── Line preprocessing ───────────────────────────────────────────────────

/**
 * Round-label lookahead: matches positions where a round label STARTS,
 * preceded by whitespace. We use this to split lines that have multiple
 * rounds concatenated, like "C03. ... 1 aum C04. 2 aum, ... (36)".
 *
 * The pattern requires:
 *   - A known prefix (Rnd/Round/Vuelta/Vta/Carreira/Carr/C/V/R)
 *   - 1–3 digits (optionally a range like "5-8")
 *   - A trailing punctuation [:.)]
 *
 * The trailing punctuation is what distinguishes a real round label from
 * incidental text like "see V5 for note".
 */
const INTERNAL_ROUND_LABEL_LOOKAHEAD =
  /\s+(?=(?:Rnds?|Rounds?|Vueltas?|Vtas?|Carreiras?|Carr\.?|[CVR])\.?\s*\d{1,3}(?:\s*[-–]\s*(?:Rnds?|Rounds?|Vueltas?|Vtas?|Carreiras?|Carr\.?|[CVR])?\.?\s*\d{1,3})?\s*[:.)])/g;

/** Sentinel marker used internally to flag rounds that came from a join split. */
const SPLIT_PREFIX = '';

const ORPHAN_COUNT_RE = /^[\(\[](\d+)\s*(?:sts?|stitches?|puntos?|ptos?)?[\)\]]\.?$/;
const ROUND_HEADER_RE = /^(?:rnds?|rounds?|vueltas?|vtas?|carreiras?|carr\.?|[cvr])\.?\s*\d+/i;
const HAS_TRAILING_COUNT_RE = /[\(\[]\d+\s*(?:sts?|stitches?|puntos?|ptos?)?[\)\]]\s*\.?$/;
const TRAILING_COUNT_CAPTURE_RE =
  /^(.*?)\s*[\(\[](\d+)\s*(?:sts?|stitches?|puntos?|ptos?)?[\)\]]\s*\.?$/;

function preprocessLines(text: string): string[] {
  const out: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    // Skip lines that are JUST digits (PDF page numbers like "06", "12").
    // The round-line regex would otherwise greedily backtrack and parse "06"
    // as round 0 with body "6", creating a phantom round with 0 stitches.
    if (/^\d+$/.test(line)) continue;
    // Split internal round labels (e.g., "C03. ... C04. ..." → two lines).
    const segments = line.split(INTERNAL_ROUND_LABEL_LOOKAHEAD);
    if (segments.length === 1) {
      out.push(line);
    } else {
      // Mark each split segment with a sentinel so the post-pass can identify
      // contiguous join-groups when reattaching orphan counts.
      for (const seg of segments) {
        const trimmed = seg.trim();
        if (trimmed) out.push(SPLIT_PREFIX + trimmed);
      }
    }
  }
  // Reattach orphan "(N)" lines from PDF column layouts to their rounds.
  const reattached = reattachOrphanCounts(out);
  // Strip sentinel prefixes before returning.
  return reattached.map((line) => (line.startsWith(SPLIT_PREFIX) ? line.slice(1) : line));
}

/**
 * Some PDF patterns extract their text as two columns: rounds on the left,
 * declared counts on the right. After flattening, this looks like:
 *
 *   C03. (1 sc, 1 inc) x 6  C04. (2 sc, 1 inc) x 6  ... C12. (10 sc, 1 inc) x 6  (18)
 *   (24)
 *   (30)
 *   ...
 *   (72)
 *
 * After the round-label split, the trailing "(18)" sticks to C12 — but it
 * actually belongs to C03 (the first round in the join group). The orphan
 * lines below are counts for the rest of the rounds, in order.
 *
 * This function detects that situation: a contiguous join-group followed by
 * orphan-count lines whose total count matches the group size. When found,
 * it redistributes counts in order across the group's rounds.
 */
function reattachOrphanCounts(lines: string[]): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (!ORPHAN_COUNT_RE.test(stripSentinel(lines[i]))) {
      result.push(lines[i]);
      i++;
      continue;
    }
    // Gather contiguous orphan counts.
    const orphans: string[] = [];
    while (i < lines.length && ORPHAN_COUNT_RE.test(stripSentinel(lines[i]))) {
      const m = stripSentinel(lines[i]).match(ORPHAN_COUNT_RE)!;
      orphans.push(m[1]);
      i++;
    }
    // Find the immediately preceding contiguous join-group (sentinel-marked
    // rounds) in `result`.
    let joinEnd = result.length - 1;
    while (joinEnd >= 0 && !result[joinEnd].startsWith(SPLIT_PREFIX)) joinEnd--;
    let joinStart = joinEnd;
    while (joinStart > 0 && result[joinStart - 1].startsWith(SPLIT_PREFIX)) joinStart--;
    if (joinEnd < 0) {
      // No join group — fall back to attaching each orphan to the closest
      // preceding round-without-count.
      assignOrphansToTrailingRounds(result, orphans);
      continue;
    }
    const groupSize = joinEnd - joinStart + 1;
    const lastLine = stripSentinel(result[joinEnd]);
    const lastCountMatch = lastLine.match(TRAILING_COUNT_CAPTURE_RE);
    if (lastCountMatch && 1 + orphans.length === groupSize) {
      // Column-layout case: detach the trailing count from the last round and
      // distribute (trailing + orphans) across the whole group in order.
      const trailingCount = lastCountMatch[2];
      result[joinEnd] = SPLIT_PREFIX + lastCountMatch[1].trim();
      const allCounts = [trailingCount, ...orphans];
      for (let k = 0; k < groupSize; k++) {
        result[joinStart + k] = result[joinStart + k] + ` (${allCounts[k]})`;
      }
      continue;
    }
    if (!lastCountMatch && orphans.length === groupSize) {
      // No count anywhere in the group, orphans align with rounds — assign
      // straight in order.
      for (let k = 0; k < groupSize; k++) {
        result[joinStart + k] = result[joinStart + k] + ` (${orphans[k]})`;
      }
      continue;
    }
    // Mismatched counts — fall back to safe trailing-attachment.
    assignOrphansToTrailingRounds(result, orphans);
  }
  return result;
}

function stripSentinel(line: string): string {
  return line.startsWith(SPLIT_PREFIX) ? line.slice(1) : line;
}

function assignOrphansToTrailingRounds(result: string[], orphans: string[]): void {
  const candidates: number[] = [];
  for (let j = 0; j < result.length; j++) {
    const stripped = stripSentinel(result[j]);
    if (ROUND_HEADER_RE.test(stripped) && !HAS_TRAILING_COUNT_RE.test(stripped)) {
      candidates.push(j);
    }
  }
  const start = Math.max(0, candidates.length - orphans.length);
  const targets = candidates.slice(start);
  for (let k = 0; k < Math.min(orphans.length, targets.length); k++) {
    result[targets[k]] = result[targets[k]] + ` (${orphans[k]})`;
  }
  // Leftover orphans (no candidates) — keep them as orphan count lines.
  for (let k = targets.length; k < orphans.length; k++) {
    result.push(`(${orphans[k]})`);
  }
}

// ─── Metadata extraction ──────────────────────────────────────────────────

function extractMetadata(lines: string[]): { name: string; designer?: string } {
  let name = 'Untitled pattern';
  let designer: string | undefined;

  for (const line of lines.slice(0, 15)) {
    // Look for designer credits
    const designerMatch = line.match(/(?:design(?:ed)?\s+by|dise[ñn]o(?:\s+de)?|por)[:\s]+(.+)/i);
    if (designerMatch && !designer) {
      designer = designerMatch[1].trim().split(/[.;,]/)[0];
    }
    // First substantial non-instructional line is the name
    if (
      name === 'Untitled pattern' &&
      line.length > 3 &&
      line.length < 100 &&
      !/^(rnd|vta|v\d|round)/i.test(line) &&
      !/abbrevi|abrevia|materi|hook|aguja|hilo|yarn/i.test(line) &&
      !line.startsWith('©') &&
      !line.startsWith('#')
    ) {
      // Strip leading words like "Crochet Pattern", "Patrón", etc.
      let candidate = line
        .replace(/^crochet\s+pattern[:\s]*/i, '')
        .replace(/^pattern[:\s]*/i, '')
        .replace(/^patr[óo]n[:\s]*/i, '')
        .replace(/[":]/g, '')
        .trim();
      if (candidate.length > 2 && candidate.length < 80) {
        name = candidate;
      }
    }
  }

  return { name, designer };
}

// ─── Section splitting (multi-piece) ──────────────────────────────────────

interface Section {
  name: string;
  count: number;
  lines: string[];
}

/**
 * Detect piece-header lines like "HEAD", "EARS (make 2)", "Cabeza:", etc.
 * Returns sections, each with their lines.
 */
function splitIntoSections(lines: string[], _lang: Language): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;

  const headerRegex =
    /^([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ\s/]+?)(?:\s*\((?:make|hacer)\s+(\d+)\)|\s*\(x?(\d+)\))?[:.]?$/;

  // List of known piece names — English, Spanish, Portuguese. Used to
  // identify section headers when splitting a multi-piece pattern.
  // (Match is case-insensitive and also accepts "name (make 2)" / "name x2".)
  const KNOWN_PIECE_NAMES = new Set([
    // ── English ──────────────────────────────────────────────────────
    // body parts
    'head', 'body', 'ear', 'ears', 'arm', 'arms', 'leg', 'legs',
    'feet', 'foot', 'paw', 'paws', 'hand', 'hands',
    'tail', 'tail tip', 'snout', 'nose', 'eye', 'eyes', 'eye patch',
    'patch', 'muzzle', 'cheek', 'cheeks', 'horn', 'horns', 'antler', 'antlers',
    'wing', 'wings', 'mane', 'beak', 'tongue', 'tooth', 'teeth',
    'fin', 'fins', 'shell', 'crest',
    'feet/legs', 'feet / legs', 'base',
    // accessories / clothing
    'hair', 'hat', 'cap', 'bow', 'tie', 'scarf', 'skirt', 'dress',
    'pants', 'shoe', 'shoes', 'boot', 'boots', 'sock', 'socks',
    'flower', 'leaf', 'petal', 'stem',

    // ── Spanish ──────────────────────────────────────────────────────
    // body parts
    'cabeza', 'cuerpo', 'oreja', 'orejas', 'brazo', 'brazos',
    'pierna', 'piernas', 'patas', 'pata', 'mano', 'manos',
    'cola', 'puntita de cola', 'nariz', 'hocico',
    'ojo', 'ojos', 'parche', 'parches', 'mejilla', 'mejillas',
    'cuerno', 'cuernos', 'asta', 'astas',
    'ala', 'alas', 'crin', 'pico', 'lengua', 'diente', 'dientes',
    'aleta', 'aletas', 'caparazón', 'cresta',
    // accessories / clothing
    'cabello', 'pelo', 'gorro', 'sombrero', 'moño', 'moños',
    'corbata', 'bufanda', 'falda', 'vestido', 'pantalón', 'pantalones',
    'zapato', 'zapatos', 'bota', 'botas', 'media', 'medias',
    'flor', 'flores', 'hoja', 'hojas', 'pétalo', 'pétalos', 'tallo',

    // ── Portuguese (Brazilian) ──────────────────────────────────────
    // body parts
    'cabeça', 'cabeca', 'corpo', 'orelha', 'orelhas',
    'braço', 'braco', 'braços', 'bracos',
    'perna', 'pernas', 'perna direita', 'perna esquerda',
    'pé', 'pe', 'pés', 'pes', 'mão', 'mao', 'mãos', 'maos',
    'pata', 'patas', 'cauda', 'rabo', 'pontinha de cauda',
    'nariz', 'focinho', 'olho', 'olhos', 'bochecha', 'bochechas',
    'chifre', 'chifres', 'galho', 'galhos',
    'asa', 'asas', 'crina', 'bico', 'língua', 'lingua',
    'dente', 'dentes', 'nadadeira', 'nadadeiras', 'casco', 'crista',
    // accessories / clothing
    'cabelo', 'cabelos', 'chapéu', 'chapeu', 'gorro', 'laço', 'laco',
    'gravata', 'cachecol', 'saia', 'vestido', 'calça', 'calca',
    'sapato', 'sapatos', 'bota', 'botas', 'meia', 'meias',
    'flor', 'flores', 'folha', 'folhas', 'pétala', 'petala', 'caule',
  ]);

  for (const line of lines) {
    const headerMatch = line.match(headerRegex);
    let isHeader = false;
    let pieceName = '';
    let pieceCount = 1;

    if (headerMatch) {
      const candidateName = headerMatch[1].trim().toLowerCase();
      // Header must look like a piece name to be a section
      if (
        KNOWN_PIECE_NAMES.has(candidateName) ||
        Array.from(KNOWN_PIECE_NAMES).some((known) =>
          candidateName.includes(known),
        )
      ) {
        isHeader = true;
        pieceName = headerMatch[1].trim();
        pieceCount = parseInt(headerMatch[2] ?? headerMatch[3] ?? '1', 10);
      }
    }

    if (isHeader) {
      if (current && current.lines.length > 0) sections.push(current);
      current = { name: pieceName, count: pieceCount, lines: [] };
    } else {
      // Lines before any detected piece header are ignored unless we're already in a piece
      if (current) current.lines.push(line);
    }
  }

  if (current && current.lines.length > 0) sections.push(current);
  return sections;
}

// ─── Piece parsing ────────────────────────────────────────────────────────

function parsePiece(section: Section, lang: Language, errors: ValidationError[]): Piece | null {
  const id = section.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40) || `piece_${Math.random().toString(36).slice(2, 6)}`;
  const rounds: Round[] = [];
  let startingMethod: StartingMethod = 'magic_ring';
  let startingCount = 6;
  let startingDetected = false;
  let currentColor: string | undefined;
  let foundationChainLength: number | undefined;
  /** Annotations detected on non-round lines, attached to the next round we parse. */
  let pendingAnnotations: Annotation[] = [];

  // First pass: scan non-round lines for "start with X chains" instructions
  // before processing rounds.
  const FOUNDATION_CHAIN_REGEX =
    /(?:start\s+(?:with\s+)?(?:a\s+)?(?:foundation\s+)?chain\s+of|begin\s+with\s+|inicia(?:r)?\s+con|empieza\s+con|comienza\s+con|inicie\s+com|come(?:ç|c)e\s+com|fa(?:ç|c)a)\s+(\d+)\s*(?:ch|chains?|cad(?:enas?)?|corr(?:ente(?:s)?)?)/i;
  for (const scanLine of section.lines) {
    const fm = scanLine.match(FOUNDATION_CHAIN_REGEX);
    if (fm) {
      foundationChainLength = parseInt(fm[1], 10);
      startingMethod = 'foundation_chain';
      break;
    }
  }

  // Round line regex: matches every common round notation:
  //   English:     "Rnd 1:", "Rnds 9-12.", "Round 1.", "1)"
  //   Spanish:     "Vta 1:", "Vueltas 9-12:", "V1:", "1."
  //   Portuguese:  "C01.", "C06-C08.", "Carreira 1:", "Carr. 5"
  // Also captures ranges where the prefix is repeated on the second number.
  const ROUND_PREFIX = '(?:rnds?|rounds?|vueltas?|vtas?|carreiras?|carr|c|v|r)\\.?\\s*';
  const roundLineRegex = new RegExp(
    `^(?:${ROUND_PREFIX})?(\\d+)(?:\\s*[-–]\\s*(?:${ROUND_PREFIX})?(\\d+))?\\s*[:.)]?\\s*(.+)$`,
    'i',
  );

  for (const line of section.lines) {
    const match = line.match(roundLineRegex);
    if (!match) {
      // Non-round line — try to extract annotations (color changes, stuffing,
      // eye placement, etc.) and queue them for the next round we parse.
      const lineAnnotations = extractAnnotations(line, lang);
      if (lineAnnotations.length > 0) {
        pendingAnnotations.push(...lineAnnotations);
        // Apply color_change annotations to the running current color
        for (const a of lineAnnotations) {
          if (a.kind === 'color_change' && a.details?.color) {
            currentColor = String(a.details.color);
          }
        }
      }
      continue;
    }
    const startNum = parseInt(match[1], 10);
    const endNum = match[2] ? parseInt(match[2], 10) : startNum;
    let body = match[3].trim();

    // Detect starting method on first round
    if (!startingDetected) {
      if (/magic\s+ring|anillo\s+m[áa]gico|\bMR\b|\bAM\b/i.test(body)) {
        startingMethod = 'magic_ring';
      } else if (/(?:foundation\s+)?chain|cadena|\bch\b/i.test(body)) {
        startingMethod = 'foundation_chain';
      }
      startingDetected = true;
    }

    // Extract round modifier (BLO/FLO) — can appear at start "BLO: 36 sc",
    // anywhere mid-body "36 pb BLO", or even at the end before the count.
    let modifier: RoundModifier = null;
    const modMatchStart = body.match(/^(BLO|FLO)\s*[:.]?\s*/i);
    if (modMatchStart) {
      modifier = modMatchStart[1].toUpperCase() as RoundModifier;
      body = body.slice(modMatchStart[0].length);
    } else {
      const modMatchAny = body.match(/\b(BLO|FLO)\b/i);
      if (modMatchAny) {
        modifier = modMatchAny[1].toUpperCase() as RoundModifier;
        body = body.replace(/\b(BLO|FLO)\b/gi, '').replace(/\s{2,}/g, ' ').trim();
      }
    }

    // Detect color change (informational)
    const colorChangeMatch = body.match(
      /(?:change\s+(?:yarn\s+)?(?:into|to)|cambia(?:r)?\s+a)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)(?:\.|,|$)/i,
    );
    if (colorChangeMatch) {
      currentColor = colorChangeMatch[1].trim();
      body = body.replace(colorChangeMatch[0], '').trim();
    }

    // Extract declared count "(N)", "(N sts)", "[N stitches]", etc. at the end.
    // Also accepts variants like "(40 sts x 2 rounds)" or "(40 sts x 4 rounds)".
    let declaredCount: number | undefined;
    const countMatch = body.match(
      /[\(\[](\d+)\s*(?:sts?|stitches?|puntos?|ptos?)?\s*(?:[\)\]]|(?:\s*[xX×]\s*\d+\s*(?:rounds?|vueltas?|times?)\s*[\)\]]))\s*(?:[–-]\s*\d+\s*(?:rounds?|vueltas?))?\s*\.?\s*$/,
    );
    if (countMatch) {
      declaredCount = parseInt(countMatch[1], 10);
      body = body.slice(0, countMatch.index).trim();
      body = body.replace(/[.\s]+$/, '');
    }

    // Parse operations from body
    const ops = parseOperations(body, lang, errors);
    const computedCount = computeStitchCount(ops, rounds.length === 0 ? 0 : rounds[rounds.length - 1].stitchCount);

    // Authority rule: if the pattern declares a count (e.g., "(6 sts)"), trust it.
    // Operations are then used only for visual classification (increase/decrease/even).
    // This handles tricky patterns like "Ch 2, 6 sc in first ch (6 sts)" where the
    // literal stitch sum doesn't match the actual round count.
    let effectiveCount: number;
    if (declaredCount !== undefined) {
      effectiveCount = declaredCount;
      // Soft warning if the parser's interpretation doesn't match the declared count
      if (computedCount > 0 && computedCount !== declaredCount) {
        // Don't push a hard error — just note silently. Validator will pick up clear ones.
      }
    } else if (rounds.length === 0) {
      effectiveCount = ops.reduce((s, op) => s + opAddCount(op), 0);
    } else {
      effectiveCount = computedCount;
    }

    if (rounds.length === 0) startingCount = effectiveCount;

    // Also extract annotations from inside this round's text (e.g., inline
    // "stuff as you go" notes appended to a round)
    const inlineAnnotations = extractAnnotations(line, lang);

    // Combine pending annotations (from previous non-round lines) with inline ones.
    // Annotations get attached to the FIRST round of a range.
    const allAnnotations: Annotation[] = [...pendingAnnotations, ...inlineAnnotations];
    pendingAnnotations = [];

    // Build round(s) — if range, repeat
    for (let n = startNum; n <= endNum; n++) {
      const round: Round = {
        number: n,
        operations: ops,
        stitchCount: effectiveCount,
        declaredCount,
        modifier,
        color: currentColor,
        operationKind: classifyRound(ops, rounds.length === 0 ? 0 : rounds[rounds.length - 1]?.stitchCount ?? 0, effectiveCount),
        rawText: line,
        annotations: n === startNum && allAnnotations.length > 0 ? allAnnotations : undefined,
      };
      rounds.push(round);
    }
  }

  // If there are leftover pending annotations, attach them to the last round
  if (pendingAnnotations.length > 0 && rounds.length > 0) {
    const last = rounds[rounds.length - 1];
    last.annotations = [...(last.annotations ?? []), ...pendingAnnotations];
  }

  // Heuristic: infer implicit foundation chain if not detected explicitly.
  // Many real patterns omit the "start with X chains" preamble and just
  // begin with a round whose count is unusual (not a clean 6/8 multiple
  // typical of magic-ring starts). E.g., Dudu: "C01. 4 pb, 5 pb juntos,
  // 3 pb, 1 aum (14)" → 14 is not 6/12/18/24..., suggests foundation chain.
  if (foundationChainLength === undefined && rounds.length > 0) {
    const r1 = rounds[0].stitchCount;
    const cleanlyMagicRing = r1 === 6 || r1 === 8 || r1 === 12;
    const looksLikeFoundationChain = r1 >= 10 && !cleanlyMagicRing;
    if (looksLikeFoundationChain) {
      // Estimate the chain length: about half the "extra" stitches beyond a
      // baseline magic-ring of 6. Capped at sensible values.
      const estimated = Math.max(3, Math.min(12, Math.round((r1 - 6) / 2)));
      foundationChainLength = estimated;
      startingMethod = 'foundation_chain';
    }
  }

  if (rounds.length === 0) return null;

  // Derive default caps from pattern shape
  const lastRound = rounds[rounds.length - 1];
  const peakCount = Math.max(...rounds.map((r) => r.stitchCount));
  const startCap: 'dome' | 'flat' | 'open' =
    startingMethod === 'magic_ring' ? 'dome' : 'flat';
  const endCap: 'dome' | 'flat' | 'open' =
    lastRound.stitchCount <= peakCount * 0.3 ? 'dome' : 'flat';

  return {
    id,
    name: section.name,
    startingMethod,
    startingCount,
    rounds,
    count: section.count,
    startCap,
    endCap,
    foundationChainLength,
  };
}

// ─── Operation parsing ────────────────────────────────────────────────────

/**
 * Parse the operations portion of a round into structured Operations.
 *
 * Examples:
 *   "6 sc"                    → [{ stitch: sc, count: 6 }]
 *   "(1 sc, inc) * 6"         → [{ group: [...], count: 6 }]
 *   "2 sc, inc, (4 sc, inc) * 5, 2 sc"
 */
function parseOperations(text: string, lang: Language, errors: ValidationError[]): Operation[] {
  if (!text || text.length === 0) return [];

  const tokens = tokenize(text);
  const ops: Operation[] = [];
  let i = 0;

  while (i < tokens.length) {
    const t = tokens[i];

    if (t === ',') {
      i++;
      continue;
    }

    if (t === '(' || t === '[' || t === '*') {
      // Find matching closer
      const open = t;
      const close = t === '(' ? ')' : t === '[' ? ']' : '*';
      let depth = 1;
      let j = i + 1;
      while (j < tokens.length && depth > 0) {
        if (tokens[j] === open && open !== '*') depth++;
        else if (tokens[j] === close) depth--;
        if (depth > 0) j++;
      }
      const innerTokens = tokens.slice(i + 1, j);
      const innerOps = parseOperations(innerTokens.join(' '), lang, errors);
      i = j + 1;

      // Look for multiplier: "* 6", "x 6", "x6", "6 times", "6 veces"
      let multiplier = 1;
      while (i < tokens.length && tokens[i] === ',') i++;
      if (i < tokens.length) {
        const next = tokens[i];
        if (next === '*' || next === 'x') {
          i++;
          if (i < tokens.length && /^\d+$/.test(tokens[i])) {
            multiplier = parseInt(tokens[i], 10);
            i++;
          }
        } else if (/^\d+$/.test(next)) {
          // Bare number after group: "[...] 6" or "[...] 6 times"
          multiplier = parseInt(next, 10);
          i++;
          // Skip "times" or "veces"
          if (i < tokens.length && /^(times|veces)$/i.test(tokens[i])) i++;
        } else if (next === 'times' || next === 'veces') {
          i++;
        }
      }

      ops.push({ stitch: 'sc', count: multiplier, group: innerOps });
      continue;
    }

    // Numeric prefix: "6 sc"
    let count = 1;
    let stitch: StitchType | null = null;

    if (/^\d+$/.test(t)) {
      count = parseInt(t, 10);
      i++;
    }

    if (i < tokens.length) {
      // Try to consume a stitch alias (which may be 1-3 words)
      const remaining = tokens.slice(i, Math.min(i + 4, tokens.length));
      const consumed = consumeStitchAlias(remaining);
      if (consumed) {
        stitch = consumed.stitch;
        i += consumed.tokensConsumed;
      }
    }

    if (stitch) {
      // "in next st", "en sig pto", "en cada pto" — informational, skip
      while (i < tokens.length && /^(in|en|next|sig|each|cada|st|sts|pto|ptos|stitch|stitches|punto|puntos)$/i.test(tokens[i])) {
        i++;
      }
      ops.push({ stitch, count });
    } else if (count > 1 && stitch === null) {
      // Standalone number — likely a count error or end-of-round count
      i++;
    } else {
      // Unrecognized token, skip
      i++;
    }
  }

  return ops;
}

/** Tokenize a round's body into atomic tokens. */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const t = text.replace(/[\.;]+$/, '');
  while (i < t.length) {
    const c = t[i];
    if (/\s/.test(c)) {
      i++;
    } else if (c === '(' || c === ')' || c === '[' || c === ']' || c === '*' || c === ',') {
      tokens.push(c);
      i++;
    } else if (/\d/.test(c)) {
      let j = i;
      while (j < t.length && /\d/.test(t[j])) j++;
      tokens.push(t.slice(i, j));
      i = j;
    } else if (/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(c)) {
      let j = i;
      while (j < t.length && /[A-Za-zÁÉÍÓÚÑáéíóúñ_-]/.test(t[j])) j++;
      tokens.push(t.slice(i, j));
      i = j;
    } else {
      i++;
    }
  }
  return tokens;
}

/**
 * Try to match the leading tokens against a known stitch alias (which may span
 * multiple tokens, e.g. "single crochet").
 */
function consumeStitchAlias(
  tokens: string[],
): { stitch: StitchType; tokensConsumed: number } | null {
  // Try longest match first: 4 tokens, then 3, then 2, then 1
  for (let len = Math.min(4, tokens.length); len >= 1; len--) {
    const candidate = tokens.slice(0, len).join(' ');
    const stitch = resolveStitch(candidate);
    if (stitch) return { stitch, tokensConsumed: len };
  }
  return null;
}

// ─── Stitch count computation ─────────────────────────────────────────────

function opAddCount(op: Operation): number {
  if (op.group && op.group.length > 0) {
    const inner = op.group.reduce((s, sub) => s + opAddCount(sub), 0);
    return inner * op.count;
  }
  const stitchInfo = STITCHES[op.stitch];
  return stitchInfo.countDelta * op.count;
}

function opRemoveCount(op: Operation): number {
  // For decreases: each dec consumes 2 stitches but produces 1.
  // The "count" reduction is 1 per dec applied. But the stitches from the previous
  // round consumed are 2 per dec. We track count delta = +1 (dec adds 1 to current),
  // but the stitches advanced in previous round = 2.
  if (op.stitch === 'dec') {
    if (op.group) {
      return op.group.reduce((s, sub) => s + (sub.stitch === 'dec' ? sub.count * 2 : sub.count * 1), 0) * op.count;
    }
    return op.count * 2;
  }
  if (op.group && op.group.length > 0) {
    const inner = op.group.reduce(
      (s, sub) => s + (sub.stitch === 'dec' ? sub.count * 2 : sub.count * 1),
      0,
    );
    return inner * op.count;
  }
  return op.count;
}

/**
 * Compute the stitch count at the end of a round.
 *
 * Logic:
 *   - Each operation produces stitches into the new round.
 *   - sc, hdc, dc, tr, sl_st, ch produce 1 stitch each (countDelta=1).
 *   - inc produces 2 stitches in the new round but consumes 1 from previous.
 *   - dec consumes 2 from previous and produces 1 in new round.
 *
 * The new stitch count is the sum of countDelta for each operation, multiplied
 * by repetitions. The previous round's stitch count is implicitly consumed.
 */
function computeStitchCount(ops: Operation[], _previousCount: number): number {
  return ops.reduce((s, op) => s + opAddCount(op), 0);
}

/** Classify a round by its dominant operation kind. */
function classifyRound(
  ops: Operation[],
  prevCount: number,
  newCount: number,
): Round['operationKind'] {
  if (prevCount === 0) return 'start';
  if (newCount > prevCount) {
    return ops.some((op) => op.stitch === 'dec' || (op.group?.some((g) => g.stitch === 'dec'))) ? 'mixed' : 'increase';
  }
  if (newCount < prevCount) {
    return ops.some((op) => op.stitch === 'inc' || (op.group?.some((g) => g.stitch === 'inc'))) ? 'mixed' : 'decrease';
  }
  return 'even';
}

// Re-export for tests
export { tokenize, parseOperations, opAddCount, opRemoveCount };
