import { useState } from 'react';
import { Card, Input, Select } from '@/components/common/ui';
import { estimateYarnGrams } from '@/engine/gauge';
import { ALL_YARN_WEIGHTS, HOOK_SIZES, STITCHES, getAllStitchAliases, resolveStitch } from '@/engine';
import { useSettings } from '@/store/settings';
import { t } from '@/lib/i18n';

export function CalculatorsPage() {
  const { language } = useSettings();

  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 font-serif text-3xl text-cream-900">{t('calculators', language)}</h1>
        <div className="grid gap-6 md:grid-cols-2">
          <YarnCalculator />
          <TimeCalculator />
          <HookConverter />
          <NotationConverter />
          <CostCalculator />
          <GaugeMeasurer />
        </div>
      </div>
    </div>
  );
}

// ─── Yarn calculator ─────────────────────────────────────────────────────

function YarnCalculator() {
  const { language } = useSettings();
  const [stitches, setStitches] = useState(500);
  const [yarn, setYarn] = useState(3);
  const grams = estimateYarnGrams(stitches, { yarnCyc: yarn, hookMm: 3.5, tension: 1.0 });
  const yarnInfo = ALL_YARN_WEIGHTS.find((y) => y.cyc === yarn)!;
  const meters = ((grams / 100) * yarnInfo.metersPer100g).toFixed(0);

  return (
    <Card className="p-5">
      <h3 className="font-serif text-xl text-cream-800 mb-3">{t('calc_yarn_title', language)}</h3>
      <div className="space-y-3">
        <Input
          type="number"
          label={t('total_stitches', language)}
          value={stitches}
          onChange={(e) => setStitches(parseInt(e.target.value) || 0)}
        />
        <Select
          label={t('yarn', language)}
          value={yarn}
          onChange={(e) => setYarn(parseInt(e.target.value))}
          options={ALL_YARN_WEIGHTS.map((y) => ({ value: y.cyc, label: `${y.cyc} — ${y.name}` }))}
        />
      </div>
      <div className="mt-4 rounded-lg bg-cream-50 p-3 text-sm">
        <div className="flex justify-between"><span className="text-cream-600">{t('estimated_grams', language)}</span><span className="font-medium">{grams} g</span></div>
        <div className="flex justify-between"><span className="text-cream-600">{t('estimated_meters', language)}</span><span className="font-medium">{meters} m</span></div>
      </div>
    </Card>
  );
}

// ─── Time calculator ─────────────────────────────────────────────────────

function TimeCalculator() {
  const { language } = useSettings();
  const [stitches, setStitches] = useState(500);
  const [stitchesPerMinute, setStitchesPerMinute] = useState(20);

  const minutes = Math.ceil(stitches / stitchesPerMinute);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return (
    <Card className="p-5">
      <h3 className="font-serif text-xl text-cream-800 mb-3">{t('calc_time_title', language)}</h3>
      <div className="space-y-3">
        <Input
          type="number"
          label={t('total_stitches', language)}
          value={stitches}
          onChange={(e) => setStitches(parseInt(e.target.value) || 0)}
        />
        <Input
          type="number"
          label={language === 'es' ? 'Puntos por minuto' : 'Stitches per minute'}
          value={stitchesPerMinute}
          onChange={(e) => setStitchesPerMinute(parseInt(e.target.value) || 1)}
        />
      </div>
      <div className="mt-4 rounded-lg bg-cream-50 p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-cream-600">{t('hours', language)}</span>
          <span className="font-medium">{hours}h {mins}m</span>
        </div>
      </div>
    </Card>
  );
}

// ─── Hook converter ──────────────────────────────────────────────────────

function HookConverter() {
  const { language } = useSettings();

  return (
    <Card className="p-5">
      <h3 className="font-serif text-xl text-cream-800 mb-3">{t('calc_hooks_title', language)}</h3>
      <div className="max-h-64 overflow-y-auto rounded-lg border border-cream-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-cream-100 text-cream-700">
            <tr>
              <th className="text-left p-2">mm</th>
              <th className="text-left p-2">US</th>
              <th className="text-left p-2">UK</th>
            </tr>
          </thead>
          <tbody>
            {HOOK_SIZES.map((h) => (
              <tr key={h.mm} className="border-t border-cream-100">
                <td className="p-2 font-medium">{h.mm}</td>
                <td className="p-2 text-cream-600">{h.us ?? '—'}</td>
                <td className="p-2 text-cream-600">{h.uk ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── Notation converter ──────────────────────────────────────────────────

function NotationConverter() {
  const { language } = useSettings();
  const [input, setInput] = useState('');
  const resolved = input ? resolveStitch(input.trim()) : null;

  return (
    <Card className="p-5">
      <h3 className="font-serif text-xl text-cream-800 mb-3">{t('calc_notation_title', language)}</h3>
      <Input
        type="text"
        placeholder={language === 'es' ? 'Ej: pb, sc, single crochet...' : 'Ex: sc, pb, punto bajo...'}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      {resolved && (
        <div className="mt-4 rounded-lg bg-cream-50 p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-cream-600">ES</span>
            <span className="font-medium">{STITCHES[resolved].abbreviation.es} ({STITCHES[resolved].displayName.es})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cream-600">EN</span>
            <span className="font-medium">{STITCHES[resolved].abbreviation.en} ({STITCHES[resolved].displayName.en})</span>
          </div>
        </div>
      )}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-cream-600">
          {language === 'es' ? 'Ver todos los aliases' : 'See all aliases'}
        </summary>
        <p className="mt-2 text-xs text-cream-500 leading-relaxed">
          {getAllStitchAliases().slice(0, 30).join(', ')}...
        </p>
      </details>
    </Card>
  );
}

// ─── Cost calculator ─────────────────────────────────────────────────────

function CostCalculator() {
  const { language } = useSettings();
  const [grams, setGrams] = useState(80);
  const [costPerGram, setCostPerGram] = useState(50);
  const [hours, setHours] = useState(8);
  const [hourlyRate, setHourlyRate] = useState(2000);

  const yarnCost = grams * costPerGram;
  const laborCost = hours * hourlyRate;
  const total = yarnCost + laborCost;

  return (
    <Card className="p-5">
      <h3 className="font-serif text-xl text-cream-800 mb-3">{t('calc_cost_title', language)}</h3>
      <div className="space-y-2">
        <Input type="number" label={t('estimated_grams', language)} value={grams} onChange={(e) => setGrams(parseInt(e.target.value) || 0)} />
        <Input type="number" label={t('cost_per_gram', language)} value={costPerGram} onChange={(e) => setCostPerGram(parseFloat(e.target.value) || 0)} />
        <Input type="number" label={t('hours', language)} value={hours} onChange={(e) => setHours(parseFloat(e.target.value) || 0)} />
        <Input type="number" label={t('hourly_rate', language)} value={hourlyRate} onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)} />
      </div>
      <div className="mt-4 rounded-lg bg-cream-50 p-3 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-cream-600">{t('yarn', language)}</span><span>${yarnCost.toFixed(0)}</span></div>
        <div className="flex justify-between"><span className="text-cream-600">{language === 'es' ? 'Mano de obra' : 'Labor'}</span><span>${laborCost.toFixed(0)}</span></div>
        <div className="flex justify-between border-t border-cream-200 pt-1 mt-1 font-medium"><span>{t('total_cost', language)}</span><span className="text-terracotta-600">${total.toFixed(0)}</span></div>
      </div>
    </Card>
  );
}

// ─── Gauge measurer ──────────────────────────────────────────────────────

function GaugeMeasurer() {
  const { language } = useSettings();
  const [stitches, setStitches] = useState(10);
  const [width, setWidth] = useState(4);
  const [rounds, setRounds] = useState(10);
  const [height, setHeight] = useState(4);

  const widthPerStitch = width / stitches;
  const heightPerRound = height / rounds;

  return (
    <Card className="p-5">
      <h3 className="font-serif text-xl text-cream-800 mb-3">{t('calc_gauge_title', language)}</h3>
      <p className="text-xs text-cream-600 mb-3">
        {language === 'es'
          ? 'Tejé un cuadrado de prueba y medilo:'
          : 'Crochet a test swatch and measure it:'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Input type="number" label={t('stitches', language)} value={stitches} onChange={(e) => setStitches(parseInt(e.target.value) || 1)} />
        <Input type="number" step="0.5" label={`${t('width', language)} (cm)`} value={width} onChange={(e) => setWidth(parseFloat(e.target.value) || 1)} />
        <Input type="number" label={t('rounds', language)} value={rounds} onChange={(e) => setRounds(parseInt(e.target.value) || 1)} />
        <Input type="number" step="0.5" label={`${t('height', language)} (cm)`} value={height} onChange={(e) => setHeight(parseFloat(e.target.value) || 1)} />
      </div>
      <div className="mt-4 rounded-lg bg-cream-50 p-3 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-cream-600">{language === 'es' ? 'Por punto' : 'Per stitch'}</span><span>{(widthPerStitch * 10).toFixed(1)} mm</span></div>
        <div className="flex justify-between"><span className="text-cream-600">{language === 'es' ? 'Por ronda' : 'Per round'}</span><span>{(heightPerRound * 10).toFixed(1)} mm</span></div>
      </div>
    </Card>
  );
}
