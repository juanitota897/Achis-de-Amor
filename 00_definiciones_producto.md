# Achis de Amor — Definiciones de producto

**Última actualización:** 2026-04-30
**Status:** En definición (pre-MVP)

---

## Contexto del proyecto

Sitio web para **Achis de Amor** (@achis_de_amor en Instagram), la marca de amigurumis de la mamá de Juani. Pensado para uso personal de la mamá Y como producto comercializable a tejedoras del nicho.

La marca ya existe, vende por Instagram, tiene identidad visual establecida (paleta beige/terracota/pasteles, ojitos cerrados como firma). El sitio formaliza la marca online — no la crea.

---

## Los tres pain points que resuelve

### Pain #1 — "Compra un patrón y no termina siendo lo mismo"
Problema real de mercado: diseñadores venden patrones cuyo resultado no se corresponde con la foto promocional. A veces es estafa, a veces es discrepancia de proporciones, a veces es tamaño distinto al anunciado.

**Solución:** Visualizador 3D que permite previsualizar el resultado de un patrón antes de comprarlo o empezar a tejerlo.

### Pain #2 — "Quiere hacer sus patrones pero no sabe cómo"
Tiene la habilidad técnica (teje amigurumis complejos a partir de patrones avanzados) pero no la habilidad de diseño matemático para escribir sus propios patrones desde cero.

**Solución:** Generador de patrones — input de forma y dimensiones objetivo, output de patrón escrito en notación estándar.

### Pain #3 — "Le piden ajustar el tamaño pero no sabe matemática"
Clientes piden el mismo amigurumi en otro tamaño. Ella no sabe escalar las cuentas ni calcular hilo necesario.

**Solución:** Escalador con calculadora — input patrón + tamaño objetivo, output patrón escalado + materiales necesarios.

---

## Insight clave de arquitectura

**Las tres herramientas comparten el mismo motor matemático.**

Si modelamos correctamente la geometría del crochet (anillos apilados, cómo aumentos/disminuciones cambian el diámetro, cómo se acumula la altura por ronda), las tres features son aplicaciones distintas del mismo motor:

| Herramienta | Operación con el motor |
|---|---|
| Visualizador | Patrón → forma 3D + tamaño |
| Generador | Forma + tamaño → patrón |
| Escalador | Patrón + nuevo tamaño → patrón reescalado |

Esto significa que construir el motor una vez nos da las tres herramientas casi gratis.

---

## Spec del visualizador (decidido)

**Inputs:**
- Patrón en notación inglés americano (sc, inc, dec, sl st, ch, hdc, dc, tr, BLO, FLO, magic ring, foundation chain) — soportar las 3 sintaxis comunes vistas en patrones reales
- Hilo (grosor) y aguja (mm) usados — para calcular tamaño real
- Colores por ronda (opcional)

**Outputs:**
- Vista 3D del resultado, con colores por ronda
- Tamaño total en cm (ancho × alto)
- Conteo de puntos por ronda visible
- Indicador de qué rondas son aumento, disminución, o parejas

**Lo que NO hace en MVP:**
- Textura realista (puntos individuales renderizados)
- Multi-pieza con ensamble (cabeza + cuerpo + brazos juntos)
- Posicionamiento de safety eyes
- Exportación a 3D imprimible

---

## Audiencia objetivo

**Usuario primario inicial:** la mamá de Juani (Achis de Amor).

**Usuario público objetivo:** tejedoras de amigurumi de nivel intermedio-avanzado, principalmente hispanohablantes, que ya pagan por patrones digitales y se frustran con los problemas de calidad/escala. Mercado: Pinterest + Etsy + Instagram.

NO es objetivo: principiantes que están aprendiendo crochet (mil sitios cubren eso).

---

## Decisiones pendientes

- [ ] Motor matemático — cómo modelamos la geometría del crochet
- [ ] Arquitectura de información (secciones del sitio)
- [ ] Modelo de monetización
- [ ] Stack técnico
- [ ] Roadmap por fases
- [ ] Marca visual del sitio (heredando o adaptando la de Achis de Amor)

---

## Material disponible para validar

- 3 patrones reales (Lea the Capybara, Scraps the Dog, Hippo in Overalls) — todos en inglés americano, multi-pieza, complejos
- Instagram @achis_de_amor con fotos del trabajo terminado
- Mamá disponible para testear y dar feedback real
