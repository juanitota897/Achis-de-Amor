/**
 * Global settings store.
 * Persists language preference, default materials, theme, etc. to localStorage.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language, MaterialSpec } from '@/engine/types';

export type RenderMode = 'plush' | 'technical';

interface SettingsState {
  language: Language;
  units: 'cm' | 'in';
  defaultMaterials: MaterialSpec;
  customGauge: { width: number; height: number } | null;
  renderMode: RenderMode;
  /** URL of the deployed Cloudflare Worker for AI features (or empty if not configured). */
  aiWorkerUrl: string;
  setLanguage: (lang: Language) => void;
  setUnits: (units: 'cm' | 'in') => void;
  setDefaultMaterials: (m: MaterialSpec) => void;
  setCustomGauge: (g: { width: number; height: number } | null) => void;
  setRenderMode: (mode: RenderMode) => void;
  setAiWorkerUrl: (url: string) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: (typeof navigator !== 'undefined' && navigator.language?.startsWith('en')) ? 'en' : 'es',
      units: 'cm',
      defaultMaterials: {
        yarnCyc: 3,
        hookMm: 3.5,
        tension: 1.0,
      },
      customGauge: null,
      renderMode: 'plush' as RenderMode,
      aiWorkerUrl: '',
      setLanguage: (lang) => set({ language: lang }),
      setUnits: (units) => set({ units }),
      setDefaultMaterials: (defaultMaterials) => set({ defaultMaterials }),
      setCustomGauge: (customGauge) => set({ customGauge }),
      setRenderMode: (renderMode) => set({ renderMode }),
      setAiWorkerUrl: (aiWorkerUrl) => set({ aiWorkerUrl: aiWorkerUrl.trim() }),
    }),
    { name: 'achis-settings' },
  ),
);
