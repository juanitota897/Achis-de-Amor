import { describe, it, expect } from 'vitest';
import { generatePattern } from '../../src/engine/generator';
import { scaleByMaterials, scaleByCount, suggestMaterialsForSize } from '../../src/engine/scaler';
import { geometrizePattern } from '../../src/engine/geometry';

describe('scaler — by materials', () => {
  it('produces a larger amigurumi when using thicker yarn', () => {
    const original = generatePattern({ kind: 'sphere', diameter: 8 });
    const originalGeom = geometrizePattern(original);

    const scaled = scaleByMaterials(original, {
      yarnCyc: 6, // super bulky
      hookMm: 10,
      tension: 1.0,
    });

    expect(scaled.estimatedSize.width).toBeGreaterThan(originalGeom.estimatedSize.width);
  });

  it('produces a smaller amigurumi with thinner yarn', () => {
    const original = generatePattern({ kind: 'sphere', diameter: 8 });
    const originalGeom = geometrizePattern(original);

    const scaled = scaleByMaterials(original, {
      yarnCyc: 1, // super fine
      hookMm: 2.5,
      tension: 1.0,
    });

    expect(scaled.estimatedSize.width).toBeLessThan(originalGeom.estimatedSize.width);
  });

  it('estimated yarn weight scales with material change', () => {
    const original = generatePattern({ kind: 'sphere', diameter: 8 });

    const thick = scaleByMaterials(original, { yarnCyc: 6, hookMm: 10, tension: 1.0 });
    const thin = scaleByMaterials(original, { yarnCyc: 1, hookMm: 2.5, tension: 1.0 });

    expect(thick.estimatedYarnGrams).toBeGreaterThan(thin.estimatedYarnGrams);
  });
});

describe('scaler — by count', () => {
  it('scales BOTH stitch counts and number of rounds proportionally', () => {
    const original = generatePattern({ kind: 'sphere', diameter: 6 });
    const scaled = scaleByCount(original, 2.0);

    const origRoundCount = original.pieces[0].rounds.length;
    const newRoundCount = scaled.pieces[0].rounds.length;

    // Number of rounds should roughly double
    expect(newRoundCount).toBeGreaterThanOrEqual(origRoundCount * 1.7);
    expect(newRoundCount).toBeLessThanOrEqual(origRoundCount * 2.3);

    // Peak stitch count should also roughly double
    const origPeak = Math.max(...original.pieces[0].rounds.map((r) => r.stitchCount));
    const newPeak = Math.max(...scaled.pieces[0].rounds.map((r) => r.stitchCount));
    expect(newPeak).toBeGreaterThanOrEqual(origPeak * 1.7);
    expect(newPeak).toBeLessThanOrEqual(origPeak * 2.3);
  });

  it('preserves aspect ratio when scaling proportionally', () => {
    const original = generatePattern({ kind: 'sphere', diameter: 8 });
    const scaled = scaleByCount(original, 1.5);
    const origGeom = geometrizePattern(original);
    const newGeom = geometrizePattern(scaled);
    const origAspect = origGeom.estimatedSize.height / origGeom.estimatedSize.width;
    const newAspect = newGeom.estimatedSize.height / newGeom.estimatedSize.width;
    expect(Math.abs(origAspect - newAspect)).toBeLessThan(0.2);
  });
});

describe('scaler — suggest materials for size', () => {
  it('suggests sensible yarn for a tiny target', () => {
    const original = generatePattern({ kind: 'sphere', diameter: 8 });
    const suggestion = suggestMaterialsForSize(original, { width: 4 });
    expect(suggestion).not.toBeNull();
    if (suggestion) {
      // Should suggest a finer yarn than the default (CYC 3)
      expect(suggestion.yarnCyc).toBeLessThanOrEqual(3);
    }
  });

  it('suggests thicker yarn for a bigger target', () => {
    const original = generatePattern({ kind: 'sphere', diameter: 8 });
    const suggestion = suggestMaterialsForSize(original, { width: 20 });
    expect(suggestion).not.toBeNull();
    if (suggestion) {
      expect(suggestion.yarnCyc).toBeGreaterThanOrEqual(4);
    }
  });
});
