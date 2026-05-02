# Patrones reales

Esta carpeta es para que **Juani / la mamá** acumulen patrones reales (PDFs, imágenes, txt sueltos) que después yo (Claude) puedo leer cuando me piden mejorar el parser, debuggear un caso particular, o sumar al training set de pruebas.

## Cómo organizar

Carpeta libre, pero la convención que sugiero:

```
patterns_real/
├── pdf/                      ← PDFs originales (Etsy, Gumroad, etc.)
│   ├── dudu_dinosaurio.pdf
│   ├── capybara_inglés.pdf
│   └── ...
├── images/                   ← Fotos del producto terminado, screenshots
│   ├── dudu_terminado.jpg
│   └── ...
├── text/                     ← Patrones extraídos / pegados como texto crudo
│   ├── dudu_cabelo.txt       ← caso problemático: layout de columnas
│   └── ...
└── README.md
```

## Para qué los uso

Cuando me decís "mirá el patrón X y arreglá Y":

1. Leo el archivo del patrón.
2. Pruebo el parser/render contra ese caso.
3. Si encuentro un caso edge nuevo (notación rara, layout particular), lo sumo como test al test suite del motor (`tests/engine/`) para que no se vuelva a romper.

## Casos de prueba ya cubiertos por el test suite

Estos están en `tests/engine/parser.test.ts` y `tests/engine/real_patterns.test.ts`:

- Dudu — Cabelo (PDF brasilero con layout de dos columnas, rondas concatenadas + conteos sueltos)
- Capibara, Basset Hound, Hippo, etc. (en `src/data/realPatterns.ts`, también tests)
- Notación inglesa estándar (Rnd / sc / inc / dec)
- Notación rioplatense (Vuelta / pb / aum / dism)
- Notación brasilera (Carreira "C01." / pb / aum / dim)
- Foundation chain explícito e implícito
- Patrones con secciones múltiples (Cabeza, Cuerpo, Brazos, etc.)

## Casos que sería bueno sumar

Si ves que tu mamá maneja patrones con alguna de estas características raras, traelos:

- Patrones con anotaciones de cambio de color complejas
- Diagrams visuales (gráficos circulares de puntos) en lugar de texto
- Patrones con instrucciones de armado (ensamblar piezas X con Y) — para el feature de "pieza unida"
- Patrones en otros idiomas (italiano, alemán, ruso, etc.)
- Patrones con técnicas raras (cabello pelo a pelo, tunisian, broomstick, etc.)
