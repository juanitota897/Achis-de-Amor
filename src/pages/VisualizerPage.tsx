import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save, FileDown, Languages, AlertCircle, BookMarked, Sparkles, Wand2, Trash2, X as XIcon } from 'lucide-react';
import { REAL_PATTERN_EXAMPLES } from '@/data/realPatterns';
import { getPattern } from '@/lib/db';
import { generateImage, cleanPattern, type CleanPatternResponse } from '@/lib/ai';
import {
  parsePattern,
  geometrizePattern,
  validatePattern,
  formatPattern,
} from '@/engine';
import { ANNOTATION_ICON } from '@/engine/annotations';
import { Render3D } from '@/components/visualizer/Render3D';
import { Button, Textarea, Badge, Card } from '@/components/common/ui';
import { MaterialPicker } from '@/components/common/MaterialPicker';
import { useSettings } from '@/store/settings';
import { t } from '@/lib/i18n';
import { savePattern, newId, listProjects, addPatternToProject, type Project } from '@/lib/db';
import { exportPatternToPDF } from '@/lib/pdf';
import type { Pattern, ValidationError } from '@/engine/types';

const PRESET_COLORS = [
  '#E5D2B0', '#F0E5CF', '#D6A77A', '#B85B3D', '#7A5236',
  '#A4BC85', '#7A9CB8', '#F2C0C8', '#1F1A17', '#F8F4EC',
];

/**
 * Capture a canvas at a target square size and return base64 PNG (no prefix).
 * SD-1.5 img2img expects 512×512; we downscale to fit while preserving aspect
 * by letterboxing the canvas onto a square white background.
 */
function downscaleCanvasToBase64(source: HTMLCanvasElement, target: number): string {
  const out = document.createElement('canvas');
  out.width = target;
  out.height = target;
  const ctx = out.getContext('2d');
  if (!ctx) return source.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
  // White background so transparent pixels don't render black after JPEG/PNG roundtrip.
  ctx.fillStyle = '#FBF7F1';
  ctx.fillRect(0, 0, target, target);
  // Letterbox the source canvas centered onto the target square.
  const sw = source.width;
  const sh = source.height;
  const scale = Math.min(target / sw, target / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = (target - dw) / 2;
  const dy = (target - dh) / 2;
  ctx.drawImage(source, 0, 0, sw, sh, dx, dy, dw, dh);
  return out.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
}

// ─── AI image cache ──────────────────────────────────────────────────────
// We cache generated images in localStorage keyed by a hash of the inputs
// (pattern text + color + yarn + hook). Same inputs → same image, no API
// call. Limited to ~30 entries to avoid blowing localStorage quota.
const AI_CACHE_PREFIX = 'achis:ai-image:';
const AI_CACHE_INDEX_KEY = 'achis:ai-image:index';
const AI_CACHE_MAX_ENTRIES = 30;

function fnvHash(s: string): string {
  // Tiny non-cryptographic hash — fine for cache keys.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16);
}

function buildAiCacheKey(input: { text: string; color: string; yarnCyc: number; hookMm: number }): string {
  // Normalize whitespace so trivial reformatting doesn't bust the cache.
  const norm = input.text.replace(/\s+/g, ' ').trim();
  return AI_CACHE_PREFIX + fnvHash(`${norm}|${input.color}|${input.yarnCyc}|${input.hookMm}`);
}

function readAiCache(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Convert the JSON response from /clean-pattern back to plain pattern text
 * the parser can re-parse. We render each piece as a header followed by its
 * rounds, with annotations as inline notes.
 */
function formatCleanedPattern(res: CleanPatternResponse): string | null {
  if (!res.pieces || res.pieces.length === 0) {
    // Fall back to raw response if Claude didn't return structured pieces
    return res.raw ?? null;
  }
  const blocks: string[] = [];
  for (const piece of res.pieces) {
    const header = piece.count > 1
      ? `${piece.name.toUpperCase()} (x${piece.count})`
      : piece.name.toUpperCase();
    const lines: string[] = [header];
    // Index annotations by round number for inline insertion
    const byRound = new Map<number, string[]>();
    for (const ann of piece.annotations ?? []) {
      const list = byRound.get(ann.round) ?? [];
      list.push(ann.text);
      byRound.set(ann.round, list);
    }
    piece.rounds.forEach((round, i) => {
      lines.push(round);
      const notes = byRound.get(i + 1);
      if (notes) for (const n of notes) lines.push(`→ ${n}`);
    });
    blocks.push(lines.join('\n'));
  }
  if (res.materials?.yarn || res.materials?.hookMm) {
    const matLine = [
      res.materials.yarn ? `Hilo: ${res.materials.yarn}` : '',
      res.materials.hookMm ? `Aguja: ${res.materials.hookMm} mm` : '',
    ].filter(Boolean).join(' · ');
    blocks.unshift(matLine);
  }
  return blocks.join('\n\n');
}

function writeAiCache(key: string, dataUrl: string): void {
  try {
    // Track keys in an index so we can evict oldest when over the limit.
    const indexRaw = localStorage.getItem(AI_CACHE_INDEX_KEY);
    const index: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    // Move (or add) this key to the end (most recent).
    const filtered = index.filter((k) => k !== key);
    filtered.push(key);
    while (filtered.length > AI_CACHE_MAX_ENTRIES) {
      const evict = filtered.shift();
      if (evict) localStorage.removeItem(evict);
    }
    localStorage.setItem(AI_CACHE_INDEX_KEY, JSON.stringify(filtered));
    localStorage.setItem(key, dataUrl);
  } catch {
    // Quota exceeded or storage disabled — just skip cache write silently.
  }
}

export function VisualizerPage() {
  const { language, setLanguage, defaultMaterials, setDefaultMaterials, aiWorkerUrl } = useSettings();
  const [searchParams] = useSearchParams();
  const patternIdFromUrl = searchParams.get('id');
  const [text, setText] = useState(() => t('example_pattern', language));
  const [saved, setSaved] = useState(false);
  const [color, setColor] = useState('#E5D2B0');
  const [loadedPatternName, setLoadedPatternName] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [saveName, setSaveName] = useState('');
  const [saveProjectId, setSaveProjectId] = useState<string>('');
  // AI image state
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  // AI clean-pattern state
  const [cleanLoading, setCleanLoading] = useState(false);
  const [cleanError, setCleanError] = useState<string | null>(null);
  const [cleanPieceMode, setCleanPieceMode] = useState<'split' | 'merge'>('split');
  // Piece focus: when set, the 3D viewer and rondas panel show only this piece.
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);

  // Load projects when the save modal opens
  useEffect(() => {
    if (showSaveModal) {
      void listProjects().then(setProjects);
    }
  }, [showSaveModal]);

  // Load saved pattern from URL (?id=xyz)
  useEffect(() => {
    if (!patternIdFromUrl) return;
    let cancelled = false;
    getPattern(patternIdFromUrl).then((saved) => {
      if (cancelled || !saved) return;
      setText(saved.sourceText);
      if (saved.materials) setDefaultMaterials(saved.materials);
      setLoadedPatternName(saved.name);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patternIdFromUrl]);

  // Re-parse on every change
  const { pattern, geometry, errors } = useMemo(() => {
    try {
      const p = parsePattern(text, { defaultMaterials });
      // Inject the picked color as the default for any unspecified ring
      p.colors = [{ id: 'main', name: 'Main', hex: color }];
      for (const piece of p.pieces) {
        for (const round of piece.rounds) {
          if (!round.color) round.color = 'main';
        }
      }
      const g = geometrizePattern(p);
      const e = validatePattern(p);
      return { pattern: p, geometry: g, errors: e };
    } catch (err) {
      return {
        pattern: null as Pattern | null,
        geometry: null,
        errors: [
          {
            severity: 'error' as const,
            code: 'PARSE_ERROR',
            message: err instanceof Error ? err.message : 'Error al procesar el patrón',
          },
        ] as ValidationError[],
      };
    }
  }, [text, defaultMaterials, color]);

  // Filtered geometry shown in the 3D viewer. When a piece is selected,
  // only that piece's geometry is rendered.
  const displayedGeometry = useMemo(() => {
    if (!geometry) return geometry;
    if (!selectedPieceId) return geometry;
    const filtered = geometry.pieces.filter((p) => p.pieceId === selectedPieceId);
    if (filtered.length === 0) return geometry; // selection no longer valid
    return { ...geometry, pieces: filtered };
  }, [geometry, selectedPieceId]);

  // Reset selection when the underlying pattern changes (different pieces).
  useEffect(() => {
    if (!selectedPieceId) return;
    if (!geometry || !geometry.pieces.some((p) => p.pieceId === selectedPieceId)) {
      setSelectedPieceId(null);
    }
  }, [geometry, selectedPieceId]);

  useEffect(() => {
    setSaved(false);
  }, [text]);

  function handleTranslate() {
    if (!pattern) return;
    const target = language === 'es' ? 'en' : 'es';
    const formatted = formatPattern(pattern, { language: target });
    setText(formatted);
  }

  function openSaveModal() {
    if (!pattern) return;
    setSaveName(loadedPatternName || pattern.metadata.name || (language === 'es' ? 'Mi patrón' : 'My pattern'));
    setSaveProjectId('');
    setShowSaveModal(true);
  }

  async function confirmSave() {
    if (!pattern) return;
    const id = newId();
    await savePattern({
      id,
      name: saveName.trim() || (pattern.metadata.name || 'Untitled'),
      designer: pattern.metadata.designer,
      source: 'own',
      language: pattern.metadata.sourceLanguage,
      sourceText: text,
      pattern,
      materials: defaultMaterials,
      isCompleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    if (saveProjectId) {
      await addPatternToProject(saveProjectId, id);
    }
    setShowSaveModal(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleExport() {
    if (!pattern || !geometry) return;
    await exportPatternToPDF(pattern, geometry, language);
  }

  async function handleGenerateRealistic() {
    if (!pattern || !geometry || !aiWorkerUrl) return;
    setAiError(null);
    // Check cache first — no point burning tokens regenerating the same piece.
    const cacheKey = buildAiCacheKey({
      text,
      color,
      yarnCyc: defaultMaterials.yarnCyc,
      hookMm: defaultMaterials.hookMm,
    });
    const cached = readAiCache(cacheKey);
    if (cached) {
      setAiImageUrl(cached);
      return;
    }
    setAiLoading(true);
    setAiImageUrl(null);
    try {
      // Capture the 3D render canvas as a PNG to feed into img2img. This
      // forces the AI to preserve the actual silhouette of the pattern
      // instead of hallucinating a generic amigurumi.
      let inputImageBase64: string | undefined;
      try {
        const canvas = document.querySelector(
          '.flex-1.min-h-0 > canvas, canvas',
        ) as HTMLCanvasElement | null;
        if (canvas) {
          inputImageBase64 = downscaleCanvasToBase64(canvas, 512);
        }
      } catch {
        // Capture failed — proceed without seed (worker falls back to text-to-image).
      }

      const description = pattern.pieces.length === 1
        ? pattern.pieces[0].name
        : `${pattern.pieces[0].name} (and ${pattern.pieces.length - 1} more pieces)`;
      const result = await generateImage(aiWorkerUrl, {
        patternText: text,
        pieceDescription: `amigurumi ${description.toLowerCase()}`,
        color,
        sizeCm: geometry.estimatedSize,
        model: 'flux',
        inputImageBase64,
      });
      setAiImageUrl(result.imageUrl);
      writeAiCache(cacheKey, result.imageUrl);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setAiLoading(false);
    }
  }

  async function handleCleanPattern() {
    if (!aiWorkerUrl || !text.trim()) return;
    setCleanLoading(true);
    setCleanError(null);
    try {
      const res = await cleanPattern(aiWorkerUrl, text, language, cleanPieceMode);
      const cleaned = formatCleanedPattern(res);
      if (!cleaned) {
        setCleanError(language === 'es'
          ? 'La IA no devolvió un patrón válido. Probá con un texto más completo.'
          : 'AI did not return a valid pattern. Try with more complete text.');
        return;
      }
      // Safety check: parse both versions and compare round counts. If the IA
      // silently altered any stitch counts, ask the user before applying.
      const before = parsePattern(text, { language });
      const after = parsePattern(cleaned, { language });
      const beforeCounts = before.pieces.flatMap((p) => p.rounds.map((r) => r.stitchCount));
      const afterCounts = after.pieces.flatMap((p) => p.rounds.map((r) => r.stitchCount));
      const totalBefore = beforeCounts.reduce((s, c) => s + c, 0);
      const totalAfter = afterCounts.reduce((s, c) => s + c, 0);
      const countsDiffer =
        beforeCounts.length !== afterCounts.length ||
        Math.abs(totalBefore - totalAfter) / Math.max(1, totalBefore) > 0.02;
      if (countsDiffer) {
        const msg = language === 'es'
          ? `La IA cambió las cuentas: ${beforeCounts.length} rondas / ${totalBefore} puntos antes → ${afterCounts.length} rondas / ${totalAfter} puntos después. ¿Aplicar igual?`
          : `AI changed the counts: ${beforeCounts.length} rounds / ${totalBefore} stitches before → ${afterCounts.length} rounds / ${totalAfter} stitches after. Apply anyway?`;
        if (!window.confirm(msg)) return;
      }
      setText(cleaned);
    } catch (err) {
      setCleanError(err instanceof Error ? err.message : String(err));
    } finally {
      setCleanLoading(false);
    }
  }

  function updateMaterial<K extends keyof typeof defaultMaterials>(key: K, value: any) {
    setDefaultMaterials({ ...defaultMaterials, [key]: value });
  }
  void updateMaterial;

  return (
    <div className="grid grid-cols-1 gap-4 p-4 xl:h-screen xl:max-h-screen xl:grid-cols-12">
      {/* Left column: pattern editor */}
      <Card className="flex flex-col p-4 overflow-hidden xl:col-span-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl text-cream-800">{t('pattern', language)}</h2>
            {loadedPatternName && (
              <p className="text-xs text-terracotta-600">📖 {loadedPatternName}</p>
            )}
          </div>
          <div className="flex gap-1 items-center">
            <details className="relative">
              <summary className="cursor-pointer text-xs text-cream-600 hover:text-cream-800 px-2 py-1 rounded hover:bg-cream-100 list-none flex items-center gap-1">
                <BookMarked size={12} />
                {language === 'es' ? 'Ejemplos' : 'Examples'}
              </summary>
              <div className="absolute right-0 top-full mt-1 w-64 max-h-80 overflow-y-auto z-20 bg-white border border-cream-200 rounded-lg shadow-lg p-1">
                {REAL_PATTERN_EXAMPLES.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => {
                      setText(ex.text);
                      setDefaultMaterials({ ...defaultMaterials, ...ex.materials });
                      (document.activeElement as HTMLElement)?.blur();
                    }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-cream-100 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{ex.icon}</span>
                      <div className="flex-1">
                        <div className="font-medium text-cream-800">{ex.name}</div>
                        <div className="text-cream-500 text-[10px]">{ex.designer}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </details>
            <Button variant="ghost" size="sm" onClick={handleTranslate} title={t('translate', language)}>
              <Languages size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!text.trim()) return;
                if (window.confirm(language === 'es' ? '¿Borrar el patrón actual?' : 'Clear the current pattern?')) {
                  setText('');
                  setLoadedPatternName(null);
                  setSelectedPieceId(null);
                  setAiImageUrl(null);
                  setAiError(null);
                  setCleanError(null);
                }
              }}
              disabled={!text.trim()}
              title={language === 'es' ? 'Borrar el patrón' : 'Clear pattern'}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('paste_pattern_here', language)}
          className="flex-1 min-h-0"
        />

        {/* Suggest AI cleanup when the pattern looks badly broken */}
        {aiWorkerUrl &&
          errors.filter((e) => e.severity === 'error').length >= 3 &&
          !cleanLoading && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
              <Wand2 size={16} className="text-amber-700 mt-0.5 shrink-0" />
              <div className="flex-1 text-xs">
                <p className="font-medium text-amber-900 mb-1">
                  {language === 'es'
                    ? `Encontré ${errors.filter((e) => e.severity === 'error').length} errores graves en este patrón`
                    : `Found ${errors.filter((e) => e.severity === 'error').length} critical errors in this pattern`}
                </p>
                <p className="text-amber-800 mb-2">
                  {language === 'es'
                    ? 'Probablemente venga del PDF con basura o líneas pegadas. ¿Querés que la IA lo limpie antes de visualizarlo?'
                    : 'Likely from a noisy PDF extraction. Want AI to clean it before visualizing?'}
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCleanPattern}
                  disabled={cleanLoading}
                >
                  <Wand2 size={12} />
                  {language === 'es' ? 'Limpiar con IA' : 'Clean with AI'}
                </Button>
              </div>
            </div>
          )}

        {errors.length > 0 && (
          <div className="mt-3 max-h-32 overflow-auto rounded-lg border border-cream-200 bg-cream-50 p-2 space-y-1">
            {errors.slice(0, 5).map((err, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <AlertCircle
                  size={14}
                  className={
                    err.severity === 'error'
                      ? 'text-red-500'
                      : err.severity === 'warning'
                      ? 'text-yellow-500'
                      : 'text-blue-500'
                  }
                />
                <div className="flex-1">
                  <span className="font-medium text-cream-800">
                    {err.round ? `R${err.round}: ` : ''}
                  </span>
                  <span className="text-cream-700">{err.message}</span>
                </div>
              </div>
            ))}
            {errors.length > 5 && (
              <p className="text-xs text-cream-500">+ {errors.length - 5} más</p>
            )}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <Button variant="primary" size="sm" onClick={openSaveModal} className="flex-1">
            <Save size={14} />
            {saved ? t('save_success', language) : t('save', language)}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <FileDown size={14} />
            PDF
          </Button>
        </div>
        {aiWorkerUrl && (
          <>
            {/* Clean-pattern mode toggle: split vs merge pieces.
                Note: "merge" only forces the parser into a single piece — it
                does NOT assemble pieces in their final positions (that would
                require reading the pattern's assembly instructions, which is
                a separate feature). */}
            <div className="mt-2 flex gap-1 text-xs">
              <button
                type="button"
                onClick={() => setCleanPieceMode('split')}
                className={`flex-1 px-2 py-1 rounded border transition ${
                  cleanPieceMode === 'split'
                    ? 'bg-terracotta-500 text-white border-terracotta-500'
                    : 'bg-cream-50 text-cream-700 border-cream-200 hover:bg-cream-100'
                }`}
                title={language === 'es'
                  ? 'Detecta cabeza, cuerpo, brazos, etc. como piezas separadas (recomendado)'
                  : 'Detects head, body, arms, etc. as separate pieces (recommended)'}
              >
                {language === 'es' ? 'Detectar piezas' : 'Detect pieces'}
              </button>
              <button
                type="button"
                onClick={() => setCleanPieceMode('merge')}
                className={`flex-1 px-2 py-1 rounded border transition ${
                  cleanPieceMode === 'merge'
                    ? 'bg-terracotta-500 text-white border-terracotta-500'
                    : 'bg-cream-50 text-cream-700 border-cream-200 hover:bg-cream-100'
                }`}
                title={language === 'es'
                  ? 'Forzar todo en una sola pieza (NO ensambla — solo concatena rondas)'
                  : 'Force into one piece (does NOT assemble — just concatenates rounds)'}
              >
                {language === 'es' ? 'Una sola pieza' : 'Single piece'}
              </button>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCleanPattern}
              disabled={cleanLoading || !text.trim()}
              className="mt-2 w-full"
              title={language === 'es'
                ? 'Limpia y estructura un patrón crudo con IA (típico de PDF mal copiado)'
                : 'Clean and structure a raw pattern using AI'}
            >
              <Wand2 size={14} />
              {cleanLoading
                ? language === 'es' ? 'Limpiando...' : 'Cleaning...'
                : language === 'es' ? 'Limpiar patrón (IA)' : 'Clean pattern (AI)'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerateRealistic}
              disabled={aiLoading || !pattern}
              className="mt-2 w-full"
              title={language === 'es' ? 'Generar imagen realista con IA' : 'Generate realistic image with AI'}
            >
              <Sparkles size={14} />
              {aiLoading
                ? language === 'es' ? 'Generando...' : 'Generating...'
                : language === 'es' ? 'Vista realista (IA)' : 'Realistic view (AI)'}
            </Button>
            {cleanError && (
              <p className="mt-2 text-xs text-red-600 break-words">{cleanError}</p>
            )}
          </>
        )}
      </Card>

      {/* Center column: 3D render */}
      <Card className="flex flex-col p-0 overflow-hidden min-h-[420px] xl:col-span-5 xl:min-h-0">
        <div className="flex-1 min-h-0">
          <Render3D geometry={displayedGeometry} />
        </div>
        <div className="border-t border-cream-200 p-3 grid grid-cols-3 gap-3 text-sm">
          <Stat
            label={t('size', language)}
            value={
              geometry
                ? `${geometry.estimatedSize.width.toFixed(1)} × ${geometry.estimatedSize.height.toFixed(1)} cm`
                : '—'
            }
          />
          <Stat
            label={t('yarn_needed', language)}
            value={geometry ? `${geometry.estimatedYarnGrams} g` : '—'}
          />
          <Stat
            label={t('pieces', language)}
            value={geometry ? `${geometry.pieces.length}` : '—'}
          />
        </div>
      </Card>

      {/* Right column: rounds + materials */}
      <Card className="flex flex-col p-4 overflow-hidden xl:col-span-3">
        <h3 className="mb-2 text-sm font-medium text-cream-700">{t('materials', language)}</h3>
        <MaterialPicker
          materials={defaultMaterials}
          onChange={setDefaultMaterials}
          language={language}
          variant="compact"
        />
        <div className="mt-3 mb-3">
          <span className="text-xs font-medium text-cream-700 mb-1.5 block">
            {language === 'es' ? 'Color' : 'Color'}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-6 w-6 rounded-full border-2 transition ${
                  color === c ? 'border-terracotta-500 ring-1 ring-terracotta-200' : 'border-cream-300'
                }`}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
            <label className="h-6 w-6 rounded-full border-2 border-cream-300 cursor-pointer overflow-hidden relative">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
              />
              <div className="absolute inset-0" style={{ background: 'conic-gradient(from 0deg, #f87171, #fbbf24, #34d399, #60a5fa, #a78bfa, #f87171)' }} />
            </label>
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-cream-700">{t('rounds', language)}</h3>
          {pattern && pattern.pieces.length > 1 && selectedPieceId && (
            <button
              type="button"
              onClick={() => setSelectedPieceId(null)}
              className="text-[11px] text-terracotta-600 hover:underline"
            >
              {language === 'es' ? '× ver todas' : '× show all'}
            </button>
          )}
        </div>
        {/* Piece selector tabs (only when there's more than 1 piece) */}
        {pattern && pattern.pieces.length > 1 && (
          <div className="mb-2 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setSelectedPieceId(null)}
              className={`text-[11px] px-2 py-0.5 rounded-full border transition ${
                selectedPieceId === null
                  ? 'bg-terracotta-500 text-white border-terracotta-500'
                  : 'bg-cream-50 text-cream-700 border-cream-200 hover:bg-cream-100'
              }`}
            >
              {language === 'es' ? 'Todas' : 'All'}
            </button>
            {pattern.pieces.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPieceId(p.id)}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition ${
                  selectedPieceId === p.id
                    ? 'bg-terracotta-500 text-white border-terracotta-500'
                    : 'bg-cream-50 text-cream-700 border-cream-200 hover:bg-cream-100'
                }`}
                title={p.name}
              >
                {p.name}
                {p.count > 1 && <span className="ml-1 opacity-70">×{p.count}</span>}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1 overflow-auto space-y-1">
          {pattern?.pieces
            .filter((p) => !selectedPieceId || p.id === selectedPieceId)
            .map((piece) => (
            <div key={piece.id} className="mb-3">
              <div className="text-xs font-semibold uppercase text-cream-500 mb-1">
                {piece.name} {piece.count > 1 && `(×${piece.count})`}
              </div>
              {piece.rounds.map((round) => (
                <div key={round.number}>
                  <div className="flex items-center justify-between gap-2 py-1 px-2 rounded hover:bg-cream-50">
                    <span className="text-xs font-mono text-cream-600 w-8">
                      {language === 'es' ? 'V' : 'R'}
                      {round.number}
                    </span>
                    <span className="flex-1 text-sm text-cream-800">{round.stitchCount}</span>
                    <Badge variant={round.operationKind}>{round.operationKind}</Badge>
                  </div>
                  {round.annotations && round.annotations.length > 0 && (
                    <div className="ml-10 space-y-0.5 mb-1">
                      {round.annotations.map((a, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 text-[11px] text-warm-600 italic"
                          title={a.rawText}
                        >
                          <span>{ANNOTATION_ICON[a.kind]}</span>
                          <span className="leading-tight">{a.summary}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-2">
          <button
            onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
            className="w-full text-xs text-cream-500 hover:text-cream-700"
          >
            {t('language', language)}: <span className="uppercase font-mono">{language}</span>
          </button>
        </div>
      </Card>

      {/* AI image modal */}
      {(aiImageUrl || aiError) && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-30 p-4"
          onClick={() => {
            setAiImageUrl(null);
            setAiError(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-cream-200">
              <h3 className="font-serif text-xl text-cream-900 flex items-center gap-2">
                <Sparkles size={18} className="text-terracotta-500" />
                {language === 'es' ? 'Vista realista' : 'Realistic view'}
              </h3>
              <button
                onClick={() => {
                  setAiImageUrl(null);
                  setAiError(null);
                }}
                className="text-cream-500 hover:text-cream-800"
              >
                <XIcon size={18} />
              </button>
            </div>
            {aiError && (
              <div className="p-6 text-sm text-red-700">
                <p className="font-medium mb-2">
                  {language === 'es' ? 'Error generando la imagen' : 'Error generating image'}
                </p>
                <p className="text-xs font-mono bg-red-50 p-2 rounded">{aiError}</p>
              </div>
            )}
            {aiImageUrl && (
              <>
                <img src={aiImageUrl} alt="AI generated" className="w-full" />
                <div className="p-3 flex justify-between items-center text-xs text-cream-500">
                  <span>
                    {language === 'es'
                      ? 'Generado con DALL-E 3 desde tu patrón'
                      : 'Generated with DALL-E 3 from your pattern'}
                  </span>
                  <a
                    href={aiImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="text-terracotta-600 hover:text-terracotta-700 underline"
                  >
                    {language === 'es' ? 'Descargar' : 'Download'}
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Save modal */}
      {showSaveModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 p-4"
          onClick={() => setShowSaveModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 space-y-4"
          >
            <h3 className="font-serif text-xl text-cream-900">
              {language === 'es' ? 'Guardar patrón' : 'Save pattern'}
            </h3>

            <label className="block">
              <span className="text-xs font-medium text-warm-700 mb-1 block">
                {language === 'es' ? 'Nombre' : 'Name'}
              </span>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                autoFocus
                className="w-full rounded-lg border border-warm-200 bg-white px-3 py-2 text-sm outline-none focus:border-terracotta-400"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-warm-700 mb-1 block">
                {language === 'es' ? 'Agregar a proyecto (opcional)' : 'Add to project (optional)'}
              </span>
              <select
                value={saveProjectId}
                onChange={(e) => setSaveProjectId(e.target.value)}
                className="w-full rounded-lg border border-warm-200 bg-white px-3 py-2 text-sm outline-none focus:border-terracotta-400"
              >
                <option value="">
                  {language === 'es' ? '— Solo en biblioteca —' : '— Library only —'}
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon ?? '✨'} {p.name}
                  </option>
                ))}
              </select>
              {projects.length === 0 && (
                <p className="text-[11px] text-warm-500 mt-1">
                  {language === 'es'
                    ? 'No hay proyectos. Podés crear uno desde la biblioteca.'
                    : 'No projects. Create one from the library.'}
                </p>
              )}
            </label>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" onClick={() => setShowSaveModal(false)}>
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button variant="primary" onClick={confirmSave}>
                <Save size={14} />
                {t('save', language)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-cream-500">{label}</div>
      <div className="font-medium text-cream-800">{value}</div>
    </div>
  );
}
