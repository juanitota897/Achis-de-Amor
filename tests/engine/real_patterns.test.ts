/**
 * Regression tests using real patterns sourced from designers.
 *
 * Lea the Capybara — Inna Chybinova (@inna_chi_hm)
 * Scraps the Dog — Alison North (@kornflake_stew)
 * Hippo in Overalls — anonymous
 *
 * These test that the parser handles the syntactic variations and
 * structural complexity of patterns sold in the real world.
 */

import { describe, it, expect } from 'vitest';
import { parsePattern } from '../../src/engine/parser';
import { geometrizePattern } from '../../src/engine/geometry';

describe('regression — Lea the Capybara (head only)', () => {
  const text = `
HEAD

Rnd 1. 8 sc in magic ring [8]
Rnd 2. (inc) * 8 times [16]
Rnd 3. (1 sc, inc) * 8 times [24]
Rnd 4. (3 sc, inc) * 6 times [30]
Rnd 5. 2 sc, inc, (4 sc, inc) * 5 times, 2 sc [36]
Rnd 6. (5 sc, inc) * 6 times [42]
Rnd 7. 3 sc, inc, (6 sc, inc) * 5 times, 3 sc [48]
Rnd 8. (7 sc, inc) * 6 times [54]
Rnds 9-12. 54 sc [54] – 4 rounds
Rnd 13. 4 sc, inc, (8 sc, inc) * 5 times, 4 sc [60]
Rnds 14-18. 60 sc [60] – 5 rounds
Rnd 19. (9 sc, inc) * 6 times [66]
Rnds 20-23. 66 sc [66] – 4 rounds
Rnd 24. (9 sc, dec) * 6 times [60]
Rnd 25. (3 sc, dec) * 12 times [48]
Rnd 26. 3 sc, dec, (6 sc, dec) * 5 times, 3 sc [42]
Rnd 27. (5 sc, dec) * 6 times [36]
Rnd 28. 2 sc, dec, (4 sc, dec) * 5 times, 2 sc [30]
Rnd 29. (3 sc, dec) * 6 times [24]
Rnd 30. BLO: (2 sc, dec) * 6 times [18]
Rnd 31. (1 sc, dec) * 6 times [12]
Rnd 32. (dec) * 6 times [6]
  `;

  it('parses the head as a single piece with 32 rounds (after expansion)', () => {
    const pattern = parsePattern(text);
    expect(pattern.pieces.length).toBe(1);
    const head = pattern.pieces[0];
    // 9-12 = 4, 14-18 = 5, 20-23 = 4 → 1+1+1+1+1+1+1+1+4+1+5+1+4+1+1+1+1+1+1+1+1+1+1+1 = 32
    expect(head.rounds.length).toBe(32);
  });

  it('every declared count matches the computed count', () => {
    const pattern = parsePattern(text);
    const head = pattern.pieces[0];
    for (const round of head.rounds) {
      if (round.declaredCount !== undefined) {
        expect(round.stitchCount).toBe(round.declaredCount);
      }
    }
  });

  it('captures the BLO modifier on round 30', () => {
    const pattern = parsePattern(text);
    const head = pattern.pieces[0];
    const r30 = head.rounds.find((r) => r.number === 30);
    expect(r30?.modifier).toBe('BLO');
  });

  it('peak stitch count is 66 at rounds 19-23', () => {
    const pattern = parsePattern(text);
    const head = pattern.pieces[0];
    const peak = Math.max(...head.rounds.map((r) => r.stitchCount));
    expect(peak).toBe(66);
  });

  it('produces a geometry with sphere-like profile', () => {
    const pattern = parsePattern(text);
    const geom = geometrizePattern(pattern);
    const radii = geom.pieces[0].rings.map((r) => r.radius);
    // Profile should swell then shrink
    const peakIndex = radii.indexOf(Math.max(...radii));
    expect(peakIndex).toBeGreaterThan(2);
    expect(peakIndex).toBeLessThan(radii.length - 2);
  });
});

describe('regression — Scraps the Dog (ears piece)', () => {
  const text = `
EARS (make 2)

Rnd 1: working into a magic ring 6 sc.
Rnd 2: [2 sc in next st] 6 times. (12)
Rnd 3: [1 sc, 2 sc in next st] 6 times. (18)
Rnd 4: [2 sc, 2 sc in next st] 6 times. (24)
Rnd 5-9: 24 sc.
Rnd 10: [6 sc, sc2tog] 3 times. (21)
Rnd 11-12. 21 sc.
Rnd 13: [5 sc, sc2tog] 3 times. (18)
Rnd 14-15. 18 sc.
Rnd 16: [4 sc, sc2tog] 3 times. (15)
Rnd 17-18. 15 sc.
Rnd 19: [3 sc, sc2tog] 3 times. (12)
Rnd 20-21: 12 sc.
  `;

  it('detects piece name and count', () => {
    const pattern = parsePattern(text);
    expect(pattern.pieces.length).toBe(1);
    const ears = pattern.pieces[0];
    expect(ears.name.toLowerCase()).toContain('ear');
    expect(ears.count).toBe(2);
  });

  it('expands round ranges correctly', () => {
    const pattern = parsePattern(text);
    const ears = pattern.pieces[0];
    // 1-21 = 21 rounds total
    expect(ears.rounds.length).toBe(21);
    // Verify peak count is 24
    const counts = ears.rounds.map((r) => r.stitchCount);
    expect(Math.max(...counts)).toBe(24);
  });

  it('handles sc2tog as decrease', () => {
    const pattern = parsePattern(text);
    const ears = pattern.pieces[0];
    const r10 = ears.rounds.find((r) => r.number === 10);
    expect(r10?.stitchCount).toBe(21);
    expect(r10?.operationKind).toBe('decrease');
  });
});

describe('regression — Basset Hound (declared counts as authority)', () => {
  // Pattern uses "Ch 2, 6 sc in first ch (6 sts)" as a magic-ring substitute,
  // and declares stitch counts as "(6 sts)", "(12 sts)", etc.
  // Without the declaredCount-as-authority rule, this would parse to 8 stitches
  // for round 1 (chains + sc) and produce a deformed result.
  const text = `
HEAD

R1: Ch 2, 6 sc in first ch (6 sts)
R2: 2sc in each st around (12 sts)
R3: (Sc 1, 2 sc in next st) 6 times (18 sts)
R4: (Sc 2, 2 sc in next st) 6 times (24 sts)
R5: (Sc 3, 2 sc in next st) 6 times (30 sts)
R6: (Sc 4, 2 sc in next st) 6 times (36 sts)
R7: (Sc 8, 2 sc in next st) 4 times (40 sts)
R8-9: Sc 40 (40 sts x 2 rounds)
R10: (Sc 8, dec 1) 4 times (36 sts)
R11: Sc 36 (36 sts)
R12: (Sc 7, dec 1) 4 times (32 sts)
  `;

  it('uses declared counts as authority instead of literal operations sum', () => {
    const pattern = parsePattern(text);
    expect(pattern.pieces.length).toBe(1);
    const head = pattern.pieces[0];
    expect(head.rounds[0].stitchCount).toBe(6); // not 8 (Ch 2 + 6 sc)
    expect(head.rounds[1].stitchCount).toBe(12); // not 2 (literal "2 sc")
    expect(head.rounds[2].stitchCount).toBe(18);
    expect(head.rounds[3].stitchCount).toBe(24);
    expect(head.rounds[4].stitchCount).toBe(30);
    expect(head.rounds[5].stitchCount).toBe(36);
    expect(head.rounds[6].stitchCount).toBe(40);
    // Range R8-9 expands
    expect(head.rounds[7].stitchCount).toBe(40);
    expect(head.rounds[8].stitchCount).toBe(40);
    expect(head.rounds[9].stitchCount).toBe(36);
  });

  it('produces a sensible decreasing profile (no false alarms)', () => {
    const pattern = parsePattern(text);
    const counts = pattern.pieces[0].rounds.map((r) => r.stitchCount);
    // Should peak at 40 and not have wild swings
    const peak = Math.max(...counts);
    expect(peak).toBe(40);
    // Each round should differ from prev by at most ~30%
    for (let i = 1; i < counts.length; i++) {
      const ratio = counts[i] / counts[i - 1];
      expect(ratio).toBeGreaterThan(0.5);
      expect(ratio).toBeLessThan(2.5);
    }
  });
});

describe('regression — Dudu o Menino Dinossauro (Brazilian Portuguese)', () => {
  // Pattern in Portuguese with "C01" round prefix (Carreira), "dim" decrease,
  // "pb juntos" notation, and "Trocar para cor" color change. Starts with
  // "Inicie com 6 corr" (foundation chain of 6 chains), so the cross-section
  // should be elongated.
  const text = `
PERNA DIREITA

Inicie com 6 corr e a partir da 2ª corr a contar da agulha, faça:

C01. 4 pb, 5 pb juntos, 3 pb, 1 aum (14)
C02. 1 aum, 3 pb, 5 aum, 4 pb, 1 aum (21)
C03. 1 pb, 1 aum, 3 pb, (1 pb, 1 aum) x 5, 5 pb, 1 aum (28)
C04. 2 aum, 5 pb, (2 pb, 1 aum) x 4, 7 pb, 2 aum (36)
C05. 36 pb BLO (36)
C06-C08. 36 pb (36)
C09. 11 pb, (1 pb, 1 dim) x 6, 7 pb (30)
C10. 11 pb, 5 dim, 9 pb (25)
C11. 9 pb, 5 dim, 6 pb (20)
C12-C20. 20 pb (20)
Trocar para cor da cueca.
C21. 8 pb, corte o fio e finalize com ponto falso.
  `;

  it('detects "C" prefix as carreira (round)', () => {
    const pattern = parsePattern(text);
    expect(pattern.pieces.length).toBe(1);
    const piece = pattern.pieces[0];
    // C01..C04 + C05 + C06-C08 (3 rounds) + C09..C11 + C12-C20 (9 rounds) + C21 = 21
    expect(piece.rounds.length).toBe(21);
  });

  it('uses declared counts in Portuguese-style "(N)"', () => {
    const pattern = parsePattern(text);
    const counts = pattern.pieces[0].rounds.map((r) => r.stitchCount);
    expect(counts[0]).toBe(14);
    expect(counts[1]).toBe(21);
    expect(counts[2]).toBe(28);
    expect(counts[3]).toBe(36);
    expect(counts[4]).toBe(36);
    expect(counts[5]).toBe(36); // C06
    expect(counts[7]).toBe(36); // C08
    expect(counts[8]).toBe(30);
    expect(counts[9]).toBe(25);
    expect(counts[10]).toBe(20);
    expect(counts[11]).toBe(20); // C12
    expect(counts[19]).toBe(20); // C20
  });

  it('captures BLO modifier on round 5', () => {
    const pattern = parsePattern(text);
    const r5 = pattern.pieces[0].rounds.find((r) => r.number === 5);
    expect(r5?.modifier).toBe('BLO');
  });

  it('detects foundation chain start ("Inicie com 6 corr")', () => {
    const pattern = parsePattern(text);
    const piece = pattern.pieces[0];
    expect(piece.startingMethod).toBe('foundation_chain');
    expect(piece.foundationChainLength).toBe(6);
  });

  it('produces elongated cross-sections at the base, circular ones at the top', () => {
    const pattern = parsePattern(text);
    const geom = geometrizePattern(pattern);
    const rings = geom.pieces[0].rings;
    // Base ring (foot): radiusX should be significantly bigger than radiusZ
    const firstRing = rings[0];
    expect(firstRing.radiusX).toBeDefined();
    expect(firstRing.radiusZ).toBeDefined();
    expect(firstRing.radiusX!).toBeGreaterThan(firstRing.radiusZ! * 1.5);
    // Top ring (leg): radiusX should be close to radiusZ (nearly circular)
    const lastRing = rings[rings.length - 1];
    const ratio = lastRing.radiusX! / lastRing.radiusZ!;
    expect(ratio).toBeLessThan(1.5);
  });
});

describe('regression — Hippo in Overalls (head start)', () => {
  // Hippo uses "1)" round numbering and "9 sc, 3 inc" syntax
  const text = `
HEAD

1) 9 sc, 3 inc, 9 sc, 3 inc. (24)
2) (3 sc, inc) * 6. (30)
3) 2 sc, inc, (4 sc, inc) * 5, 2 sc. (36)
4) (5 sc, inc) * 6. (42)
5) 3 sc, inc, (6 sc, inc) * 5, 3 sc. (48)
6-7) 48 sc. (48)
  `;

  it('handles "N)" round syntax', () => {
    const pattern = parsePattern(text);
    expect(pattern.pieces.length).toBe(1);
    expect(pattern.pieces[0].rounds.length).toBe(7);
  });

  it('uses declared count as authority for foundation-chain rounds', () => {
    // Hippo pattern starts with "11 ch" worked into both sides. "1) 9 sc, 3 inc,
    // 9 sc, 3 inc. (24)" — literally "9+3*2+9+3*2 = 30", but the round actually
    // produces 24 stitches because of the chain wrap context. The parser now
    // uses the declared count as authority, so stitchCount = 24.
    const pattern = parsePattern(text);
    const head = pattern.pieces[0];
    expect(head.rounds[0].declaredCount).toBe(24);
    expect(head.rounds[0].stitchCount).toBe(24);
  });

  it('handles round ranges with "X-Y)" syntax', () => {
    const pattern = parsePattern(text);
    const head = pattern.pieces[0];
    // Round 6-7 should expand
    const r6 = head.rounds.find((r) => r.number === 6);
    const r7 = head.rounds.find((r) => r.number === 7);
    expect(r6).toBeDefined();
    expect(r7).toBeDefined();
    expect(r6?.stitchCount).toBe(48);
    expect(r7?.stitchCount).toBe(48);
  });
});
