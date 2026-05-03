/**
 * Pattern scaler.
 *
 * Two strategies for scaling:
 *
 * (A) Material swap — keep the pattern intact, change yarn weight + hook.
 *     The geometry of the result changes (bigger or smaller), but the pattern
 *     reads identical. Best for typical "make it bigger" requests.
 *
 * (B) Stitch-count multiplication — keep the materials, multiply all the
 *     stitch counts by a factor and rewrite the pattern. Useful when the
 *     user must use a specific yarn.
 */

import type { Pattern, MaterialSpec } from './types';
import { computeGauge } from './gauge';
import { generatePattern } from './generator';
import { YARN_WEIGHTS } from './yarns';

export interface ScaleByMaterialsResult {
  pattern: Pattern;
  estimatedSize: { height: number; width: number };
  estimatedYarnGrams: number;
}

/**
 * Strategy A: change the materials (yarn + hook). Returns the same pattern
 * with new materials embedded, plus the new estimated size.
 */
export function scaleByMaterials(
  pattern: Pattern,
  newMaterials: MaterialSpec,
): ScaleByMaterialsResult {
  const newPattern: Pattern = {
    ...pattern,
    materials: newMaterials,
  };
  // Re-compute estimated size
  const gauge = computeGauge(newMaterials, 'sc');
  const piece = pattern.pieces[0];
  if (!piece) {
    return {
      pattern: newPattern,
      estimatedSize: { height: 0, width: 0 },
      estimatedYarnGrams: 0,
    };
  }

  const totalHeight = piece.rounds.length * gauge.height;
  const maxStitchCount = Math.max(...piece.rounds.map((r) => r.stitchCount));
  const maxRadius = (maxStitchCount * gauge.width) / (2 * Math.PI);
  const totalStitches = piece.rounds.reduce((s, r) => s + r.stitchCount, 0);
  const grams = Math.ceil(totalStitches * (YARN_WEIGHTS[newMaterials.yarnCyc]?.gramsPerStitch ?? 0.22));

  return {
    pattern: newPattern,
    estimatedSize: {
      height: totalHeight / 10,
      width: (maxRadius * 2) / 10,
    },
    estimatedYarnGrams: grams,
  };
}

/**
 * Suggest the materials needed to reach a target size, keeping the pattern
 * intact. Searches over CYC weights and finds the closest match.
 */
export function suggestMaterialsForSize(
  pattern: Pattern,
  targetSizeCm: { height?: number; width?: number },
): MaterialSpec | null {
  const piece = pattern.pieces[0];
  if (!piece) return null;

  const maxStitchCount = Math.max(...piece.rounds.map((r) => r.stitchCount));
  const totalRounds = piece.rounds.length;

  // We want either height or width to match (or both)
  const target = targetSizeCm.height ?? targetSizeCm.width ?? 10;
  const targetMm = target * 10;

  let bestCyc = 4;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const cyc of [0, 1, 2, 3, 4, 5, 6, 7]) {
    const yarn = YARN_WEIGHTS[cyc];
    const recHook = (yarn.recommendedHookMm.min + yarn.recommendedHookMm.max) / 2;
    const materials: MaterialSpec = { yarnCyc: cyc, hookMm: recHook, tension: 1.0 };
    const gauge = computeGauge(materials, 'sc');

    const projectedHeight = totalRounds * gauge.height;
    const projectedWidth = (maxStitchCount * gauge.width) / Math.PI;

    const projected = targetSizeCm.height
      ? projectedHeight
      : projectedWidth;
    const delta = Math.abs(projected - targetMm);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestCyc = cyc;
    }
  }

  const yarn = YARN_WEIGHTS[bestCyc];
  return {
    yarnCyc: bestCyc,
    hookMm: (yarn.recommendedHookMm.min + yarn.recommendedHookMm.max) / 2,
    tension: 1.0,
  };
}

/**
 * Strategy B: scale a pattern proportionally by a uniform factor.
 *
 * This scales BOTH dimensions:
 *   - Stitch counts per round (by `factor`) → wider/narrower amigurumi
 *   - Number of rounds (by `factor`) → taller/shorter amigurumi
 *
 * The new round count list is sampled from the original profile, so the
 * shape stays proportionally identical. New stitch counts are snapped to
 * multiples of 6 when possible so the resulting pattern stays expressible
 * with balanced increase/decrease groups.
 *
 * Each new round emits a placeholder "N sc" operation. A more sophisticated
 * version could rebuild balanced increases/decreases — left for future iteration.
 */
import type { Round } from './types';

const SNAP = 6;
const MIN_COUNT = 6;

function snapToSix(n: number): number {
  if (n <= MIN_COUNT) return MIN_COUNT;
  return Math.round(n / SNAP) * SNAP;
}

export function scaleByCount(
  pattern: Pattern,
  factor: number,
): Pattern {
  if (factor <= 0) return pattern;
  const newPieces = pattern.pieces.map((piece) => {
    if (piece.rounds.length === 0) return piece;

    const origCounts = piece.rounds.map((r) => r.stitchCount);
    const origLen = origCounts.length;
    const newLen = Math.max(2, Math.round(origLen * factor));

    const newRounds: Round[] = [];
    for (let i = 0; i < newLen; i++) {
      // Sample fractional position in original sequence
      const t = (i / (newLen - 1)) * (origLen - 1);
      const lower = Math.floor(t);
      const upper = Math.min(lower + 1, origLen - 1);
      const frac = t - lower;
      // Linear interpolation, then scale by factor
      const interpolated =
        origCounts[lower] * (1 - frac) + origCounts[upper] * frac;
      const scaled = interpolated * factor;
      const snapped = snapToSix(scaled);

      // Preserve original operationKind logic
      let kind: Round['operationKind'];
      if (i === 0) kind = 'start';
      else if (snapped > newRounds[i - 1].stitchCount) kind = 'increase';
      else if (snapped < newRounds[i - 1].stitchCount) kind = 'decrease';
      else kind = 'even';

      newRounds.push({
        number: i + 1,
        operations: [{ stitch: 'sc', count: snapped }],
        stitchCount: snapped,
        modifier: null,
        operationKind: kind,
        color: piece.rounds[Math.min(lower, piece.rounds.length - 1)]?.color,
      });
    }

    return {
      ...piece,
      startingCount: newRounds[0].stitchCount,
      rounds: newRounds,
    };
  });

  return {
    ...pattern,
    metadata: {
      ...pattern.metadata,
      name: `${pattern.metadata.name} (×${factor.toFixed(2)})`,
    },
    pieces: newPieces,
  };
}

// re-export generator for convenience when scaling generates a fresh pattern
export { generatePattern };

/**
 * Strategy C — REDIMENSIONAR: change size AND change materials in one step.
 *
 * Use case: "tengo un hipopótamo de 33cm hecho con aguja 3.25mm y hilo de
 * 8 hebras. Quiero el mismo, pero de 50cm con aguja 2.25mm y hilo de 6 hebras."
 *
 * Math:
 *   Each stitch in the new gauge is `g_new` mm wide; in the old gauge it
 *   was `g_old` mm wide. To produce a piece of `target_cm` with the new
 *   gauge starting from a pattern that produced `current_cm` with the old
 *   gauge, we need:
 *
 *     stitch_factor = (target_cm / current_cm) × (g_old.width / g_new.width)
 *
 *   The first term is the size change. The second compensates for the new
 *   yarn making smaller (or bigger) stitches per unit length.
 *
 * Returns the rescaled pattern with new materials embedded.
 */
export interface RedimensionInput {
  /** Pattern as it is, in the original materials. */
  pattern: Pattern;
  /** Materials the pattern was originally crocheted with. */
  currentMaterials: MaterialSpec;
  /** Final size achieved with currentMaterials, in centimetres (height). */
  currentSizeCm: number;
  /** Materials the user will actually crochet with this time. */
  newMaterials: MaterialSpec;
  /** Final size desired in centimetres (height). */
  targetSizeCm: number;
}

export interface RedimensionResult {
  pattern: Pattern;
  /** The factor that was applied to every stitch count and round count. */
  scaleFactor: number;
  /** Breakdown of where the factor came from (for UI display). */
  breakdown: {
    sizeFactor: number;       // target / current
    gaugeFactor: number;      // gOld.width / gNew.width
    combined: number;         // sizeFactor × gaugeFactor
  };
  estimatedSize: { height: number; width: number };
  estimatedYarnGrams: number;
}

export function redimensionPattern(input: RedimensionInput): RedimensionResult {
  const { pattern, currentMaterials, currentSizeCm, newMaterials, targetSizeCm } = input;

  const gOld = computeGauge(currentMaterials, 'sc');
  const gNew = computeGauge(newMaterials, 'sc');

  const sizeFactor = targetSizeCm / Math.max(0.1, currentSizeCm);
  const gaugeFactor = gOld.width / Math.max(0.1, gNew.width);
  const combined = sizeFactor * gaugeFactor;

  // Apply the scale factor uniformly to all stitch counts AND round counts.
  // scaleByCount handles both: it interpolates over the round profile and
  // multiplies stitch counts by `factor`.
  const scaled = scaleByCount(pattern, combined);

  // Embed the new materials so the visualizer/PDF reflect them.
  const newPattern: Pattern = {
    ...scaled,
    materials: newMaterials,
    metadata: {
      ...scaled.metadata,
      name: `${pattern.metadata.name} (${currentSizeCm.toFixed(0)}→${targetSizeCm.toFixed(0)}cm)`,
    },
  };

  // Re-estimate the resulting size with the new gauge.
  const piece = newPattern.pieces[0];
  let estHeight = 0;
  let estWidth = 0;
  let totalStitches = 0;
  if (piece) {
    estHeight = piece.rounds.length * gNew.height / 10;
    const maxCount = Math.max(...piece.rounds.map((r) => r.stitchCount));
    estWidth = (maxCount * gNew.width) / Math.PI / 10;
    totalStitches = piece.rounds.reduce((s, r) => s + r.stitchCount, 0);
  }
  const grams = Math.ceil(
    totalStitches * (YARN_WEIGHTS[newMaterials.yarnCyc]?.gramsPerStitch ?? 0.22),
  );

  return {
    pattern: newPattern,
    scaleFactor: combined,
    breakdown: { sizeFactor, gaugeFactor, combined },
    estimatedSize: { height: estHeight, width: estWidth },
    estimatedYarnGrams: grams,
  };
}
