/**
 * 3D mesh builder.
 *
 * Two render modes:
 *
 *   - 'plush' (default): how a finished, stuffed amigurumi actually looks.
 *      • Profile is low-pass filtered to erase ring-step artifacts.
 *      • Mid-section rings are inflated radially (simulates stuffing pushing out).
 *      • Caps continue the tangent of the last ring instead of forcing a quarter-circle,
 *        so closures look like a hand-pinched dome rather than a geometric cone-tip.
 *      • Material is matte (low sheen, no clearcoat) — fluffy, not plastic.
 *      • Texture intensity reduced so silhouette dominates.
 *
 *   - 'technical': true to the math. Each round visible. Sharp closures.
 *      Useful for debugging patterns or counting stitches.
 *
 * Strategy in either mode:
 *   1. Build profile (radius+y per ring) from PieceGeometry.
 *   2. Apply mode-specific transforms (blur, inflate, etc).
 *   3. Densely interpolate between rings.
 *   4. Cap each end per its EndCapStyle.
 *   5. Sweep the profile around the Y axis, triangulate, generate UVs.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { PieceGeometry, EndCapStyle } from '@/engine/types';
import { getCrochetTextures, TILE_STITCHES_X, TILE_STITCHES_Y } from './crochetTexture';
import type { RenderMode } from '@/store/settings';

interface AmigurumiMeshProps {
  geometry: PieceGeometry;
  position?: [number, number, number];
  rotation?: [number, number, number];
  segments?: number;
  subdivisions?: number;
  renderMode?: RenderMode;
}

export function AmigurumiMesh({
  geometry,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  segments = 64,
  subdivisions,
  renderMode = 'plush',
}: AmigurumiMeshProps) {
  const effectiveSubdivs = subdivisions ?? (renderMode === 'plush' ? 24 : 12);

  // For foot-shape pieces, split the rings into foot (0..peak) and leg
  // (peak..end), and render each as its own mesh: foot horizontal, leg
  // vertical above. This produces the natural L-shape of a leg+foot.
  const subPieces = useMemo(() => {
    if (geometry.isFootShape && geometry.peakRingIndex > 0 && geometry.rings.length > geometry.peakRingIndex + 1) {
      const footRings = geometry.rings.slice(0, geometry.peakRingIndex + 1);
      const legRings = geometry.rings.slice(geometry.peakRingIndex);
      return { foot: footRings, leg: legRings, isSplit: true };
    }
    return { foot: geometry.rings, leg: [], isSplit: false };
  }, [geometry]);

  // Build geometries
  const footGeometry = useMemo(
    () => buildSubPieceGeometry(subPieces.foot, geometry, segments, effectiveSubdivs, renderMode, 'foot'),
    [subPieces.foot, geometry, segments, effectiveSubdivs, renderMode],
  );
  const legGeometry = useMemo(
    () => (subPieces.isSplit ? buildSubPieceGeometry(subPieces.leg, geometry, segments, effectiveSubdivs, renderMode, 'leg') : null),
    [subPieces.leg, subPieces.isSplit, geometry, segments, effectiveSubdivs, renderMode],
  );

  const textures = useMemo(() => {
    const base = getCrochetTextures();
    const bumpMap = base.bumpMap.clone();
    const normalMap = base.normalMap.clone();
    const roughnessMap = base.roughnessMap.clone();
    const aoMap = base.aoMap.clone();
    bumpMap.needsUpdate = true;
    normalMap.needsUpdate = true;
    roughnessMap.needsUpdate = true;
    aoMap.needsUpdate = true;
    if (geometry.rings.length > 0) {
      const avgStitchesAround =
        geometry.rings.reduce((s, r) => s + r.stitchCount, 0) / geometry.rings.length;
      const totalRounds = geometry.rings.length;
      const repeatX = Math.max(1, Math.round(avgStitchesAround / TILE_STITCHES_X));
      const repeatY = Math.max(1, Math.round(totalRounds / TILE_STITCHES_Y));
      bumpMap.repeat.set(repeatX, repeatY);
      normalMap.repeat.set(repeatX, repeatY);
      roughnessMap.repeat.set(repeatX, repeatY);
      aoMap.repeat.set(repeatX, repeatY);
    }
    return { bumpMap, normalMap, roughnessMap, aoMap };
  }, [geometry]);

  const isPlush = renderMode === 'plush';
  const normalScale = isPlush ? 0.3 : 0.6;
  const sheenIntensity = isPlush ? 0.25 : 0.6;
  const roughness = isPlush ? 0.97 : 0.92;
  const clearcoat = isPlush ? 0 : 0.05;

  function renderMaterial(): React.ReactElement {
    return (
      <meshPhysicalMaterial
        vertexColors
        normalMap={textures.normalMap}
        normalScale={new THREE.Vector2(normalScale, normalScale)}
        roughnessMap={textures.roughnessMap}
        roughness={roughness}
        aoMap={textures.aoMap}
        aoMapIntensity={isPlush ? 0.8 : 0.7}
        metalness={0.0}
        sheen={sheenIntensity}
        sheenRoughness={isPlush ? 0.8 : 0.4}
        sheenColor={new THREE.Color(isPlush ? '#fff0d8' : '#fff5e8')}
        clearcoat={clearcoat}
        clearcoatRoughness={0.9}
        side={THREE.DoubleSide}
        flatShading={false}
      />
    );
  }

  // For foot-shape pieces: foot lies flat (rotated 90° around X axis), leg
  // stays vertical above. We compute the foot's footprint height (the original
  // height of the foot rings stacked) — that height becomes the foot's
  // forward-extension when laid flat.
  if (subPieces.isSplit && legGeometry) {
    const SCALE = 0.1;
    const peakRing = geometry.rings[geometry.peakRingIndex];
    const footMaxRing = peakRing;
    const footHeightCm = peakRing.yPosition * SCALE; // length of foot when laid flat
    const peakRadiusZ = (footMaxRing.radiusZ ?? footMaxRing.radius) * SCALE;
    // Foot: place at ground (Y=0), centered, with forward offset so leg sits on its back third
    const footY = peakRadiusZ * 0.7; // foot sits on bottom edge, raised by half height
    const legY = peakRadiusZ * 1.3; // leg starts above the foot
    const footZ = footHeightCm * 0.25; // foot extends mostly forward, slightly back of leg axis

    return (
      <group position={position} rotation={rotation}>
        <mesh
          geometry={footGeometry}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, footY, footZ]}
          castShadow
          receiveShadow
        >
          {renderMaterial()}
        </mesh>
        <mesh
          geometry={legGeometry}
          position={[0, legY, 0]}
          castShadow
          receiveShadow
        >
          {renderMaterial()}
        </mesh>
      </group>
    );
  }

  // Default: single mesh, vertical
  return (
    <mesh
      geometry={footGeometry}
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
    >
      {renderMaterial()}
    </mesh>
  );
}

interface ProfilePoint {
  y: number;
  /** Average radius (used by interpolation as a scalar). */
  radius: number;
  /** Optional: ellipse semi-axis in X. Defaults to radius (circular). */
  radiusX: number;
  /** Optional: ellipse semi-axis in Z. Defaults to radius (circular). */
  radiusZ: number;
  color: THREE.Color;
}

type SubPieceKind = 'foot' | 'leg' | 'whole';

function buildSubPieceGeometry(
  rings: PieceGeometry['rings'],
  parentGeom: PieceGeometry,
  segments: number,
  subdivisions: number,
  mode: RenderMode,
  kind: SubPieceKind,
): THREE.BufferGeometry {
  if (rings.length === 0) return new THREE.BufferGeometry();

  const SCALE = 0.1;

  // Step 1: control points. Re-baseline the y so the first ring is at y=0.
  const baseY = rings[0].yPosition;
  let controlPoints: ProfilePoint[] = rings.map((ring) => ({
    y: (ring.yPosition - baseY) * SCALE,
    radius: ring.radius * SCALE,
    radiusX: (ring.radiusX ?? ring.radius) * SCALE,
    radiusZ: (ring.radiusZ ?? ring.radius) * SCALE,
    color: new THREE.Color(ring.color),
  }));

  // For sub-pieces of foot-shaped patterns, skip the inflate (pieces are
  // shorter and we want to preserve the silhouette exactly).
  const skipInflate = parentGeom.isFootShape;

  if (mode === 'plush') {
    controlPoints = blurRadiusProfile(controlPoints, 1);
    if (!skipInflate) {
      controlPoints = inflateForStuffing(controlPoints, 0.04);
    }
  }

  const profile = interpolateProfile(controlPoints, subdivisions);

  // Determine the right cap styles for this sub-piece
  // - 'foot' alone (whole piece): use parentGeom caps
  // - 'foot' as sub-piece: closed at start (toe), flat at end (where it meets the leg)
  // - 'leg' as sub-piece: flat at start (where it meets the foot), use parentGeom endCap at top
  // - 'whole': use parentGeom caps
  let startCapStyle: typeof parentGeom.startCap = parentGeom.startCap;
  let endCapStyle: typeof parentGeom.endCap = parentGeom.endCap;
  if (kind === 'foot') {
    // Foot piece: closed at toe (start), open/flat where leg attaches (end)
    startCapStyle = parentGeom.startCap;
    endCapStyle = 'open'; // we'll cover the join with the leg mesh
  } else if (kind === 'leg') {
    // Leg piece: open where foot attaches (start), normal cap at top
    startCapStyle = 'open';
    endCapStyle = parentGeom.endCap;
  }

  const startCap = buildStartCap(profile, startCapStyle, subdivisions, mode);
  const endCap = buildEndCap(profile, endCapStyle, subdivisions, mode);

  const fullProfile = [...startCap, ...profile, ...endCap];

  return profileToMesh(fullProfile, segments);
}

// ─── Plush transformations ───────────────────────────────────────────────

/**
 * Low-pass filter on the radius profile. Erases ring-step discontinuities
 * between adjacent rounds with very different stitch counts. The Y values
 * are kept as-is — only radius is smoothed.
 */
function blurRadiusProfile(profile: ProfilePoint[], passes: number): ProfilePoint[] {
  if (profile.length < 3) return profile;

  function blurAxis(values: number[]): number[] {
    let v = values;
    for (let pass = 0; pass < passes; pass++) {
      const next: number[] = [];
      for (let i = 0; i < v.length; i++) {
        const a = v[Math.max(0, i - 2)];
        const b = v[Math.max(0, i - 1)];
        const c = v[i];
        const d = v[Math.min(v.length - 1, i + 1)];
        const e = v[Math.min(v.length - 1, i + 2)];
        next.push(a * 0.1 + b * 0.2 + c * 0.4 + d * 0.2 + e * 0.1);
      }
      v = next;
    }
    return v;
  }

  const radii = blurAxis(profile.map((p) => p.radius));
  const radiiX = blurAxis(profile.map((p) => p.radiusX));
  const radiiZ = blurAxis(profile.map((p) => p.radiusZ));
  return profile.map((p, i) => ({
    ...p,
    radius: radii[i],
    radiusX: radiiX[i],
    radiusZ: radiiZ[i],
  }));
}

/**
 * Simulate stuffing inflating the piece. Each ring is pushed outward by
 * an amount proportional to (radius / maxRadius)² — so the equator gets
 * the most inflation, the poles barely any. This mimics how a stuffed
 * amigurumi looks "tense" in the middle but tapers naturally at the ends.
 */
function inflateForStuffing(profile: ProfilePoint[], maxFactor: number): ProfilePoint[] {
  const maxR = Math.max(...profile.map((p) => p.radius));
  if (maxR <= 0) return profile;
  return profile.map((p) => {
    const t = p.radius / maxR; // 0..1
    const inflate = 1 + maxFactor * t * t;
    return {
      ...p,
      radius: p.radius * inflate,
      radiusX: p.radiusX * inflate,
      radiusZ: p.radiusZ * inflate,
    };
  });
}

// ─── Cubic interpolation ─────────────────────────────────────────────────

function interpolateProfile(controls: ProfilePoint[], subdivisions: number): ProfilePoint[] {
  if (controls.length < 2) return controls;
  const out: ProfilePoint[] = [controls[0]];

  for (let i = 0; i < controls.length - 1; i++) {
    const p0 = controls[i - 1] ?? controls[i];
    const p1 = controls[i];
    const p2 = controls[i + 1];
    const p3 = controls[i + 2] ?? p2;

    for (let s = 1; s <= subdivisions; s++) {
      const t = s / subdivisions;
      const radius = catmullRom(p0.radius, p1.radius, p2.radius, p3.radius, t);
      const radiusX = catmullRom(p0.radiusX, p1.radiusX, p2.radiusX, p3.radiusX, t);
      const radiusZ = catmullRom(p0.radiusZ, p1.radiusZ, p2.radiusZ, p3.radiusZ, t);
      const y = lerp(p1.y, p2.y, t);
      const color = p1.color.clone().lerp(p2.color, t);
      out.push({
        y,
        radius: Math.max(0, radius),
        radiusX: Math.max(0, radiusX),
        radiusZ: Math.max(0, radiusZ),
        color,
      });
    }
  }

  return out;
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

// ─── Caps ────────────────────────────────────────────────────────────────

/**
 * Build start cap. In 'plush' mode the cap is computed as a Bezier-ish
 * curve that continues the tangent of the first 1-2 rings, so the closure
 * looks like a hand-pinched dome. In 'technical' mode it's a quarter-circle.
 */
function buildStartCap(
  profile: ProfilePoint[],
  style: EndCapStyle,
  steps: number,
  mode: RenderMode,
): ProfilePoint[] {
  if (style === 'open' || profile.length === 0) return [];
  const ring = profile[0];
  if (style === 'flat') {
    return buildFlatishCap(ring, -1, Math.max(3, Math.floor(steps / 3)));
  }
  if (mode === 'plush' && profile.length >= 2) {
    return buildTangentialCap(ring, profile[1], -1, steps);
  }
  return buildQuarterCircleCap(ring, -1, steps);
}

function buildEndCap(
  profile: ProfilePoint[],
  style: EndCapStyle,
  steps: number,
  mode: RenderMode,
): ProfilePoint[] {
  if (style === 'open' || profile.length === 0) return [];
  const ring = profile[profile.length - 1];
  if (style === 'flat') {
    return buildFlatishCap(ring, +1, Math.max(3, Math.floor(steps / 3)));
  }
  if (mode === 'plush' && profile.length >= 2) {
    return buildTangentialCap(ring, profile[profile.length - 2], +1, steps);
  }
  return buildQuarterCircleCap(ring, +1, steps);
}

/**
 * "Flat-ish" cap: a very low dome (~15% of radius height) that closes the end
 * smoothly without creating a pinch. Used for cylinders, tubes, and any piece
 * where the last ring isn't already small.
 */
function buildFlatishCap(
  ring: ProfilePoint,
  direction: 1 | -1,
  steps: number,
): ProfilePoint[] {
  const capH = ring.radius * 0.15; // very shallow
  const points: ProfilePoint[] = [];
  if (direction === -1) {
    for (let i = steps; i >= 1; i--) {
      const t = i / steps;
      const theta = (t * Math.PI) / 2;
      const c = Math.cos(theta);
      points.push({
        y: ring.y - capH * Math.sin(theta),
        radius: ring.radius * c,
        radiusX: ring.radiusX * c,
        radiusZ: ring.radiusZ * c,
        color: ring.color.clone(),
      });
    }
  } else {
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const theta = (t * Math.PI) / 2;
      const c = Math.cos(theta);
      points.push({
        y: ring.y + capH * Math.sin(theta),
        radius: ring.radius * c,
        radiusX: ring.radiusX * c,
        radiusZ: ring.radiusZ * c,
        color: ring.color.clone(),
      });
    }
  }
  return points;
}

/**
 * Quarter-circle cap. Used in 'technical' mode.
 */
function buildQuarterCircleCap(
  ring: ProfilePoint,
  direction: 1 | -1,
  steps: number,
): ProfilePoint[] {
  const capH = ring.radius * 1.0;
  const points: ProfilePoint[] = [];
  if (direction === -1) {
    for (let i = steps; i >= 1; i--) {
      const t = i / steps;
      const theta = (t * Math.PI) / 2;
      const c = Math.cos(theta);
      points.push({
        y: ring.y - capH * Math.sin(theta),
        radius: ring.radius * c,
        radiusX: ring.radiusX * c,
        radiusZ: ring.radiusZ * c,
        color: ring.color.clone(),
      });
    }
  } else {
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const theta = (t * Math.PI) / 2;
      const c = Math.cos(theta);
      points.push({
        y: ring.y + capH * Math.sin(theta),
        radius: ring.radius * c,
        radiusX: ring.radiusX * c,
        radiusZ: ring.radiusZ * c,
        color: ring.color.clone(),
      });
    }
  }
  return points;
}

/**
 * Tangential cap: cubic Bezier from the ring to (radius=0, y=ring.y ± capH),
 * with a control point that continues the tangent of the previous ring.
 * This produces a smooth, natural-looking closure.
 */
function buildTangentialCap(
  ring: ProfilePoint,
  prevRing: ProfilePoint,
  direction: 1 | -1,
  steps: number,
): ProfilePoint[] {
  // Tangent of the profile at the cap point (slope dr/dy)
  const dr = ring.radius - prevRing.radius;
  const dy = direction === -1 ? prevRing.y - ring.y : ring.y - prevRing.y;
  const slope = Math.abs(dy) > 0.001 ? dr / dy : 0;

  // Cap height: smaller if the slope is already steep (so it doesn't overshoot)
  const baseCapH = ring.radius * 0.95;
  const capH = baseCapH / (1 + Math.abs(slope) * 1.5);

  // Bezier control points — both ends should match the tangent of the profile.
  // P0 = (ring.radius, ring.y)
  // P1 = (ring.radius + slope*capH/3, ring.y + direction*capH/3)
  // P2 = (slope*capH/3, ring.y + direction*capH*2/3)
  // P3 = (0, ring.y + direction*capH)
  const tipY = ring.y + direction * capH;
  const points: ProfilePoint[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    // Cubic Bezier — same shape factor applied to both axes preserves ellipse ratio
    function bezScalar(v: number): number {
      return u * u * u * v + 3 * u * u * t * (v * 0.85) + 3 * u * t * t * (v * 0.4);
    }
    const r = bezScalar(ring.radius);
    const rX = bezScalar(ring.radiusX);
    const rZ = bezScalar(ring.radiusZ);
    const y =
      u * u * u * ring.y +
      3 * u * u * t * (ring.y + direction * capH * 0.3) +
      3 * u * t * t * (ring.y + direction * capH * 0.65) +
      t * t * t * tipY;
    points.push({
      y,
      radius: Math.max(0.001, r),
      radiusX: Math.max(0.001, rX),
      radiusZ: Math.max(0.001, rZ),
      color: ring.color.clone(),
    });
  }

  return direction === -1 ? points.reverse() : points;
}

// ─── Sweep + triangulate ─────────────────────────────────────────────────

function profileToMesh(
  profile: ProfilePoint[],
  segments: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const ringVertCount = segments + 1;

  for (let i = 0; i < profile.length; i++) {
    const point = profile[i];
    const v = i / Math.max(1, profile.length - 1);
    for (let s = 0; s <= segments; s++) {
      const u = s / segments;
      const angle = u * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      // Use per-point ellipse semi-axes: X uses radiusX (long axis for foundation
      // chain pieces), Z uses radiusZ (short axis).
      positions.push(point.radiusX * cos, point.y, point.radiusZ * sin);
      colors.push(point.color.r, point.color.g, point.color.b);
      uvs.push(u, v);
    }
  }

  const indices: number[] = [];
  for (let i = 0; i < profile.length - 1; i++) {
    for (let s = 0; s < segments; s++) {
      const a = i * ringVertCount + s;
      const b = i * ringVertCount + s + 1;
      const c = (i + 1) * ringVertCount + s;
      const d = (i + 1) * ringVertCount + s + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('uv2', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
