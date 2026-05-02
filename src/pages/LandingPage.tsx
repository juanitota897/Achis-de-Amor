import { Link } from 'react-router-dom';
import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { Eye, Wand2, Maximize2 } from 'lucide-react';
import { generatePattern } from '@/engine';
import { geometrizePattern } from '@/engine/geometry';
import { AmigurumiMesh } from '@/components/visualizer/AmigurumiMesh';
import { useSettings } from '@/store/settings';
import { t } from '@/lib/i18n';

export function LandingPage() {
  const { language, setLanguage } = useSettings();

  // Pre-generate a sample sphere amigurumi for the hero
  const heroGeometry = useMemo(() => {
    const pattern = generatePattern({ kind: 'sphere', diameter: 8 });
    return geometrizePattern(pattern);
  }, []);

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="border-b border-cream-200 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-terracotta-500 flex items-center justify-center text-white font-serif text-sm">
              A
            </div>
            <span className="font-serif text-xl text-cream-800">Achis de Amor</span>
          </div>
          <nav className="flex items-center gap-4">
            <button
              onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
              className="text-sm text-cream-700 hover:text-cream-900"
            >
              {language === 'es' ? 'EN' : 'ES'}
            </button>
            <Link
              to="/app/visualizador"
              className="rounded-lg bg-terracotta-500 px-4 py-2 text-sm text-white hover:bg-terracotta-600 transition"
            >
              {t('hero_cta', language)} →
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <section className="grid gap-12 md:grid-cols-2 md:items-center">
          <div className="space-y-6">
            <h1 className="font-serif text-5xl leading-tight text-cream-900">
              {t('hero_title', language)}
            </h1>
            <p className="text-lg text-cream-700">
              {t('hero_subtitle', language)}
            </p>
            <div className="space-y-2">
              <Feature label={t('feature_1', language)} icon={Eye} />
              <Feature label={t('feature_2', language)} icon={Wand2} />
              <Feature label={t('feature_3', language)} icon={Maximize2} />
            </div>
            <div className="flex gap-3 pt-4">
              <Link
                to="/app/visualizador"
                className="rounded-lg bg-terracotta-500 px-6 py-3 text-white shadow hover:bg-terracotta-600 transition"
              >
                {t('hero_cta', language)} →
              </Link>
              <Link
                to="/tutoriales"
                className="rounded-lg border border-cream-300 px-6 py-3 text-cream-700 hover:bg-cream-100 transition"
              >
                {t('tutorials', language)}
              </Link>
            </div>
          </div>

          <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-cream-200 bg-gradient-to-br from-cream-100 to-cream-50">
            <Canvas shadows camera={{ position: [10, 6, 10], fov: 35 }}>
              <Suspense fallback={null}>
                <hemisphereLight args={['#FFE9C4', '#A89484', 0.6]} />
                <directionalLight position={[10, 15, 8]} intensity={1.2} castShadow />
                <directionalLight position={[-8, 5, -5]} intensity={0.3} color="#F2C0C8" />
                <group position={[0, -1, 0]}>
                  {heroGeometry.pieces.map((p) => (
                    <AmigurumiMesh key={p.pieceId} geometry={p} />
                  ))}
                </group>
                <ContactShadows position={[0, -2, 0]} opacity={0.3} scale={20} blur={2} />
                <Environment preset="apartment" />
                <OrbitControls
                  autoRotate
                  autoRotateSpeed={1.5}
                  enablePan={false}
                  enableZoom={false}
                  target={[0, 0, 0]}
                />
              </Suspense>
            </Canvas>
          </div>
        </section>
      </main>

      <footer className="border-t border-cream-200 mt-16">
        <div className="mx-auto max-w-6xl px-6 py-6 text-center text-sm text-cream-500">
          Achis de Amor · {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}

function Feature({ label, icon: Icon }: { label: string; icon: typeof Eye }) {
  return (
    <div className="flex items-center gap-3 text-cream-700">
      <Icon size={18} className="text-terracotta-500" />
      <span>{label}</span>
    </div>
  );
}
