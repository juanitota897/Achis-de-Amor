/**
 * First-visit onboarding modal.
 *
 * Shows once (gated by localStorage). Walks the user through the 4 main
 * features of Achis de Amor with a step-by-step modal.
 */

import { useState } from 'react';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { Eye, Wand2, Maximize2, Sparkles, ChevronRight, ChevronLeft, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ONBOARDING_KEY = 'achis:onboarded:v1';

interface Step {
  icon: LucideIcon;
  titleEs: string;
  titleEn: string;
  bodyEs: string;
  bodyEn: string;
}

const STEPS: Step[] = [
  {
    icon: Eye,
    titleEs: 'Visualizá tu patrón en 3D',
    titleEn: 'Visualize your pattern in 3D',
    bodyEs:
      'Pegá un patrón en el textarea y aparece la pieza en 3D al instante. Podés rotarla, hacer zoom, cambiar color e hilo.',
    bodyEn:
      'Paste a pattern in the textarea and the 3D piece appears instantly. You can rotate, zoom, change color and yarn.',
  },
  {
    icon: Wand2,
    titleEs: 'Limpiá patrones desordenados con IA',
    titleEn: 'Clean messy patterns with AI',
    bodyEs:
      'Si pegaste un patrón sacado de un PDF y se ve raro (líneas pegadas, basura del PDF), tocá "Limpiar patrón (IA)" y la IA lo deja prolijo manteniendo todas las cuentas.',
    bodyEn:
      'If you pasted a pattern from a PDF and it looks messy, tap "Clean pattern (AI)" and the AI tidies it up while preserving all stitch counts.',
  },
  {
    icon: Maximize2,
    titleEs: 'Adaptá el tamaño y los materiales',
    titleEn: 'Adjust size and materials',
    bodyEs:
      'En el Escalador podés agrandar o achicar cualquier patrón. En el Visualizador, cambiá el tipo de hilo y el grosor de aguja para ver cómo afecta al tamaño final.',
    bodyEn:
      'In the Scaler you can resize any pattern. In the Visualizer, change yarn weight and hook size to see how it affects the final dimensions.',
  },
  {
    icon: Sparkles,
    titleEs: 'Vista realista con IA',
    titleEn: 'Realistic AI preview',
    bodyEs:
      'Una vez que el patrón se ve bien en 3D, tocá "Vista realista (IA)" y la IA genera una foto fotorrealista. Útil para mostrar a clientas el resultado final antes de empezar a tejer.',
    bodyEn:
      'Once the pattern looks good in 3D, tap "Realistic view (AI)" and AI generates a photorealistic preview. Useful for showing clients the final result before starting to crochet.',
  },
];

interface OnboardingProps {
  language: 'es' | 'en';
}

export function Onboarding({ language }: OnboardingProps) {
  const [done, setDone] = useLocalStorage<boolean>(ONBOARDING_KEY, false);
  const [step, setStep] = useState(0);

  if (done) return null;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  function close() {
    setDone(true);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={close}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-terracotta-100">
            <Icon className="text-terracotta-700" size={22} />
          </div>
          <button
            onClick={close}
            aria-label={language === 'es' ? 'Saltar tutorial' : 'Skip tutorial'}
            className="text-cream-500 hover:text-cream-700 -mr-2 -mt-2 p-2"
          >
            <X size={18} />
          </button>
        </div>

        <h2 className="mb-2 font-serif text-2xl text-cream-900">
          {language === 'es' ? current.titleEs : current.titleEn}
        </h2>
        <p className="text-base text-cream-700 leading-relaxed">
          {language === 'es' ? current.bodyEs : current.bodyEn}
        </p>

        {/* Step dots */}
        <div className="mt-6 flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Paso ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'w-6 bg-terracotta-500' : 'w-2 bg-cream-300 hover:bg-cream-400'
              }`}
            />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center gap-1 px-4 py-2 text-sm text-cream-600 hover:text-cream-800 disabled:opacity-30 disabled:hover:text-cream-600"
          >
            <ChevronLeft size={16} />
            {language === 'es' ? 'Atrás' : 'Back'}
          </button>
          <button
            onClick={close}
            className="text-xs text-cream-500 hover:text-cream-700 underline"
          >
            {language === 'es' ? 'Saltar' : 'Skip'}
          </button>
          {isLast ? (
            <button
              onClick={close}
              className="flex items-center gap-1 rounded-lg bg-terracotta-500 px-4 py-2 text-sm font-medium text-white hover:bg-terracotta-600"
            >
              {language === 'es' ? '¡Empezar!' : "Let's go!"}
            </button>
          ) : (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1 rounded-lg bg-terracotta-500 px-4 py-2 text-sm font-medium text-white hover:bg-terracotta-600"
            >
              {language === 'es' ? 'Siguiente' : 'Next'}
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
