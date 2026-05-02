import { describe, it, expect } from 'vitest';
import { generatePattern } from '../../src/engine/generator';
import { geometrizePattern } from '../../src/engine/geometry';

describe('generator', () => {
  it('generates a sphere with sensible round count', () => {
    const pattern = generatePattern({ kind: 'sphere', diameter: 10 });
    expect(pattern.pieces.length).toBe(1);
    const piece = pattern.pieces[0];
    expect(piece.startingMethod).toBe('magic_ring');
    expect(piece.startingCount).toBe(6);
    expect(piece.rounds.length).toBeGreaterThan(5);
    // First round = 6
    expect(piece.rounds[0].stitchCount).toBe(6);
  });

  it('generated sphere has roughly the correct size', () => {
    const pattern = generatePattern({ kind: 'sphere', diameter: 10 });
    const geom = geometrizePattern(pattern);
    // Width should be in the 8-12 cm range (allow 20% tolerance)
    expect(geom.estimatedSize.width).toBeGreaterThan(7);
    expect(geom.estimatedSize.width).toBeLessThan(13);
  });

  it('generated sphere is actually spherical (height ≈ width)', () => {
    const pattern = generatePattern({ kind: 'sphere', diameter: 10 });
    const geom = geometrizePattern(pattern);
    const aspect = geom.estimatedSize.height / geom.estimatedSize.width;
    // True sphere has aspect = 1.0; allow 25% tolerance for stitch quantization
    expect(aspect).toBeGreaterThan(0.75);
    expect(aspect).toBeLessThan(1.25);
  });

  it('generated sphere stitch counts follow a sphere profile (peak in the middle)', () => {
    const pattern = generatePattern({ kind: 'sphere', diameter: 10 });
    const counts = pattern.pieces[0].rounds.map((r) => r.stitchCount);
    const peakIndex = counts.indexOf(Math.max(...counts));
    // Peak should be roughly in the middle of the rounds
    const middleStart = Math.floor(counts.length * 0.3);
    const middleEnd = Math.ceil(counts.length * 0.7);
    expect(peakIndex).toBeGreaterThanOrEqual(middleStart);
    expect(peakIndex).toBeLessThanOrEqual(middleEnd);
    // First and last rounds should be small
    expect(counts[0]).toBeLessThanOrEqual(12);
    expect(counts[counts.length - 1]).toBeLessThanOrEqual(12);
  });

  it('generates a cylinder with constant rounds', () => {
    const pattern = generatePattern({ kind: 'cylinder', diameter: 4, height: 8 });
    const piece = pattern.pieces[0];
    // Most rounds should be even (cylinder body)
    const evenRounds = piece.rounds.filter((r) => r.operationKind === 'even').length;
    expect(evenRounds).toBeGreaterThan(piece.rounds.length / 2);
  });

  it('generates a cone (closes at the top)', () => {
    const pattern = generatePattern({ kind: 'cone', diameter: 6 });
    const piece = pattern.pieces[0];
    // Cone tapers from a wide base to a point; last ring should be small
    const counts = piece.rounds.map((r) => r.stitchCount);
    const peak = Math.max(...counts);
    const last = counts[counts.length - 1];
    expect(last).toBeLessThanOrEqual(peak / 2);
  });

  it('produces patterns where stitch counts change at sensible rates', () => {
    const original = generatePattern({ kind: 'sphere', diameter: 8 });
    const piece = original.pieces[0];
    // Stitch counts should be valid (every round adds or removes a sane amount)
    for (let i = 1; i < piece.rounds.length; i++) {
      const prev = piece.rounds[i - 1].stitchCount;
      const curr = piece.rounds[i].stitchCount;
      const ratio = curr / prev;
      expect(ratio).toBeGreaterThanOrEqual(0.5);
      expect(ratio).toBeLessThanOrEqual(2.5);
    }
  });

  it('supports multiple shape kinds', () => {
    const shapes = ['sphere', 'cylinder', 'cone', 'pear', 'hemisphere', 'disc'] as const;
    for (const kind of shapes) {
      const pattern = generatePattern({ kind, diameter: 5, height: 5 });
      expect(pattern.pieces.length).toBe(1);
      expect(pattern.pieces[0].rounds.length).toBeGreaterThan(0);
    }
  });

  it('disc, hemisphere, teardrop close at the top (last ring is small)', () => {
    // These shapes used to leave the top open, producing a "tube" instead
    // of a closed solid. After the fix they should taper to a small last ring.
    for (const kind of ['disc', 'hemisphere', 'teardrop'] as const) {
      const pattern = generatePattern({ kind, diameter: 6, length: 6, width: 4 });
      const piece = pattern.pieces[0];
      const counts = piece.rounds.map((r) => r.stitchCount);
      const peak = Math.max(...counts);
      const last = counts[counts.length - 1];
      expect(last).toBeLessThan(peak * 0.4);
    }
  });
});
