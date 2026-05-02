import { describe, it, expect } from 'vitest';
import { computeGauge, estimateYarnGrams } from '../../src/engine/gauge';

describe('gauge calculator', () => {
  it('returns sensible defaults for worsted + 5mm hook', () => {
    const gauge = computeGauge({ yarnCyc: 4, hookMm: 5, tension: 1.0 });
    expect(gauge.width).toBeGreaterThan(4);
    expect(gauge.width).toBeLessThan(7);
    expect(gauge.height).toBeGreaterThan(4);
    expect(gauge.height).toBeLessThan(7);
  });

  it('produces larger stitches with bigger hooks', () => {
    const small = computeGauge({ yarnCyc: 4, hookMm: 4, tension: 1.0 });
    const large = computeGauge({ yarnCyc: 4, hookMm: 6, tension: 1.0 });
    expect(large.width).toBeGreaterThan(small.width);
    expect(large.height).toBeGreaterThan(small.height);
  });

  it('produces taller stitches for taller stitch types', () => {
    const sc = computeGauge({ yarnCyc: 4, hookMm: 5, tension: 1.0 }, 'sc');
    const dc = computeGauge({ yarnCyc: 4, hookMm: 5, tension: 1.0 }, 'dc');
    expect(dc.height).toBeGreaterThan(sc.height * 2);
    // Width should be the same
    expect(dc.width).toBeCloseTo(sc.width, 1);
  });

  it('respects custom-measured gauge override', () => {
    const gauge = computeGauge({
      yarnCyc: 4,
      hookMm: 5,
      tension: 1.0,
      customGauge: { width: 4, height: 4 },
    });
    expect(gauge.width).toBe(4);
    expect(gauge.height).toBe(4);
  });

  it('clamps tension to safe range', () => {
    const wayTight = computeGauge({ yarnCyc: 4, hookMm: 5, tension: 0.1 });
    const wayLoose = computeGauge({ yarnCyc: 4, hookMm: 5, tension: 10 });
    const tight = computeGauge({ yarnCyc: 4, hookMm: 5, tension: 0.85 });
    const loose = computeGauge({ yarnCyc: 4, hookMm: 5, tension: 1.15 });
    expect(wayTight.width).toBeCloseTo(tight.width, 2);
    expect(wayLoose.width).toBeCloseTo(loose.width, 2);
  });

  it('estimates yarn grams sensibly', () => {
    const grams = estimateYarnGrams(500, { yarnCyc: 4, hookMm: 5, tension: 1.0 });
    expect(grams).toBeGreaterThan(50);
    expect(grams).toBeLessThan(200);
  });
});
