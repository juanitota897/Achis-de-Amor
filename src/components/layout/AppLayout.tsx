/**
 * App layout: sidebar with navigation + main area.
 *
 * Responsive behavior:
 *   - xl+ (≥ 1280px, desktop): sidebar always visible.
 *   - < xl (tablet/iPad/phone): sidebar collapses into a hamburger drawer.
 */

import { type ReactNode, useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Eye,
  Wand2,
  Maximize2,
  Calculator,
  BookOpen,
  Settings,
  GraduationCap,
  Home,
  Menu,
  X,
} from 'lucide-react';
import { useSettings } from '@/store/settings';
import { t } from '@/lib/i18n';
import { Onboarding } from '@/components/common/Onboarding';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { language, setLanguage } = useSettings();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Auto-close the drawer on route change so it doesn't stay overlaid.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const navItems = [
    { path: '/app/visualizador', label: t('visualizer', language), icon: Eye },
    { path: '/app/generador', label: t('generator', language), icon: Wand2 },
    { path: '/app/escalador', label: t('scaler', language), icon: Maximize2 },
    { path: '/app/calculadoras', label: t('calculators', language), icon: Calculator },
    { path: '/app/biblioteca', label: t('library', language), icon: BookOpen },
    { path: '/tutoriales', label: t('tutorials', language), icon: GraduationCap },
    { path: '/app/configuracion', label: t('settings', language), icon: Settings },
  ];

  const sidebarBody = (
    <>
      <div className="flex items-center gap-2 px-5 py-5 border-b border-cream-200">
        <NavLink to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-terracotta-500 flex items-center justify-center text-white font-serif">
            A
          </div>
          <span className="font-serif text-lg text-cream-800">Achis de Amor</span>
        </NavLink>
      </div>

      <nav className="flex-1 p-3 overflow-auto">
        <NavLink
          to="/"
          className="mb-2 flex items-center gap-3 rounded-lg px-3 py-3 text-base text-cream-600 hover:bg-cream-100 xl:py-2 xl:text-sm"
        >
          <Home size={18} />
          {t('home', language)}
        </NavLink>

        <div className="my-2 h-px bg-cream-200" />

        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `mb-1 flex items-center gap-3 rounded-lg px-3 py-3 text-base transition-colors xl:py-2 xl:text-sm ${
                isActive
                  ? 'bg-terracotta-100 text-terracotta-800 font-medium'
                  : 'text-cream-700 hover:bg-cream-100'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-cream-200 p-3">
        <button
          onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
          className="w-full flex items-center justify-between rounded-lg px-3 py-3 text-base text-cream-600 hover:bg-cream-100 xl:py-2 xl:text-sm"
        >
          <span>{t('language', language)}</span>
          <span className="font-mono text-xs uppercase text-cream-700">{language}</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-cream-50">
      {/* Mobile/tablet top bar: only visible below xl */}
      <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between border-b border-cream-200 bg-white px-4 py-3 xl:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menú"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-cream-700 hover:bg-cream-100"
        >
          <Menu size={20} />
        </button>
        <NavLink to="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-terracotta-500 flex items-center justify-center text-white font-serif text-sm">
            A
          </div>
          <span className="font-serif text-base text-cream-800">Achis de Amor</span>
        </NavLink>
        <div className="w-10" /> {/* spacer for symmetry */}
      </header>

      {/* Drawer backdrop (mobile/tablet only when open) */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 xl:hidden"
        />
      )}

      {/* Sidebar — desktop: always visible. Mobile/tablet: drawer slides in. */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-cream-200 bg-white transition-transform
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
          xl:static xl:w-60 xl:translate-x-0
        `}
      >
        {/* Close button (mobile/tablet drawer only) */}
        <button
          onClick={() => setDrawerOpen(false)}
          aria-label="Cerrar menú"
          className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-cream-700 hover:bg-cream-100 xl:hidden"
        >
          <X size={18} />
        </button>
        {sidebarBody}
      </aside>

      {/* Main content — leave room for the fixed top bar on mobile/tablet */}
      <main className="flex-1 overflow-auto pt-14 xl:pt-0">
        <div key={location.pathname} className="h-full">
          {children}
        </div>
      </main>

      {/* First-visit onboarding */}
      <Onboarding language={language} />
    </div>
  );
}
