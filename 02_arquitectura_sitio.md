# Arquitectura del sitio

**Última actualización:** 2026-04-30
**Status:** Confirmado

## Decisión confirmada

Estrategia híbrida: arrancamos con **workspace puro** (concepto A) para que la mamá tenga la herramienta funcionando rápido. Después le agregamos encima la **fachada pública** con landing, tienda, blog (concepto B). El resultado final es un producto único con dos caras: marca pública y app.

---

## Mapa de navegación (MVP)

```
achisdeamor.com (o el dominio que elijamos)
│
├─ /                    Landing minimalista (1 pantalla)
│                       Hero con render 3D girando + CTA "Probá la herramienta"
│                       Sin scroll largo, sin features, sin reviews — minimalismo
│
├─ /signup, /login      Auth simple (email + password o magic link)
│
├─ /app                 Workspace principal (post-login)
│   ├─ /visualizador    Pegás patrón, ves resultado 3D
│   ├─ /generador       Elegís forma + dimensiones, te genera el patrón
│   ├─ /escalador       Patrón + nuevo tamaño → patrón reescalado
│   ├─ /calculadoras    Hilo necesario, conversor de agujas, conversor de notación
│   ├─ /biblioteca      Patrones guardados, organizados por carpetas
│   └─ /configuracion   Idioma, materiales preferidos, gauge personal, perfil
│
└─ /tutoriales          Tutorial guiado round-by-round + FAQs
```

Cuando llegue el momento de agregar la fachada pública, se inserta arriba sin tocar `/app`:

```
├─ /sobre-mi            Historia de Achis de Amor + IG embed
├─ /tienda              Amigurumis terminados a la venta
├─ /patrones            Catálogo de patrones diseñados por ella
└─ /blog                Diario, tutoriales largos, casos
```

---

## Layouts por sección

### Landing (`/`)

```
┌──────────────────────────────────────────────────────────┐
│  [ achis de amor ]                          [ ingresar ] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│        Diseñá amigurumis sin matemática.                 │
│                                                          │
│              [ render 3D girando        ]                │
│              [ de un capybara o similar ]                │
│              [ con mouse interactivo    ]                │
│                                                          │
│              [ Probá gratis →  ]                         │
│                                                          │
│        ✓ Visualizá el resultado antes de tejer           │
│        ✓ Generá patrones a partir de la forma            │
│        ✓ Escalá tus diseños sin romperte la cabeza       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Una sola pantalla, sin scroll. El render 3D girando es el demo principal — vale más que mil palabras.

---

### Visualizador (`/app/visualizador`)

Layout de tres columnas, pensado para desktop (donde se hace el trabajo serio). En mobile colapsan a tabs.

```
┌───────────────────────────────────────────────────────────────────┐
│ [ achis ]  Visualizador ▾   Mi biblioteca   Settings    [ JT ]    │
├──────────────┬───────────────────────────────┬───────────────────┤
│              │                               │                   │
│   PATRÓN     │       RENDER 3D               │  RONDAS           │
│              │                               │                   │
│   ╔════════╗ │   ┌──────────────────────┐   │   R1  6 sc   (6)  │
│   ║Rnd 1: 6║ │   │                      │   │   R2  6 inc  (12) │
│   ║sc en MR║ │   │     [ amigurumi 3D ] │   │   R3  ...         │
│   ║Rnd 2:..║ │   │     rotable, zoom    │   │   R4  ...         │
│   ║...     ║ │   │     con colores      │   │                   │
│   ║        ║ │   │                      │   │   ▸ Detalles      │
│   ║errores ║ │   │                      │   │     R3: 12→18     │
│   ║resalta-║ │   └──────────────────────┘   │     6 aumentos    │
│   ║dos en  ║ │                               │                   │
│   ║rojo    ║ │   Tamaño: 18cm × 14cm         │                   │
│   ╚════════╝ │   Hilo: 22g aprox             │                   │
│              │                               │                   │
│   ▾ Idioma:  │   ▾ Hilo: DK (worsted #4)     │                   │
│      [ ES ]  │   ▾ Aguja: 3.5 mm             │                   │
│              │   ▾ Tensión: normal           │                   │
│              │                               │                   │
│  ┌────────┐  │                               │  ┌─────────────┐ │
│  │Validar │  │                               │  │ Exportar PDF│ │
│  │Traducir│  │                               │  │ Tutorial    │ │
│  └────────┘  │                               │  │ Guardar     │ │
│              │                               │  └─────────────┘ │
└──────────────┴───────────────────────────────┴───────────────────┘
```

**Detalles importantes:**
- Columna izquierda: textbox grande con syntax highlighting. Errores resaltados en rojo con tooltip de la sugerencia.
- Columna central: viewer 3D con controles de cámara. Por defecto rotación lenta automática para mostrar la forma. Tabs encima del viewer: "Forma" / "Despiece" (ver cada pieza por separado en multi-pieza).
- Columna derecha: lista de rondas, click para expandir y ver el detalle. Cada ronda muestra cambio de stitch count y operación dominante. Al hover, la ronda correspondiente se resalta en el render 3D.

---

### Generador (`/app/generador`)

Wizard en 3 pasos.

```
Paso 1 — ¿Qué querés crear?
┌────────────────────────────────────────────┐
│  [ esfera ] [ cilindro ] [ cono ] [ cono   │
│  truncado ] [ óvalo ] [ pera ] [ lágrima ] │
│  [ pétalo ] [ disco ] [ hemi-esfera ] ...  │
│                                            │
│  Cada forma con thumbnail visual.          │
└────────────────────────────────────────────┘

Paso 2 — ¿Qué dimensiones?
┌────────────────────────────────────────────┐
│  Diámetro: [_____] cm                      │
│  Altura:   [_____] cm                      │
│                                            │
│  [ preview en vivo del 3D mientras tipea ] │
└────────────────────────────────────────────┘

Paso 3 — ¿Qué materiales?
┌────────────────────────────────────────────┐
│  Hilo: [ DK / Worsted / Sport / ... ]      │
│  Aguja: [ 3.5 mm ▾ ]                       │
│  Tensión: [ normal ▾ ]                     │
│                                            │
│  → Generar patrón                          │
└────────────────────────────────────────────┘

Resultado:
┌────────────────────────────────────────────┐
│  Patrón generado en notación bilingüe      │
│  + render 3D del resultado                 │
│  + estimación de hilo y tiempo             │
│                                            │
│  [ Editar ] [ Guardar en biblioteca ]      │
│  [ Exportar PDF ] [ Abrir en visualizador ]│
└────────────────────────────────────────────┘
```

---

### Escalador (`/app/escalador`)

Layout horizontal: patrón original a la izquierda, controles en el medio, resultado escalado a la derecha.

```
┌──────────────────────────────────────────────────────────┐
│  PATRÓN ORIGINAL    │  ESCALAR     │  RESULTADO          │
│                     │              │                     │
│  [textbox patrón]   │  Estrategia: │  [textbox patrón    │
│                     │  ○ Cambiar   │   reescalado]       │
│  Tamaño actual:     │    materiales│                     │
│  18 × 14 cm         │  ○ Cambiar   │  Tamaño nuevo:      │
│                     │    conteo    │  27 × 21 cm         │
│  Materiales:        │              │                     │
│  DK + 3.5mm         │  Tamaño      │  Materiales:        │
│                     │  objetivo:   │  Worsted + 5mm      │
│                     │  [ 1.5x ]    │                     │
│                     │              │  Hilo: 49g          │
│                     │  → Aplicar   │                     │
│                     │              │  [ Exportar ]       │
└──────────────────────────────────────────────────────────┘
```

Dos estrategias de escalado claramente separadas:
- **Cambiar materiales:** mantiene el patrón intacto, solo cambia hilo y aguja. Sugerencia automática de qué hilo usar para alcanzar el tamaño objetivo.
- **Cambiar conteo:** mantiene los materiales, multiplica las cuentas. Útil cuando el usuario está atado a un hilo específico.

---

### Calculadoras (`/app/calculadoras`)

Grid de mini-herramientas. Cada una abre en modal o panel lateral.

```
┌──────────┬──────────┬──────────┐
│ Hilo     │ Tiempo   │ Conversor│
│ necesario│ de tejido│ aguja    │
│          │          │ US-mm-UK │
├──────────┼──────────┼──────────┤
│ Conversor│ Costo    │ Gauge    │
│ notación │ del      │ swatch   │
│ es-en    │ proyecto │ helper   │
└──────────┴──────────┴──────────┘
```

Cada calculadora es una herramienta autocontenida con inputs mínimos y output inmediato.

---

### Biblioteca (`/app/biblioteca`)

Grid de patrones guardados, con filtros y búsqueda.

```
┌──────────────────────────────────────────────────────────┐
│  Mi biblioteca           [ Buscar... ]  [ + Nuevo ]      │
│  Filtros: ▾ Carpeta  ▾ Tipo  ▾ Forma  ▾ Tamaño          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐         │
│  │ [3D]   │  │ [3D]   │  │ [3D]   │  │ [3D]   │         │
│  │        │  │        │  │        │  │        │         │
│  │ Capi   │  │ Scraps │  │ Hippo  │  │ Conejo │         │
│  │ 18cm   │  │ 12cm   │  │ 22cm   │  │ 15cm   │         │
│  │ DK     │  │ Worsted│  │ Worsted│  │ Sport  │         │
│  └────────┘  └────────┘  └────────┘  └────────┘         │
│                                                          │
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
```

Cada card es clickable y abre el patrón en el visualizador. Las miniaturas son renders del 3D real.

Carpetas/etiquetas para organizar: "Patrones míos" / "Patrones comprados" / "WIP" / "Completados" / "Para clientes".

---

### Configuración (`/app/configuracion`)

Tabs verticales:
- **Perfil:** nombre, foto, email
- **Preferencias:** idioma de notación por defecto (es/en), unidades (cm/in)
- **Materiales:** tu hilo y aguja por defecto, tu gauge personal medido
- **Cuenta:** suscripción (cuando exista), facturación, exportar todos mis datos
- **Avanzado:** API keys (si en algún momento abrimos integraciones), reset de tutorial

---

### Tutorial (`/tutoriales`)

Tres modos:
1. **Tour guiado de la app** (primera vez que entrás): popup steps que te llevan por las herramientas
2. **Tutorial de un patrón** (round-by-round): el modo que definimos en el motor
3. **FAQs y conceptos:** "¿Cómo medir mi gauge?", "¿Qué hilo elegir?", "¿Diferencia entre BLO y FLO?", etc. Glosario expandible.

---

## Decisiones de UX importantes

### Idioma

Toggle global en header. Cambia notación, UI y exports al instante. Por defecto el idioma del navegador, pero recordamos la elección del usuario.

### Auth

Para MVP: email + password (Supabase Auth). Después agregamos Google login. La mamá probablemente no necesita registrarse — si la web está en su computadora, podemos guardar todo en localStorage como fallback. Cuenta es necesaria solo para sincronizar entre dispositivos.

### Mobile vs desktop

El visualizador es desktop-first (las tres columnas necesitan espacio). En mobile colapsan a tabs ("Patrón" / "3D" / "Rondas"). El generador y las calculadoras funcionan bien en mobile.

### Tema visual

Heredamos la paleta de Achis de Amor: beiges cálidos, terracota, blancos rotos, acentos pastel. Tipografías serias pero amigables (algo como Manrope o Inter para UI, complementada con una serif suave para titulares).

Modo oscuro: opcional para v2.

---

## Decisiones pendientes para el siguiente doc

- Stack técnico (frontend, backend, hosting, dominio)
- Modelo de datos en Supabase (cómo guardamos patrones, usuarios, biblioteca)
- Roadmap de implementación por fases
