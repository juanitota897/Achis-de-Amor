/**
 * Real-world example patterns extracted from popular amigurumi designers.
 *
 * These are NOT redistributed in full — only the structural skeleton
 * (rounds, stitch counts) of representative pieces is included so users
 * can see how the visualizer handles real designs. For the full pattern
 * (with photos, assembly notes, stuffing instructions), users should
 * purchase from the original designer.
 *
 * All patterns credited to their original designers below.
 */

export interface RealPatternExample {
  id: string;
  /** Display name */
  name: string;
  /** Animal/category emoji */
  icon: string;
  /** Original designer */
  designer: string;
  /** Suggested materials per the original pattern. */
  materials: { yarnCyc: number; hookMm: number };
  /** The pattern text — head/body piece. */
  text: string;
  /** Language of the pattern text. */
  language: 'es' | 'en';
}

export const REAL_PATTERN_EXAMPLES: RealPatternExample[] = [
  {
    id: 'capybara_head',
    name: 'Capibara — cabeza',
    icon: '🦫',
    designer: 'Inna Chybinova (@inna_chi_hm)',
    materials: { yarnCyc: 2, hookMm: 2.25 },
    language: 'en',
    text: `# Lea the Capybara — Head

HEAD

Rnd 1: 8 sc in magic ring [8]
Rnd 2: (inc) * 8 times [16]
Rnd 3: (1 sc, inc) * 8 times [24]
Rnd 4: (3 sc, inc) * 6 times [30]
Rnd 5: 2 sc, inc, (4 sc, inc) * 5 times, 2 sc [36]
Rnd 6: (5 sc, inc) * 6 times [42]
Rnd 7: 3 sc, inc, (6 sc, inc) * 5 times, 3 sc [48]
Rnd 8: (7 sc, inc) * 6 times [54]
Rnds 9-12: 54 sc [54]
Rnd 13: 4 sc, inc, (8 sc, inc) * 5 times, 4 sc [60]
Rnds 14-18: 60 sc [60]
Rnd 19: (9 sc, inc) * 6 times [66]
Rnds 20-23: 66 sc [66]
Rnd 24: (9 sc, dec) * 6 times [60]
Rnd 25: (3 sc, dec) * 12 times [48]
Rnd 26: 3 sc, dec, (6 sc, dec) * 5 times, 3 sc [42]
Rnd 27: (5 sc, dec) * 6 times [36]
Rnd 28: 2 sc, dec, (4 sc, dec) * 5 times, 2 sc [30]
Rnd 29: (3 sc, dec) * 6 times [24]
Rnd 30: (2 sc, dec) * 6 times [18]
Rnd 31: (1 sc, dec) * 6 times [12]
Rnd 32: 6 dec [6]`,
  },
  {
    id: 'kitty_head',
    name: 'Gatito — cabeza',
    icon: '🐱',
    designer: 'Denae Mroczek (Ami Amore)',
    materials: { yarnCyc: 4, hookMm: 3.5 },
    language: 'en',
    text: `# Kitty — Head

HEAD

Rnd 1: 8 sc in MR [8]
Rnd 2: 8 inc [16]
Rnd 3: (1 sc, inc) x 8 [24]
Rnd 4: (2 sc, inc) x 8 [32]
Rnd 5: 32 sc [32]
Rnd 6: (3 sc, inc) x 8 [40]
Rnd 7: 40 sc [40]
Rnd 8: (4 sc, inc) x 8 [48]
Rnd 9: 48 sc [48]
Rnd 10: (5 sc, inc) x 8 [56]
Rnds 11-18: 56 sc [56]
Rnd 19: (3 sc, dec) x 11, sc [45]
Rnd 20: (2 sc, dec) x 11, sc [34]
Rnd 21: (1 sc, dec) x 11, sc [23]
Rnd 22: 11 dec, sc [12]
Rnd 23: 6 dec [6]`,
  },
  {
    id: 'bunny_mini_head',
    name: 'Conejo miniatura — cabeza',
    icon: '🐰',
    designer: 'Happy Crochet, Etc',
    materials: { yarnCyc: 1, hookMm: 1.5 },
    language: 'en',
    text: `# Mini Bunny — Head

HEAD

Rnd 1: 6 sc in magic ring [6]
Rnd 2: 6 inc [12]
Rnd 3: (1 sc, inc) * 6 [18]
Rnd 4: (2 sc, inc) * 6 [24]
Rnd 5: (3 sc, inc) * 6 [30]
Rnds 6-10: 30 sc [30]
Rnd 11: (3 sc, dec) * 6 [24]
Rnd 12: (2 sc, dec) * 6 [18]
Rnd 13: (1 sc, dec) * 6 [12]
Rnd 14: 6 dec [6]`,
  },
  {
    id: 'basset_head',
    name: 'Basset Hound — cabeza',
    icon: '🐕',
    designer: "Theresa's Crochet Shop",
    materials: { yarnCyc: 4, hookMm: 3.75 },
    language: 'en',
    text: `# Barley the Basset Hound — Head

HEAD

Rnd 1: 6 sc in MR [6]
Rnd 2: 6 inc [12]
Rnd 3: (1 sc, inc) x 6 [18]
Rnd 4: (2 sc, inc) x 6 [24]
Rnd 5: (3 sc, inc) x 6 [30]
Rnd 6: (4 sc, inc) x 6 [36]
Rnd 7: (5 sc, inc) x 6 [42]
Rnds 8-13: 42 sc [42]
Rnd 14: (5 sc, dec) x 6 [36]
Rnd 15: (4 sc, dec) x 6 [30]
Rnd 16: (3 sc, dec) x 6 [24]
Rnd 17: (2 sc, dec) x 6 [18]
Rnd 18: (1 sc, dec) x 6 [12]
Rnd 19: 6 dec [6]`,
  },
  {
    id: 'goose_body',
    name: 'Gansito — cabeza+cuerpo',
    icon: '🦆',
    designer: 'Olga Lukoshkina',
    materials: { yarnCyc: 3, hookMm: 2.25 },
    language: 'en',
    text: `# Crochet Goose — Head + Body (continuous)

HEAD

Rnd 1: 6 sc in magic ring [6]
Rnd 2: 6 inc [12]
Rnd 3: (1 sc, inc) * 6 [18]
Rnd 4: (2 sc, inc) * 6 [24]
Rnd 5: 24 sc [24]
Rnd 6: 9 sc, 3 inc, 9 sc, 3 inc [30]
Rnd 7: 30 sc [30]
Rnd 8: (1 sc, inc) * 3, 9 sc, (1 sc, inc) * 3, 9 sc [36]
Rnds 9-11: 36 sc [36]
Rnd 12: (4 sc, dec) * 6 [30]
Rnd 13: (3 sc, dec) * 6 [24]
Rnd 14: (2 sc, dec) * 6 [18]
Rnd 15: (1 sc, dec) * 6 [12]
Rnd 16: (4 sc, dec) * 2 [10]
Rnds 17-22: 10 sc [10]
Rnd 23: (4 sc, inc) * 2 [12]
Rnd 24: 12 sc [12]
Rnd 25: (1 sc, inc) * 6 [18]
Rnd 26: (2 sc, inc) * 6 [24]
Rnd 27: 24 sc [24]
Rnd 28: (3 sc, inc) * 6 [30]
Rnd 29: (4 sc, inc) * 6 [36]
Rnds 30-33: 36 sc [36]
Rnd 34: (4 sc, dec) * 6 [30]
Rnd 35: (3 sc, dec) * 6 [24]
Rnd 36: (2 sc, dec) * 6 [18]
Rnd 37: (1 sc, dec) * 6 [12]
Rnd 38: 6 dec [6]`,
  },
  {
    id: 'lion_alan_head',
    name: 'León Alan — cabeza',
    icon: '🦁',
    designer: 'El rincón de Ale',
    materials: { yarnCyc: 3, hookMm: 2.5 },
    language: 'es',
    text: `# Alan el León — Cabeza

CABEZA

V1: 6 pb en AM (6)
V2: 6 aum (12)
V3: (1 aum, 1 pb) x 6 (18)
V4: (3 aum, 6 pb) x 2 (24)
V5: (1 aum, 1 pb) x 3, 6 pb, (1 aum, 1 pb) x 3, 6 pb (30)
V6: (1 aum, 2 pb) x 3, 6 pb, (1 aum, 2 pb) x 3, 6 pb (36)
V7-V10: 36 pb (36)
V11: 10 pb, (1 aum, 1 pb) x 6, 14 pb (42)
V12: 11 pb, (2 pb, 1 aum) x 5, 16 pb (47)
V13-V18: 47 pb (47)
V19: (5 pb, 1 dism) x 6, 5 pb (41)
V20: (4 pb, 1 dism) x 6, 5 pb (35)
V21: (3 pb, 1 dism) x 6, 5 pb (29)
V22: (2 pb, 1 dism) x 6, 5 pb (23)
V23: (1 pb, 1 dism) x 6, 5 pb (17)
V24: 5 dism, 7 pb (12)
V25: 6 dism (6)`,
  },
  {
    id: 'frog_head',
    name: 'Sapo Fredy — cabeza',
    icon: '🐸',
    designer: 'Fredy the Frog',
    materials: { yarnCyc: 3, hookMm: 3 },
    language: 'en',
    text: `# Fredy the Frog — Head

HEAD

Rnd 1: 6 sc in MR [6]
Rnd 2: 6 inc [12]
Rnd 3: (1 sc, inc) * 6 [18]
Rnd 4: (2 sc, inc) * 6 [24]
Rnd 5: (3 sc, inc) * 6 [30]
Rnd 6: (4 sc, inc) * 6 [36]
Rnd 7: (5 sc, inc) * 6 [42]
Rnd 8: (6 sc, inc) * 6 [48]
Rnds 9-13: 48 sc [48]
Rnd 14: (6 sc, dec) * 6 [42]
Rnd 15: (5 sc, dec) * 6 [36]
Rnd 16: (4 sc, dec) * 6 [30]
Rnd 17: (3 sc, dec) * 6 [24]
Rnd 18: (2 sc, dec) * 6 [18]
Rnd 19: (1 sc, dec) * 6 [12]
Rnd 20: 6 dec [6]`,
  },
  {
    id: 'triceratops_body',
    name: 'Mini Triceratops — base',
    icon: '🦕',
    designer: 'Ludasamigurumi',
    materials: { yarnCyc: 1, hookMm: 1.5 },
    language: 'en',
    text: `# Mini Triceratops — Base

BASE

Round 1: 6 sc in MR [6]
Round 2: 6 sc [6]
Round 3: 6 inc [12]
Rounds 4-5: 12 sc [12]
Round 6: (1 sc, inc) * 6 [18]
Rounds 7-9: 18 sc [18]
Round 10: (2 sc, inc) * 6 [24]
Rounds 11-14: 24 sc [24]
Round 15: (3 sc, inc) * 6 [30]
Rounds 16-20: 30 sc [30]
Round 21: (4 sc, inc) * 6 [36]
Rounds 22-27: 36 sc [36]
Round 28: (5 sc, inc) * 6 [42]
Rounds 29-33: 42 sc [42]
Round 34: 3 sc, inc, (6 sc, inc) * 5, 3 sc [48]
Round 35: (7 sc, inc) * 6 [54]
Round 36: 4 sc, inc, (8 sc, inc) * 5, 4 sc [60]
Round 37: (9 sc, inc) * 6 [66]
Round 38: 5 sc, inc, (10 sc, inc) * 5, 5 sc [72]
Round 39: (11 sc, inc) * 6 [78]
Rounds 40-44: 78 sc [78]
Round 45: (11 sc, dec) * 6 [72]
Round 46: 5 sc, dec, (10 sc, dec) * 5, 5 sc [66]
Round 47: (9 sc, dec) * 6 [60]
Round 48: 4 sc, dec, (8 sc, dec) * 5, 4 sc [54]
Round 49: (7 sc, dec) * 6 [48]
Round 50: 3 sc, dec, (6 sc, dec) * 5, 3 sc [42]
Round 51: 42 sc [42]
Round 52: (5 sc, dec) * 6 [36]
Round 53: (4 sc, dec) * 6 [30]
Round 54: (3 sc, dec) * 6 [24]
Round 55: (2 sc, dec) * 6 [18]
Round 56: (1 sc, dec) * 6 [12]`,
  },
  {
    id: 'chihuahua_head',
    name: 'Chihuahua — cabeza',
    icon: '🐕',
    designer: 'PatchCatCrafts',
    materials: { yarnCyc: 3, hookMm: 4 },
    language: 'en',
    text: `# Chihuahua — Head

HEAD

Rnd 1: 6 sc in MR [6]
Rnd 2: 6 inc [12]
Rnd 3: (sc, inc) x 6 [18]
Rnd 4: (sc 2, inc) x 6 [24]
Rnd 5: (sc 3, inc) x 6 [30]
Rnd 6: (sc 4, inc) x 6 [36]
Rnd 7: (sc 5, inc) x 7 [42]
Rnd 8: (sc 6, inc) x 6 [48]
Rnd 9: 48 sc [48]
Rnd 10: 4 sc, inc, (sc 11, inc) x 3, 7 sc [52]
Rnds 11-16: 52 sc [52]
Rnd 17: (sc 11, dec) x 4 [48]
Rnd 18: (sc 6, dec) x 6 [42]
Rnd 19: (sc 5, dec) x 6 [36]
Rnd 20: (sc 4, dec) x 6 [30]
Rnd 21: (sc 3, dec) x 6 [24]
Rnd 22: (sc 2, dec) x 6 [18]`,
  },
];

export function findExample(id: string): RealPatternExample | undefined {
  return REAL_PATTERN_EXAMPLES.find((p) => p.id === id);
}
