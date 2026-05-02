/**
 * Annotation extractor.
 *
 * Patterns interleave actual stitch instructions ("Rnd 5: 30 sc") with
 * structural notes that aren't stitches but matter:
 *
 *   - Color changes: "change yarn to white", "with blue yarn"
 *   - Stuffing instructions: "stuff the head firmly"
 *   - Eye placement: "place safety eyes between rounds 14 and 15"
 *   - Sewing/joining: "sew ears to top of head"
 *   - Closing: "fasten off and leave long tail"
 *
 * This module captures those notes via regex and produces structured
 * Annotation records. The parser attaches them to the round they precede
 * or follow (typically the round just before the note).
 */

import type { Annotation, AnnotationKind } from './types';

interface AnnotationPattern {
  kind: AnnotationKind;
  /** Regex to detect this kind of annotation. */
  regex: RegExp;
  /** Build a human-readable summary from the regex match groups. */
  buildSummary: (match: RegExpMatchArray, lang: 'es' | 'en') => string;
  /** Optional structured details. */
  buildDetails?: (match: RegExpMatchArray) => Record<string, string | number>;
}

const PATTERNS: AnnotationPattern[] = [
  // Color change
  {
    kind: 'color_change',
    regex:
      /\b(?:change|cambia(?:r)?|switch|trocar?\s+para|trocar?\s+a|with)\s+(?:yarn\s+|color\s+|cor\s+(?:da?\s+|do\s+)?|to\s+|a\s+)?(?:to|into|a|para)?\s*(?:el\s+|the\s+)?(?:color\s+|cor\s+)?([a-zA-ZÁÉÍÓÚÑáéíóúñãõç]+)\s*(?:yarn|color)?\b/i,
    buildSummary: (m, lang) =>
      lang === 'es' ? `Cambio a color ${m[1].toLowerCase()}` : `Change to ${m[1].toLowerCase()}`,
    buildDetails: (m) => ({ color: m[1].toLowerCase() }),
  },
  // Eye placement
  {
    kind: 'eyes',
    regex:
      /(?:place|insert|coloca|inserta|pon)\s+(?:two\s+|dos\s+)?(?:safety\s+|de\s+seguridad\s+)?eyes?\s+(?:between|entre)\s+(?:rnds?\.?|rounds?|vueltas?|v)\s*(\d+)\s+(?:&|and|y)\s+(?:rnds?\.?|rounds?|vueltas?|v)?\s*(\d+)(?:,?\s*(\d+)\s+(?:stitches|sts|holes|puntos))?/i,
    buildSummary: (m, lang) => {
      const apart = m[3] ? `, ${m[3]} ${lang === 'es' ? 'puntos' : 'sts'} ${lang === 'es' ? 'apartados' : 'apart'}` : '';
      return lang === 'es'
        ? `Ojos entre V${m[1]}–V${m[2]}${apart}`
        : `Safety eyes between R${m[1]}–R${m[2]}${apart}`;
    },
    buildDetails: (m) => ({
      between: `${m[1]}-${m[2]}`,
      apart: parseInt(m[3] ?? '0', 10),
    }),
  },
  // Stuffing
  {
    kind: 'stuffing',
    regex:
      /\b(?:stuff(?:ing)?|rellena(?:r)?|relleno|begin\s+(?:to\s+)?stuff|stuff\s+as\s+you\s+go|fill\s+with\s+stuffing|fill\s+with\s+filler)\b/i,
    buildSummary: (_m, lang) =>
      lang === 'es' ? 'Rellenar con vellón' : 'Stuff with fiberfill',
  },
  // Sewing
  {
    kind: 'sewing',
    regex:
      /\b(?:sew\s+(?:the\s+)?(\w+)\s+(?:to|onto)\s+(?:the\s+)?(\w+)|coser\s+(?:la?\s+)?(\w+)\s+a\s+(?:la?\s+)?(\w+))/i,
    buildSummary: (m, lang) => {
      const a = m[1] ?? m[3];
      const b = m[2] ?? m[4];
      return lang === 'es' ? `Coser ${a} a ${b}` : `Sew ${a} to ${b}`;
    },
    buildDetails: (m) => ({ from: m[1] ?? m[3], to: m[2] ?? m[4] }),
  },
  // Fasten off / cut yarn
  {
    kind: 'fasten_off',
    regex:
      /\b(?:fasten\s+off|cut\s+(?:the\s+)?yarn|cierra(?:r)?|cortar?\s+(?:el\s+)?hilo|leave\s+(?:a\s+)?(?:long\s+)?tail|deja(?:r)?\s+(?:una?\s+)?(?:hebra|cola)\s+larga)/i,
    buildSummary: (_m, lang) =>
      lang === 'es' ? 'Cortar y dejar hebra larga' : 'Fasten off, leave long tail',
  },
];

/**
 * Try to extract one or more annotations from a free-form line of text.
 * Returns an empty array if no patterns match.
 */
export function extractAnnotations(line: string, lang: 'es' | 'en'): Annotation[] {
  const out: Annotation[] = [];
  for (const pat of PATTERNS) {
    const match = line.match(pat.regex);
    if (match) {
      out.push({
        kind: pat.kind,
        rawText: match[0],
        summary: pat.buildSummary(match, lang),
        details: pat.buildDetails?.(match),
      });
    }
  }
  return out;
}

/** Helper: concise icon for each annotation kind. */
export const ANNOTATION_ICON: Record<AnnotationKind, string> = {
  color_change: '🎨',
  stuffing: '🧸',
  eyes: '👁️',
  sewing: '🪡',
  fasten_off: '✂️',
  note: '📝',
};
