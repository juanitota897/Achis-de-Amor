/**
 * Friendly material picker.
 *
 * Replaces the basic Select/dropdown approach with a more visual interface:
 *   - Yarn selector shows the friendly name + ply system (e.g., "Semigrueso (8/6 / DK)")
 *     with the recommended hook range as a hint.
 *   - Hook selector groups sizes into "fine / medium / thick" zones with the mm
 *     prominently displayed.
 *   - Optional "what your yarn is called" text input that auto-matches aliases
 *     ("8/6", "Scheepjes Catona", "fingering" all resolve to the right CYC).
 */

import { useState } from 'react';
import { ALL_YARN_WEIGHTS, HOOK_SIZES, findYarnByName, type MaterialSpec } from '@/engine';
import type { Language } from '@/engine/types';

interface MaterialPickerProps {
  materials: MaterialSpec;
  onChange: (m: MaterialSpec) => void;
  language: Language;
  /** Compact = single-line look, full = expanded with descriptions */
  variant?: 'compact' | 'full';
}

export function MaterialPicker({
  materials,
  onChange,
  language,
  variant = 'full',
}: MaterialPickerProps) {
  const [yarnSearch, setYarnSearch] = useState('');
  const yarn = ALL_YARN_WEIGHTS.find((y) => y.cyc === materials.yarnCyc) ?? ALL_YARN_WEIGHTS[3];

  function pickYarnByCyc(cyc: number) {
    const newYarn = ALL_YARN_WEIGHTS.find((y) => y.cyc === cyc);
    if (!newYarn) return;
    // Auto-pick the recommended midpoint hook if current hook is way off
    const currentHook = materials.hookMm;
    const isOutOfRange =
      currentHook < newYarn.recommendedHookMm.min ||
      currentHook > newYarn.recommendedHookMm.max;
    onChange({
      ...materials,
      yarnCyc: cyc,
      hookMm: isOutOfRange
        ? (newYarn.recommendedHookMm.min + newYarn.recommendedHookMm.max) / 2
        : currentHook,
    });
  }

  function trySearch(value: string) {
    setYarnSearch(value);
    if (value.trim().length >= 2) {
      const match = findYarnByName(value.trim());
      if (match) pickYarnByCyc(match.cyc);
    }
  }

  return (
    <div className="space-y-3">
      {/* Yarn picker */}
      <div>
        <label className="text-xs font-medium text-cream-700 mb-1.5 block">
          {language === 'es' ? 'Tipo de hilo' : 'Yarn type'}
        </label>

        {/* Quick-pick chips by category */}
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          {ALL_YARN_WEIGHTS.map((y) => (
            <button
              key={y.cyc}
              onClick={() => pickYarnByCyc(y.cyc)}
              className={`text-left px-2.5 py-2 rounded-lg text-xs transition border ${
                materials.yarnCyc === y.cyc
                  ? 'bg-terracotta-100 border-terracotta-400 text-terracotta-800'
                  : 'bg-white border-cream-200 text-cream-700 hover:bg-cream-50'
              }`}
            >
              <div className="font-medium leading-tight">
                {language === 'es' ? y.displayEs : y.displayEn}
              </div>
              {variant === 'full' && (
                <div className="text-[10px] text-cream-500 mt-0.5">
                  {language === 'es' ? 'Aguja' : 'Hook'}{' '}
                  {y.recommendedHookMm.min}–{y.recommendedHookMm.max} mm
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Search by name */}
        {variant === 'full' && (
          <div className="relative">
            <input
              type="text"
              placeholder={
                language === 'es'
                  ? '¿Cómo se llama tu hilo? (ej: 8/6, semigrueso, Scheepjes Catona)'
                  : 'What is your yarn called? (e.g., DK, fingering, Catona)'
              }
              value={yarnSearch}
              onChange={(e) => trySearch(e.target.value)}
              className="w-full rounded-lg border border-cream-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-terracotta-400"
            />
          </div>
        )}

        {/* Examples for selected */}
        {variant === 'full' && yarn.examples.length > 0 && (
          <p className="text-[10px] text-cream-500 mt-1.5">
            {language === 'es' ? 'Ejemplos: ' : 'Examples: '}
            {yarn.examples.slice(0, 3).join(', ')}
          </p>
        )}
      </div>

      {/* Hook picker */}
      <div>
        <label className="text-xs font-medium text-cream-700 mb-1.5 block">
          {language === 'es' ? 'Aguja' : 'Hook'}
          <span className="ml-2 text-cream-500 font-normal">
            ({language === 'es' ? 'sugerida: ' : 'suggested: '}
            {yarn.recommendedHookMm.min}–{yarn.recommendedHookMm.max} mm)
          </span>
        </label>
        <HookSlider
          mm={materials.hookMm}
          recommended={yarn.recommendedHookMm}
          onChange={(mm) => onChange({ ...materials, hookMm: mm })}
        />
      </div>

      {/* Tension (compact) */}
      {variant === 'full' && (
        <div>
          <label className="text-xs font-medium text-cream-700 mb-1.5 block">
            {language === 'es' ? 'Tu tensión' : 'Your tension'}
          </label>
          <div className="grid grid-cols-3 gap-1">
            {[
              { value: 0.85, label: language === 'es' ? 'Apretada' : 'Tight' },
              { value: 1.0, label: language === 'es' ? 'Normal' : 'Normal' },
              { value: 1.15, label: language === 'es' ? 'Suelta' : 'Loose' },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => onChange({ ...materials, tension: t.value })}
                className={`px-2 py-1.5 rounded text-xs transition ${
                  Math.abs(materials.tension - t.value) < 0.01
                    ? 'bg-terracotta-500 text-white'
                    : 'bg-cream-100 text-cream-700 hover:bg-cream-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Hook slider with visual highlight of recommended range

interface HookSliderProps {
  mm: number;
  recommended: { min: number; max: number };
  onChange: (mm: number) => void;
}

function HookSlider({ mm, recommended, onChange }: HookSliderProps) {
  const allHooks = HOOK_SIZES.filter((h) => h.mm >= 1.5 && h.mm <= 12);
  // Snap to nearest standard hook on change
  function pickClosest(value: number) {
    const closest = allHooks.reduce((prev, curr) =>
      Math.abs(curr.mm - value) < Math.abs(prev.mm - value) ? curr : prev,
    );
    onChange(closest.mm);
  }

  return (
    <div>
      <input
        type="range"
        min={1.5}
        max={12}
        step={0.25}
        value={mm}
        onChange={(e) => pickClosest(parseFloat(e.target.value))}
        className="w-full accent-terracotta-500"
      />
      <div className="flex items-center justify-between text-[10px] text-cream-500 mt-1">
        <span>1.5mm</span>
        <span className="font-mono text-terracotta-700 font-bold text-sm">{mm}mm</span>
        <span>12mm</span>
      </div>
      {(mm < recommended.min || mm > recommended.max) && (
        <p className="text-[10px] text-amber-700 mt-1">
          ⚠ Aguja fuera del rango recomendado para este hilo
        </p>
      )}
    </div>
  );
}
