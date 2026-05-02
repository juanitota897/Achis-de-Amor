/**
 * Core types for the crochet engine.
 *
 * The fundamental abstraction: an amigurumi is a collection of Pieces,
 * each Piece is a sequence of Rounds, each Round has a stitch count
 * derived from a list of Operations.
 */

// ─── Stitches ─────────────────────────────────────────────────────────────

/** Canonical stitch type. Aliases (sc, pb, single crochet, punto bajo) all map to this. */
export type StitchType =
  | 'ch'      // chain / cadena
  | 'sl_st'   // slip stitch / punto raso
  | 'sc'      // single crochet / punto bajo
  | 'hdc'     // half double crochet / medio punto
  | 'dc'      // double crochet / punto alto / vareta
  | 'tr'      // treble crochet / punto alto doble
  | 'inc'     // increase (2 sc in same stitch)
  | 'dec';    // invisible decrease (sc2tog)

/** Modifier applied to a round (e.g. work in back loop only). */
export type RoundModifier = 'BLO' | 'FLO' | null;

/**
 * Special instruction extracted from the pattern text — things that aren't
 * stitches but are still important: "stuff the head", "place safety eyes
 * between rounds 5 and 6", "change yarn to white", etc.
 */
export type AnnotationKind =
  | 'color_change'   // "change yarn to white"
  | 'stuffing'       // "stuff the head firmly"
  | 'eyes'           // "place safety eyes between rounds 14 and 15, 10 sts apart"
  | 'sewing'         // "sew the ears to the head"
  | 'fasten_off'     // "fasten off and leave a tail"
  | 'note';          // generic note that didn't match a known pattern

export interface Annotation {
  kind: AnnotationKind;
  /** Original text snippet from the pattern. */
  rawText: string;
  /** Human-readable summary (in the pattern's source language). */
  summary: string;
  /** Optional structured data (e.g. eye position details). */
  details?: Record<string, string | number>;
}

/** Method used to start a piece. */
export type StartingMethod = 'magic_ring' | 'foundation_chain' | 'continued';

/**
 * How an end of a piece is visually closed in the 3D render.
 *
 *   - 'dome': hemispherical cap (use for spheres, eggs, drops — anything
 *     that visually pinches into a curved point).
 *   - 'flat': flat disc covering the open ring (use for cylinders, tubes
 *     viewed end-on, or any piece whose extreme ring is a real visible
 *     circle in the finished amigurumi).
 *   - 'open': no cap, leave the ring open (use for tubes, sleeves, or
 *     pieces that are designed to be sewn onto another part).
 */
export type EndCapStyle = 'dome' | 'flat' | 'open';

// ─── Pattern structure ────────────────────────────────────────────────────

/** A single operation within a round, e.g. "3 sc" or "(1 sc, inc) * 6". */
export interface Operation {
  /** The stitch type for this operation. */
  stitch: StitchType;
  /** How many times this stitch is performed. */
  count: number;
  /** If this Operation is itself a repeated group, the inner sequence. */
  group?: Operation[];
  /** Optional textual note (e.g. "in next st"). */
  note?: string;
}

/** A single round within a piece. */
export interface Round {
  /** Round number (1-indexed). */
  number: number;
  /** Operations performed in this round, in order. */
  operations: Operation[];
  /** Total stitch count at end of the round, computed. */
  stitchCount: number;
  /** Stitch count declared in the source pattern, for validation. */
  declaredCount?: number;
  /** Modifier applied to the whole round. */
  modifier: RoundModifier;
  /** Color identifier for this round (matches a color in pattern.colors). */
  color?: string;
  /** The dominant operation type (informational). */
  operationKind: 'start' | 'increase' | 'decrease' | 'even' | 'mixed';
  /** Original raw text of the round, for debugging and display. */
  rawText?: string;
  /** Annotations extracted from inline notes around this round. */
  annotations?: Annotation[];
}

/** A single physical piece of the amigurumi (head, body, ear, etc). */
export interface Piece {
  /** Internal id. */
  id: string;
  /** Display name, language-tagged. */
  name: string;
  /** How this piece begins. */
  startingMethod: StartingMethod;
  /** Initial stitch count (e.g. 6 for "6 sc in MR"). */
  startingCount: number;
  /** All the rounds, in sequence. */
  rounds: Round[];
  /** Whether this piece is duplicated (e.g. "Ears (make 2)"). */
  count: number;
  /** Optional note about stuffing, finishing, etc. */
  notes?: string[];
  /** Visual cap style for the bottom (round 1) end. Defaults derived from startingMethod. */
  startCap?: EndCapStyle;
  /** Visual cap style for the top (last round) end. Defaults derived from final stitch count. */
  endCap?: EndCapStyle;
  /**
   * If the piece starts from a foundation chain (worked around both sides),
   * the length of that chain in stitches. The renderer uses this to deform
   * the cross-section from a circle to an elongated stadium/ellipse.
   */
  foundationChainLength?: number;
}

/** An assembly step describing how pieces are joined. */
export interface AssemblyStep {
  type: 'sew' | 'embroider' | 'attach_eyes' | 'note';
  pieceId?: string;
  targetPieceId?: string;
  description: string;
  targetRound?: number;
  position?: string;
}

/** A material/yarn/hook used in the pattern. */
export interface MaterialSpec {
  /** Yarn weight (CYC 0–7). */
  yarnCyc: number;
  /** Hook size in mm. */
  hookMm: number;
  /** Tension multiplier (0.85–1.15, default 1.0). */
  tension: number;
  /** Optional human-readable yarn name. */
  yarnName?: string;
  /** Optional brand. */
  yarnBrand?: string;
  /** User-measured custom gauge override. */
  customGauge?: { width: number; height: number };
}

/** A color used in the pattern. */
export interface ColorSpec {
  id: string;
  name: string;
  hex: string;
}

/** Full parsed pattern. */
export interface Pattern {
  /** Pattern metadata. */
  metadata: {
    name: string;
    designer?: string;
    sourceLanguage: 'es' | 'en' | 'mixed';
    description?: string;
    estimatedSize?: { height: number; width: number };
  };
  /** All pieces of the amigurumi. */
  pieces: Piece[];
  /** Assembly instructions. */
  assembly: AssemblyStep[];
  /** Materials used. */
  materials: MaterialSpec;
  /** Color palette referenced by rounds. */
  colors: ColorSpec[];
  /** Validation errors detected during parsing. */
  errors: ValidationError[];
  /** Original source text. */
  sourceText: string;
}

// ─── Validation ───────────────────────────────────────────────────────────

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationError {
  severity: ValidationSeverity;
  /** Machine-readable error code. */
  code: string;
  /** Human-readable message. */
  message: string;
  /** Piece id (if applicable). */
  pieceId?: string;
  /** Round number (if applicable). */
  round?: number;
  /** Suggested fix. */
  suggestion?: string;
}

// ─── Geometry ─────────────────────────────────────────────────────────────

/** Computed geometry of a single round (a ring in 3D). */
export interface Ring {
  roundNumber: number;
  stitchCount: number;
  /** Radius in mm (used for circular pieces; equals radiusX for elliptical). */
  radius: number;
  /**
   * Optional semi-axis in X. For foundation-chain pieces, this is the long axis
   * of the ellipse. If not specified, defaults to `radius`.
   */
  radiusX?: number;
  /**
   * Optional semi-axis in Z (the short axis for foundation-chain pieces).
   * If not specified, defaults to `radius`.
   */
  radiusZ?: number;
  /** Y position of the centerline of this ring, in mm. */
  yPosition: number;
  /** Height of this ring (depends on stitch type), in mm. */
  height: number;
  /** Hex color. */
  color: string;
  /** Operation kind for visual cues. */
  operationKind: Round['operationKind'];
}

/** Computed geometry of a single piece. */
export interface PieceGeometry {
  pieceId: string;
  name: string;
  /**
   * Each ring may have its own radiusX/radiusZ for elliptical cross-section
   * (foundation-chain pieces). For circular pieces, radius is used directly.
   */
  rings: Ring[];
  totalHeight: number;
  maxRadius: number;
  totalStitches: number;
  /** How the start (bottom) end should be rendered. */
  startCap: EndCapStyle;
  /** How the end (top) end should be rendered. */
  endCap: EndCapStyle;
  /** Index of the ring with maximum stitch count (peak of the piece). */
  peakRingIndex: number;
  /**
   * True if this piece is shaped like a foot/limb (foundation chain + peak in
   * the bottom half). The renderer applies an L-bend transformation so the
   * foot lies horizontally and the leg stands vertical.
   */
  isFootShape: boolean;
}

/** Full computed geometry of a pattern. */
export interface Geometry {
  pieces: PieceGeometry[];
  /** Total estimated yarn weight in grams. */
  estimatedYarnGrams: number;
  /** Estimated finished size in cm. */
  estimatedSize: { height: number; width: number };
}

// ─── Generator ────────────────────────────────────────────────────────────

export type ShapeKind =
  | 'sphere'
  | 'flat_sphere'
  | 'oblong_sphere'
  | 'cylinder'
  | 'tapered_cylinder'
  | 'cone'
  | 'truncated_cone'
  | 'oval'
  | 'pear'
  | 'hemisphere'
  | 'disc'
  | 'teardrop'
  | 'petal'
  | 'open_tube';

export interface ShapeParams {
  kind: ShapeKind;
  /** Diameter or width in cm. */
  diameter?: number;
  /** For non-circular: secondary dimension. */
  diameterTop?: number;
  /** Height/length in cm. */
  height?: number;
  /** For oval: length and width. */
  length?: number;
  width?: number;
  /** For petal etc.: curvature 0-1. */
  curvature?: number;
}

// ─── Languages ────────────────────────────────────────────────────────────

export type Language = 'es' | 'en';
