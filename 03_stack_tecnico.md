# Stack técnico

**Última actualización:** 2026-04-30
**Status:** Propuesta inicial — pendiente revisión

---

## Filosofía

Stack moderno pero conservador. Nada experimental. Todo lo que recomiendo tiene 5+ años de tracción, comunidad grande, y está probado en producción a escala. La meta es que dentro de dos años puedas mantener esto sin que se desactualice.

Diferencia con G-Layer: aquel proyecto se beneficia del single-file HTML porque es una experiencia continua tipo "app". Achis de Amor tiene navegación entre secciones, biblioteca persistente, multi-pieza con render 3D pesado, exportación a PDF — la complejidad pide framework real.

---

## Stack recomendado

| Capa | Tecnología | Por qué |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | Routing nativo, server components para PDF/SEO, una sola tecnología para landing pública + app interna |
| Lenguaje | **TypeScript** | El motor matemático tiene mucha estructura — TS atrapa bugs antes de que lleguen al usuario |
| Estilos | **Tailwind CSS v4** | Velocidad de iteración, paleta consistente vía CSS variables |
| UI components | **shadcn/ui** | Componentes copy-paste personalizables, no librería externa pesada |
| 3D | **Three.js + React Three Fiber + Drei** | Estándar de facto para 3D web. R3F integra Three.js con React |
| Estado | **Zustand** | Mucho más simple que Redux para el alcance que tenemos |
| Forms | **React Hook Form + Zod** | Validación en cliente y servidor con un solo schema |
| Data fetching | **TanStack Query** | Cache automático, optimistic updates |
| Backend | **Supabase** | Postgres + Auth + Realtime + Storage. Misma stack que ya conocés |
| Auth | **Supabase Auth** | Email/password + magic link + Google OAuth cuando convenga |
| Hosting | **Vercel** | Deploy automático desde GitHub, edge functions, integración perfecta con Next.js |
| Dominio | A decidir | Sugerencia: `achisdeamor.com` (si está libre) o `achisdeamor.app` |
| PDF generation | **@react-pdf/renderer** | Client-side, sin server. Si crece, migrar a Puppeteer en Edge Function |
| Iconos | **Lucide** | Coherente con shadcn/ui |
| Analytics | **Plausible** | Privacy-friendly, ligero, sin banners molestos de cookies |
| Errors | **Sentry** | Monitoreo de errores en producción |

---

## Por qué Next.js y no single-file HTML

Pros del single-file (lo que conocés de G-Layer):
- Despliegue trivial (subís un archivo)
- Cero build step
- Cero dependencias

Pros de Next.js para este proyecto:
- **Routing real:** `/app/visualizador`, `/app/generador`, etc. son URLs separadas. Cada una se carga independiente.
- **Code splitting automático:** el visualizador no carga el código del generador hasta que el usuario navega a él. Performance.
- **SEO de la landing:** Server Components renderizan HTML completo en el servidor, Google lo indexa. Crítico cuando agreguemos blog/tienda.
- **Server Actions:** export de PDF, validaciones críticas, llamadas a APIs externas — todo en el mismo proyecto sin separar backend.
- **Imagen optimizada:** las miniaturas de la biblioteca se sirven en webp/avif automáticamente.
- **Biblioteca de patrones grande:** mantener el state de cientos de patrones en localStorage y un single-file se va a poner pesado rápido.

Concretamente: tu mamá podría tener 50 patrones guardados en su biblioteca + cada patrón cargado tiene su mesh 3D + estás corriendo Three.js + React. El single-file HTML colapsa con esa complejidad.

---

## Arquitectura del proyecto

```
achisdeamor/
├─ app/                          # Next.js App Router
│  ├─ (public)/                  # Group route: páginas públicas
│  │  ├─ page.tsx                # Landing /
│  │  ├─ layout.tsx              # Layout con header público
│  │  ├─ login/page.tsx
│  │  └─ signup/page.tsx
│  ├─ app/                       # Workspace privado
│  │  ├─ layout.tsx              # Layout con sidebar
│  │  ├─ visualizador/page.tsx
│  │  ├─ generador/page.tsx
│  │  ├─ escalador/page.tsx
│  │  ├─ calculadoras/
│  │  │  ├─ page.tsx
│  │  │  ├─ hilo/page.tsx
│  │  │  ├─ tiempo/page.tsx
│  │  │  └─ ...
│  │  ├─ biblioteca/page.tsx
│  │  └─ configuracion/page.tsx
│  ├─ tutoriales/page.tsx
│  └─ api/                       # API Routes / Server Actions
│     ├─ export-pdf/route.ts
│     └─ ...
│
├─ components/                   # Componentes React
│  ├─ ui/                        # shadcn/ui base
│  ├─ visualizer/                # Componentes del visualizador
│  │  ├─ PatternEditor.tsx
│  │  ├─ Render3D.tsx
│  │  ├─ RoundsList.tsx
│  │  └─ ...
│  ├─ generator/
│  ├─ scaler/
│  └─ shared/                    # Header, sidebar, etc
│
├─ lib/
│  ├─ engine/                    # ★ Motor matemático del crochet
│  │  ├─ stitches.ts             # Diccionario de puntos
│  │  ├─ yarns.ts                # Diccionario de hilos
│  │  ├─ hooks.ts                # Diccionario de agujas
│  │  ├─ gauge.ts                # Calculador de gauge
│  │  ├─ parser.ts               # Parser de patrones
│  │  ├─ translator.ts           # ES ↔ EN
│  │  ├─ geometry.ts             # Geometrizador (anillos → 3D)
│  │  ├─ assembly.ts             # Ensamblador multi-pieza
│  │  ├─ generator.ts            # Generador inverso
│  │  ├─ scaler.ts               # Escalador
│  │  ├─ validator.ts            # Detección de errores
│  │  ├─ shapes/                 # Catálogo de formas
│  │  │  ├─ sphere.ts
│  │  │  ├─ cylinder.ts
│  │  │  ├─ ...
│  │  └─ types.ts                # Tipos TypeScript del Pattern
│  ├─ supabase/                  # Cliente y queries
│  │  ├─ client.ts
│  │  ├─ server.ts
│  │  └─ queries/
│  ├─ store/                     # Zustand stores
│  └─ utils/
│
├─ public/                       # Assets estáticos
├─ supabase/                     # Migrations y funciones edge
│  ├─ migrations/
│  └─ functions/
├─ tests/                        # Tests (vitest)
│  └─ engine/                    # ★ Tests del motor (críticos)
│
├─ package.json
├─ tsconfig.json
├─ tailwind.config.ts
└─ next.config.ts
```

**Notable:** `lib/engine/` está aislado del resto del código. Es el motor puro, sin dependencias de React ni de Supabase. Eso permite testearlo sin tocar el frontend, y eventualmente expornerlo como API si quisieras.

---

## Modelo de datos en Supabase

### Tabla: `patterns`

```sql
create table patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  description text,
  language text check (language in ('es', 'en', 'mixed')) default 'es',
  source_text text not null,           -- patrón crudo escrito por el usuario
  parsed_data jsonb,                    -- estructura Pattern parseada
  materials jsonb,                      -- { yarn: {...}, hook_mm, tension }
  geometry_cache jsonb,                 -- coordenadas 3D pre-calculadas
  thumbnail_url text,                   -- screenshot del render
  folder_id uuid references folders,
  source_url text,                      -- de dónde lo sacó (Etsy, propio, etc)
  source_designer text,                 -- quien lo diseñó
  is_own_design boolean default false,  -- ¿es de la usuaria o ajeno?
  is_completed boolean default false,
  notes text,                           -- notas personales
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on patterns(user_id);
create index on patterns(folder_id);
create index on patterns(updated_at desc);
```

### Tabla: `folders`

```sql
create table folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  parent_folder_id uuid references folders,
  color text,                           -- hex para distinguir visualmente
  position integer,                     -- orden custom
  created_at timestamptz default now()
);
```

Carpetas anidables. Defaults útiles que se crean al registrarse: "Patrones míos", "Patrones comprados", "WIP", "Completados", "Para clientes".

### Tabla: `user_preferences`

```sql
create table user_preferences (
  user_id uuid primary key references auth.users,
  language_pref text default 'es',
  units text check (units in ('cm', 'in')) default 'cm',
  default_yarn_cyc integer,             -- categoría CYC por defecto
  default_hook_mm numeric,
  measured_gauge jsonb,                 -- gauge medido por el usuario
  theme text default 'light',
  onboarding_completed boolean default false
);
```

### Tabla: `yarn_catalog`

```sql
create table yarn_catalog (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  name text not null,
  cyc_weight integer not null,
  fiber text,                           -- "100% algodón mercerizado", etc
  default_gauge jsonb,                  -- gauge declarado por el fabricante
  meters_per_100g numeric,
  is_official boolean default false,    -- catálogo curado vs aportado por usuarios
  added_by uuid references auth.users,
  created_at timestamptz default now()
);

create unique index on yarn_catalog(brand, name);
```

Catálogo público de hilos. Usuarios pueden agregar los suyos. Eventual moderación para casos famosos (Drops, Scheepjes, Yarn Art, Hobbii).

### Storage buckets

- `pattern-thumbnails/` — miniaturas de renders 3D (privado, RLS)
- `pattern-exports/` — PDFs exportados (privado, RLS)
- `user-avatars/` — fotos de perfil (público)

### RLS (Row Level Security)

Toda tabla con `user_id` tiene política: solo el dueño lee/escribe sus filas. `yarn_catalog` con `is_official=true` es público para lectura, todos pueden agregar (con flag).

---

## Performance y consideraciones técnicas

### Motor matemático

- **Funciones puras** — todo el motor es input → output, sin estado interno. Esto permite memoización agresiva.
- **Cache geométrico:** la geometría 3D se calcula una vez por patrón + materiales. Se guarda en `patterns.geometry_cache` en BD para no recalcular en cada apertura.
- **Web Workers:** patrones muy grandes (300+ rondas, multi-pieza compleja) se procesan en Web Worker para no bloquear el UI.

### Three.js

- **InstancedMesh para los anillos:** cada anillo se renderiza como una instancia del mismo mesh base. Permite renderizar 1000+ rondas sin caer FPS.
- **LOD (level of detail):** lejos = pocos polígonos, cerca = muchos. Automático con Drei.
- **Materiales con shader de "felpa":** custom shader que simula textura de hilo sin necesidad de geometría de cada punto. Performance + estética.
- **Lazy loading:** el viewer 3D solo se carga cuando el usuario está en el visualizador. No se carga en biblioteca o configuración.

### Bundle size

Target: < 250KB initial JS para landing, < 500KB para app. Three.js es pesado pero se carga lazy solo donde se usa.

---

## Testing

El motor matemático es crítico — un bug ahí puede dar resultados visualmente convincentes pero matemáticamente errados. Estrategia:

- **Unit tests del motor (Vitest):** cada función pura del motor con casos de prueba. Patrones reales de la mamá como casos de regresión.
- **Snapshot tests:** patrón → estructura parseada. Cualquier cambio que rompa parsings existentes se detecta.
- **Tests visuales (Playwright + screenshots):** render 3D del mismo patrón debe verse igual entre commits.
- **E2E tests críticos:** flujo de "abrir patrón → ver 3D → exportar PDF" en Playwright.

CI corre todo en cada PR antes de mergear.

---

## CI / CD

- GitHub para repo
- GitHub Actions para CI: typecheck + tests + build
- Vercel deploya automático desde `main`. Preview deploys por cada PR.
- Supabase migrations se aplican manualmente o vía CLI con `supabase db push` antes de mergear PR de schema.

---

## Decisiones específicas para revisar

1. **Next.js o quedarse con single-file HTML.** Mi recomendación es Next.js por las razones de arriba, pero si el proyecto va a tardar mucho en escalar y querés simplicidad máxima al inicio, podemos hacer single-file. El downside grande es que te ata a esa decisión y migrar después es doloroso.

2. **Dominio.** Sugerencia `achisdeamor.com` o `achisdeamor.app`. Ver disponibilidad y precio.

3. **Hosting:** Vercel free tier alcanza para arrancar. Cuando crezca el tráfico, plan Pro ($20/mes). Supabase free tier también alcanza.

4. **Idioma del código.** Recomiendo escribir nombres de variables y comentarios en inglés (estándar). Strings de UI van por sistema de i18n separado.

5. **Lo que NO incluiríamos en MVP** (parking explícito):
   - Pagos / suscripciones (no monetiza todavía)
   - Marketplace de patrones
   - Comunidad / comentarios
   - Modo oscuro
   - App nativa (iOS/Android)
   - Login con redes sociales (solo email/password al inicio)
   - Multi-usuario / shareable patterns

---

## Costos estimados (mensual)

| Servicio | Plan | Costo |
|---|---|---|
| Vercel | Hobby (free) → Pro | $0 → $20/mes |
| Supabase | Free → Pro | $0 → $25/mes |
| Dominio | .com | ~$12/año (~$1/mes) |
| Plausible Analytics | Hobby | ~$9/mes |
| Sentry | Developer (free) | $0 |
| **Total inicial (free tiers)** | | **~$1/mes** (solo dominio) |
| **Total con tráfico real** | | **~$55/mes** |

Mientras la mamá sea la única usuaria, todo en free tier. Cuando se abra al público y tenga decenas de usuarios activos, los $55/mes se cubren con < 10 suscripciones de $7/mes.

---

## Decisiones pendientes para el siguiente doc

- Roadmap de implementación por fases (qué construimos en qué orden)
- Criterios de éxito de cada fase
- Estimación de tiempo
