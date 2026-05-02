/**
 * Shape catalog for the inverse generator.
 *
 * Each shape is defined by:
 *   1. A radius profile r(y) over a vertical range — the mathematical
 *      surface of revolution that gives the shape its silhouette.
 *   2. A cap style for each end (dome, flat, open).
 *
 * The sampler discretizes the profile into rounds at intervals of one
 * stitch height and emits a list of stitch counts (snapped to multiples
 * of 6 for clean balanced patterns).
 */

import type { ShapeKind, ShapeParams, MaterialSpec, EndCapStyle } from '../types';
import { computeGauge } from '../gauge';

export interface ShapeRound {
  stitchCount: number;
  kind: 'start' | 'increase' | 'decrease' | 'even';
  note?: string;
}

export interface ShapeOutput {
  rings: ShapeRound[];
  startCap: EndCapStyle;
  endCap: EndCapStyle;
}

export type ShapeBuilder = (
  params: ShapeParams,
  gauge: { width: number; height: number },
) => ShapeOutput;

const STARTING_COUNT = 6;
const SNAP = 6;

const cmToMm = (cm: number) => cm * 10;

// ─── Profile sampler ──────────────────────────────────────────────────────

interface ProfileOptions {
  radiusAt: (y: number) => number;
  totalHeight: number;
  gauge: { width: number; height: number };
  /** Whether the bottom collapses to a magic ring (radius → 0). */
  closedBottom: boolean;
  /** Whether the top collapses to a magic ring closure (radius → 0). */
  closedTop: boolean;
  startNote?: string;
}

function sampleProfile(opts: ProfileOptions): ShapeRound[] {
  const { radiusAt, totalHeight, gauge, closedBottom, closedTop, startNote } = opts;
  const rings: ShapeRound[] = [];

  const numRings = Math.max(2, Math.round(totalHeight / gauge.height));
  let prevCount = STARTING_COUNT;

  if (closedBottom) {
    rings.push({ stitchCount: STARTING_COUNT, kind: 'start', note: startNote ?? 'magic ring' });
  } else {
    const r0 = radiusAt(0);
    const c0 = snapCount(idealCount(r0, gauge.width));
    rings.push({ stitchCount: c0, kind: 'start', note: startNote ?? `foundation chain x${c0}` });
    prevCount = c0;
  }

  for (let i = 1; i <= numRings; i++) {
    const y = (i / numRings) * totalHeight;
    const r = radiusAt(y);
    let count = snapCount(idealCount(r, gauge.width));

    if (i === numRings && closedTop) {
      count = Math.min(count, STARTING_COUNT);
    }

    if (prevCount > 0) {
      count = Math.min(count, prevCount * 2);
      count = Math.max(count, Math.ceil(prevCount / 2));
    }
    count = Math.max(STARTING_COUNT, count);

    const kind: ShapeRound['kind'] =
      count > prevCount ? 'increase' : count < prevCount ? 'decrease' : 'even';
    rings.push({ stitchCount: count, kind });
    prevCount = count;
  }

  if (closedTop && prevCount > STARTING_COUNT) {
    while (prevCount > STARTING_COUNT) {
      const next = Math.max(STARTING_COUNT, prevCount - SNAP);
      rings.push({ stitchCount: next, kind: 'decrease' });
      prevCount = next;
    }
  }

  return rings;
}

function idealCount(radius_mm: number, stitchWidth_mm: number): number {
  if (radius_mm <= 0) return STARTING_COUNT;
  return (2 * Math.PI * radius_mm) / stitchWidth_mm;
}

function snapCount(count: number): number {
  return Math.max(STARTING_COUNT, Math.round(count / SNAP) * SNAP);
}

// ─── Shape builders ───────────────────────────────────────────────────────

const sphere: ShapeBuilder = (params, gauge) => {
  const D = cmToMm(params.diameter ?? 5);
  const R = D / 2;
  return {
    rings: sampleProfile({
      radiusAt: (y) => Math.sqrt(Math.max(0, R * R - (y - R) * (y - R))),
      totalHeight: D,
      gauge,
      closedBottom: true,
      closedTop: true,
    }),
    startCap: 'dome',
    endCap: 'dome',
  };
};

const flatSphere: ShapeBuilder = (params, gauge) => {
  const D = cmToMm(params.diameter ?? 5);
  const H = cmToMm(params.height ?? params.diameter! * 0.6);
  const a = D / 2;
  const b = H / 2;
  return {
    rings: sampleProfile({
      radiusAt: (y) => {
        const ny = (y - b) / b;
        return a * Math.sqrt(Math.max(0, 1 - ny * ny));
      },
      totalHeight: H,
      gauge,
      closedBottom: true,
      closedTop: true,
    }),
    startCap: 'dome',
    endCap: 'dome',
  };
};

const oblongSphere: ShapeBuilder = (params, gauge) => {
  const D = cmToMm(params.diameter ?? 6);
  const H = cmToMm(params.height ?? params.diameter! * 1.5);
  const a = D / 2;
  const b = H / 2;
  return {
    rings: sampleProfile({
      radiusAt: (y) => {
        const ny = (y - b) / b;
        return a * Math.sqrt(Math.max(0, 1 - ny * ny));
      },
      totalHeight: H,
      gauge,
      closedBottom: true,
      closedTop: true,
    }),
    startCap: 'dome',
    endCap: 'dome',
  };
};

const cylinder: ShapeBuilder = (params, gauge) => {
  // Cylinder: closed flat at bottom (foot/base), open at top (where it
  // attaches to the body). Radius is constant from a quick build-up phase.
  const D = cmToMm(params.diameter ?? 3);
  const H = cmToMm(params.height ?? 5);
  const R = D / 2;
  // Build-up phase: increase from MR to full radius in just a few rounds
  // (so the bottom is a flat-ish disc rather than a tall cone).
  const buildupHeight = Math.min(R * 0.5, H * 0.2);
  return {
    rings: sampleProfile({
      radiusAt: (y) => {
        if (y < buildupHeight) {
          // Quick cosine ease-in
          const t = y / buildupHeight;
          return R * Math.sin((t * Math.PI) / 2);
        }
        return R;
      },
      totalHeight: H,
      gauge,
      closedBottom: true,
      closedTop: false,
    }),
    startCap: 'flat',
    endCap: 'open',
  };
};

const taperedCylinder: ShapeBuilder = (params, gauge) => {
  const dBase = cmToMm(params.diameter ?? 4);
  const dTop = cmToMm(params.diameterTop ?? 2);
  const H = cmToMm(params.height ?? 5);
  const Rbase = dBase / 2;
  const Rtop = dTop / 2;
  const buildupHeight = Math.min(Rbase * 0.5, H * 0.2);
  return {
    rings: sampleProfile({
      radiusAt: (y) => {
        if (y < buildupHeight) {
          const t = y / buildupHeight;
          return Rbase * Math.sin((t * Math.PI) / 2);
        }
        const t = (y - buildupHeight) / (H - buildupHeight);
        return Rbase + (Rtop - Rbase) * t;
      },
      totalHeight: H,
      gauge,
      closedBottom: true,
      closedTop: false,
    }),
    startCap: 'flat',
    endCap: 'open',
  };
};

const cone: ShapeBuilder = (params, gauge) => {
  // Cone: open wide bottom (flat disc, the brim of a hat), tapering to
  // a closed point at the top.
  const D = cmToMm(params.diameter ?? 5);
  const R = D / 2;
  const H = cmToMm(params.height ?? params.diameter ?? 5);
  return {
    rings: sampleProfile({
      radiusAt: (y) => R * (1 - y / H),
      totalHeight: H,
      gauge,
      closedBottom: false,
      closedTop: true,
      startNote: `chain ring x${snapCount(idealCount(R, gauge.width))}`,
    }),
    startCap: 'open',
    endCap: 'dome',
  };
};

const truncatedCone: ShapeBuilder = (params, gauge) => {
  const dBase = cmToMm(params.diameter ?? 5);
  const dTop = cmToMm(params.diameterTop ?? 3);
  const H = cmToMm(params.height ?? 4);
  const Rbase = dBase / 2;
  const Rtop = dTop / 2;
  return {
    rings: sampleProfile({
      radiusAt: (y) => Rbase + (Rtop - Rbase) * (y / H),
      totalHeight: H,
      gauge,
      closedBottom: false,
      closedTop: false,
    }),
    startCap: 'flat',
    endCap: 'flat',
  };
};

const oval: ShapeBuilder = (params, gauge) => {
  const length = cmToMm(params.length ?? 8);
  const width = cmToMm(params.width ?? 5);
  const H = cmToMm(params.height ?? 4);
  const Rmax = width / 2;
  const buildup = Math.min(Rmax * 0.6, H * 0.3);
  return {
    rings: sampleProfile({
      radiusAt: (y) => {
        if (y < buildup) {
          const t = y / buildup;
          return Rmax * Math.sin((t * Math.PI) / 2);
        }
        if (y > H - buildup) {
          const t = (H - y) / buildup;
          return Rmax * Math.sin((t * Math.PI) / 2);
        }
        return Rmax;
      },
      totalHeight: H,
      gauge,
      closedBottom: true,
      closedTop: true,
      startNote: `foundation chain x${Math.max(4, Math.round((length - width) / gauge.width))}`,
    }),
    startCap: 'dome',
    endCap: 'dome',
  };
};

const pear: ShapeBuilder = (params, gauge) => {
  // Pear: rounded wide bottom (closed dome), narrow neck open at top
  const dBase = cmToMm(params.diameter ?? 6);
  const dTop = cmToMm(params.diameterTop ?? 3);
  const H = cmToMm(params.height ?? 8);
  const Rbase = dBase / 2;
  const Rtop = dTop / 2;
  return {
    rings: sampleProfile({
      radiusAt: (y) => {
        const domeHeight = Rbase * 0.8;
        if (y < domeHeight) {
          const ny = (y - domeHeight) / domeHeight;
          return Rbase * Math.sqrt(Math.max(0, 1 - ny * ny));
        }
        const t = (y - domeHeight) / (H - domeHeight);
        const smoothT = t * t * (3 - 2 * t);
        return Rbase + (Rtop - Rbase) * smoothT;
      },
      totalHeight: H,
      gauge,
      closedBottom: true,
      closedTop: false,
    }),
    startCap: 'dome',
    endCap: 'flat',
  };
};

const hemisphere: ShapeBuilder = (params, gauge) => {
  // Half a sphere — open flat disc at bottom (would attach to head/body),
  // closed dome at top.
  const D = cmToMm(params.diameter ?? 4);
  const R = D / 2;
  return {
    rings: sampleProfile({
      radiusAt: (y) => Math.sqrt(Math.max(0, R * R - y * y)),
      totalHeight: R,
      gauge,
      closedBottom: false,
      closedTop: true,
      startNote: `chain ring x${snapCount(idealCount(R, gauge.width))}`,
    }),
    startCap: 'flat',
    endCap: 'dome',
  };
};

const disc: ShapeBuilder = (params, gauge) => {
  // Closed flat disc — a lentil/coin shape. Both ends close into domes
  // (so it's a real solid disc, not a UFO with rims).
  const D = cmToMm(params.diameter ?? 4);
  const R = D / 2;
  const thickness = Math.max(gauge.height * 4, R * 0.35);
  return {
    rings: sampleProfile({
      radiusAt: (y) => {
        const ny = (y - thickness / 2) / (thickness / 2);
        return R * Math.sqrt(Math.max(0, 1 - ny * ny));
      },
      totalHeight: thickness,
      gauge,
      closedBottom: true,
      closedTop: true,
    }),
    startCap: 'dome',
    endCap: 'dome',
  };
};

const teardrop: ShapeBuilder = (params, gauge) => {
  const length = cmToMm(params.length ?? params.height ?? 4);
  const width = cmToMm(params.width ?? params.diameter ?? 2);
  const Rmax = width / 2;
  return {
    rings: sampleProfile({
      radiusAt: (y) => {
        const bottomZone = length * 0.5;
        if (y < bottomZone) {
          const ny = (y - bottomZone / 2) / (bottomZone / 2);
          return Rmax * Math.sqrt(Math.max(0, 1 - ny * ny * 0.6));
        }
        const t = (y - bottomZone) / (length - bottomZone);
        return Rmax * (1 - t);
      },
      totalHeight: length,
      gauge,
      closedBottom: true,
      closedTop: true,
    }),
    startCap: 'dome',
    endCap: 'dome',
  };
};

const petal: ShapeBuilder = (params, gauge) => {
  const length = cmToMm(params.length ?? 5);
  const width = cmToMm(params.width ?? 3);
  const Rmax = width / 2;
  return {
    rings: sampleProfile({
      radiusAt: (y) => {
        const t = y / length;
        return Rmax * Math.sin(Math.PI * Math.pow(t, 0.7));
      },
      totalHeight: length,
      gauge,
      closedBottom: true,
      closedTop: true,
    }),
    startCap: 'dome',
    endCap: 'dome',
  };
};

const openTube: ShapeBuilder = (params, gauge) => {
  // True open tube — both ends visibly open
  const D = cmToMm(params.diameter ?? 4);
  const H = cmToMm(params.height ?? 6);
  const R = D / 2;
  return {
    rings: sampleProfile({
      radiusAt: () => R,
      totalHeight: H,
      gauge,
      closedBottom: false,
      closedTop: false,
      startNote: `foundation chain x${snapCount(idealCount(R, gauge.width))}, joined`,
    }),
    startCap: 'open',
    endCap: 'open',
  };
};

// ─── Registry ─────────────────────────────────────────────────────────────

export const SHAPE_BUILDERS: Record<ShapeKind, ShapeBuilder> = {
  sphere,
  flat_sphere: flatSphere,
  oblong_sphere: oblongSphere,
  cylinder,
  tapered_cylinder: taperedCylinder,
  cone,
  truncated_cone: truncatedCone,
  oval,
  pear,
  hemisphere,
  disc,
  teardrop,
  petal,
  open_tube: openTube,
};

export const SHAPE_LABELS: Record<ShapeKind, { es: string; en: string }> = {
  sphere: { es: 'Esfera', en: 'Sphere' },
  flat_sphere: { es: 'Esfera achatada', en: 'Flat sphere' },
  oblong_sphere: { es: 'Esfera alargada', en: 'Oblong sphere' },
  cylinder: { es: 'Cilindro', en: 'Cylinder' },
  tapered_cylinder: { es: 'Cilindro cónico', en: 'Tapered cylinder' },
  cone: { es: 'Cono', en: 'Cone' },
  truncated_cone: { es: 'Cono truncado', en: 'Truncated cone' },
  oval: { es: 'Óvalo', en: 'Oval' },
  pear: { es: 'Pera', en: 'Pear' },
  hemisphere: { es: 'Hemiesfera', en: 'Hemisphere' },
  disc: { es: 'Disco', en: 'Disc' },
  teardrop: { es: 'Lágrima', en: 'Teardrop' },
  petal: { es: 'Pétalo', en: 'Petal' },
  open_tube: { es: 'Tubo abierto', en: 'Open tube' },
};

export function buildShape(
  params: ShapeParams,
  materials: MaterialSpec,
): ShapeOutput {
  const builder = SHAPE_BUILDERS[params.kind];
  if (!builder) throw new Error(`Unknown shape kind: ${params.kind}`);
  const gauge = computeGauge(materials, 'sc');
  return builder(params, gauge);
}
