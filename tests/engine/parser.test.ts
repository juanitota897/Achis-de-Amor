import { describe, it, expect } from 'vitest';
import { parsePattern } from '../../src/engine/parser';

describe('parser — basic patterns', () => {
  it('parses a simple sphere pattern in English', () => {
    const text = `
      Test Sphere

      HEAD
      Rnd 1: 6 sc in magic ring (6)
      Rnd 2: 6 inc (12)
      Rnd 3: (1 sc, inc) * 6 (18)
      Rnd 4: (2 sc, inc) * 6 (24)
      Rnd 5-8: 24 sc (24)
      Rnd 9: (2 sc, dec) * 6 (18)
      Rnd 10: (1 sc, dec) * 6 (12)
      Rnd 11: 6 dec (6)
    `;
    const pattern = parsePattern(text);
    expect(pattern.pieces.length).toBe(1);
    const piece = pattern.pieces[0];
    expect(piece.startingMethod).toBe('magic_ring');
    expect(piece.startingCount).toBe(6);
    expect(piece.rounds.length).toBe(11); // 5-8 expands to 4 rounds
    expect(piece.rounds[0].stitchCount).toBe(6);
    expect(piece.rounds[1].stitchCount).toBe(12);
    expect(piece.rounds[2].stitchCount).toBe(18);
    expect(piece.rounds[3].stitchCount).toBe(24);
    expect(piece.rounds[4].stitchCount).toBe(24); // first of 5-8 range
    expect(piece.rounds[7].stitchCount).toBe(24); // last of 5-8 range
    expect(piece.rounds[8].stitchCount).toBe(18);
    expect(piece.rounds[10].stitchCount).toBe(6);
  });

  it('parses a Spanish pattern', () => {
    const text = `
      Esfera de prueba

      CABEZA
      V1: 6 pb en AM (6)
      V2: 6 aum (12)
      V3: (1 pb, aum) x 6 (18)
      V4: (2 pb, aum) x 6 (24)
      V5: 24 pb (24)
      V6: (2 pb, dism) x 6 (18)
    `;
    const pattern = parsePattern(text);
    expect(pattern.metadata.sourceLanguage).toBe('es');
    expect(pattern.pieces.length).toBe(1);
    const piece = pattern.pieces[0];
    expect(piece.rounds.length).toBe(6);
    expect(piece.rounds[0].stitchCount).toBe(6);
    expect(piece.rounds[1].stitchCount).toBe(12);
    expect(piece.rounds[5].stitchCount).toBe(18);
  });

  it('detects multiple pieces by header', () => {
    const text = `
      Test multipart

      HEAD
      Rnd 1: 6 sc in magic ring (6)
      Rnd 2: 6 inc (12)

      EARS (make 2)
      Rnd 1: 6 sc in magic ring (6)
      Rnd 2: 6 sc (6)

      BODY
      Rnd 1: 6 sc in magic ring (6)
      Rnd 2: 6 inc (12)
      Rnd 3: (1 sc, inc) * 6 (18)
    `;
    const pattern = parsePattern(text);
    expect(pattern.pieces.length).toBe(3);
    expect(pattern.pieces[0].name.toLowerCase()).toBe('head');
    expect(pattern.pieces[1].name.toLowerCase()).toBe('ears');
    expect(pattern.pieces[1].count).toBe(2);
    expect(pattern.pieces[2].name.toLowerCase()).toBe('body');
  });

  it('handles different round number syntaxes — "X)" form', () => {
    const text = `
      Test variant
      HEAD
      1) 6 sc in magic ring (6)
      2) 6 inc. (12)
      3) (1 sc, inc) * 6. (18)
      4) 18 sc. (18)
    `;
    const pattern = parsePattern(text);
    const piece = pattern.pieces[0];
    expect(piece.rounds.length).toBe(4);
    expect(piece.rounds[0].stitchCount).toBe(6);
    expect(piece.rounds[1].stitchCount).toBe(12);
    expect(piece.rounds[2].stitchCount).toBe(18);
    expect(piece.rounds[3].stitchCount).toBe(18);
  });

  it('handles bracket-style notation [...]', () => {
    const text = `
      HEAD
      Rnd 1: 6 sc in magic ring [6]
      Rnd 2: [2 sc in next st] 6 times [12]
      Rnd 3: [1 sc, 2 sc in next st] 6 times [18]
    `;
    const pattern = parsePattern(text);
    const piece = pattern.pieces[0];
    expect(piece.rounds[0].stitchCount).toBe(6);
    expect(piece.rounds[1].stitchCount).toBe(12);
    expect(piece.rounds[2].stitchCount).toBe(18);
  });

  it('handles asymmetric increases', () => {
    // From real Capybara pattern
    const text = `
      HEAD
      Rnd 1: 8 sc in magic ring [8]
      Rnd 2: (inc) * 8 times [16]
      Rnd 3: (1 sc, inc) * 8 times [24]
      Rnd 4: (3 sc, inc) * 6 times [30]
      Rnd 5: 2 sc, inc, (4 sc, inc) * 5 times, 2 sc [36]
    `;
    const pattern = parsePattern(text);
    const piece = pattern.pieces[0];
    expect(piece.rounds[0].stitchCount).toBe(8);
    expect(piece.rounds[1].stitchCount).toBe(16);
    expect(piece.rounds[2].stitchCount).toBe(24);
    expect(piece.rounds[3].stitchCount).toBe(30);
    expect(piece.rounds[4].stitchCount).toBe(36);
  });

  it('detects BLO modifier', () => {
    const text = `
      HEAD
      Rnd 1: 6 sc in magic ring (6)
      Rnd 2: BLO: 6 inc (12)
    `;
    const pattern = parsePattern(text);
    expect(pattern.pieces[0].rounds[1].modifier).toBe('BLO');
  });

  it('expands range with prefix repeated on second number (V5-V8)', () => {
    const text = `
      CABEZA
      V1: 6 pb en AM (6)
      V2: 6 aum (12)
      V3-V6: 12 pb (12)
      V7: 6 dism (6)
    `;
    const pattern = parsePattern(text);
    const piece = pattern.pieces[0];
    // Should expand to 7 rounds total: V1, V2, V3, V4, V5, V6, V7
    expect(piece.rounds.length).toBe(7);
    expect(piece.rounds[0].stitchCount).toBe(6);
    expect(piece.rounds[1].stitchCount).toBe(12);
    expect(piece.rounds[2].stitchCount).toBe(12);
    expect(piece.rounds[3].stitchCount).toBe(12);
    expect(piece.rounds[4].stitchCount).toBe(12);
    expect(piece.rounds[5].stitchCount).toBe(12);
    expect(piece.rounds[6].stitchCount).toBe(6);
  });

  it('splits rounds concatenated on the same line (C03... C04...)', () => {
    // Real bug from the Dudu (Brazilian) pattern: two rounds smushed on one line.
    const text = `
      CORPO
      C01. 6 pb en AM (6)
      C02. 6 aum (12)
      C03. 1 pb, 1 aum, 3 pb, (1 pb, 1 aum) x 5, 5 pb, 1 aum C04. 2 aum, 5 pb, (2 pb, 1 aum) x 4, 7 pb, 2 aum (36)
      C05. 36 pb (36)
    `;
    const pattern = parsePattern(text);
    const piece = pattern.pieces[0];
    // Should detect 5 distinct rounds (C01..C05), not 4
    const roundNumbers = piece.rounds.map((r) => r.number);
    expect(roundNumbers).toEqual([1, 2, 3, 4, 5]);
    // C04 declared as (36) → effectiveCount must be 36
    expect(piece.rounds[3].stitchCount).toBe(36);
    expect(piece.rounds[4].stitchCount).toBe(36);
  });

  it('reattaches orphan count column from PDF two-column layout', () => {
    // Real bug from Dudu's Cabelo (hair) pattern: PDF column layout extracts
    // rounds C03..C12 on one line and their declared counts as separate
    // (N) lines below. The (18) at the end of the joined line actually
    // belongs to C03, not C12.
    const text = `
      CABEÇA
      C01. 6 pb no anel mágico (6)
      C02. 6 aum (12)
      C03. (1 pb, 1 aum) x 6 C04. (2 pb, 1 aum) x 6 C05. (3 pb, 1 aum) x 6 C06. (4 pb, 1 aum) x 6 (18)
      (24)
      (30)
      (36)
    `;
    const pattern = parsePattern(text);
    const counts = pattern.pieces[0].rounds.map((r) => r.stitchCount);
    expect(counts).toEqual([6, 12, 18, 24, 30, 36]);
    // No validation errors — counts must be coherent.
    expect(pattern.errors.filter((e) => e.severity === 'error')).toEqual([]);
  });

  it('classifies operation kinds correctly', () => {
    const text = `
      HEAD
      Rnd 1: 6 sc in magic ring (6)
      Rnd 2: 6 inc (12)
      Rnd 3: 12 sc (12)
      Rnd 4: 6 dec (6)
    `;
    const pattern = parsePattern(text);
    const rounds = pattern.pieces[0].rounds;
    expect(rounds[0].operationKind).toBe('start');
    expect(rounds[1].operationKind).toBe('increase');
    expect(rounds[2].operationKind).toBe('even');
    expect(rounds[3].operationKind).toBe('decrease');
  });
});
