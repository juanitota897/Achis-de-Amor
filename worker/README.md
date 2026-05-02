# Achis de Amor — AI Proxy Worker

Cloudflare Worker que actúa como proxy seguro a las APIs de Anthropic (Claude) y maneja generación de imagen vía Cloudflare Workers AI (Flux 1 Schnell).

## ¿Por qué?

Las API keys no pueden ir en el frontend porque cualquier visitante las puede robar. Este Worker corre en Cloudflare, mantiene las keys como secrets, y la app web le pega a este Worker (no a las APIs directo).

## Endpoints

- `POST /generate-image` — toma un patrón y devuelve URL de imagen (data URL si Flux, URL si DALL-E)
- `POST /clean-pattern` — toma texto crudo y devuelve patrón estructurado JSON
- `POST /analyze-image` — toma imagen base64 y devuelve análisis con Claude Vision
- `POST /health` — chequeo de status

## Setup paso a paso (5 minutos)

### 1. Crear cuenta Cloudflare

Si no tenés: [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up). Gratis, no pide tarjeta.

### 2. API key de Anthropic (vos ya tenés)

Solo necesitás la key, la pegamos como secret abajo. Está en [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys).

### 3. (OPCIONAL) OpenAI

**No es necesario** — Cloudflare Workers AI tiene un modelo de generación de imagen llamado **Flux 1 Schnell** que es gratis hasta 10K imágenes/día y tiene calidad excelente. Es el que el Worker usa por default.

Si en algún momento querés usar DALL-E 3 en su lugar (calidad ligeramente superior pero $0.04/imagen y requiere tarjeta que OpenAI a veces rechaza), agregá la key con `wrangler secret put OPENAI_API_KEY`. La app te dejará elegir cuál usar.

### 4. Instalar wrangler

En la terminal:

```bash
npm install -g wrangler
wrangler login
```

Te abre el browser para autenticar con tu cuenta Cloudflare.

### 5. Deploy

Desde la carpeta `worker/`:

```bash
cd /Users/juanitaleff/Desktop/CROCHET/worker
npm install
wrangler secret put ANTHROPIC_API_KEY
# (te pide la key, la pegás de Anthropic, enter)
wrangler deploy
```

Te tira algo como:

```
Deployed achis-de-amor-worker
https://achis-de-amor-worker.tu-cuenta.workers.dev
```

**Esa URL es la que vas a copiar en Ajustes de la app.**

### 6. (Opcional) Restringir CORS a tu dominio

Por seguridad, cuando subas a producción, editá `wrangler.toml`:

```toml
[vars]
ALLOWED_ORIGIN = "https://juanitota897.github.io"
```

Y volvé a hacer `wrangler deploy`. Eso evita que otros usen tu Worker.

## Costos estimados

Para uso normal de tu mamá:

| Operación | Modelo | Costo |
|---|---|---|
| Generar imagen | **Flux 1 Schnell** (Cloudflare) | **$0** (gratis hasta 10K/día) |
| Generar imagen | DALL-E 3 (opcional) | $0.04 / imagen |
| Generar prompt para imagen | Claude Haiku | $0.001 / llamada |
| Analizar imagen del PDF | Claude Vision | $0.005 / imagen |
| Limpiar patrón | Claude Haiku | $0.003 / patrón |

**Total mensual estimado para uso moderado: $0.50-1 USD/mes.**

Cloudflare Workers gratis te da 100K requests/día. La AI tiene 10K neurons/día gratis. Más que suficiente.

## Desarrollo local

Para probar el Worker antes de deploy:

```bash
wrangler dev
# Worker disponible en http://localhost:8787
```

En la app de Achis de Amor, configurás `Worker URL = http://localhost:8787` en Ajustes.

## Logs

Para ver los logs en producción en tiempo real:

```bash
wrangler tail
```

## Modificar y redeployar

Cambiás `src/index.ts`, después:

```bash
wrangler deploy
```

Y se actualiza en segundos.
