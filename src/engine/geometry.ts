/**
 * Geometrizer.
 *
 * Converts a parsed Pattern + materials into 3D geometry by treating
 * each round as a horizontal ring. The radius of each ring is derived
 * from its stitch count and the gauge (stitch width). Heights stack.
 *
 * The result is a Geometry object that can be rendered directly with
 * Three.js (each Ring becomes a circle of stitch_count vertices, and
 * adjacent rings form the lateral surface of the amigurumi).
 */

import type {
  Pattern,
  Geometry,
  PieceGeometry,
  Ring,
  Piece,
  Round,
  MaterialSpec,
  ColorSpec,
  EndCapStyle,
} from './types';
import { computeGauge, estimateYarnGrams } from './gauge';

const DEFAULT_RING_COLOR = '#D6A77A';

/** Map of color name → hex (extend as needed). */
const COLOR_NAME_TO_HEX: Record<string, string> = {
  white: '#F8F4EC',
  cream: '#F0E5CF',
  beige: '#E5D2B0',
  brown: '#7A5236',
  black: '#1F1A17',
  gray: '#A8A39C',
  grey: '#A8A39C',
  pink: '#F2C0C8',
  red: '#C44A40',
  orange: '#E08D52',
  yellow: '#F2D479',
  green: '#8AA572',
  blue: '#7A9CB8',
  navy: '#324A6B',
  purple: '#9C7BAC',
  // Spanish
  blanco: '#F8F4EC',
  crema: '#F0E5CF',
  marrón: '#7A5236',
  marron: '#7A5236',
  negro: '#1F1A17',
  gris: '#A8A39C',
  rosa: '#F2C0C8',
  rojo: '#C44A40',
  naranja: '#E08D52',
  amarillo: '#F2D479',
  verde: '#8AA572',
  azul: '#7A9CB8',
  morado: '#9C7BAC',
};

function colorToHex(name: string | undefined, palette: ColorSpec[] = []): string {
  if (!name) return DEFAULT_RING_COLOR;
  if (name.startsWith('#')) return name;
  // Try the pattern's own palette (e.g. "main" → user-picked color)
  const fromPalette = palette.find((c) => c.id === name || c.name.toLowerCase() === name.toLowerCase());
  if (fromPalette) return fromPalette.hex;
  const lower = name.toLowerCase().trim();
  return COLOR_NAME_TO_HEX[lower] ?? DEFAULT_RING_COLOR;
}

/**
 * Compute geometry for a single piece.
 */
function geometrizePiece(piece: Piece, materials: MaterialSpec, palette: ColorSpec[] = []): PieceGeometry {
  const gauge = computeGauge(materials, 'sc');
  const rings: Ring[] = [];
  let y = 0;
  let totalStitches = 0;

  for (const round of piece.rounds) {
    const dominantStitch = inferDominantStitch(round);
    const stitchGauge = computeGauge(materials, dominantStitch);

    const circumference = round.stitchCount * gauge.width;
    const radius = circumference / (2 * Math.PI);
    const height = stitchGauge.height;

    rings.push({
      roundNumber: round.number,
      stitchCount: round.stitchCount,
      radius,
      yPosition: y + height / 2,
      height,
      color: colorToHex(round.color, palette),
      operationKind: round.operationKind,
    });

    y += height;
    totalStitches += round.stitchCount;
  }

  const maxRadius = Math.max(...rings.map((r) => r.radius), 0);

  // Derive cap defaults if not explicitly set
  const lastRing = rings[rings.length - 1];
  const firstRing = rings[0];
  const startCap: EndCapStyle =
    piece.startCap ??
    (piece.startingMethod === 'magic_ring'
      ? 'dome'
      : firstRing && firstRing.radius < maxRadius * 0.3
        ? 'dome'
        : 'flat');
  const endCap: EndCapStyle =
    piece.endCap ??
    (lastRing && lastRing.radius < maxRadius * 0.3 ? 'dome' : 'flat');

  // Foundation-chain pieces: compute per-ring elliptical cross-section.
  // The "active" chain length stays at full strength up to the peak ring,
  // then decays to nearly zero as we go up — modeling how the foot's
  // elongated base smoothly transitions into the leg's circular cylinder.
  if (piece.foundationChainLength && piece.foundationChainLength > 0) {
    const stitchWidth = computeGauge(materials, 'sc').width;
    const L = piece.foundationChainLength;
    // Index of the ring with peak stitch count
    let peakIndex = 0;
    let peakCount = 0;
    rings.forEach((r, i) => {
      if (r.stitchCount > peakCount) {
        peakCount = r.stitchCount;
        peakIndex = i;
      }
    });

    rings.forEach((ring, i) => {
      // Active chain length for this ring
      let activeL: number;
      if (i <= peakIndex) {
        // Before/at peak: full chain (foot/base region)
        activeL = L;
      } else {
        // After peak: decay smoothly to 15% of original (leg cylinder)
        const t = (i - peakIndex) / Math.max(1, rings.length - 1 - peakIndex);
        const eased = t * t * (3 - 2 * t); // smoothstep
        activeL = L * (1 - eased * 0.85);
      }

      // Ellipse semi-axes via Ramanujan-ish approximation:
      //   perimeter ≈ π(a + b) = N * stitchWidth
      //   a = b + halfL  (semi-major axis = b + half the chain length)
      //   2b + halfL = N * stitchWidth / π
      //   b = (N * stitchWidth / π - halfL) / 2
      const halfL = (activeL * stitchWidth) / 2;
      const ab = (ring.stitchCount * stitchWidth) / Math.PI;
      const b = Math.max(stitchWidth / 2, (ab - halfL) / 2);
      const a = b + halfL;

      ring.radiusX = a;
      ring.radiusZ = b;
      // Update radius to the average so size estimates still make sense
      ring.radius = (a + b) / 2;
    });
  }

  // Recompute maxRadius based on possibly-updated radii
  const updatedMaxRadius = Math.max(...rings.map((r) => Math.max(r.radius, r.radiusX ?? r.radius)), 0);

  // Peak ring index (the ring with the maximum stitch count)
  let peakRingIndex = 0;
  let peakStitches = 0;
  rings.forEach((r, i) => {
    if (r.stitchCount > peakStitches) {
      peakStitches = r.stitchCount;
      peakRingIndex = i;
    }
  });

  // Foot shape detection — VERY strict: only true if the piece name explicitly
  // matches a foot/leg-with-foot, AND the geometry has the L-bend signature.
  // Generic foundation-chain pieces (animal bodies, hats, etc.) should NOT be
  // split into sub-meshes — they render fine as a single surface of revolution.
  const FOOT_NAMES = /^(foot|feet|pie|pies|p[ée]|p[ée]s|pierna|leg|pernas?|leg with foot|pata\s+con\s+pie)$/i;
  const nameLooksLikeFoot = FOOT_NAMES.test(piece.name.trim());
  const hasFoundationChain = (piece.foundationChainLength ?? 0) > 0;
  // Real foot signature: peak in the FIRST 2 rings (very base) AND a sharp
  // drop right after (>30% reduction within 3 rings).
  let hasSharpDrop = false;
  if (peakRingIndex <= 2 && rings.length > peakRingIndex + 3) {
    const peakSc = rings[peakRingIndex].stitchCount;
    const afterSc = rings[peakRingIndex + 3].stitchCount;
    hasSharpDrop = (peakSc - afterSc) / peakSc > 0.3;
  }
  const isFootShape = nameLooksLikeFoot && hasFoundationChain && hasSharpDrop;

  return {
    pieceId: piece.id,
    name: piece.name,
    rings,
    totalHeight: y,
    maxRadius: updatedMaxRadius,
    totalStitches,
    startCap,
    endCap,
    peakRingIndex,
    isFootShape,
  };
}

/** Determine the dominant stitch type in a round (used for height). */
function inferDominantStitch(round: Round): 'sc' | 'hdc' | 'dc' | 'tr' | 'ch' | 'sl_st' {
  // Count occurrences of each stitch type, recursively into groups
  const counts: Record<string, number> = {};

  function visit(op: { stitch: string; count: number; group?: any[] }): void {
    if (op.group && op.group.length > 0) {
      for (const sub of op.group) {
        counts[sub.stitch] = (counts[sub.stitch] ?? 0) + sub.count * op.count;
      }
    } else {
      counts[op.stitch] = (counts[op.stitch] ?? 0) + op.count;
    }
  }

  for (const op of round.operations) visit(op as any);

  // If sc is present, it dominates (most common in amigurumi)
  if ((counts.sc ?? 0) + (counts.inc ?? 0) + (counts.dec ?? 0) > 0) return 'sc';
  // Otherwise pick the highest count
  let max = 0;
  let dominant: 'sc' | 'hdc' | 'dc' | 'tr' | 'ch' | 'sl_st' = 'sc';
  for (const [stitch, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      dominant = stitch as any;
    }
  }
  return dominant;
}

/**
 * Compute geometry for a full pattern (all pieces).
 */
export function geometrizePattern(pattern: Pattern): Geometry {
  const pieces = pattern.pieces.map((p) => geometrizePiece(p, pattern.materials, pattern.colors));

  const totalStitches = pieces.reduce((s, p) => s + p.totalStitches * (p.rings.length > 0 ? 1 : 0), 0)
    + pattern.pieces.reduce((s, p) => s + (p.count - 1) * (pieces.find(pg => pg.pieceId === p.id)?.totalStitches ?? 0), 0);

  const estimatedYarnGrams = estimateYarnGrams(totalStitches, pattern.materials);

  // Estimated overall size: max of any single piece dimensions
  const maxHeight = Math.max(...pieces.map((p) => p.totalHeight), 0);
  const maxWidth = Math.max(...pieces.map((p) => p.maxRadius * 2), 0);

  return {
    pieces,
    estimatedYarnGrams,
    estimatedSize: {
      height: maxHeight / 10, // mm to cm
      width: maxWidth / 10,
    },
  };
}
