import { describe, it, expect } from 'vitest';
import { parsePattern } from '../../src/engine/parser';
import { geometrizePattern } from '../../src/engine/geometry';

describe('geometry', () => {
  it('produces a stack of rings for a simple sphere', () => {
    const text = `
      HEAD
      Rnd 1: 6 sc in magic ring (6)
      Rnd 2: 6 inc (12)
      Rnd 3: (1 sc, inc) * 6 (18)
      Rnd 4: (2 sc, inc) * 6 (24)
      Rnd 5: 24 sc (24)
      Rnd 6: (2 sc, dec) * 6 (18)
      Rnd 7: (1 sc, dec) * 6 (12)
      Rnd 8: 6 dec (6)
    `;
    const pattern = parsePattern(text);
    const geom = geometrizePattern(pattern);
    expect(geom.pieces.length).toBe(1);
    const piece = geom.pieces[0];
    expect(piece.rings.length).toBe(8);

    // Radii should follow a sphere-like profile: small, big, small
    const radii = piece.rings.map((r) => r.radius);
    expect(radii[0]).toBeLessThan(radii[3]); // first ring smaller than middle
    expect(radii[7]).toBeLessThan(radii[3]); // last ring smaller than middle
    expect(radii[3]).toBe(Math.max(...radii)); // 24 stitches = max radius

    // Y positions should be monotonically increasing
    for (let i = 1; i < piece.rings.length; i++) {
      expect(piece.rings[i].yPosition).toBeGreaterThan(piece.rings[i - 1].yPosition);
    }
  });

  it('maintains constant radius for cylinder rounds', () => {
    const text = `
      ARM
      Rnd 1: 10 sc in magic ring (10)
      Rnd 2: 10 sc (10)
      Rnd 3: 10 sc (10)
      Rnd 4: 10 sc (10)
    `;
    const pattern = parsePattern(text);
    const geom = geometrizePattern(pattern);
    const radii = geom.pieces[0].rings.map((r) => r.radius);
    // All four rings should have the same radius
    expect(radii[1]).toBeCloseTo(radii[0], 4);
    expect(radii[2]).toBeCloseTo(radii[0], 4);
    expect(radii[3]).toBeCloseTo(radii[0], 4);
  });

  it('estimates an overall size in cm', () => {
    const text = `
      HEAD
      Rnd 1: 6 sc in magic ring (6)
      Rnd 2: 6 inc (12)
      Rnd 3: 12 sc (12)
    `;
    const pattern = parsePattern(text);
    const geom = geometrizePattern(pattern);
    expect(geom.estimatedSize.height).toBeGreaterThan(0);
    expect(geom.estimatedSize.width).toBeGreaterThan(0);
    // Height should be very small (just 3 rounds)
    expect(geom.estimatedSize.height).toBeLessThan(5);
  });
});
