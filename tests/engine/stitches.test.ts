import { describe, it, expect } from 'vitest';
import { resolveStitch, STITCHES, getAllStitchAliases } from '../../src/engine/stitches';

describe('stitch resolver', () => {
  it('resolves English abbreviations', () => {
    expect(resolveStitch('sc')).toBe('sc');
    expect(resolveStitch('hdc')).toBe('hdc');
    expect(resolveStitch('dc')).toBe('dc');
    expect(resolveStitch('tr')).toBe('tr');
    expect(resolveStitch('ch')).toBe('ch');
    expect(resolveStitch('inc')).toBe('inc');
    expect(resolveStitch('dec')).toBe('dec');
    expect(resolveStitch('sl st')).toBe('sl_st');
    expect(resolveStitch('slst')).toBe('sl_st');
    expect(resolveStitch('sc2tog')).toBe('dec');
  });

  it('resolves Spanish abbreviations', () => {
    expect(resolveStitch('pb')).toBe('sc');
    expect(resolveStitch('pa')).toBe('dc');
    expect(resolveStitch('mp')).toBe('hdc');
    expect(resolveStitch('aum')).toBe('inc');
    expect(resolveStitch('dism')).toBe('dec');
    expect(resolveStitch('cad')).toBe('ch');
    expect(resolveStitch('pr')).toBe('sl_st');
  });

  it('resolves full English names', () => {
    expect(resolveStitch('single crochet')).toBe('sc');
    expect(resolveStitch('Single Crochet')).toBe('sc');
    expect(resolveStitch('SINGLE CROCHET')).toBe('sc');
    expect(resolveStitch('chain')).toBe('ch');
    expect(resolveStitch('increase')).toBe('inc');
    expect(resolveStitch('decrease')).toBe('dec');
  });

  it('resolves full Spanish names', () => {
    expect(resolveStitch('punto bajo')).toBe('sc');
    expect(resolveStitch('aumento')).toBe('inc');
    expect(resolveStitch('disminución')).toBe('dec');
    expect(resolveStitch('disminucion')).toBe('dec');
    expect(resolveStitch('cadena')).toBe('ch');
  });

  it('returns null for unknown tokens', () => {
    expect(resolveStitch('xyz')).toBeNull();
    expect(resolveStitch('round')).toBeNull();
  });

  it('exposes count deltas correctly', () => {
    expect(STITCHES.sc.countDelta).toBe(1);
    expect(STITCHES.inc.countDelta).toBe(2);
    expect(STITCHES.dec.countDelta).toBe(1);
  });

  it('lists aliases sorted by length descending', () => {
    const aliases = getAllStitchAliases();
    expect(aliases.length).toBeGreaterThan(20);
    // Longer aliases should come first (for greedy matching)
    expect(aliases[0].length).toBeGreaterThanOrEqual(aliases[aliases.length - 1].length);
  });
});
