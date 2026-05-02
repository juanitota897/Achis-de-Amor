# Motor matemático del crochet

**Documento de especificación técnica**
**Última actualización:** 2026-04-30
**Status:** Confirmado — listo para próxima fase

## Decisiones confirmadas por Juani

1. **Notación bilingüe desde MVP** (español + inglés americano)
2. **Multi-pieza con ensamble desde MVP** (no es fase 2)
3. **Aumentos asimétricos como anillos circulares**, pero la calidad visual del render NO se compromete (uso de mesh suave, materiales con textura sutil de tejido, sombras e iluminación pulida)
4. **Catálogo amplio de formas** para el generador (ver sección 11)
5. **Funcionalidades adicionales incluidas:** detección de errores en patrones, exportación, mini tutorial round-by-round

---

## Por qué este motor importa

Es la pieza central que hace posibles las tres herramientas:

| Herramienta | Qué le pide al motor |
|---|---|
| Visualizador | "Dado este patrón, ¿qué forma y qué tamaño produce?" |
| Generador | "Dada esta forma y este tamaño, ¿qué patrón la produce?" |
| Escalador | "Dado este patrón y este nuevo tamaño, ¿cómo se reescribe el patrón?" |

Las tres son operaciones distintas sobre el mismo modelo geométrico. Si el motor está bien hecho, cualquier herramienta nueva (calculadora de hilo, generador desde foto, comparador de tamaños) es solo otra operación sobre el mismo motor.

---

## Modelo conceptual

### El crochet como pila de anillos

Un amigurumi simple (de una sola pieza) se modela como una **pila de anillos de puntos**.

Cada anillo (= una ronda del patrón) tiene:
- Un número de puntos `n`
- Un tipo de punto (sc, hdc, dc, tr...) que define su altura
- Modificadores (BLO, FLO, color)
- Una posición en la pila

A partir de esos datos, calculamos su geometría:
- **Circunferencia** del anillo: `C = n × ancho_punto`
- **Radio** (asumiendo circular): `r = C / (2π)`
- **Altura** del anillo: `h = alto_punto × multiplicador_tipo`
- **Posición Y** del anillo: suma de las alturas de todos los anillos previos

Apilados con sus radios y alturas, los anillos forman la silueta del amigurumi.

### Ejemplo simple — esfera básica

```
Ronda 1: 6 sc en MR (6)         → r ≈ 4.8mm, y = 0
Ronda 2: 6 inc (12)              → r ≈ 9.5mm, y = 5mm
Ronda 3: (1sc, inc) ×6 (18)      → r ≈ 14.3mm, y = 10mm
Ronda 4: (2sc, inc) ×6 (24)      → r ≈ 19.1mm, y = 15mm
Ronda 5: (3sc, inc) ×6 (30)      → r ≈ 23.9mm, y = 20mm
Ronda 6-10: 30 sc (30)           → r constante 23.9mm, sube en altura
Ronda 11: (3sc, dec) ×6 (24)     → r ≈ 19.1mm
Ronda 12: (2sc, dec) ×6 (18)     → r ≈ 14.3mm
... etc
```

Apilando esto en Y se forma una esfera achatada. Es la geometría real de un amigurumi.

---

## Componentes del motor

```
┌──────────────────────────────────────────────────────────┐
│                      MOTOR DEL CROCHET                    │
│                                                           │
│  ┌────────────┐    ┌────────────┐    ┌────────────────┐ │
│  │ Diccionario│    │ Diccionario│    │ Diccionario de  │ │
│  │ de PUNTOS  │    │ de HILOS   │    │ AGUJAS          │ │
│  └────────────┘    └────────────┘    └────────────────┘ │
│         ↓                ↓                  ↓             │
│  ┌────────────────────────────────────────────────────┐  │
│  │           CALCULADOR DE GAUGE                       │  │
│  │  (combina hilo + aguja + punto = dimensión real)    │  │
│  └────────────────────────────────────────────────────┘  │
│                          ↓                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │              PARSER DE PATRONES                     │  │
│  │  (texto del patrón → estructura de datos rondas)    │  │
│  └────────────────────────────────────────────────────┘  │
│                          ↓                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │            EJECUTOR / GEOMETRIZADOR                 │  │
│  │  (estructura de rondas → coords 3D + dimensiones)   │  │
│  └────────────────────────────────────────────────────┘  │
│                          ↓                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │         GENERADOR INVERSO                           │  │
│  │   (forma + tamaño objetivo → estructura de rondas)  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

A continuación, especifico cada componente.

---

## 1. Diccionario de puntos

Cada tipo de punto tiene dimensiones relativas a un punto bajo (sc) base.

| Punto | Abreviatura es | Abreviatura en | Multiplicador altura |
|---|---|---|---|
| Cadena | cad | ch | 0.7 |
| Punto deslizado | pr / pd | sl st | 0.3 |
| Punto bajo | pb | sc | 1.0 (referencia) |
| Medio punto / media vareta | mp | hdc | 1.7 |
| Punto alto / vareta | pa | dc | 2.5 |
| Punto alto doble | pad | tr / dtr | 3.5 |

Ancho: para todos los puntos de altura > 0, se asume el mismo ancho que el sc base (es la aproximación estándar usada por la industria).

Operaciones especiales:
- `inc` (aumento) = 2 puntos en el mismo punto base. Aporta 2 stitches al conteo.
- `dec` (disminución invisible) = combinar 2 puntos en uno. Resta 1 al conteo.
- `BLO` = back loop only. No cambia conteo, sí cambia textura/estructura. Geometría: el anillo "se hunde" levemente y crea pliegue visible — para el motor lo modelamos como una marca, no afecta la silueta.
- `FLO` = front loop only. Igual al BLO pero el pliegue es del otro lado.

---

## 2. Diccionario de hilos (yarn weight)

Sistema estándar Craft Yarn Council (CYC) con 8 categorías:

| CYC | Nombre | Aguja recomendada (mm) | Ancho sc (mm) | Alto sc (mm) | Yardas / 100g (aprox) |
|---|---|---|---|---|---|
| 0 | Lace | 1.5–2.25 | 2.0 | 2.0 | 600+ |
| 1 | Super fine / Sock | 2.25–3.5 | 3.0 | 3.0 | 400 |
| 2 | Fine / Sport | 3.5–4.5 | 3.8 | 3.8 | 300 |
| 3 | Light / DK | 4.5–5.5 | 4.5 | 4.5 | 250 |
| 4 | Medium / Worsted | 5.5–6.5 | 5.5 | 5.5 | 200 |
| 5 | Bulky | 6.5–9.0 | 7.0 | 7.0 | 130 |
| 6 | Super bulky | 9.0–15.0 | 9.0 | 9.0 | 80 |
| 7 | Jumbo / Chenille | 15.0+ | 12.0 | 12.0 | 50 |

Para cada hilo el usuario puede:
- Elegir categoría CYC (preset)
- Sobrescribir el ancho/alto del punto si tiene su propio gauge medido
- Elegir entre presets de marcas conocidas (Yarn Art Jeans, Scheepjes Catona, Drops Paris, etc. — base de datos para crecer)

---

## 3. Diccionario de agujas

Tabla simple: tamaño en mm con equivalencias US/UK.

| mm | US | UK |
|---|---|---|
| 2.0 | – | 14 |
| 2.25 | B/1 | 13 |
| 2.5 | – | 12 |
| 3.0 | – | 11 |
| 3.5 | E/4 | 9 |
| 4.0 | G/6 | 8 |
| 5.0 | H/8 | 6 |
| 6.0 | J/10 | 4 |

La aguja modula el ancho/alto del punto: aguja mayor a la recomendada → punto más grande y suelto. El motor permite ajuste fino: el usuario puede declarar su gauge real (ej. "10 sc = 4cm con mi tensión") y el motor recalcula todo.

---

## 4. Calculador de gauge

Función pura: dado un hilo, una aguja y un tipo de punto, devuelve `{ ancho_mm, alto_mm }`.

```
gauge(hilo, aguja, tipo_punto) → { ancho, alto }
```

Lógica:
1. Empezar con dimensiones base del hilo (CYC presets o gauge custom del usuario)
2. Aplicar factor de la aguja (relación con la aguja recomendada del hilo)
3. Aplicar multiplicador de altura del tipo de punto
4. Aplicar tensión del usuario (si la declaró: tight 0.9x, normal 1.0x, loose 1.1x)

---

## 5. Parser de patrones

**Input:** texto crudo del patrón.
**Output:** estructura de datos `Pattern`:

```
Pattern = {
  metadata: {
    name, designer, language, materials
  },
  pieces: [
    Piece = {
      name: "Cabeza",
      starting_method: "magic_ring" | "foundation_chain" | "join",
      starting_count: 6,
      rounds: [
        Round = {
          number: 1,
          operations: [
            { type: "sc", count: 6 }
          ],
          stitch_count: 6,
          color: null,
          modifier: null  // BLO / FLO / null
        },
        ...
      ]
    },
    ...
  ],
  assembly: [...] // instrucciones de armado (fase 2)
}
```

### Sintaxis a soportar (en orden de prioridad MVP)

**Variantes vistas en patrones reales** (se requiere parser tolerante):

```
Rnd 1: 6 sc in magic ring (6)
Rnd 1. 6 sc in MR [6]
1) 6 sc in magic ring (6)
Vuelta 1: 6 pb en AM (6)
```

**Operaciones por ronda:**

```
6 sc                          → 6 puntos bajos
(inc) * 6                     → 6 aumentos
(1 sc, inc) * 6               → patrón repetido 6 veces
2 sc, inc, (4 sc, inc) * 5    → secuencia mixta con repetición parcial
[2 sc, 2 sc in next st] 6     → notación con corchetes
```

**Modificadores:**

```
Rnd 30: BLO: (2 sc, dec) * 6 [18]
Rnd 11: change to white. (3 sc, inc) * 6 [24]
Rnds 9-12: 54 sc [54] – 4 rounds   → expande a 4 rondas idénticas
```

### Algoritmo del parser

1. **Tokenizar:** dividir en líneas, identificar líneas de ronda vs metadata
2. **Por cada línea de ronda:**
   - Extraer número(s) de ronda (puede ser rango)
   - Detectar modificador global (BLO/FLO, color change)
   - Tokenizar operaciones (split por comas, respetando paréntesis)
   - Para cada token, expandir multiplicación si tiene `* N`
   - Sumar conteo total y validar contra el `(N)` final si está presente
3. **Devolver estructura `Round` validada**

**Manejo de errores:** si el conteo declarado no matchea el calculado, marcar ronda como inválida y mostrar warning (no romper).

---

## 6. Ejecutor / Geometrizador

**Input:** `Pattern` + materiales (hilo, aguja, tensión)
**Output:** `Geometry` con coordenadas 3D listas para renderizar.

```
Geometry = {
  pieces: [
    PieceGeometry = {
      name: "Cabeza",
      rings: [
        Ring = {
          round_number: 1,
          stitch_count: 6,
          radius_mm: 4.77,
          y_position_mm: 0,
          height_mm: 5,
          color: "#E8C9A0",
          operation_summary: "increase"  // o "even", "decrease", "start"
        },
        ...
      ],
      total_height_mm: ...,
      max_radius_mm: ...,
      total_stitches: ...
    },
  ]
}
```

### Algoritmo

```
para cada Piece:
  y = 0
  rings = []
  para cada Round del patrón:
    n = stitch_count de la ronda
    h = gauge.alto * multiplicador_punto
    w = gauge.ancho
    C = n * w
    r = C / (2 * π)
    
    rings.push({
      round_number,
      stitch_count: n,
      radius: r,
      y_position: y + h/2,  // centrado en la mitad del punto
      height: h,
      color: round.color || color_actual,
      ...
    })
    
    y = y + h
```

### Casos especiales

**Foundation chain start:** los patrones que empiezan con cadena (no anillo mágico) producen una forma alargada. Para el primer "anillo" tratamos:
- Cadena de N puntos → un óvalo en lugar de un círculo
- Modelado: dos semicírculos conectados por dos líneas rectas
- El segundo anillo (que se trabaja alrededor de la cadena) hereda esa forma alargada

**Aumentos asimétricos:** "2 sc, inc, (4 sc, inc) * 5, 2 sc" produce una forma no-circular sutil. Para MVP ignoramos esto y modelamos como anillo circular del conteo total. Para v2, podemos modelar como "anillo deformado" usando la posición de los aumentos.

**Disminuciones rápidas:** rondas con muchas dec consecutivas crean un cono cerrado. El motor lo maneja automáticamente porque el radio cae rápido.

---

## 7. Generador inverso

**Input:** forma objetivo + dimensiones objetivo + materiales.
**Output:** `Pattern` válido que produce esa forma.

### Formas iniciales soportadas (MVP)

| Forma | Parámetros | Uso típico |
|---|---|---|
| Esfera | diámetro | cabezas, bayas, panzas redondas |
| Esfera achatada | diámetro × altura | cabezas chatas, panzas anchas |
| Cilindro | diámetro × altura | brazos, piernas, dedos |
| Cono | diámetro base × altura | hocicos, sombreros |
| Óvalo | largo × ancho × altura | cuerpos alargados, cabezas tipo hipopótamo |

### Algoritmo de generación (esfera, ejemplo)

```
Input: diametro_objetivo (cm), gauge

1. Calcular circunferencia máxima objetivo: C_max = π * diametro_objetivo
2. Calcular conteo máximo de puntos: n_max = round(C_max / gauge.ancho)
3. Calcular cuántos aumentos necesitamos:
   - Empezamos en 6 (MR estándar)
   - Aumentamos de a 6 puntos por ronda hasta llegar a n_max
   - Rondas de aumento = (n_max - 6) / 6
4. Calcular meseta (rondas sin cambio): 
   - Diametro deseado / (gauge.alto) - rondas de aumento × 2
5. Generar rondas:
   - Ronda 1: 6 sc en MR
   - Ronda 2: 6 inc → 12
   - Ronda 3: (1 sc, inc) * 6 → 18
   - Ronda 4: (2 sc, inc) * 6 → 24
   - ... hasta n_max
   - Rondas de meseta: n_max sc
   - Rondas de disminución (espejo de los aumentos)
6. Devolver pattern formateado en notación
```

### Distribución de aumentos

Para que la esfera quede pareja, los aumentos no van todos juntos. La regla "2 sc, inc, (4 sc, inc) * 5, 2 sc" para 36 stitches es lo que se llama "distribución equilibrada": los aumentos se reparten alrededor del anillo, con padding inicial y final que evita que se "vea" la columna de aumentos.

El motor genera distribuciones equilibradas automáticamente.

---

## 8. Escalador

**Estrategia A — Cambio de materiales (más simple y común):**
- Mantener exactamente el mismo `Pattern`
- Cambiar el gauge (hilo más grueso, aguja más grande)
- Recalcular geometría con el nuevo gauge
- Mostrar nuevo tamaño + estimación de hilo necesario

**Estrategia B — Cambio de conteo de puntos:**
- Calcular factor de escala lineal: `f = tamaño_objetivo / tamaño_actual`
- Multiplicar todos los conteos de puntos por `f`
- Recalcular distribuciones de aumentos/disminuciones
- Devolver patrón reescrito

La estrategia A es más usable y produce mejores resultados. La estrategia B es útil cuando el usuario está atado a un hilo específico.

### Cálculo de hilo necesario

Suma del área superficial de cada anillo, multiplicada por el "rendimiento" del hilo (yardas o gramos por cm²).

Aproximación simple:
```
total_yarn_grams = sum(stitch_count_i * grams_per_stitch)
```

Donde `grams_per_stitch` se calibra empíricamente por cada categoría CYC.

---

## Estructura del código (anticipo)

Para un MVP single-file HTML como vos preferís, el motor se organiza en módulos lógicos dentro del mismo archivo:

```javascript
const Engine = (function() {
  const STITCHES = { sc: {...}, hdc: {...}, ... };
  const YARNS = { 0: {...}, 1: {...}, ... };
  const HOOKS = [...];
  
  function gauge(yarn, hook, stitch) { ... }
  
  function parsePattern(text) { ... }
  
  function geometrize(pattern, materials) { ... }
  
  function generate(shape, dimensions, materials) { ... }
  
  function scale(pattern, newDimensions, materials) { ... }
  
  return { gauge, parsePattern, geometrize, generate, scale };
})();
```

---

## 9. Soporte multi-pieza con ensamble

Cada amigurumi se modela como un **conjunto de Pieces** más un **plan de ensamble** que describe cómo se conectan.

### Estructura de Pattern multi-pieza

```
Pattern = {
  metadata: {...},
  pieces: [
    Piece { name: "head", rounds: [...] },
    Piece { name: "body", rounds: [...] },
    Piece { name: "left_arm", rounds: [...] },
    Piece { name: "right_arm", rounds: [...] },
    Piece { name: "left_leg", rounds: [...] },
    Piece { name: "right_leg", rounds: [...] },
    Piece { name: "left_ear", rounds: [...] },
    Piece { name: "right_ear", rounds: [...] },
    ...
  ],
  assembly: [
    AssemblyStep {
      type: "sew",
      part: "head",
      target: "body",
      target_round: 18,
      target_position: "top",
      orientation: { rotation: [0, 0, 0] }
    },
    AssemblyStep {
      type: "sew",
      part: "left_ear",
      target: "head",
      target_round: 22,
      target_position: "side_left",
      orientation: { rotation: [0, 90, 0] }
    },
    ...
  ]
}
```

### El parser frente a multi-pieza

El parser detecta encabezados de pieza (`HEAD`, `EARS (make 2)`, `Cabeza:`, `Orejas (hacer 2):`, etc.) y arma cada `Piece` por separado. Cuando detecta `make 2` o `hacer 2`, genera dos pieces idénticas con sufijos `_left` / `_right`.

### El ensamblador

Cuando el parser termina de procesar todas las piezas, busca instrucciones de ensamble en texto libre del patrón ("Sew the ears to the top of the head between rnds 5-6") y arma el `assembly` automáticamente. Esto es heurístico — para los casos que no detecte, ofrece una UI manual donde el usuario arrastra cada pieza al lugar correcto.

### Renderizado del amigurumi completo

Cada `Piece` se renderiza como su propio mesh 3D, posicionado y rotado según su `AssemblyStep`. El render final muestra el amigurumi armado con todas sus partes en proporción real.

---

## 10. Detección de errores en patrones

Validaciones automáticas que corre el motor cuando parsea un patrón:

| Tipo de error | Cómo se detecta | Severidad |
|---|---|---|
| Conteo declarado ≠ calculado | Operaciones suman X pero el patrón dice (Y) | Alta — flag visible |
| Salto brusco de stitch count | Cambio > 50% entre rondas consecutivas sin justificación | Media — warning |
| Aumento/disminución imposible | Más decreases que stitches disponibles | Alta — bloquea ronda |
| Forma anómala detectada | Ratio altura/ancho fuera de rangos típicos para la forma declarada | Baja — info |
| Notación ambigua | "(2sc, inc)" sin multiplicador explícito | Media — sugiere corrección |
| Pieza huérfana | Pieza presente pero no en assembly plan | Baja — warning |
| Cambio de color inválido | Color referenciado que no fue declarado en materiales | Media — warning |

Cada error se muestra inline en el patrón, con el texto exacto resaltado y una sugerencia de corrección cuando es posible.

---

## 11. Catálogo de formas para el generador

Cada forma tiene parámetros, un algoritmo de generación, y una validación de viabilidad (ej. "esfera de 200cm con hilo lace = imposible, sugerir hilo más grueso").

### Formas básicas (sólidas, cerradas)

**Esfera** — cabezas, frutas, gemas
Parámetros: `diámetro`
Generación: aumentos de 6 hasta el ecuador, meseta corta, disminuciones espejo.

**Esfera achatada** — cabezas estilo Pica Pau, panzas
Parámetros: `diámetro × altura`
Generación: aumentos rápidos, meseta corta, disminuciones rápidas.

**Esfera alargada / huevo** — cuerpos, panzas, cabezas alargadas
Parámetros: `diámetro × altura`
Generación: aumentos suaves, meseta larga, disminuciones más rápidas (asimetría).

**Cilindro** — brazos, piernas rectas, dedos
Parámetros: `diámetro × altura`
Generación: aumentos hasta diámetro, meseta de altura completa, cierre rápido o pieza abierta.

**Cilindro cónico** — piernas que se afinan, brazos
Parámetros: `diámetro_base × diámetro_punta × altura`
Generación: aumentos iniciales, disminuciones graduales hasta la punta.

**Cono** — sombreros, hocicos, picos
Parámetros: `diámetro_base × altura`
Generación: solo aumentos lineales hasta la base, cierre opcional.

**Cono truncado** — sombreros, brazos cortos
Parámetros: `diámetro_base × diámetro_top × altura`
Generación: aumentos hasta el diámetro mayor, transición al diámetro menor.

**Óvalo / cuerpo alargado** — cuerpos, narices tipo hipopótamo
Parámetros: `largo × ancho × altura`
Generación: foundation chain inicial de N puntos, luego aumentos asimétricos.

**Pera** — cuerpos con base ancha y top estrecho (gnomos, frutos)
Parámetros: `diámetro_base × diámetro_top × altura`
Generación: aumentos rápidos, meseta, transición curvada hacia diámetro top.

**Hemi-esfera** — orejas curvas, mejillas, base de copas
Parámetros: `diámetro × profundidad`
Generación: aumentos hasta el ecuador, sin meseta, cierre directo.

**Disco** — ojos, paneles, bases planas
Parámetros: `diámetro × espesor (1-3 rondas)`
Generación: aumentos hasta diámetro, meseta corta, disminuciones espejo.

### Formas para apéndices (a menudo planas o con base abierta)

**Lágrima / gota** — orejas, plumas, alas pequeñas
Parámetros: `largo × ancho_max`
Generación: punta con pocos puntos, expansión gradual hasta el ancho máximo.

**Pétalo** — orejas grandes, alas, plumas grandes
Parámetros: `largo × ancho × curvatura`
Generación: foundation chain, expansión asimétrica con curvatura.

**Tubo abierto** — mangas, cuellos
Parámetros: `diámetro × altura`
Generación: cilindro sin cierre superior ni inferior.

### Forma libre (avanzada — fase 2)

**Perfil por puntos de control** — para formas exóticas
El usuario dibuja una curva 2D que representa el perfil del lateral. El motor la rota alrededor del eje Y y genera el patrón discretizando en anillos.

Parámetros: array de puntos `(altura, radio)` que definen el perfil.

---

## 12. Mini tutorial round-by-round

Modo guiado para que la usuaria teja siguiendo el patrón, con la web mostrando estado actual y siguiente.

**Funcionalidades:**
- Marcador de ronda actual (botón "siguiente ronda")
- Vista 3D que crece en tiempo real a medida que avanza
- Conteo de stitches restantes en la ronda actual
- Marcador de "estoy en el punto X de Y"
- Recordatorio cuando es momento de cambiar color, rellenar, insertar ojos
- Pausa con guardado automático (puede cerrar la web y volver al mismo punto)
- Botón "marcar este patrón como completado" → suma a su biblioteca

**UX simple:** una sola pantalla con el patrón a la izquierda (ronda actual destacada), el render 3D a la derecha (creciendo), y un botón grande "Hecha esta ronda".

---

## 13. Exportación

**Formatos soportados:**

| Formato | Contenido | Caso de uso |
|---|---|---|
| PDF | Patrón completo en notación, tabla de materiales, render 3D del resultado, instrucciones de ensamble | Imprimir / compartir |
| Texto plano (.txt) | Solo notación, copiar/pegar | Compartir en foros, pegar en otras apps |
| JSON | Estructura completa del Pattern + Geometry | Backup, intercambio entre cuentas |
| Imagen (PNG) | Render 3D estático del resultado | Mostrar en redes sociales |
| 3D (GLTF) | Modelo 3D del amigurumi armado | Para usuarios que quieran imprimirlo o llevarlo a Blender |

PDF es el más importante para uso comercial — para que ella pueda generar PDFs vendibles de sus propios patrones.

---

## 14. Estructura del código (anticipo)

Single-file HTML con módulos lógicos organizados por responsabilidad:

```javascript
const Engine = (function() {
  // Datos base
  const STITCHES = { sc: {...}, hdc: {...}, ... };
  const STITCH_TRANSLATIONS = {
    'sc': 'pb', 'inc': 'aum', 'dec': 'dism', ...
  };
  const YARNS = { 0: {...}, 1: {...}, ... };
  const HOOKS = [...];
  const SHAPES = { sphere: {...}, cylinder: {...}, ... };
  
  // Funciones puras
  function gauge(yarn, hook, stitch) { ... }
  function translate(text, fromLang, toLang) { ... }
  
  // Parser
  function parsePattern(text, language='auto') { ... }
  function detectErrors(pattern) { ... }
  
  // Geometría
  function geometrize(pattern, materials) { ... }
  function assemble(pieces, assemblyPlan) { ... }
  
  // Generador
  function generate(shape, dimensions, materials) { ... }
  
  // Escalador
  function scaleByMaterials(pattern, newMaterials) { ... }
  function scaleByCount(pattern, factor) { ... }
  
  // Exportación
  function exportPDF(pattern, geometry) { ... }
  function exportJSON(pattern) { ... }
  function exportGLTF(geometry) { ... }
  
  return { /* API pública */ };
})();
```
