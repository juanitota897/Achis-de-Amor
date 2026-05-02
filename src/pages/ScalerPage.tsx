import { useMemo, useState } from 'react';
import {
  parsePattern,
  geometrizePattern,
  scaleByMaterials,
  scaleByCount,
  formatPattern,
  ALL_YARN_WEIGHTS,
  HOOK_SIZES,
} from '@/engine';
import { Render3D } from '@/components/visualizer/Render3D';
import { Card, Button, Textarea, Input, Select } from '@/components/common/ui';
import { useSettings } from '@/store/settings';
import { t } from '@/lib/i18n';

type Strategy = 'materials' | 'count';

export function ScalerPage() {
  const { language, defaultMaterials } = useSettings();
  const [text, setText] = useState(() => t('example_pattern', language));
  const [strategy, setStrategy] = useState<Strategy>('materials');
  const [factor, setFactor] = useState(1.5);
  const [newYarn, setNewYarn] = useState(defaultMaterials.yarnCyc);
  const [newHook, setNewHook] = useState(defaultMaterials.hookMm);

  const original = useMemo(() => {
    try {
      const p = parsePattern(text, { defaultMaterials });
      return { pattern: p, geometry: geometrizePattern(p) };
    } catch {
      return { pattern: null, geometry: null };
    }
  }, [text, defaultMaterials]);

  const scaled = useMemo(() => {
    if (!original.pattern) return { pattern: null, geometry: null };
    if (strategy === 'materials') {
      const newMaterials = { yarnCyc: newYarn, hookMm: newHook, tension: 1.0 };
      const r = scaleByMaterials(original.pattern, newMaterials);
      return { pattern: r.pattern, geometry: geometrizePattern(r.pattern) };
    } else {
      const sp = scaleByCount(original.pattern, factor);
      return { pattern: sp, geometry: geometrizePattern(sp) };
    }
  }, [original.pattern, strategy, factor, newYarn, newHook]);

  return (
    <div className="p-6 h-screen flex flex-col">
      <h1 className="font-serif text-3xl text-cream-900 mb-1">{t('scaler_title', language)}</h1>
      <p className="text-sm text-cream-600 mb-4">
        {language === 'es'
          ? 'Tomá un patrón existente y proyectalo a otro tamaño.'
          : 'Take an existing pattern and project it at another size.'}
      </p>

      <div className="grid flex-1 grid-cols-12 gap-4 min-h-0">
        {/* Original */}
        <Card className="col-span-4 flex flex-col p-4 overflow-hidden">
          <h3 className="text-sm font-medium text-cream-700 mb-2">{t('original_pattern', language)}</h3>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} className="flex-1 min-h-0" />
          {original.geometry && (
            <p className="mt-2 text-xs text-cream-500">
              {original.geometry.estimatedSize.width.toFixed(1)} × {original.geometry.estimatedSize.height.toFixed(1)} cm — {original.geometry.estimatedYarnGrams}g
            </p>
          )}
        </Card>

        {/* Strategy controls */}
        <Card className="col-span-3 p-4">
          <h3 className="text-sm font-medium text-cream-700 mb-3">{t('strategy', language)}</h3>
          <div className="space-y-2 mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={strategy === 'materials'}
                onChange={() => setStrategy('materials')}
              />
              {t('by_materials', language)}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={strategy === 'count'}
                onChange={() => setStrategy('count')}
              />
              {t('by_count', language)}
            </label>
          </div>

          {strategy === 'materials' ? (
            <div className="space-y-3">
              <Select
                label={t('yarn', language)}
                value={newYarn}
                onChange={(e) => setNewYarn(parseInt(e.target.value))}
                options={ALL_YARN_WEIGHTS.map((y) => ({ value: y.cyc, label: `${y.cyc} — ${y.name}` }))}
              />
              <Select
                label={t('hook', language)}
                value={newHook}
                onChange={(e) => setNewHook(parseFloat(e.target.value))}
                options={HOOK_SIZES.map((h) => ({ value: h.mm, label: `${h.mm}mm` }))}
              />
            </div>
          ) : (
            <Input
              type="number"
              step="0.1"
              min="0.3"
              max="5"
              label={t('factor', language)}
              value={factor}
              onChange={(e) => setFactor(parseFloat(e.target.value))}
            />
          )}
        </Card>

        {/* Result */}
        <Card className="col-span-5 flex flex-col p-4 overflow-hidden">
          <h3 className="text-sm font-medium text-cream-700 mb-2">{t('scaled_pattern', language)}</h3>
          <div className="flex-1 min-h-0 grid grid-rows-2 gap-2">
            <div className="overflow-hidden rounded-lg border border-cream-200">
              <Render3D geometry={scaled.geometry} autoRotate={false} />
            </div>
            <pre className="overflow-auto rounded-lg border border-cream-200 bg-cream-50 p-3 text-xs font-mono text-cream-800">
              {scaled.pattern ? formatPattern(scaled.pattern, { language }) : '—'}
            </pre>
          </div>
          {scaled.geometry && (
            <p className="mt-2 text-xs text-cream-500">
              {scaled.geometry.estimatedSize.width.toFixed(1)} × {scaled.geometry.estimatedSize.height.toFixed(1)} cm — {scaled.geometry.estimatedYarnGrams}g
            </p>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (scaled.pattern) {
                const txt = formatPattern(scaled.pattern, { language });
                navigator.clipboard?.writeText(txt);
              }
            }}
            className="mt-2"
          >
            {language === 'es' ? 'Copiar al portapapeles' : 'Copy to clipboard'}
          </Button>
        </Card>
      </div>
    </div>
  );
}
