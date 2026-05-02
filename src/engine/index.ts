/**
 * Public API of the crochet engine.
 *
 * The engine is a pure-TypeScript module with no React or Supabase
 * dependencies. It can be imported from anywhere and is fully testable
 * in isolation.
 */

export type * from './types';

// Dictionaries
export { STITCHES, resolveStitch, getAllStitchAliases } from './stitches';
export { YARN_WEIGHTS, getYarn, findYarnByName, ALL_YARN_WEIGHTS } from './yarns';
export { HOOK_SIZES, snapToStandardHook, findHookByLabel } from './hooks';

// Gauge
export { computeGauge, estimateYarnGrams } from './gauge';
export type { Gauge } from './gauge';

// Parser
export { parsePattern, DEFAULT_MATERIALS } from './parser';
export type { ParseOptions } from './parser';

// Translator
export { formatPattern, translateStitch, DEFAULT_FORMAT_OPTIONS } from './translator';
export type { FormatOptions } from './translator';

// Validator
export { validatePattern } from './validator';

// Geometry
export { geometrizePattern } from './geometry';

// Generator
export { generatePattern } from './generator';
export type { GenerateOptions } from './generator';
export { SHAPE_BUILDERS, SHAPE_LABELS, buildShape } from './shapes';
export type { ShapeRound, ShapeBuilder } from './shapes';

// Scaler
export { scaleByMaterials, scaleByCount, suggestMaterialsForSize } from './scaler';
export type { ScaleByMaterialsResult } from './scaler';

// Templates
export {
  PART_TEMPLATES,
  CATEGORY_INFO,
  templatesByCategory,
  scaleShape,
  applyAspect,
  findTemplate,
} from './templates';
export type { PartTemplate, PartCategory } from './templates';
