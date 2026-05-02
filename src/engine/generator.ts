/**
 * Inverse pattern generator.
 *
 * Given a target shape, dimensions, and materials, produces a complete
 * Pattern with rounds written out in proper notation.
 *
 * The shapes layer (./shapes) gives us a list of stitch counts per round;
 * this module turns those counts into Round structures with Operations
 * (using balanced increase/decrease distribution).
 */

import type {
  Pattern,
  Piece,
  Round,
  Operation,
  ShapeParams,
  MaterialSpec,
  Language,
  EndCapStyle,
  ColorSpec,
} from './types';
import { buildShape, type ShapeRound, type ShapeOutput, SHAPE_LABELS } from './shapes';
import { DEFAULT_MATERIALS } from './parser';

export interface GenerateOptions {
  language: Language;
  pieceName?: string;
  materials?: MaterialSpec;
  /** Optional uniform color (hex) applied to all rounds. */
  color?: string;
}

/**
 * Generate a Pattern from shape parameters.
 */
export function generatePattern(
  params: ShapeParams,
  options: Partial<GenerateOptions> = {},
): Pattern {
  const lang = options.language ?? 'es';
  const materials = options.materials ?? DEFAULT_MATERIALS;
  const pieceName = options.pieceName ?? SHAPE_LABELS[params.kind][lang];

  const shape = buildShape(params, materials);
  const piece = buildPieceFromShape(pieceName, shape, options.color);
  const patternName = `${SHAPE_LABELS[params.kind][lang]} ${describeDimensions(params, lang)}`;

  const colors: ColorSpec[] = options.color
    ? [{ id: 'main', name: 'Main', hex: options.color }]
    : [];

  return {
    metadata: {
      name: patternName,
      sourceLanguage: lang,
      description: lang === 'es'
        ? `Patrón generado automáticamente para ${SHAPE_LABELS[params.kind][lang].toLowerCase()}.`
        : `Auto-generated pattern for ${SHAPE_LABELS[params.kind][lang].toLowerCase()}.`,
    },
    pieces: [piece],
    assembly: [],
    materials,
    colors,
    errors: [],
    sourceText: '',
  };
}

function describeDimensions(p: ShapeParams, lang: Language): string {
  const parts: string[] = [];
  if (p.diameter) parts.push(`Ø ${p.diameter}cm`);
  if (p.height) parts.push(`${lang === 'es' ? 'altura' : 'height'} ${p.height}cm`);
  if (p.length) parts.push(`${lang === 'es' ? 'largo' : 'length'} ${p.length}cm`);
  if (p.width) parts.push(`${lang === 'es' ? 'ancho' : 'width'} ${p.width}cm`);
  return parts.join(', ');
}

/**
 * Convert shape rounds (just stitch counts and kinds) into a full Piece
 * with Operations written out in balanced fashion.
 */
function buildPieceFromShape(name: string, shape: ShapeOutput, color?: string): Piece {
  const shapeRounds = shape.rings;
  if (shapeRounds.length === 0) {
    throw new Error('Shape produced no rounds');
  }

  const rounds: Round[] = [];
  const start = shapeRounds[0];
  const startingCount = start.stitchCount;
  const startingMethod = start.note?.includes('foundation chain')
    ? 'foundation_chain'
    : 'magic_ring';
  const colorRef = color ? 'main' : undefined;

  rounds.push({
    number: 1,
    operations: [{ stitch: 'sc', count: startingCount }],
    stitchCount: startingCount,
    modifier: null,
    operationKind: 'start',
    color: colorRef,
  });

  let prevCount = startingCount;
  for (let i = 1; i < shapeRounds.length; i++) {
    const r = shapeRounds[i];
    const ops = buildBalancedOperations(prevCount, r.stitchCount, r.kind);
    rounds.push({
      number: i + 1,
      operations: ops,
      stitchCount: r.stitchCount,
      modifier: null,
      operationKind: r.kind === 'start' ? 'even' : r.kind,
      color: colorRef,
    });
    prevCount = r.stitchCount;
  }

  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40),
    name,
    startingMethod,
    startingCount,
    rounds,
    count: 1,
    startCap: shape.startCap,
    endCap: shape.endCap,
  };
}

/**
 * Build a sequence of operations that takes `prevCount` stitches and
 * produces `newCount` stitches, distributing increases/decreases evenly.
 *
 * Examples:
 *   prev=6, new=12, increase  → 6 inc                    → "(inc) x 6"
 *   prev=12, new=18, increase → (1 sc, inc) x 6          → 6 sections of [1 sc, inc]
 *   prev=18, new=24, increase → (2 sc, inc) x 6
 *   prev=24, new=18, decrease → (2 sc, dec) x 6
 *   prev=24, new=24, even     → 24 sc
 */
function buildBalancedOperations(
  prevCount: number,
  newCount: number,
  kind: ShapeRound['kind'],
): Operation[] {
  if (kind === 'even' || prevCount === newCount) {
    return [{ stitch: 'sc', count: newCount }];
  }

  if (kind === 'increase') {
    const incs = newCount - prevCount;
    if (incs <= 0) return [{ stitch: 'sc', count: newCount }];
    if (incs === prevCount) {
      // Every stitch is an increase, e.g. 6 → 12: "(inc) x 6"
      return [{ stitch: 'inc', count: incs }];
    }
    // sections = number of repeated groups = number of increases
    const sections = incs;
    const stitchesPerSection = Math.floor(prevCount / sections);
    const remainder = prevCount % sections;

    if (remainder === 0) {
      // Perfectly even: e.g. (3 sc, inc) x 6
      return [
        {
          stitch: 'sc',
          count: sections,
          group: [
            { stitch: 'sc', count: stitchesPerSection },
            { stitch: 'inc', count: 1 },
          ],
        },
      ];
    } else {
      // Unevenly distributed: pad start and end to keep symmetry.
      // E.g. for 36→48 (12 incs in 36): 3 sc per section, 0 remainder = (2 sc, inc) x 12
      // For asymmetric: 2 sc, inc, (4 sc, inc) x 5, 2 sc — split remainder evenly at edges.
      const padFront = Math.floor(remainder / 2);
      const padBack = remainder - padFront;
      const ops: Operation[] = [];
      if (padFront > 0) ops.push({ stitch: 'sc', count: padFront });
      ops.push({ stitch: 'inc', count: 1 });
      ops.push({
        stitch: 'sc',
        count: sections - 1,
        group: [
          { stitch: 'sc', count: stitchesPerSection },
          { stitch: 'inc', count: 1 },
        ],
      });
      if (padBack > 0) ops.push({ stitch: 'sc', count: padBack });
      return ops;
    }
  }

  if (kind === 'decrease') {
    const decs = prevCount - newCount;
    if (decs <= 0) return [{ stitch: 'sc', count: newCount }];
    const sections = decs;
    const stitchesPerSection = Math.floor((prevCount - decs * 2) / sections);
    const remainder = (prevCount - decs * 2) % sections;

    if (stitchesPerSection < 0) {
      // Cannot distribute — just decrease everything
      return [{ stitch: 'dec', count: decs }];
    }

    if (remainder === 0) {
      if (stitchesPerSection === 0) {
        return [{ stitch: 'dec', count: sections }];
      }
      return [
        {
          stitch: 'sc',
          count: sections,
          group: [
            { stitch: 'sc', count: stitchesPerSection },
            { stitch: 'dec', count: 1 },
          ],
        },
      ];
    } else {
      const padFront = Math.floor(remainder / 2);
      const padBack = remainder - padFront;
      const ops: Operation[] = [];
      if (padFront > 0) ops.push({ stitch: 'sc', count: padFront });
      ops.push({ stitch: 'dec', count: 1 });
      if (sections > 1) {
        ops.push({
          stitch: 'sc',
          count: sections - 1,
          group: [
            { stitch: 'sc', count: stitchesPerSection },
            { stitch: 'dec', count: 1 },
          ],
        });
      }
      if (padBack > 0) ops.push({ stitch: 'sc', count: padBack });
      return ops;
    }
  }

  return [{ stitch: 'sc', count: newCount }];
}
