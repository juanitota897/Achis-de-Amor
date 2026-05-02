/**
 * Gauge calculator.
 *
 * Combines yarn weight, hook size, stitch type, and tension into a real
 * stitch dimension (width and height in mm). This is the bridge between
 * abstract pattern and physical reality.
 */

import type { MaterialSpec, StitchType } from './types';
import { STITCHES } from './stitches';
import { getYarn } from './yarns';

export interface Gauge {
  /** Width of one stitch in mm. */
  width: number;
  /** Height of one stitch in mm (depends on stitch type). */
  height: number;
}

/**
 * Compute the gauge for a given material setup and stitch type.
 *
 * Formula:
 *   1. Start with the yarn's default sc dimensions.
 *   2. Adjust by hook size relative to yarn's recommended hook (linear).
 *   3. Multiply height by the stitch type multiplier (sc=1, hdc=1.7, dc=2.5).
 *   4. Apply tension factor (tight=0.85, normal=1.0, loose=1.15).
 *   5. Apply user-measured custom gauge as override if provided.
 */
export function computeGauge(
  materials: MaterialSpec,
  stitchType: StitchType = 'sc',
): Gauge {
  // If user provided a custom-measured gauge, use it directly for sc.
  // For other stitches, scale by the height multiplier.
  if (materials.customGauge) {
    const stitch = STITCHES[stitchType];
    return {
      width: materials.customGauge.width,
      height: materials.customGauge.height * stitch.heightMultiplier,
    };
  }

  const yarn = getYarn(materials.yarnCyc);
  const stitch = STITCHES[stitchType];

  // Hook size factor: how does the chosen hook compare to the recommended midpoint?
  const recommendedMid = (yarn.recommendedHookMm.min + yarn.recommendedHookMm.max) / 2;
  const hookFactor = materials.hookMm / recommendedMid;

  // Tension: clamp to [0.85, 1.15]
  const tension = Math.max(0.85, Math.min(1.15, materials.tension));

  return {
    width: yarn.defaultStitchWidth * hookFactor * tension,
    height: yarn.defaultStitchHeight * hookFactor * tension * stitch.heightMultiplier,
  };
}

/**
 * Estimate the yarn weight (in grams) needed for a given total stitch count.
 */
export function estimateYarnGrams(totalStitches: number, materials: MaterialSpec): number {
  const yarn = getYarn(materials.yarnCyc);
  return Math.ceil(totalStitches * yarn.gramsPerStitch);
}
