/**
 * Lightweight i18n for UI strings.
 * Pattern notation translation lives in engine/translator.ts; this file
 * only handles UI labels (buttons, tabs, errors, etc.).
 */

import type { Language } from '@/engine/types';

type Dict = Record<string, string>;

const ES: Dict = {
  // Navigation
  home: 'Inicio',
  visualizer: 'Visualizador',
  generator: 'Generador',
  scaler: 'Escalador',
  calculators: 'Calculadoras',
  library: 'Biblioteca',
  settings: 'Ajustes',
  tutorials: 'Tutoriales',
  // Landing
  hero_title: 'Diseñá amigurumis sin matemática.',
  hero_subtitle: 'Visualizá, generá y escalá tus patrones de crochet.',
  hero_cta: 'Probar la herramienta',
  feature_1: 'Visualizá el resultado antes de tejer',
  feature_2: 'Generá patrones a partir de la forma',
  feature_3: 'Escalá tus diseños sin romperte la cabeza',
  // Visualizer
  pattern: 'Patrón',
  paste_pattern_here: 'Pegá tu patrón acá...',
  rounds: 'Rondas',
  materials: 'Materiales',
  yarn: 'Hilo',
  hook: 'Aguja',
  tension: 'Tensión',
  tension_tight: 'Apretada',
  tension_normal: 'Normal',
  tension_loose: 'Suelta',
  size: 'Tamaño',
  yarn_needed: 'Hilo necesario',
  validate: 'Validar',
  translate: 'Traducir',
  save: 'Guardar',
  export_pdf: 'Exportar PDF',
  start_tutorial: 'Tutorial paso a paso',
  language: 'Idioma',
  // Generator
  generator_title: 'Generador de patrones',
  step_shape: 'Elegí la forma',
  step_dimensions: 'Definí dimensiones',
  step_materials: 'Elegí materiales',
  generate: 'Generar patrón',
  diameter: 'Diámetro',
  height: 'Altura',
  length: 'Largo',
  width: 'Ancho',
  diameter_top: 'Diámetro superior',
  result: 'Resultado',
  open_in_visualizer: 'Abrir en visualizador',
  back: 'Atrás',
  next: 'Siguiente',
  // Scaler
  scaler_title: 'Escalador',
  original_pattern: 'Patrón original',
  scaled_pattern: 'Patrón escalado',
  strategy: 'Estrategia',
  by_materials: 'Cambiando hilo y aguja',
  by_count: 'Multiplicando puntos',
  factor: 'Factor',
  apply_scaling: 'Aplicar',
  suggest_for_size: 'Sugerir para tamaño:',
  // Library
  library_title: 'Mi biblioteca',
  no_patterns_yet: 'Todavía no guardaste ningún patrón.',
  add_first: 'Agregar el primero',
  search: 'Buscar',
  filter: 'Filtrar',
  pattern_name: 'Nombre del patrón',
  designer: 'Diseñador',
  notes: 'Notas',
  delete: 'Eliminar',
  duplicate: 'Duplicar',
  open: 'Abrir',
  // Calculators
  calc_yarn_title: 'Hilo necesario',
  calc_time_title: 'Tiempo de tejido',
  calc_hooks_title: 'Conversor de agujas',
  calc_notation_title: 'Conversor de notación',
  calc_cost_title: 'Costo del proyecto',
  calc_gauge_title: 'Calculá tu gauge',
  total_stitches: 'Puntos totales',
  estimated_grams: 'Gramos estimados',
  estimated_meters: 'Metros estimados',
  hours: 'Horas',
  minutes_per_round: 'Minutos por ronda',
  cost_per_gram: 'Costo por gramo',
  total_cost: 'Costo total',
  hourly_rate: 'Costo por hora',
  // Errors
  error: 'Error',
  warning: 'Advertencia',
  info: 'Info',
  COUNT_MISMATCH: 'El conteo declarado no coincide',
  IMPOSSIBLE_DECREASE: 'Disminución imposible',
  ABRUPT_CHANGE: 'Cambio brusco entre rondas',
  ROUND_GAP: 'Salto de rondas',
  EMPTY_PIECE: 'Pieza vacía',
  // Misc
  save_success: '¡Guardado!',
  yes: 'Sí',
  no: 'No',
  confirm_delete: '¿Seguro que querés eliminarlo?',
  pieces: 'Piezas',
  stitches: 'Puntos',
  total: 'Total',
  // Pattern editor placeholder
  example_pattern: `# Mi primer amigurumi

CABEZA
V1: 6 pb en AM (6)
V2: 6 aum (12)
V3: (1 pb, aum) x 6 (18)
V4: (2 pb, aum) x 6 (24)
V5-V8: 24 pb (24)
V9: (2 pb, dism) x 6 (18)
V10: (1 pb, dism) x 6 (12)
V11: 6 dism (6)`,
};

const EN: Dict = {
  home: 'Home',
  visualizer: 'Visualizer',
  generator: 'Generator',
  scaler: 'Scaler',
  calculators: 'Calculators',
  library: 'Library',
  settings: 'Settings',
  tutorials: 'Tutorials',
  hero_title: 'Design amigurumis without the math.',
  hero_subtitle: 'Visualize, generate and scale your crochet patterns.',
  hero_cta: 'Try the tool',
  feature_1: 'See the result before you crochet',
  feature_2: 'Generate patterns from a target shape',
  feature_3: 'Scale your designs without doing the math',
  pattern: 'Pattern',
  paste_pattern_here: 'Paste your pattern here...',
  rounds: 'Rounds',
  materials: 'Materials',
  yarn: 'Yarn',
  hook: 'Hook',
  tension: 'Tension',
  tension_tight: 'Tight',
  tension_normal: 'Normal',
  tension_loose: 'Loose',
  size: 'Size',
  yarn_needed: 'Yarn needed',
  validate: 'Validate',
  translate: 'Translate',
  save: 'Save',
  export_pdf: 'Export PDF',
  start_tutorial: 'Step-by-step tutorial',
  language: 'Language',
  generator_title: 'Pattern generator',
  step_shape: 'Pick a shape',
  step_dimensions: 'Set dimensions',
  step_materials: 'Pick materials',
  generate: 'Generate pattern',
  diameter: 'Diameter',
  height: 'Height',
  length: 'Length',
  width: 'Width',
  diameter_top: 'Top diameter',
  result: 'Result',
  open_in_visualizer: 'Open in visualizer',
  back: 'Back',
  next: 'Next',
  scaler_title: 'Scaler',
  original_pattern: 'Original pattern',
  scaled_pattern: 'Scaled pattern',
  strategy: 'Strategy',
  by_materials: 'Change yarn & hook',
  by_count: 'Multiply stitch counts',
  factor: 'Factor',
  apply_scaling: 'Apply',
  suggest_for_size: 'Suggest for size:',
  library_title: 'My library',
  no_patterns_yet: "You haven't saved any patterns yet.",
  add_first: 'Add your first',
  search: 'Search',
  filter: 'Filter',
  pattern_name: 'Pattern name',
  designer: 'Designer',
  notes: 'Notes',
  delete: 'Delete',
  duplicate: 'Duplicate',
  open: 'Open',
  calc_yarn_title: 'Yarn estimator',
  calc_time_title: 'Crochet time',
  calc_hooks_title: 'Hook converter',
  calc_notation_title: 'Notation converter',
  calc_cost_title: 'Project cost',
  calc_gauge_title: 'Measure your gauge',
  total_stitches: 'Total stitches',
  estimated_grams: 'Estimated grams',
  estimated_meters: 'Estimated meters',
  hours: 'Hours',
  minutes_per_round: 'Minutes per round',
  cost_per_gram: 'Cost per gram',
  total_cost: 'Total cost',
  hourly_rate: 'Hourly rate',
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
  COUNT_MISMATCH: 'Declared count does not match',
  IMPOSSIBLE_DECREASE: 'Impossible decrease',
  ABRUPT_CHANGE: 'Abrupt change between rounds',
  ROUND_GAP: 'Round gap',
  EMPTY_PIECE: 'Empty piece',
  save_success: 'Saved!',
  yes: 'Yes',
  no: 'No',
  confirm_delete: 'Are you sure you want to delete it?',
  pieces: 'Pieces',
  stitches: 'Stitches',
  total: 'Total',
  example_pattern: `# My first amigurumi

HEAD
Rnd 1: 6 sc in magic ring (6)
Rnd 2: 6 inc (12)
Rnd 3: (1 sc, inc) * 6 (18)
Rnd 4: (2 sc, inc) * 6 (24)
Rnd 5-8: 24 sc (24)
Rnd 9: (2 sc, dec) * 6 (18)
Rnd 10: (1 sc, dec) * 6 (12)
Rnd 11: 6 dec (6)`,
};

const DICTS: Record<Language, Dict> = { es: ES, en: EN };

/** Get a UI string in the requested language. */
export function t(key: string, lang: Language = 'es'): string {
  return DICTS[lang][key] ?? DICTS.es[key] ?? key;
}
