import { useMemo, useState } from 'react';
import {
  parsePattern,
  geometrizePattern,
  scaleByMaterials,
  scaleByCount,
  redimensionPattern,
  formatPattern,
  ALL_YARN_WEIGHTS,
  HOOK_SIZES,
} from '@/engine';
import { Render3D } from '@/components/visualizer/Render3D';
import { Card, Button, Textarea, Input, Select } from '@/components/common/ui';
import { useSettings } from '@/store/settings';
import { t } from '@/lib/i18n';

type Strategy = 'redimension' | 'materials' | 'count';

export function ScalerPage() {
  const { language, defaultMaterials } = useSettings();
  const [text, setText] = useState(() => t('example_pattern', language));
  const [strategy, setStrategy] = useState<Strategy>('redimension');

  // "count" strategy: pure factor multiplier
  const [factor, setFactor] = useState(1.5);

  // "materials" strategy: change yarn/hook (size auto-changes)
  const [newYarn, setNewYarn] = useState(defaultMaterials.yarnCyc);
  const [newHook, setNewHook] = useState(defaultMaterials.hookMm);

  // "redimension" strategy: full input — current size+materials → target size+materials
  const [currentSizeCm, setCurrentSizeCm] = useState(33);
  const [targetSizeCm, setTargetSizeCm] = useState(50);
  const [currentYarn, setCurrentYarn] = useState(3); // CYC 3 = DK / 8 hebras
  const [currentHook, setCurrentHook] = useState(3.25);
  const [redimYarn, setRedimYarn] = useState(2); // CYC 2 = sport / ~5-6 hebras
  const [redimHook, setRedimHook] = useState(2.25);

  const original = useMemo(() => {
    try {
      const p = parsePattern(text, { defaultMaterials });
      return { pattern: p, geometry: geometrizePattern(p) };
    } catch {
      return { pattern: null, geometry: null };
    }
  }, [text, defaultMaterials]);

  const scaled = useMemo(() => {
    if (!original.pattern) return { pattern: null, geometry: null, breakdown: null };
    if (strategy === 'redimension') {
      const result = redimensionPattern({
        pattern: original.pattern,
        currentMaterials: { yarnCyc: currentYarn, hookMm: currentHook, tension: 1.0 },
        currentSizeCm,
        newMaterials: { yarnCyc: redimYarn, hookMm: redimHook, tension: 1.0 },
        targetSizeCm,
      });
      return {
        pattern: result.pattern,
        geometry: geometrizePattern(result.pattern),
        breakdown: result.breakdown,
      };
    }
    if (strategy === 'materials') {
      const newMaterials = { yarnCyc: newYarn, hookMm: newHook, tension: 1.0 };
      const r = scaleByMaterials(original.pattern, newMaterials);
      return { pattern: r.pattern, geometry: geometrizePattern(r.pattern), breakdown: null };
    }
    const sp = scaleByCount(original.pattern, factor);
    return { pattern: sp, geometry: geometrizePattern(sp), breakdown: null };
  }, [original.pattern, strategy, factor, newYarn, newHook, currentYarn, currentHook, currentSizeCm, redimYarn, redimHook, targetSizeCm]);

  return (
    <div className="p-6 min-h-screen flex flex-col xl:h-screen">
      <h1 className="font-serif text-3xl text-cream-900 mb-1">{t('scaler_title', language)}</h1>
      <p className="text-sm text-cream-600 mb-4">
        {language === 'es'
          ? 'Tomá un patrón existente y proyectalo a otro tamaño — incluso cambiando hilo y aguja.'
          : 'Take an existing pattern and project it at another size — even with different yarn and hook.'}
      </p>

      <div className="grid flex-1 grid-cols-1 gap-4 min-h-0 xl:grid-cols-12">
        {/* Original */}
        <Card className="flex flex-col p-4 overflow-hidden xl:col-span-4">
          <h3 className="text-sm font-medium text-cream-700 mb-2">{t('original_pattern', language)}</h3>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} className="flex-1 min-h-[180px]" />
          {original.geometry && (
            <p className="mt-2 text-xs text-cream-500">
              {original.geometry.estimatedSize.width.toFixed(1)} × {original.geometry.estimatedSize.height.toFixed(1)} cm — {original.geometry.estimatedYarnGrams}g
            </p>
          )}
        </Card>

        {/* Strategy controls */}
        <Card className="p-4 xl:col-span-3">
          <h3 className="text-sm font-medium text-cream-700 mb-3">{t('strategy', language)}</h3>
          <div className="space-y-2 mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={strategy === 'redimension'}
                onChange={() => setStrategy('redimension')}
              />
              <span className="font-medium">
                {language === 'es' ? 'Re-dimensionar (cambio total)' : 'Resize (full change)'}
              </span>
            </label>
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

          {strategy === 'redimension' && (
            <div className="space-y-3">
              <div className="rounded-lg border border-cream-200 bg-cream-50 p-3 space-y-2">
                <h4 className="text-xs font-semibold uppercase text-cream-600">
                  {language === 'es' ? 'Tu pieza original' : 'Your original piece'}
                </h4>
                <Input
                  type="number"
                  step="0.5"
                  min="2"
                  label={language === 'es' ? 'Tamaño actual (cm)' : 'Current size (cm)'}
                  value={currentSizeCm}
                  onChange={(e) => setCurrentSizeCm(parseFloat(e.target.value) || 0)}
                />
                <Select
                  label={language === 'es' ? 'Hilo que usaste' : 'Yarn used'}
                  value={currentYarn}
                  onChange={(e) => setCurrentYarn(parseInt(e.target.value))}
                  options={ALL_YARN_WEIGHTS.map((y) => ({
                    value: y.cyc,
                    label: language === 'es' ? y.displayEs : y.displayEn,
                  }))}
                />
                <Select
                  label={language === 'es' ? 'Aguja que usaste' : 'Hook used'}
                  value={currentHook}
                  onChange={(e) => setCurrentHook(parseFloat(e.target.value))}
                  options={HOOK_SIZES.map((h) => ({ value: h.mm, label: `${h.mm}mm` }))}
                />
              </div>
              <div className="rounded-lg border border-terracotta-200 bg-terracotta-50 p-3 space-y-2">
                <h4 className="text-xs font-semibold uppercase text-terracotta-700">
                  {language === 'es' ? 'Lo que querés ahora' : 'What you want now'}
                </h4>
                <Input
                  type="number"
                  step="0.5"
                  min="2"
                  label={language === 'es' ? 'Tamaño objetivo (cm)' : 'Target size (cm)'}
                  value={targetSizeCm}
                  onChange={(e) => setTargetSizeCm(parseFloat(e.target.value) || 0)}
                />
                <Select
                  label={language === 'es' ? 'Hilo nuevo' : 'New yarn'}
                  value={redimYarn}
                  onChange={(e) => setRedimYarn(parseInt(e.target.value))}
                  options={ALL_YARN_WEIGHTS.map((y) => ({
                    value: y.cyc,
                    label: language === 'es' ? y.displayEs : y.displayEn,
                  }))}
                />
                <Select
                  label={language === 'es' ? 'Aguja nueva' : 'New hook'}
                  value={redimHook}
                  onChange={(e) => setRedimHook(parseFloat(e.target.value))}
                  options={HOOK_SIZES.map((h) => ({ value: h.mm, label: `${h.mm}mm` }))}
                />
              </div>
              {scaled.breakdown && (
                <div className="rounded-lg bg-cream-100 p-3 text-xs text-cream-700 space-y-1">
                  <p>
                    {language === 'es' ? 'Cambio de tamaño' : 'Size change'}:
                    <span className="font-mono ml-1">×{scaled.breakdown.sizeFactor.toFixed(2)}</span>
                  </p>
                  <p>
                    {language === 'es' ? 'Compensación por gauge' : 'Gauge compensation'}:
                    <span className="font-mono ml-1">×{scaled.breakdown.gaugeFactor.toFixed(2)}</span>
                  </p>
                  <p className="pt-1 border-t border-cream-300 font-semibold text-cream-900">
                    {language === 'es' ? 'Multiplicador final' : 'Final multiplier'}:
                    <span className="font-mono ml-1">×{scaled.breakdown.combined.toFixed(2)}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {strategy === 'materials' && (
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
          )}

          {strategy === 'count' && (
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
        <Card className="flex flex-col p-4 overflow-hidden xl:col-span-5">
          <h3 className="text-sm font-medium text-cream-700 mb-2">{t('scaled_pattern', language)}</h3>
          <div className="flex-1 min-h-0 grid grid-rows-[minmax(220px,1fr)_minmax(180px,1fr)] gap-2">
            <div className="overflow-hidden rounded-lg border border-cream-200 min-h-[220px]">
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
