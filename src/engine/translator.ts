/**
 * Pattern translator.
 *
 * Converts a parsed pattern into a textual representation in the target language,
 * using canonical abbreviations and consistent syntax. This is also used to
 * "round-trip" a pattern (read in any syntax, output in clean canonical form).
 */

import type { Pattern, Round, Operation, Language } from './types';
import { STITCHES } from './stitches';

export interface FormatOptions {
  language: Language;
  /** Use abbreviations or full names. */
  useAbbreviations: boolean;
  /** Include round counts in parentheses at the end. */
  includeCounts: boolean;
  /** Bracket style for repetitions: 'parens' for (..), 'asterisk' for *..*. */
  repetitionStyle: 'parens' | 'asterisk' | 'brackets';
  /** Pieces separator. */
  pieceSeparator: string;
}

export const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  language: 'es',
  useAbbreviations: true,
  includeCounts: true,
  repetitionStyle: 'parens',
  pieceSeparator: '\n\n',
};

/** Format a single operation. */
function formatOperation(op: Operation, opts: FormatOptions): string {
  const stitchInfo = STITCHES[op.stitch];
  const label = opts.useAbbreviations
    ? stitchInfo.abbreviation[opts.language]
    : stitchInfo.displayName[opts.language];

  if (op.group && op.group.length > 0) {
    const inner = op.group.map((sub) => formatOperation(sub, opts)).join(', ');
    const wrapped =
      opts.repetitionStyle === 'asterisk'
        ? `*${inner}*`
        : opts.repetitionStyle === 'brackets'
          ? `[${inner}]`
          : `(${inner})`;
    return op.count > 1 ? `${wrapped} x${op.count}` : wrapped;
  }

  return op.count > 1 ? `${op.count} ${label}` : `1 ${label}`;
}

/** Format a single round. */
function formatRound(round: Round, opts: FormatOptions): string {
  const label = opts.language === 'es' ? `V${round.number}` : `R${round.number}`;
  const ops = round.operations.map((op) => formatOperation(op, opts)).join(', ');
  const modifier = round.modifier ? `${round.modifier}: ` : '';
  const count = opts.includeCounts ? ` (${round.stitchCount})` : '';
  return `${label}: ${modifier}${ops}${count}`;
}

/** Format a full pattern. */
export function formatPattern(
  pattern: Pattern,
  options: Partial<FormatOptions> = {},
): string {
  const opts = { ...DEFAULT_FORMAT_OPTIONS, ...options };
  const sections: string[] = [];

  // Header
  if (pattern.metadata.name) {
    sections.push(`# ${pattern.metadata.name}`);
  }

  // Pieces
  for (const piece of pattern.pieces) {
    const pieceHeader = piece.count > 1
      ? opts.language === 'es'
        ? `\n## ${piece.name} (hacer ${piece.count})`
        : `\n## ${piece.name} (make ${piece.count})`
      : `\n## ${piece.name}`;
    sections.push(pieceHeader);

    const startLabel =
      piece.startingMethod === 'magic_ring'
        ? opts.language === 'es' ? 'AM' : 'MR'
        : piece.startingMethod === 'foundation_chain'
          ? opts.language === 'es' ? 'cad' : 'ch'
          : '';

    for (const round of piece.rounds) {
      sections.push(formatRound(round, opts));
    }

    if (piece.notes && piece.notes.length > 0) {
      sections.push('');
      sections.push(...piece.notes);
    }
    void startLabel;
  }

  return sections.join('\n');
}

/** Translate a single stitch type label between languages. */
export function translateStitch(
  stitch: keyof typeof STITCHES,
  targetLang: Language,
  useAbbreviation = true,
): string {
  const info = STITCHES[stitch];
  return useAbbreviation
    ? info.abbreviation[targetLang]
    : info.displayName[targetLang];
}
