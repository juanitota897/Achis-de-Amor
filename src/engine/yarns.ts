/**
 * Yarn weight catalog (Craft Yarn Council standards) + regional aliases.
 *
 * The CYC 0-7 system is the international standard, but real users speak
 * in regional terms:
 *   - Argentine/Spanish: "semigrueso", "8/6", "8/8", "4/7", "fino"
 *   - British/Aussie: "4 ply", "8 ply", "10 ply", "12 ply"
 *   - American: "fingering", "sport", "DK", "worsted", "bulky"
 *   - Brand names: "Yarn Art Jeans", "Scheepjes Catona", "DMC perlé"
 *
 * This file maps all of those to the canonical CYC categories so the user
 * can pick whichever name they're used to.
 */

export interface YarnWeight {
  cyc: number;
  /** Canonical name (international). */
  name: string;
  /** Friendly display name in Spanish (more natural for Argentine users). */
  displayEs: string;
  /** Friendly display name in English. */
  displayEn: string;
  /** All known aliases — lower-cased for case-insensitive lookup. */
  aliases: string[];
  recommendedHookMm: { min: number; max: number };
  defaultStitchWidth: number;
  defaultStitchHeight: number;
  yardsPer100g: number;
  metersPer100g: number;
  gramsPerStitch: number;
  /** Common fiber/yarn product examples for this weight. */
  examples: string[];
}

export const YARN_WEIGHTS: Record<number, YarnWeight> = {
  0: {
    cyc: 0,
    name: 'Lace',
    displayEs: 'Hilo muy fino (encaje)',
    displayEn: 'Lace',
    aliases: ['lace', 'cobweb', 'thread', '10-count', 'crochet thread', 'hilo de encaje'],
    recommendedHookMm: { min: 1.5, max: 2.25 },
    defaultStitchWidth: 2.0,
    defaultStitchHeight: 2.0,
    yardsPer100g: 750,
    metersPer100g: 685,
    gramsPerStitch: 0.04,
    examples: ['DMC Perlé 12', 'Crochet thread #10'],
  },
  1: {
    cyc: 1,
    name: 'Super Fine',
    displayEs: 'Fino (3-4 hebras / sock)',
    displayEn: 'Super fine / Fingering',
    aliases: [
      'super fine', 'fingering', 'sock', 'baby', 'fino',
      '3 ply', '4 ply',
      '4/4', '4/5', '4/6',
      'algodón fino', 'hilo fino',
    ],
    recommendedHookMm: { min: 2.25, max: 3.5 },
    defaultStitchWidth: 3.0,
    defaultStitchHeight: 3.0,
    yardsPer100g: 437,
    metersPer100g: 400,
    gramsPerStitch: 0.07,
    examples: ['DMC Perlé 5', 'Yarn Art Jeans (fino)', 'Alize Miss'],
  },
  2: {
    cyc: 2,
    name: 'Fine',
    displayEs: 'Sport (5 hebras)',
    displayEn: 'Fine / Sport',
    aliases: [
      'fine', 'sport', 'baby',
      '5 ply',
      '4/7', '4/8', '5/6',
      'sport',
    ],
    recommendedHookMm: { min: 3.5, max: 4.5 },
    defaultStitchWidth: 3.8,
    defaultStitchHeight: 3.8,
    yardsPer100g: 328,
    metersPer100g: 300,
    gramsPerStitch: 0.10,
    examples: ['Scheepjes Catona', 'Cashmilon (mediano)'],
  },
  3: {
    cyc: 3,
    name: 'Light',
    displayEs: 'Semigrueso (8 hebras / DK)',
    displayEn: 'Light / DK',
    aliases: [
      'light', 'dk', 'light worsted',
      '8 ply',
      '8/6', '8/7', '8/8',
      'semigrueso', 'algodón semigrueso',
    ],
    recommendedHookMm: { min: 4.5, max: 5.5 },
    defaultStitchWidth: 4.5,
    defaultStitchHeight: 4.5,
    yardsPer100g: 273,
    metersPer100g: 250,
    gramsPerStitch: 0.15,
    examples: ['Yarn Art Jeans', 'Scheepjes Stone Washed', 'Algodón 8/6 argentino'],
  },
  4: {
    cyc: 4,
    name: 'Medium',
    displayEs: 'Grueso (worsted / 10-12 hebras)',
    displayEn: 'Medium / Worsted',
    aliases: [
      'medium', 'worsted', 'afghan', 'aran',
      '10 ply', '11 ply', '12 ply',
      '8/10', '8/12',
      'grueso', 'algodón grueso', 'lana mediana',
    ],
    recommendedHookMm: { min: 5.5, max: 6.5 },
    defaultStitchWidth: 5.5,
    defaultStitchHeight: 5.5,
    yardsPer100g: 218,
    metersPer100g: 200,
    gramsPerStitch: 0.22,
    examples: ['Cashmilon clásico', 'Red Heart Super Saver', 'Aran tradicional'],
  },
  5: {
    cyc: 5,
    name: 'Bulky',
    displayEs: 'Muy grueso (chunky / 14 hebras)',
    displayEn: 'Bulky / Chunky',
    aliases: [
      'bulky', 'chunky', 'craft', 'rug',
      '14 ply', '16 ply',
      'muy grueso', 'lana gruesa',
    ],
    recommendedHookMm: { min: 6.5, max: 9.0 },
    defaultStitchWidth: 7.0,
    defaultStitchHeight: 7.0,
    yardsPer100g: 142,
    metersPer100g: 130,
    gramsPerStitch: 0.35,
    examples: ['Lana de oveja gruesa', 'Bernat Softee Chunky'],
  },
  6: {
    cyc: 6,
    name: 'Super Bulky',
    displayEs: 'Super grueso',
    displayEn: 'Super bulky',
    aliases: [
      'super bulky', 'roving', 'super grueso',
    ],
    recommendedHookMm: { min: 9.0, max: 15.0 },
    defaultStitchWidth: 9.0,
    defaultStitchHeight: 9.0,
    yardsPer100g: 87,
    metersPer100g: 80,
    gramsPerStitch: 0.55,
    examples: ['Lion Brand Wool-Ease Thick & Quick'],
  },
  7: {
    cyc: 7,
    name: 'Jumbo',
    displayEs: 'Jumbo (chenille XXL)',
    displayEn: 'Jumbo / Chenille',
    aliases: [
      'jumbo', 'chenille', 'roving xxl',
    ],
    recommendedHookMm: { min: 15.0, max: 25.0 },
    defaultStitchWidth: 12.0,
    defaultStitchHeight: 12.0,
    yardsPer100g: 55,
    metersPer100g: 50,
    gramsPerStitch: 0.85,
    examples: ['Bernat Blanket Big', 'Chenille XXL'],
  },
};

export function getYarn(cyc: number): YarnWeight {
  return YARN_WEIGHTS[cyc] ?? YARN_WEIGHTS[4];
}

/**
 * Find a yarn weight by any name/alias (case-insensitive partial or exact match).
 * Examples that work:
 *   - "8/6" → CYC 3
 *   - "DK" → CYC 3
 *   - "semigrueso" → CYC 3
 *   - "8 ply" → CYC 3
 *   - "Scheepjes Catona" → CYC 2 (matched via examples)
 */
export function findYarnByName(name: string): YarnWeight | null {
  const lower = name.toLowerCase().trim();
  for (const yarn of Object.values(YARN_WEIGHTS)) {
    if (yarn.name.toLowerCase() === lower) return yarn;
    if (yarn.aliases.some((alias) => alias.toLowerCase() === lower)) return yarn;
    if (yarn.examples.some((ex) => ex.toLowerCase() === lower)) return yarn;
    // Partial match for examples (so "scheepjes catona 100% mercerized" still hits)
    if (yarn.examples.some((ex) => lower.includes(ex.toLowerCase()))) return yarn;
  }
  return null;
}

export const ALL_YARN_WEIGHTS: YarnWeight[] = Object.values(YARN_WEIGHTS).sort(
  (a, b) => a.cyc - b.cyc,
);
