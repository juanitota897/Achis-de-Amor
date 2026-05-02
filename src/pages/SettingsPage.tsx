import { useState } from 'react';
import { Card, Select, Input, Button } from '@/components/common/ui';
import { ALL_YARN_WEIGHTS, HOOK_SIZES } from '@/engine';
import { useSettings } from '@/store/settings';
import { t } from '@/lib/i18n';
import { checkWorkerHealth } from '@/lib/ai';

export function SettingsPage() {
  const settings = useSettings();
  const { language, units, defaultMaterials, customGauge, aiWorkerUrl } = settings;
  const [aiUrlInput, setAiUrlInput] = useState(aiWorkerUrl);
  const [aiCheckStatus, setAiCheckStatus] = useState<'idle' | 'checking' | 'ok' | 'fail'>('idle');

  async function testAiWorker() {
    setAiCheckStatus('checking');
    const ok = await checkWorkerHealth(aiUrlInput);
    setAiCheckStatus(ok ? 'ok' : 'fail');
    if (ok) settings.setAiWorkerUrl(aiUrlInput);
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="font-serif text-3xl text-cream-900">{t('settings', language)}</h1>

        <Card className="p-5 space-y-3">
          <h2 className="font-serif text-xl text-cream-800">{t('language', language)}</h2>
          <Select
            value={language}
            onChange={(e) => settings.setLanguage(e.target.value as 'es' | 'en')}
            options={[
              { value: 'es', label: 'Español' },
              { value: 'en', label: 'English' },
            ]}
          />
          <Select
            label={language === 'es' ? 'Unidades' : 'Units'}
            value={units}
            onChange={(e) => settings.setUnits(e.target.value as 'cm' | 'in')}
            options={[
              { value: 'cm', label: 'cm' },
              { value: 'in', label: 'in (inches)' },
            ]}
          />
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-serif text-xl text-cream-800">{language === 'es' ? 'Materiales por defecto' : 'Default materials'}</h2>
          <Select
            label={t('yarn', language)}
            value={defaultMaterials.yarnCyc}
            onChange={(e) => settings.setDefaultMaterials({ ...defaultMaterials, yarnCyc: parseInt(e.target.value) })}
            options={ALL_YARN_WEIGHTS.map((y) => ({ value: y.cyc, label: `${y.cyc} — ${y.name}` }))}
          />
          <Select
            label={t('hook', language)}
            value={defaultMaterials.hookMm}
            onChange={(e) => settings.setDefaultMaterials({ ...defaultMaterials, hookMm: parseFloat(e.target.value) })}
            options={HOOK_SIZES.map((h) => ({ value: h.mm, label: `${h.mm}mm` }))}
          />
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-serif text-xl text-cream-800">
            {language === 'es' ? 'Tu gauge medido' : 'Your measured gauge'}
          </h2>
          <p className="text-sm text-cream-600">
            {language === 'es'
              ? 'Si medís cuánto mide un punto bajo con tu hilo y aguja, los cálculos son más precisos.'
              : 'If you measure how big your single crochet is with your yarn + hook, calculations get more accurate.'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              step="0.5"
              label={`${t('width', language)} (mm)`}
              value={customGauge?.width ?? ''}
              placeholder="—"
              onChange={(e) =>
                settings.setCustomGauge(
                  e.target.value ? { width: parseFloat(e.target.value), height: customGauge?.height ?? 0 } : null,
                )
              }
            />
            <Input
              type="number"
              step="0.5"
              label={`${t('height', language)} (mm)`}
              value={customGauge?.height ?? ''}
              placeholder="—"
              onChange={(e) =>
                settings.setCustomGauge(
                  e.target.value ? { width: customGauge?.width ?? 0, height: parseFloat(e.target.value) } : null,
                )
              }
            />
          </div>
          {customGauge && (
            <Button variant="ghost" size="sm" onClick={() => settings.setCustomGauge(null)}>
              {language === 'es' ? 'Borrar gauge custom' : 'Clear custom gauge'}
            </Button>
          )}
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-serif text-xl text-cream-800">
            🪄 {language === 'es' ? 'Inteligencia artificial' : 'Artificial intelligence'}
          </h2>
          <p className="text-sm text-cream-600">
            {language === 'es'
              ? 'Funcionalidades opcionales con IA: generar imagen realista del producto, limpiar patrones desordenados, analizar fotos del PDF. Requiere desplegar el Worker de Cloudflare (gratis, instrucciones en /worker/README.md).'
              : 'Optional AI features: generate realistic product images, clean messy patterns, analyze PDF photos. Requires deploying the Cloudflare Worker (free, instructions in /worker/README.md).'}
          </p>
          <Input
            type="text"
            label={language === 'es' ? 'URL del Worker' : 'Worker URL'}
            placeholder="https://achis-de-amor-worker.tu-cuenta.workers.dev"
            value={aiUrlInput}
            onChange={(e) => setAiUrlInput(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={testAiWorker}>
              {aiCheckStatus === 'checking'
                ? language === 'es' ? 'Probando...' : 'Testing...'
                : language === 'es' ? 'Probar y guardar' : 'Test & save'}
            </Button>
            {aiCheckStatus === 'ok' && (
              <span className="text-xs text-sage-700">
                ✓ {language === 'es' ? 'Conectado' : 'Connected'}
              </span>
            )}
            {aiCheckStatus === 'fail' && (
              <span className="text-xs text-red-600">
                ✗ {language === 'es' ? 'No responde' : 'Not responding'}
              </span>
            )}
          </div>
          {aiWorkerUrl && (
            <p className="text-xs text-warm-500">
              {language === 'es' ? 'IA habilitada. ' : 'AI enabled. '}
              <button
                onClick={() => {
                  settings.setAiWorkerUrl('');
                  setAiUrlInput('');
                  setAiCheckStatus('idle');
                }}
                className="underline hover:text-warm-700"
              >
                {language === 'es' ? 'Desconectar' : 'Disconnect'}
              </button>
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
