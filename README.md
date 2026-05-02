# Achis de Amor

Herramientas de crochet para amigurumis: visualizador 3D, generador, escalador, biblioteca y calculadoras.

## Estado: MVP funcional ✓

- **Motor matemático completo** (47 tests pasando)
- **Visualizador 3D** con render real en Three.js, materiales con textura suave
- **Generador** de patrones con 14 formas predefinidas
- **Escalador** con dos estrategias (cambio de materiales, cambio de conteo)
- **Biblioteca** con persistencia local (IndexedDB) + export/import JSON
- **6 calculadoras** (hilo, tiempo, agujas, notación, costo, gauge)
- **Tutorial guiado** + FAQs
- **Bilingüe** (español + inglés) con toggle global
- **Landing** con render 3D girando como demo

## Stack

- Vite + React + TypeScript
- Tailwind CSS con paleta Achis de Amor (beiges, terracota, sage)
- Three.js + React Three Fiber + Drei (3D)
- Zustand + persist (settings)
- IndexedDB vía idb (biblioteca de patrones)
- jsPDF (export client-side)
- Vitest (tests)

## Estructura

```
src/
  App.tsx                React Router
  main.tsx
  index.css              Tailwind + design tokens
  engine/                Motor matemático puro (cero dependencias UI)
    types.ts             Tipos del Pattern, Round, Operation, Geometry
    stitches.ts          Diccionario bilingüe de puntos
    yarns.ts             Catálogo CYC 0-7
    hooks.ts             Agujas mm/US/UK
    gauge.ts             Cálculo de dimensiones reales
    parser.ts            Parser tolerante (3 sintaxis, es/en, ranges, BLO/FLO)
    translator.ts        Formateo es↔en
    validator.ts         Detección de errores
    geometry.ts          Anillos 3D apilados
    generator.ts         Forma → patrón (con balanced increases)
    scaler.ts            Escalado por materiales o conteo
    shapes/index.ts      14 formas + 14 builders
    index.ts             API público
  pages/                 Páginas (1 por ruta)
    LandingPage.tsx
    VisualizerPage.tsx
    GeneratorPage.tsx
    ScalerPage.tsx
    LibraryPage.tsx
    CalculatorsPage.tsx
    TutorialsPage.tsx
    SettingsPage.tsx
  components/
    layout/AppLayout.tsx       Sidebar + main area
    visualizer/
      Render3D.tsx             Canvas R3F + lighting + controls
      AmigurumiMesh.tsx        Construcción de mesh desde PieceGeometry
    common/ui.tsx              Button, Input, Select, Card, Badge
  store/settings.ts            Zustand global (idioma, materiales, gauge)
  lib/
    db.ts                      IndexedDB wrapper
    pdf.ts                     Export PDF
    i18n.ts                    Strings de UI bilingües
tests/engine/                  47 tests (todos verdes)
.github/workflows/deploy.yml   Auto-deploy a GitHub Pages
docs (raíz):
  00_definiciones_producto.md
  01_motor_matematico.md
  02_arquitectura_sitio.md
  03_stack_tecnico.md
  04_roadmap.md
```

## Comandos

```bash
npm install
npm run dev        # localhost:5173
npm run build      # producción → dist/
npm test           # 47 tests
```

## Deploy

1. Crear repo `Achis-de-Amor` en GitHub
2. Desde la carpeta CROCHET:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: motor + UI completa"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/Achis-de-Amor.git
   git push -u origin main
   ```
3. En GitHub: Settings → Pages → Source: GitHub Actions
4. El workflow de `.github/workflows/deploy.yml` corre tests, builda y publica
5. Disponible en `https://TU-USUARIO.github.io/Achis-de-Amor/`

## Routing

- `/` Landing pública con demo 3D
- `/app/visualizador` Pegar patrón, ver 3D
- `/app/generador` Forma + dimensiones → patrón
- `/app/escalador` Reescalar patrón existente
- `/app/biblioteca` Patrones guardados
- `/app/calculadoras` 6 mini-herramientas
- `/app/configuracion` Idioma, materiales, gauge personal
- `/tutoriales` Tour guiado + FAQs

## Funcionalidades del motor

**Parser tolerante** soporta:
- 3 sintaxis de round: `Rnd 1: ...`, `Vuelta 1: ...`, `1) ...`
- Bilingüe: pb/sc, aum/inc, dism/dec, AM/MR, etc.
- Repeticiones: `(...) * 6`, `(...) x 6`, `[...] 6 times`, `*...*`
- Rangos: `Rnd 5-10: 30 sc` se expande a 6 rondas
- Modificadores: BLO, FLO
- Cambios de color: "change to white"
- Multi-pieza: detecta secciones automáticamente, "(make 2)" duplica

**Validator detecta:**
- Conteo declarado ≠ calculado
- Disminuciones imposibles
- Cambios bruscos entre rondas
- Saltos de número de ronda
- Piezas vacías

**Generator** con 14 formas:
sphere, flat_sphere, oblong_sphere, cylinder, tapered_cylinder, cone,
truncated_cone, oval, pear, hemisphere, disc, teardrop, petal, open_tube

**Scaler** dos estrategias:
- Cambiar materiales (yarn + hook), patrón intacto
- Multiplicar conteos, materiales intactos

**Geometry** modela cada amigurumi como pila de anillos circulares con
cálculo de radio, altura y posición Y, listo para Three.js.
