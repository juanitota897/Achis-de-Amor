/**
 * Part templates: human-friendly presets for amigurumi parts.
 *
 * Each template wraps a ShapeParams (the abstract geometric definition)
 * with a label, category, icon and sensible default dimensions derived
 * from analyzing real patterns (Kitty, Bunny, Basset Hound, Mice, Goose).
 *
 * The UI shows these templates organized by category, so the user thinks
 * "I want a cat ear" instead of "I want a 4×2cm teardrop".
 */

import type { ShapeParams } from './types';

export type PartCategory =
  | 'head'
  | 'body'
  | 'arm'
  | 'leg'
  | 'hand_foot'
  | 'ear'
  | 'face'
  | 'tail'
  | 'other';

export interface PartTemplate {
  id: string;
  category: PartCategory;
  label: { es: string; en: string };
  description?: { es: string; en: string };
  /** Emoji representation. Used as compact icon in the picker. */
  icon: string;
  /** Default shape parameters at scale=1.0. */
  shape: ShapeParams;
  /** Suggested default scale when this template is first picked. */
  defaultScale?: number;
}

export const CATEGORY_INFO: Record<
  PartCategory,
  { label: { es: string; en: string }; icon: string; order: number }
> = {
  head: { label: { es: 'Cabezas', en: 'Heads' }, icon: '🐻', order: 1 },
  body: { label: { es: 'Cuerpos', en: 'Bodies' }, icon: '🫥', order: 2 },
  arm: { label: { es: 'Brazos', en: 'Arms' }, icon: '💪', order: 3 },
  leg: { label: { es: 'Patas', en: 'Legs' }, icon: '🦵', order: 4 },
  hand_foot: { label: { es: 'Manos y pies', en: 'Hands & feet' }, icon: '🐾', order: 5 },
  ear: { label: { es: 'Orejas', en: 'Ears' }, icon: '👂', order: 6 },
  face: { label: { es: 'Detalles faciales', en: 'Face details' }, icon: '👃', order: 7 },
  tail: { label: { es: 'Colas', en: 'Tails' }, icon: '🐍', order: 8 },
  other: { label: { es: 'Otros', en: 'Others' }, icon: '✨', order: 9 },
};

export const PART_TEMPLATES: PartTemplate[] = [
  // ─── Heads ────────────────────────────────────────────────────────────
  {
    id: 'head_round_small',
    category: 'head',
    label: { es: 'Cabeza redonda chica', en: 'Small round head' },
    description: {
      es: 'Para amigurumis miniatura (ratón, mini conejo).',
      en: 'For miniature amigurumis (mouse, mini bunny).',
    },
    icon: '🐭',
    shape: { kind: 'sphere', diameter: 5 },
  },
  {
    id: 'head_round_medium',
    category: 'head',
    label: { es: 'Cabeza redonda mediana', en: 'Medium round head' },
    description: {
      es: 'Tamaño estándar para gatos, conejos, ositos.',
      en: 'Standard size for cats, bunnies, bears.',
    },
    icon: '🐱',
    shape: { kind: 'sphere', diameter: 8 },
  },
  {
    id: 'head_round_large',
    category: 'head',
    label: { es: 'Cabeza redonda grande', en: 'Large round head' },
    description: {
      es: 'Para amigurumis grandes (basset hound, oso grande).',
      en: 'For large amigurumis (basset hound, big bear).',
    },
    icon: '🐶',
    shape: { kind: 'sphere', diameter: 12 },
  },
  {
    id: 'head_flat',
    category: 'head',
    label: { es: 'Cabeza achatada', en: 'Flat head' },
    description: {
      es: 'Estilo Pica Pau — más ancha que alta.',
      en: 'Pica Pau style — wider than tall.',
    },
    icon: '🦊',
    shape: { kind: 'flat_sphere', diameter: 9, height: 6 },
  },
  {
    id: 'head_oblong',
    category: 'head',
    label: { es: 'Cabeza ovalada', en: 'Oblong head' },
    description: {
      es: 'Más alta que ancha, tipo caballo o jirafa.',
      en: 'Taller than wide, horse or giraffe style.',
    },
    icon: '🦒',
    shape: { kind: 'oblong_sphere', diameter: 7, height: 11 },
  },
  {
    id: 'head_hippo',
    category: 'head',
    label: { es: 'Cabeza tipo hipopótamo', en: 'Hippo-style head' },
    description: {
      es: 'Cuerpo alargado horizontal, foundation chain.',
      en: 'Horizontally elongated, foundation chain start.',
    },
    icon: '🦛',
    shape: { kind: 'oval', length: 11, width: 7, height: 6 },
  },
  {
    id: 'head_horse',
    category: 'head',
    label: { es: 'Cabeza de caballo', en: 'Horse head' },
    description: {
      es: 'Alargada con hocico cónico (caballo, llama, alpaca).',
      en: 'Elongated with tapered muzzle (horse, llama, alpaca).',
    },
    icon: '🐴',
    shape: { kind: 'tapered_cylinder', diameter: 5, diameterTop: 3, height: 9 },
  },
  {
    id: 'head_dog_long',
    category: 'head',
    label: { es: 'Cabeza alargada (perro/zorro)', en: 'Long head (dog/fox)' },
    description: {
      es: 'Achatada con hocico que sobresale.',
      en: 'Flattened with protruding snout.',
    },
    icon: '🦊',
    shape: { kind: 'oblong_sphere', diameter: 6, height: 9 },
  },
  {
    id: 'head_dino',
    category: 'head',
    label: { es: 'Cabeza de dinosaurio', en: 'Dinosaur head' },
    description: {
      es: 'Muy alargada con boca prominente.',
      en: 'Very elongated with prominent mouth.',
    },
    icon: '🦖',
    shape: { kind: 'oval', length: 13, width: 6, height: 5 },
  },
  {
    id: 'head_penguin',
    category: 'head',
    label: { es: 'Cabeza+cuerpo pingüino', en: 'Penguin head+body' },
    description: {
      es: 'Pieza unificada en forma de pera invertida.',
      en: 'Unified piece, inverted-pear shape.',
    },
    icon: '🐧',
    shape: { kind: 'pear', diameter: 9, diameterTop: 5, height: 14 },
  },
  {
    id: 'head_owl',
    category: 'head',
    label: { es: 'Cabeza+cuerpo búho', en: 'Owl head+body' },
    description: {
      es: 'Forma de huevo (cabeza y cuerpo unidos).',
      en: 'Egg shape (head and body unified).',
    },
    icon: '🦉',
    shape: { kind: 'oblong_sphere', diameter: 8, height: 11 },
  },
  {
    id: 'head_frog',
    category: 'head',
    label: { es: 'Cabeza de rana', en: 'Frog head' },
    description: {
      es: 'Achatada y muy ancha.',
      en: 'Very wide, flattened.',
    },
    icon: '🐸',
    shape: { kind: 'flat_sphere', diameter: 10, height: 5 },
  },

  // ─── Bodies ───────────────────────────────────────────────────────────
  {
    id: 'body_round',
    category: 'body',
    label: { es: 'Cuerpo redondo', en: 'Round body' },
    description: { es: 'Pelota — cuerpo simple.', en: 'Ball — simple body.' },
    icon: '⚪',
    shape: { kind: 'sphere', diameter: 9 },
  },
  {
    id: 'body_oblong',
    category: 'body',
    label: { es: 'Cuerpo ovalado', en: 'Oblong body' },
    description: {
      es: 'Cuerpo alargado vertical (oso parado).',
      en: 'Vertically elongated body (standing bear).',
    },
    icon: '🐻',
    shape: { kind: 'oblong_sphere', diameter: 9, height: 13 },
  },
  {
    id: 'body_pear',
    category: 'body',
    label: { es: 'Cuerpo tipo pera', en: 'Pear body' },
    description: {
      es: 'Base ancha, cuello angosto. Animales sentados.',
      en: 'Wide base, narrow neck. Sitting animals.',
    },
    icon: '🐧',
    shape: { kind: 'pear', diameter: 10, diameterTop: 5, height: 12 },
  },
  {
    id: 'body_cylinder',
    category: 'body',
    label: { es: 'Cuerpo cilíndrico', en: 'Cylinder body' },
    description: {
      es: 'Tronco recto. Animales parados.',
      en: 'Straight trunk. Standing animals.',
    },
    icon: '🦌',
    shape: { kind: 'cylinder', diameter: 7, height: 12 },
  },
  {
    id: 'body_fish',
    category: 'body',
    label: { es: 'Cuerpo de pez', en: 'Fish body' },
    description: {
      es: 'Lágrima alargada horizontal.',
      en: 'Elongated horizontal teardrop.',
    },
    icon: '🐟',
    shape: { kind: 'teardrop', length: 12, width: 5 },
  },
  {
    id: 'body_long_animal',
    category: 'body',
    label: { es: 'Cuerpo largo (perro/gato)', en: 'Long body (dog/cat)' },
    description: {
      es: 'Tipo basset/dachshund — alargado horizontal.',
      en: 'Basset/dachshund — horizontally elongated.',
    },
    icon: '🐕',
    shape: { kind: 'oval', length: 14, width: 7, height: 6 },
  },
  {
    id: 'body_turtle_shell',
    category: 'body',
    label: { es: 'Caparazón de tortuga', en: 'Turtle shell' },
    description: {
      es: 'Disco grande con domo arriba.',
      en: 'Large disc with top dome.',
    },
    icon: '🐢',
    shape: { kind: 'flat_sphere', diameter: 10, height: 5 },
  },

  // ─── Arms ─────────────────────────────────────────────────────────────
  {
    id: 'arm_straight',
    category: 'arm',
    label: { es: 'Brazo recto', en: 'Straight arm' },
    description: {
      es: 'Cilindro corto, sin afinarse.',
      en: 'Short cylinder, no taper.',
    },
    icon: '➖',
    shape: { kind: 'cylinder', diameter: 2.5, height: 5 },
  },
  {
    id: 'arm_tapered',
    category: 'arm',
    label: { es: 'Brazo cónico', en: 'Tapered arm' },
    description: {
      es: 'Más ancho en la mano que en el hombro.',
      en: 'Wider at hand than at shoulder.',
    },
    icon: '▽',
    shape: { kind: 'tapered_cylinder', diameter: 2.5, diameterTop: 1.8, height: 5 },
  },
  {
    id: 'arm_long',
    category: 'arm',
    label: { es: 'Brazo largo', en: 'Long arm' },
    description: { es: 'Para animales tipo mono.', en: 'For monkey-like animals.' },
    icon: '🦧',
    shape: { kind: 'cylinder', diameter: 2, height: 8 },
  },

  // ─── Legs ─────────────────────────────────────────────────────────────
  {
    id: 'leg_front_thin',
    category: 'leg',
    label: { es: 'Pata delantera fina', en: 'Thin front leg' },
    description: {
      es: 'Animales esbeltos (gato, ciervo).',
      en: 'Slim animals (cat, deer).',
    },
    icon: '🦌',
    shape: { kind: 'tapered_cylinder', diameter: 2, diameterTop: 1.5, height: 5 },
  },
  {
    id: 'leg_back_chubby',
    category: 'leg',
    label: { es: 'Pata trasera rolliza', en: 'Chubby back leg' },
    description: {
      es: 'Voluminosa abajo, fina arriba (oso, conejo).',
      en: 'Voluminous bottom, thin top (bear, bunny).',
    },
    icon: '🐰',
    shape: { kind: 'pear', diameter: 4, diameterTop: 2, height: 6 },
  },
  {
    id: 'leg_short',
    category: 'leg',
    label: { es: 'Pata corta', en: 'Short leg' },
    description: { es: 'Estilo basset hound, ratón.', en: 'Basset hound, mouse style.' },
    icon: '🐕',
    shape: { kind: 'tapered_cylinder', diameter: 2.2, diameterTop: 1.8, height: 3 },
  },

  // ─── Hands & feet ─────────────────────────────────────────────────────
  {
    id: 'hand_round',
    category: 'hand_foot',
    label: { es: 'Mano redonda', en: 'Round hand' },
    description: { es: 'Pelota chica achatada.', en: 'Small flattened ball.' },
    icon: '✊',
    shape: { kind: 'flat_sphere', diameter: 2.5, height: 1.8 },
  },
  {
    id: 'foot_oval',
    category: 'hand_foot',
    label: { es: 'Pie ovalado', en: 'Oval foot' },
    description: {
      es: 'Pie alargado para animales parados.',
      en: 'Elongated foot for standing animals.',
    },
    icon: '🦶',
    shape: { kind: 'oval', length: 4, width: 2.5, height: 1.5 },
  },
  {
    id: 'foot_round',
    category: 'hand_foot',
    label: { es: 'Pata redonda', en: 'Round paw' },
    description: { es: 'Para gatos, perros chicos.', en: 'For cats, small dogs.' },
    icon: '🐾',
    shape: { kind: 'flat_sphere', diameter: 3, height: 2 },
  },

  // ─── Ears ─────────────────────────────────────────────────────────────
  {
    id: 'ear_cat_pointy',
    category: 'ear',
    label: { es: 'Oreja en pico (gato)', en: 'Pointy ear (cat)' },
    description: { es: 'Triangular erguida.', en: 'Erect triangular.' },
    icon: '🐈',
    shape: { kind: 'teardrop', length: 4, width: 2.5 },
  },
  {
    id: 'ear_bear_round',
    category: 'ear',
    label: { es: 'Oreja redonda (oso)', en: 'Round ear (bear)' },
    description: { es: 'Hemiesférica chica.', en: 'Small hemispherical.' },
    icon: '🐻',
    shape: { kind: 'hemisphere', diameter: 3 },
  },
  {
    id: 'ear_bunny_long',
    category: 'ear',
    label: { es: 'Oreja larga (conejo)', en: 'Long ear (bunny)' },
    description: { es: 'Lágrima muy alargada.', en: 'Very elongated teardrop.' },
    icon: '🐰',
    shape: { kind: 'teardrop', length: 8, width: 2.2 },
  },
  {
    id: 'ear_dog_floppy',
    category: 'ear',
    label: { es: 'Oreja colgante (perro)', en: 'Floppy ear (dog)' },
    description: {
      es: 'Tipo basset/sabueso, plana y larga.',
      en: 'Basset/hound style, flat and long.',
    },
    icon: '🦮',
    shape: { kind: 'petal', length: 6, width: 3.5 },
  },
  {
    id: 'ear_mouse_disc',
    category: 'ear',
    label: { es: 'Oreja redondita (ratón)', en: 'Tiny round ear (mouse)' },
    description: { es: 'Disco pequeño.', en: 'Small disc.' },
    icon: '🐭',
    shape: { kind: 'disc', diameter: 2 },
  },
  {
    id: 'ear_petal',
    category: 'ear',
    label: { es: 'Oreja triangular plana', en: 'Triangular flat ear' },
    description: { es: 'Tipo jirafa, ciervo joven.', en: 'Giraffe, young deer.' },
    icon: '🦒',
    shape: { kind: 'petal', length: 4, width: 2 },
  },

  // ─── Face details ─────────────────────────────────────────────────────
  {
    id: 'snout_small',
    category: 'face',
    label: { es: 'Hocico chico', en: 'Small snout' },
    description: { es: 'Bola achatada.', en: 'Flat ball.' },
    icon: '👃',
    shape: { kind: 'flat_sphere', diameter: 2.5, height: 1.8 },
  },
  {
    id: 'snout_long',
    category: 'face',
    label: { es: 'Hocico largo', en: 'Long snout' },
    description: { es: 'Para perros, lobos.', en: 'For dogs, wolves.' },
    icon: '🐺',
    shape: { kind: 'oval', length: 4, width: 2.5, height: 2 },
  },
  {
    id: 'nose_round',
    category: 'face',
    label: { es: 'Nariz pequeña', en: 'Small nose' },
    description: { es: 'Pelotita.', en: 'Tiny ball.' },
    icon: '🔴',
    shape: { kind: 'sphere', diameter: 1.5 },
  },
  {
    id: 'cheek_disc',
    category: 'face',
    label: { es: 'Mejilla', en: 'Cheek' },
    description: { es: 'Disco chiquito.', en: 'Little disc.' },
    icon: '😊',
    shape: { kind: 'disc', diameter: 2 },
  },
  {
    id: 'beak_cone',
    category: 'face',
    label: { es: 'Pico de ave', en: 'Bird beak' },
    description: { es: 'Cono pequeño (gansito).', en: 'Small cone (goose).' },
    icon: '🦆',
    shape: { kind: 'cone', diameter: 2, height: 2 },
  },

  // ─── Tails ────────────────────────────────────────────────────────────
  {
    id: 'tail_short_pointy',
    category: 'tail',
    label: { es: 'Cola corta puntiaguda', en: 'Short pointy tail' },
    description: { es: 'Cono chico.', en: 'Small cone.' },
    icon: '🐈',
    shape: { kind: 'cone', diameter: 2, height: 3 },
  },
  {
    id: 'tail_long',
    category: 'tail',
    label: { es: 'Cola larga afinada', en: 'Long tapered tail' },
    description: {
      es: 'Más ancha en la base, fina en la punta.',
      en: 'Wider at base, thin at tip.',
    },
    icon: '🐈‍⬛',
    shape: { kind: 'tapered_cylinder', diameter: 2, diameterTop: 0.8, height: 7 },
  },
  {
    id: 'tail_bunny_pompom',
    category: 'tail',
    label: { es: 'Cola redondita', en: 'Round pompom tail' },
    description: { es: 'Pelotita conejo.', en: 'Bunny ball.' },
    icon: '🐰',
    shape: { kind: 'sphere', diameter: 2.5 },
  },

  // ─── Other ────────────────────────────────────────────────────────────
  {
    id: 'fin_dolphin',
    category: 'other',
    label: { es: 'Aleta (delfín/pez)', en: 'Fin (dolphin/fish)' },
    description: { es: 'Pétalo curvo.', en: 'Curved petal.' },
    icon: '🐬',
    shape: { kind: 'petal', length: 4, width: 3 },
  },
  {
    id: 'tentacle',
    category: 'other',
    label: { es: 'Tentáculo (pulpo)', en: 'Tentacle (octopus)' },
    description: {
      es: 'Cilindro cónico largo y fino.',
      en: 'Long thin tapered cylinder.',
    },
    icon: '🐙',
    shape: { kind: 'tapered_cylinder', diameter: 2, diameterTop: 0.6, height: 9 },
  },
  {
    id: 'crab_claw',
    category: 'other',
    label: { es: 'Pinza (cangrejo)', en: 'Claw (crab)' },
    description: { es: 'Forma de gota gruesa.', en: 'Thick teardrop shape.' },
    icon: '🦀',
    shape: { kind: 'teardrop', length: 4, width: 3 },
  },
  {
    id: 'horn_cone',
    category: 'other',
    label: { es: 'Cuerno', en: 'Horn' },
    description: { es: 'Cono pequeño.', en: 'Small cone.' },
    icon: '🦄',
    shape: { kind: 'cone', diameter: 1.8, height: 3 },
  },
  {
    id: 'wing_petal',
    category: 'other',
    label: { es: 'Ala', en: 'Wing' },
    description: { es: 'Pétalo plano.', en: 'Flat petal.' },
    icon: '🕊️',
    shape: { kind: 'petal', length: 5, width: 3 },
  },
  {
    id: 'hat_cone',
    category: 'other',
    label: { es: 'Sombrero / boina', en: 'Hat / beret' },
    description: { es: 'Cono truncado.', en: 'Truncated cone.' },
    icon: '🎩',
    shape: { kind: 'truncated_cone', diameter: 6, diameterTop: 4, height: 3 },
  },
];

/** Group templates by category for easy rendering. */
export function templatesByCategory(): Record<PartCategory, PartTemplate[]> {
  const out: Record<PartCategory, PartTemplate[]> = {
    head: [],
    body: [],
    arm: [],
    leg: [],
    hand_foot: [],
    ear: [],
    face: [],
    tail: [],
    other: [],
  };
  for (const tpl of PART_TEMPLATES) {
    out[tpl.category].push(tpl);
  }
  return out;
}

/** Apply a uniform scale factor to a ShapeParams. */
export function scaleShape(shape: ShapeParams, factor: number): ShapeParams {
  return {
    ...shape,
    diameter: shape.diameter !== undefined ? round1(shape.diameter * factor) : undefined,
    diameterTop: shape.diameterTop !== undefined ? round1(shape.diameterTop * factor) : undefined,
    height: shape.height !== undefined ? round1(shape.height * factor) : undefined,
    length: shape.length !== undefined ? round1(shape.length * factor) : undefined,
    width: shape.width !== undefined ? round1(shape.width * factor) : undefined,
  };
}

/** Apply an aspect-ratio adjustment: stretch or squish vertical dimensions. */
export function applyAspect(shape: ShapeParams, aspect: number): ShapeParams {
  return {
    ...shape,
    height: shape.height !== undefined ? round1(shape.height * aspect) : undefined,
    length: shape.length !== undefined ? round1(shape.length * aspect) : undefined,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Find a template by id. */
export function findTemplate(id: string): PartTemplate | undefined {
  return PART_TEMPLATES.find((t) => t.id === id);
}
