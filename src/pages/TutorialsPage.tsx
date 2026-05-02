import { Card } from '@/components/common/ui';
import { Eye, Wand2, Maximize2, BookOpen } from 'lucide-react';
import { useSettings } from '@/store/settings';
import { t } from '@/lib/i18n';
import { Link } from 'react-router-dom';

export function TutorialsPage() {
  const { language } = useSettings();

  const lessons = [
    {
      title: language === 'es' ? 'Cómo usar el visualizador' : 'How to use the visualizer',
      icon: Eye,
      to: '/app/visualizador',
      desc: language === 'es'
        ? 'Pegá tu patrón en texto, elegí materiales y mirá el resultado en 3D antes de empezar a tejer.'
        : 'Paste your pattern, pick your materials and see the 3D result before crocheting.',
    },
    {
      title: language === 'es' ? 'Generar tus propios patrones' : 'Generating your own patterns',
      icon: Wand2,
      to: '/app/generador',
      desc: language === 'es'
        ? 'Elegí una forma (esfera, cilindro, cono...), definí dimensiones y obtené el patrón escrito.'
        : 'Pick a shape (sphere, cylinder, cone...), set dimensions and get the written pattern.',
    },
    {
      title: language === 'es' ? 'Escalar un patrón a otro tamaño' : 'Scaling a pattern to another size',
      icon: Maximize2,
      to: '/app/escalador',
      desc: language === 'es'
        ? 'Tomá un patrón existente y proyectalo a otro tamaño cambiando hilo o multiplicando puntos.'
        : 'Take an existing pattern and project it at another size by changing yarn or multiplying counts.',
    },
  ];

  const faqs = language === 'es'
    ? [
        { q: '¿Cómo mido mi gauge?', a: 'Tejé un cuadrado de 10×10 puntos bajos con tu hilo y aguja. Medí cuántos cm da. Esa medida la cargás en Ajustes para que los cálculos sean más precisos para vos.' },
        { q: '¿Qué hilo elijo?', a: 'Para amigurumis chicos (8-15 cm), un hilo categoría 2-3 (sport o DK) con aguja de 2.5-3.5mm va perfecto. Para más grandes, subí a categoría 4 (worsted) con 4-5mm.' },
        { q: '¿Por qué mi amigurumi no queda como en la foto?', a: 'Las tres causas más comunes: 1) tu gauge es distinto al del diseñador, 2) el patrón tiene errores que no se notan al leer (probalo en el visualizador), 3) el patrón fue generado por IA sin testear.' },
        { q: '¿Diferencia entre BLO y FLO?', a: 'Back loop only y front loop only — significa tejer solo en una de las dos hebras del punto previo. BLO crea un pliegue visible útil para definir la base de un sombrero, las patas, etc.' },
        { q: '¿Cómo empiezo si nunca tejí?', a: 'Te recomendamos aprender los puntos básicos en YouTube (anillo mágico, punto bajo, aumento, disminución) antes de venir acá. Esta herramienta asume que sabés tejer y te ayuda a no equivocarte con los patrones.' },
      ]
    : [
        { q: 'How do I measure my gauge?', a: 'Crochet a 10×10 sc square. Measure it. Enter that measurement in Settings to get more accurate calculations.' },
        { q: 'Which yarn should I use?', a: 'For small amigurumis (8-15cm), a CYC 2-3 yarn with a 2.5-3.5mm hook works great. For larger, go CYC 4 (worsted) with 4-5mm.' },
        { q: "Why doesn't my amigurumi look like the photo?", a: 'Three common causes: 1) your gauge differs from the designer\'s, 2) the pattern has errors that aren\'t obvious when reading (test it in the visualizer), 3) the pattern was AI-generated without testing.' },
        { q: 'Difference between BLO and FLO?', a: 'Back loop only and front loop only — work into just one of the two strands of the stitch below. BLO creates a visible fold useful for hat brims, legs, etc.' },
        { q: 'How do I start if I never crocheted before?', a: 'We recommend learning the basics on YouTube (magic ring, single crochet, increase, decrease) before using this. This tool assumes you can crochet and helps you avoid pattern mistakes.' },
      ];

  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 font-serif text-3xl text-cream-900">{t('tutorials', language)}</h1>

        <h2 className="font-serif text-xl text-cream-800 mb-3">
          {language === 'es' ? 'Tour guiado' : 'Guided tour'}
        </h2>
        <div className="grid gap-4 md:grid-cols-3 mb-10">
          {lessons.map((lesson) => (
            <Link key={lesson.title} to={lesson.to}>
              <Card className="p-5 h-full hover:shadow-md transition cursor-pointer">
                <lesson.icon className="text-terracotta-500 mb-3" size={24} />
                <h3 className="font-medium text-cream-900 mb-2">{lesson.title}</h3>
                <p className="text-sm text-cream-600">{lesson.desc}</p>
              </Card>
            </Link>
          ))}
        </div>

        <h2 className="font-serif text-xl text-cream-800 mb-3 flex items-center gap-2">
          <BookOpen size={20} />
          FAQs
        </h2>
        <Card className="divide-y divide-cream-200">
          {faqs.map((faq, i) => (
            <details key={i} className="p-5 group">
              <summary className="cursor-pointer font-medium text-cream-900 list-none flex items-center justify-between">
                <span>{faq.q}</span>
                <span className="text-cream-400 group-open:rotate-180 transition">▾</span>
              </summary>
              <p className="mt-3 text-sm text-cream-700 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </Card>
      </div>
    </div>
  );
}
