# Roadmap de implementación

**Última actualización:** 2026-04-30
**Repo destino:** `Achis-de-Amor` (GitHub)
**Hosting:** GitHub Pages
**Stack:** Vite + React + TypeScript + Tailwind + Three.js (R3F)

---

## Fase 1 — Motor matemático (esta sesión)

**Objetivo:** Tener el motor del crochet completamente funcional y testeado, sin UI todavía.

- [x] Setup del proyecto (Vite + TS + Tailwind + Vitest)
- [ ] Diccionarios: puntos, hilos, agujas
- [ ] Calculador de gauge
- [ ] Parser bilingüe (es/en) con todas las sintaxis vistas en patrones reales
- [ ] Traductor es↔en
- [ ] Validador (detección de errores)
- [ ] Geometrizador (anillos → coords 3D)
- [ ] Generador (forma + dimensiones → patrón)
- [ ] Escalador (cambio de materiales y de conteo)
- [ ] Catálogo de 14 formas básicas
- [ ] Tests del motor con los 3 patrones reales como casos de regresión

**Criterio de éxito:** El motor parsea correctamente Lea Capybara, Scraps Dog y Hippo in Overalls, y produce geometría correcta para cada uno.

---

## Fase 2 — Visualizador 3D ✓ COMPLETO

- [x] Layout de tres columnas
- [x] Editor de patrón
- [x] Render 3D con R3F + Drei
- [x] Mesh suave con vertex colors por ronda
- [x] Iluminación pulida (hemisphere + directional + soft shadows)
- [x] Vista de rondas con badges de operación
- [x] Controles de materiales
- [x] Cálculo y display de tamaño + hilo
- [x] Indicador de errores inline

## Fase 3 — Generador y escalador ✓ COMPLETO

- [x] Wizard del generador (3 pasos)
- [x] Preview en vivo durante generación
- [x] Layout del escalador
- [x] Dos estrategias de escalado
- [x] Output con patrón reescrito + render

## Fase 4 — Biblioteca y persistencia ✓ COMPLETO

- [x] IndexedDB setup vía idb
- [x] CRUD de patrones
- [x] Grid de biblioteca con miniaturas
- [x] Export/import JSON
- [x] Búsqueda

## Fase 5 — Calculadoras ✓ COMPLETO

- [x] Calculadora de hilo necesario
- [x] Calculadora de tiempo
- [x] Conversor de agujas
- [x] Conversor de notación
- [x] Calculador de costo
- [x] Medidor de gauge personal

## Fase 6 — Tutorial y export ✓ COMPLETO

- [x] Tour guiado
- [x] FAQs bilingües
- [x] Export PDF (cliente)
- [x] Export JSON (biblioteca completa)

## Fase 7 — Landing y deploy ✓ COMPLETO

- [x] Landing minimalista con render demo girando
- [x] Toggle de idioma global
- [x] GitHub Actions workflow
- [x] Deploy automático a GitHub Pages

---

## Post-MVP (cuando valide la mamá)

- Supabase para multi-dispositivo
- Auth real
- Dominio custom
- Tienda de amigurumis terminados (concepto B)
- Catálogo de patrones diseñados por ella
- Marketplace abierto a otros diseñadores
- Suscripción / monetización
