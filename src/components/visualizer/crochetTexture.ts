/**
 * Procedural crochet texture generator — high-fidelity edition.
 *
 * Generates a stack of canvas-based texture maps that together simulate
 * the appearance of single-crochet stitches:
 *
 *   - bumpMap: grayscale height field of the stitches
 *   - normalMap: per-pixel surface normals derived from the bump (this is
 *     what really sells the 3D illusion under lighting)
 *   - roughnessMap: subtle yarn-fiber variation, slightly darker in valleys
 *   - aoMap: ambient occlusion that darkens the spaces between stitches
 *
 * The single-crochet anatomy:
 *   - Each stitch is a V-chevron at the top (the "front loop" pair)
 *   - Below the V is the "post" — vertical stripe going down to the next round
 *   - The center between two posts has a small hole (where the hook went in)
 *   - Stitches in alternating rows are offset by half a stitch (continuous spiral)
 */

import * as THREE from 'three';

const TILE_SIZE = 1024;
const STITCHES_PER_TILE_X = 8;
const STITCHES_PER_TILE_Y = 8;

let cached: {
  bumpMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  aoMap: THREE.CanvasTexture;
} | null = null;

interface TextureSet {
  bumpMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  aoMap: THREE.CanvasTexture;
}

export function getCrochetTextures(): TextureSet {
  if (cached) return cached;

  const bumpCanvas = createBumpCanvas();
  const normalCanvas = bumpToNormal(bumpCanvas);
  const roughnessCanvas = createRoughnessCanvas(bumpCanvas);
  const aoCanvas = bumpToAO(bumpCanvas);

  const bumpMap = makeTexture(bumpCanvas);
  const normalMap = makeTexture(normalCanvas);
  const roughnessMap = makeTexture(roughnessCanvas);
  const aoMap = makeTexture(aoCanvas);

  cached = { bumpMap, normalMap, roughnessMap, aoMap };
  return cached;
}

export const TILE_STITCHES_X = STITCHES_PER_TILE_X;
export const TILE_STITCHES_Y = STITCHES_PER_TILE_Y;

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

// ─── Bump map (height field) ──────────────────────────────────────────────

function createBumpCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;
  const ctx = canvas.getContext('2d')!;

  // Mid-gray background = base height
  ctx.fillStyle = '#7a7a7a';
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

  const stitchW = TILE_SIZE / STITCHES_PER_TILE_X;
  const stitchH = TILE_SIZE / STITCHES_PER_TILE_Y;

  // First pass: dark valleys (the spaces between stitches)
  for (let row = -1; row < STITCHES_PER_TILE_Y + 1; row++) {
    const offsetX = row % 2 === 0 ? 0 : stitchW * 0.5;
    for (let col = -1; col < STITCHES_PER_TILE_X + 1; col++) {
      const cx = col * stitchW + offsetX + stitchW / 2;
      const cy = row * stitchH + stitchH / 2;
      drawValley(ctx, cx, cy, stitchW, stitchH);
    }
  }

  // Second pass: stitch bodies (the raised V chevrons)
  for (let row = -1; row < STITCHES_PER_TILE_Y + 1; row++) {
    const offsetX = row % 2 === 0 ? 0 : stitchW * 0.5;
    for (let col = -1; col < STITCHES_PER_TILE_X + 1; col++) {
      const cx = col * stitchW + offsetX + stitchW / 2;
      const cy = row * stitchH + stitchH / 2;
      drawStitch(ctx, cx, cy, stitchW, stitchH);
    }
  }

  // Third pass: fine yarn fiber noise overlay
  addFiberNoise(ctx);

  return canvas;
}

/** Draw the valley/shadow under each stitch (dark area between stitches). */
function drawValley(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
): void {
  // Subtle dark fade around the stitch periphery
  const fade = ctx.createRadialGradient(cx, cy, w * 0.3, cx, cy, w * 0.7);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = fade;
  ctx.fillRect(cx - w, cy - h, w * 2, h * 2);
}

/** Draw a single sc stitch — V chevron + post + hole. */
function drawStitch(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
): void {
  // 1. The "post" — vertical column going from this stitch down to next round
  const postGrad = ctx.createLinearGradient(cx - w * 0.18, cy, cx + w * 0.18, cy);
  postGrad.addColorStop(0, '#5a5a5a');
  postGrad.addColorStop(0.5, '#a8a8a8');
  postGrad.addColorStop(1, '#5a5a5a');
  ctx.fillStyle = postGrad;
  ctx.beginPath();
  ctx.roundRect(cx - w * 0.18, cy - h * 0.05, w * 0.36, h * 0.55, w * 0.05);
  ctx.fill();

  // 2. The body of the stitch — slightly raised oval at the top
  const body = ctx.createRadialGradient(cx, cy - h * 0.05, w * 0.05, cx, cy - h * 0.1, w * 0.5);
  body.addColorStop(0, '#c2c2c2');
  body.addColorStop(0.5, '#a0a0a0');
  body.addColorStop(1, '#7a7a7a');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(cx, cy - h * 0.1, w * 0.42, h * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. The V chevron — two diagonal "legs" forming the top of the stitch
  // These are the most visible feature of single crochet
  const legGrad = ctx.createLinearGradient(cx, cy - h * 0.4, cx, cy - h * 0.05);
  legGrad.addColorStop(0, '#d8d8d8'); // bright top edge
  legGrad.addColorStop(1, '#909090');
  ctx.strokeStyle = legGrad;
  ctx.lineWidth = w * 0.08;
  ctx.lineCap = 'round';
  ctx.beginPath();
  // Left leg
  ctx.moveTo(cx - w * 0.34, cy + h * 0.05);
  ctx.lineTo(cx, cy - h * 0.32);
  // Right leg
  ctx.lineTo(cx + w * 0.34, cy + h * 0.05);
  ctx.stroke();

  // 4. Inner highlight on legs (the shiny edge of the yarn)
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = w * 0.025;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.32, cy + h * 0.03);
  ctx.lineTo(cx - w * 0.02, cy - h * 0.3);
  ctx.moveTo(cx + w * 0.02, cy - h * 0.3);
  ctx.lineTo(cx + w * 0.32, cy + h * 0.03);
  ctx.stroke();

  // 5. Hole at the top center (where the hook entered)
  const hole = ctx.createRadialGradient(cx, cy - h * 0.32, 0, cx, cy - h * 0.32, w * 0.08);
  hole.addColorStop(0, '#2a2a2a');
  hole.addColorStop(1, 'rgba(42,42,42,0)');
  ctx.fillStyle = hole;
  ctx.beginPath();
  ctx.ellipse(cx, cy - h * 0.32, w * 0.1, h * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Add subtle high-frequency noise to simulate yarn fibers. */
function addFiberNoise(ctx: CanvasRenderingContext2D): void {
  const imageData = ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const noise = (Math.random() - 0.5) * 12;
    d[i] = clamp(d[i] + noise);
    d[i + 1] = clamp(d[i + 1] + noise);
    d[i + 2] = clamp(d[i + 2] + noise);
  }
  ctx.putImageData(imageData, 0, 0);
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, v));
}

// ─── Normal map (derived from bump via Sobel-like gradient) ───────────────

function bumpToNormal(bumpCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = bumpCanvas.width;
  canvas.height = bumpCanvas.height;
  const ctx = canvas.getContext('2d')!;
  const bumpCtx = bumpCanvas.getContext('2d')!;
  const bump = bumpCtx.getImageData(0, 0, canvas.width, canvas.height);
  const out = ctx.createImageData(canvas.width, canvas.height);

  const w = canvas.width;
  const h = canvas.height;
  const strength = 6.0; // higher = more pronounced normals

  function getHeight(x: number, y: number): number {
    const xi = ((x % w) + w) % w;
    const yi = ((y % h) + h) % h;
    return bump.data[(yi * w + xi) * 4] / 255;
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = getHeight(x - 1, y - 1);
      const t = getHeight(x, y - 1);
      const tr = getHeight(x + 1, y - 1);
      const l = getHeight(x - 1, y);
      const r = getHeight(x + 1, y);
      const bl = getHeight(x - 1, y + 1);
      const b = getHeight(x, y + 1);
      const br = getHeight(x + 1, y + 1);

      // Sobel kernels
      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      // Normal vector (in tangent space)
      const nx = -dx * strength;
      const ny = -dy * strength;
      const nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

      const idx = (y * w + x) * 4;
      out.data[idx] = ((nx / len) * 0.5 + 0.5) * 255;
      out.data[idx + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      out.data[idx + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      out.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(out, 0, 0);
  return canvas;
}

// ─── Roughness map ────────────────────────────────────────────────────────

function createRoughnessCanvas(bumpCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = bumpCanvas.width;
  canvas.height = bumpCanvas.height;
  const ctx = canvas.getContext('2d')!;
  const bumpCtx = bumpCanvas.getContext('2d')!;
  const bump = bumpCtx.getImageData(0, 0, canvas.width, canvas.height);
  const out = ctx.createImageData(canvas.width, canvas.height);

  // Roughness is mostly uniform but slightly higher in valleys (yarn fibers
  // catch more light there)
  for (let i = 0; i < bump.data.length; i += 4) {
    const height = bump.data[i] / 255;
    // High in valleys (low height), slightly less on raised areas
    const roughness = 0.92 - height * 0.15 + (Math.random() - 0.5) * 0.08;
    const v = clamp(roughness * 255);
    out.data[i] = v;
    out.data[i + 1] = v;
    out.data[i + 2] = v;
    out.data[i + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}

// ─── Ambient occlusion map ────────────────────────────────────────────────

function bumpToAO(bumpCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = bumpCanvas.width;
  canvas.height = bumpCanvas.height;
  const ctx = canvas.getContext('2d')!;
  const bumpCtx = bumpCanvas.getContext('2d')!;
  const bump = bumpCtx.getImageData(0, 0, canvas.width, canvas.height);
  const out = ctx.createImageData(canvas.width, canvas.height);

  // Simple AO: brighter where bump is high, darker where bump is low
  // (valleys block light)
  for (let i = 0; i < bump.data.length; i += 4) {
    const height = bump.data[i] / 255;
    const ao = 0.5 + height * 0.5;
    const v = clamp(ao * 255);
    out.data[i] = v;
    out.data[i + 1] = v;
    out.data[i + 2] = v;
    out.data[i + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}
