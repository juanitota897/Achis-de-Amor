/**
 * Stitch dictionary.
 *
 * Each stitch has a height multiplier relative to a single crochet (sc),
 * which is the reference. Width is approximately the same for all stitches.
 *
 * Aliases map all common written forms (Spanish + English + abbreviations)
 * to the canonical stitch type.
 */

import type { StitchType, Language } from './types';

export interface StitchInfo {
  type: StitchType;
  /** Vertical multiplier relative to a single crochet (sc = 1.0). */
  heightMultiplier: number;
  /** Effect on stitch count: +N adds, -N removes. */
  countDelta: number;
  /** Display name in each language. */
  displayName: Record<Language, string>;
  /** Standard abbreviations in each language. */
  abbreviation: Record<Language, string>;
}

export const STITCHES: Record<StitchType, StitchInfo> = {
  ch: {
    type: 'ch',
    heightMultiplier: 0.7,
    countDelta: 1,
    displayName: { es: 'cadena', en: 'chain' },
    abbreviation: { es: 'cad', en: 'ch' },
  },
  sl_st: {
    type: 'sl_st',
    heightMultiplier: 0.3,
    countDelta: 1,
    displayName: { es: 'punto raso', en: 'slip stitch' },
    abbreviation: { es: 'pr', en: 'sl st' },
  },
  sc: {
    type: 'sc',
    heightMultiplier: 1.0,
    countDelta: 1,
    displayName: { es: 'punto bajo', en: 'single crochet' },
    abbreviation: { es: 'pb', en: 'sc' },
  },
  hdc: {
    type: 'hdc',
    heightMultiplier: 1.7,
    countDelta: 1,
    displayName: { es: 'media vareta', en: 'half double crochet' },
    abbreviation: { es: 'mp', en: 'hdc' },
  },
  dc: {
    type: 'dc',
    heightMultiplier: 2.5,
    countDelta: 1,
    displayName: { es: 'vareta', en: 'double crochet' },
    abbreviation: { es: 'pa', en: 'dc' },
  },
  tr: {
    type: 'tr',
    heightMultiplier: 3.5,
    countDelta: 1,
    displayName: { es: 'vareta doble', en: 'treble crochet' },
    abbreviation: { es: 'pad', en: 'tr' },
  },
  inc: {
    type: 'inc',
    heightMultiplier: 1.0,
    countDelta: 2,
    displayName: { es: 'aumento', en: 'increase' },
    abbreviation: { es: 'aum', en: 'inc' },
  },
  dec: {
    type: 'dec',
    heightMultiplier: 1.0,
    countDelta: 1,
    displayName: { es: 'disminución', en: 'decrease' },
    abbreviation: { es: 'dism', en: 'dec' },
  },
};

/**
 * Map of all known stitch aliases (case-insensitive) to canonical types.
 * Includes English, Spanish, and common abbreviation variants.
 */
const ALIAS_TO_TYPE_RAW: Record<string, StitchType> = {
  // chain
  ch: 'ch',
  chain: 'ch',
  chains: 'ch',
  cad: 'ch',
  cadena: 'ch',
  cadenas: 'ch',
  // slip stitch
  'sl st': 'sl_st',
  slst: 'sl_st',
  'sl-st': 'sl_st',
  ss: 'sl_st',
  pr: 'sl_st',
  pd: 'sl_st',
  'punto raso': 'sl_st',
  'punto deslizado': 'sl_st',
  // single crochet
  sc: 'sc',
  'single crochet': 'sc',
  pb: 'sc',
  'punto bajo': 'sc',
  // half double crochet
  hdc: 'hdc',
  'half double crochet': 'hdc',
  'half double': 'hdc',
  mp: 'hdc',
  'medio punto': 'hdc',
  'media vareta': 'hdc',
  mv: 'hdc',
  // double crochet
  dc: 'dc',
  'double crochet': 'dc',
  pa: 'dc',
  'punto alto': 'dc',
  vareta: 'dc',
  v: 'dc',
  // treble crochet
  tr: 'tr',
  'treble crochet': 'tr',
  trc: 'tr',
  'double treble': 'tr',
  dtr: 'tr',
  pad: 'tr',
  'punto alto doble': 'tr',
  'vareta doble': 'tr',
  // increase
  inc: 'inc',
  increase: 'inc',
  '2 sc in next st': 'inc',
  '2sc in next st': 'inc',
  'aum': 'inc',
  aumento: 'inc',
  // decrease
  dec: 'dec',
  decrease: 'dec',
  sc2tog: 'dec',
  'invisible decrease': 'dec',
  'inv dec': 'dec',
  dism: 'dec',
  disminución: 'dec',
  disminucion: 'dec',
  'pb2j': 'dec',
  // Portuguese (Brazilian)
  dim: 'dec',
  diminuição: 'dec',
  diminuicao: 'dec',
  'pb juntos': 'dec',
  juntos: 'dec',
  // Portuguese-only generic stitch aliases
  corr: 'ch',
  corrente: 'ch',
  correntes: 'ch',
  'ponto baixo': 'sc',
  'meio ponto alto': 'hdc',
  'ponto alto': 'dc',
  'ponto falso': 'sl_st',
};

/** Lookup table with normalized keys (lowercased, trimmed). */
const ALIAS_TO_TYPE: Map<string, StitchType> = new Map(
  Object.entries(ALIAS_TO_TYPE_RAW).map(([key, value]) => [
    key.toLowerCase().trim(),
    value,
  ]),
);

/**
 * Resolve a token from raw pattern text to a canonical StitchType.
 * Returns null if the token doesn't match any known stitch.
 */
export function resolveStitch(token: string): StitchType | null {
  const normalized = token.toLowerCase().trim();
  return ALIAS_TO_TYPE.get(normalized) ?? null;
}

/** Get all aliases (for parser tokenization). */
export function getAllStitchAliases(): string[] {
  return Array.from(ALIAS_TO_TYPE.keys()).sort((a, b) => b.length - a.length);
}
