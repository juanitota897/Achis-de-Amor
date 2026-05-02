import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Eye, Settings2, Search } from 'lucide-react';
import {
  generatePattern,
  geometrizePattern,
  formatPattern,
  PART_TEMPLATES,
  CATEGORY_INFO,
  templatesByCategory,
  scaleShape,
  applyAspect,
  type PartTemplate,
  type PartCategory,
} from '@/engine';
import { Render3D } from '@/components/visualizer/Render3D';
import { Card, Button } from '@/components/common/ui';
import { MaterialPicker } from '@/components/common/MaterialPicker';
import { useSettings } from '@/store/settings';
import { t } from '@/lib/i18n';
import { savePattern, newId } from '@/lib/db';

const PRESET_COLORS = [
  '#E5D2B0', '#F0E5CF', '#D6A77A', '#B85B3D', '#7A5236',
  '#A4BC85', '#7A9CB8', '#F2C0C8', '#1F1A17', '#F8F4EC',
];

const SIZE_LABELS = [
  { value: 0.6, label: { es: 'Mini', en: 'Mini' } },
  { value: 0.8, label: { es: 'Chico', en: 'Small' } },
  { value: 1.0, label: { es: 'Mediano', en: 'Medium' } },
  { value: 1.3, label: { es: 'Grande', en: 'Large' } },
  { value: 1.6, label: { es: 'Gigante', en: 'Giant' } },
];

export function GeneratorPage() {
  const navigate = useNavigate();
  const { language, defaultMaterials, setDefaultMaterials } = useSettings();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(PART_TEMPLATES[1].id); // medium head as default
  const [scale, setScale] = useState(1.0);
  const [aspect, setAspect] = useState(1.0);
  const [color, setColor] = useState('#E5D2B0');
  const [advancedMode, setAdvancedMode] = useState(false);
  const [advancedShape, setAdvancedShape] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<PartCategory>>(new Set());

  const selectedTemplate = useMemo<PartTemplate>(
    () => PART_TEMPLATES.find((t) => t.id === selectedTemplateId) ?? PART_TEMPLATES[0],
    [selectedTemplateId],
  );

  // Reset scale and aspect when template changes
  function pickTemplate(tpl: PartTemplate) {
    setSelectedTemplateId(tpl.id);
    setScale(tpl.defaultScale ?? 1.0);
    setAspect(1.0);
    setAdvancedShape(null);
  }

  // Compute the effective shape from template + scale + aspect (or advanced override)
  const effectiveShape = useMemo(() => {
    if (advancedMode && advancedShape) return advancedShape;
    let shape = scaleShape(selectedTemplate.shape, scale);
    if (aspect !== 1.0) shape = applyAspect(shape, aspect);
    return shape;
  }, [selectedTemplate, scale, aspect, advancedMode, advancedShape]);

  const result = useMemo(() => {
    try {
      const pattern = generatePattern(effectiveShape, { language, materials: defaultMaterials, color });
      const geometry = geometrizePattern(pattern);
      return { pattern, geometry };
    } catch {
      return { pattern: null, geometry: null };
    }
  }, [effectiveShape, language, defaultMaterials, color]);

  async function savePatternToLibrary(): Promise<string | null> {
    if (!result.pattern) return null;
    const id = newId();
    await savePattern({
      id,
      name: `${selectedTemplate.label[language]} — ${result.geometry?.estimatedSize.width.toFixed(1)}cm`,
      source: 'generated',
      language,
      sourceText: formatPattern(result.pattern, { language }),
      pattern: result.pattern,
      materials: defaultMaterials,
      isCompleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return id;
  }

  async function saveAndGoToLibrary() {
    await savePatternToLibrary();
    navigate('/app/biblioteca');
  }

  async function saveAndOpenVisualizer() {
    const id = await savePatternToLibrary();
    if (id) navigate(`/app/visualizador?id=${id}`);
  }

  const categorized = useMemo(() => templatesByCategory(), []);
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categorized;
    const q = search.toLowerCase();
    const out: Record<string, PartTemplate[]> = {};
    for (const [cat, items] of Object.entries(categorized)) {
      const matches = items.filter(
        (t) =>
          t.label.es.toLowerCase().includes(q) ||
          t.label.en.toLowerCase().includes(q) ||
          t.description?.es.toLowerCase().includes(q) ||
          t.description?.en.toLowerCase().includes(q),
      );
      if (matches.length > 0) out[cat] = matches;
    }
    return out;
  }, [categorized, search]);

  function toggleCategory(cat: PartCategory) {
    setCollapsedCategories((s) => {
      const next = new Set(s);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  return (
    <div className="grid h-screen grid-cols-12 gap-3 p-3 overflow-hidden">
      {/* LEFT — categories & templates */}
      <Card className="col-span-3 flex flex-col p-3 overflow-hidden">
        <h2 className="font-serif text-xl text-cream-800 mb-3 px-1">
          {language === 'es' ? 'Partes' : 'Parts'}
        </h2>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-2.5 text-cream-500" />
          <input
            type="text"
            placeholder={t('search', language)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-cream-200 bg-white py-1.5 pl-8 pr-3 text-sm outline-none focus:border-terracotta-400"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {Object.entries(CATEGORY_INFO)
            .sort(([, a], [, b]) => a.order - b.order)
            .map(([catKey, info]) => {
              const cat = catKey as PartCategory;
              const items = filteredCategories[cat] ?? [];
              if (items.length === 0) return null;
              const isCollapsed = collapsedCategories.has(cat) && !search;
              return (
                <div key={cat}>
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-cream-600 px-1 py-1 hover:text-cream-800"
                  >
                    <span className="flex items-center gap-2">
                      <span>{info.icon}</span>
                      <span>{info.label[language]}</span>
                      <span className="text-cream-400">({items.length})</span>
                    </span>
                    <span className={`transition ${isCollapsed ? '' : 'rotate-90'}`}>▸</span>
                  </button>
                  {!isCollapsed && (
                    <div className="space-y-1 mt-1">
                      {items.map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => pickTemplate(tpl)}
                          className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition flex items-center gap-2 ${
                            tpl.id === selectedTemplateId
                              ? 'bg-terracotta-100 text-terracotta-800 font-medium'
                              : 'hover:bg-cream-100 text-cream-700'
                          }`}
                        >
                          <span className="text-base shrink-0">{tpl.icon}</span>
                          <span className="text-xs leading-tight">{tpl.label[language]}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </Card>

      {/* CENTER — 3D preview */}
      <Card className="col-span-6 flex flex-col p-0 overflow-hidden">
        <div className="border-b border-cream-200 px-5 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-2xl text-cream-900">
                {selectedTemplate.icon} {selectedTemplate.label[language]}
              </h1>
              {selectedTemplate.description && (
                <p className="text-xs text-cream-600 mt-0.5">
                  {selectedTemplate.description[language]}
                </p>
              )}
            </div>
            {result.geometry && (
              <div className="text-right">
                <div className="font-medium text-cream-800 text-lg">
                  {result.geometry.estimatedSize.width.toFixed(1)} × {result.geometry.estimatedSize.height.toFixed(1)} cm
                </div>
                <div className="text-xs text-cream-500">
                  {result.geometry.estimatedYarnGrams} g · {result.pattern?.pieces[0]?.rounds.length} {language === 'es' ? 'vueltas' : 'rounds'}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <Render3D geometry={result.geometry} background="#FBF7F1" />
        </div>
      </Card>

      {/* RIGHT — controls */}
      <Card className="col-span-3 flex flex-col p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-xl text-cream-800">
            {language === 'es' ? 'Ajustes' : 'Settings'}
          </h2>
          <button
            onClick={() => setAdvancedMode(!advancedMode)}
            className={`text-xs px-2 py-1 rounded transition ${
              advancedMode
                ? 'bg-terracotta-100 text-terracotta-700'
                : 'text-cream-600 hover:bg-cream-100'
            }`}
            title={language === 'es' ? 'Modo avanzado' : 'Advanced mode'}
          >
            <Settings2 size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Size slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-cream-700">
                {language === 'es' ? 'Tamaño' : 'Size'}
              </span>
              <span className="text-xs font-mono text-cream-600">×{scale.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.4}
              max={2.0}
              step={0.05}
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full accent-terracotta-500"
            />
            <div className="grid grid-cols-5 gap-1 mt-1.5">
              {SIZE_LABELS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setScale(s.value)}
                  className={`text-[10px] py-1 rounded transition ${
                    Math.abs(scale - s.value) < 0.01
                      ? 'bg-terracotta-500 text-white'
                      : 'bg-cream-100 text-cream-700 hover:bg-cream-200'
                  }`}
                >
                  {s.label[language]}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-cream-700">
                {language === 'es' ? 'Forma' : 'Shape'}
              </span>
              <span className="text-xs font-mono text-cream-600">
                {aspect < 0.95 ? (language === 'es' ? 'achatada' : 'flat') : aspect > 1.05 ? (language === 'es' ? 'alargada' : 'tall') : (language === 'es' ? 'normal' : 'normal')}
              </span>
            </div>
            <input
              type="range"
              min={0.6}
              max={1.6}
              step={0.05}
              value={aspect}
              onChange={(e) => setAspect(parseFloat(e.target.value))}
              className="w-full accent-terracotta-500"
            />
            <div className="flex justify-between text-[10px] text-cream-500 mt-0.5 px-1">
              <span>↔</span>
              <span>•</span>
              <span>↕</span>
            </div>
          </div>

          {/* Color */}
          <div>
            <span className="text-xs font-medium text-cream-700 mb-1.5 block">
              {language === 'es' ? 'Color' : 'Color'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full border-2 transition ${
                    color === c ? 'border-terracotta-500 ring-2 ring-terracotta-200' : 'border-cream-300'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
              <label className="h-7 w-7 rounded-full border-2 border-cream-300 cursor-pointer overflow-hidden relative">
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

          {/* Materials */}
          <div className="pt-3 border-t border-cream-200">
            <MaterialPicker
              materials={defaultMaterials}
              onChange={setDefaultMaterials}
              language={language}
              variant="compact"
            />
          </div>

          {/* Advanced mode params */}
          {advancedMode && (
            <div className="space-y-2 pt-2 border-t border-cream-200">
              <p className="text-xs text-cream-600">
                {language === 'es' ? 'Modo avanzado: editá los parámetros directamente.' : 'Advanced mode: edit params directly.'}
              </p>
              {(['diameter', 'diameterTop', 'height', 'length', 'width'] as const).map((key) => {
                const val = (effectiveShape as any)[key];
                if (val === undefined) return null;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-cream-700">{t(key === 'diameterTop' ? 'diameter_top' : key, language)} (cm)</span>
                      <span className="text-xs font-mono text-cream-600">{val.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={30}
                      step={0.1}
                      value={val}
                      onChange={(e) => setAdvancedShape({ ...effectiveShape, [key]: parseFloat(e.target.value) })}
                      className="w-full accent-terracotta-500"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="pt-3 border-t border-cream-200 mt-3 space-y-2">
          <Button variant="primary" onClick={saveAndGoToLibrary} className="w-full">
            <Save size={14} />
            {t('save', language)} & {t('library', language).toLowerCase()}
          </Button>
          <Button
            variant="secondary"
            onClick={saveAndOpenVisualizer}
            className="w-full"
          >
            <Eye size={14} />
            {t('open_in_visualizer', language)}
          </Button>
        </div>
      </Card>
    </div>
  );
}
