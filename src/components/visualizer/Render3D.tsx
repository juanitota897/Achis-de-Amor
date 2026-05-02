/**
 * 3D viewer component.
 *
 * Centers the scene around the origin so the camera (looking at 0,0,0)
 * frames the amigurumi correctly regardless of single- or multi-piece patterns.
 */

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import type { Geometry } from '@/engine/types';
import { AmigurumiMesh } from './AmigurumiMesh';
import { useSettings } from '@/store/settings';

interface Render3DProps {
  geometry: Geometry | null;
  autoRotate?: boolean;
  background?: string;
}

const SCALE = 0.1; // mm to cm in 3D space units

export function Render3D({ geometry, autoRotate = true, background = '#FBF7F1' }: Render3DProps) {
  const { renderMode, setRenderMode, language } = useSettings();
  const layout = useMemo(() => {
    if (!geometry || geometry.pieces.length === 0) {
      return { positions: [] as [number, number, number][], cameraDistance: 25, sceneCenter: [0, 0, 0] as [number, number, number], floorY: -2 };
    }

    const PIECE_GAP = 1.5; // cm between pieces
    const positions: [number, number, number][] = [];

    // Compute total width: sum of (2*maxRadius) + gaps
    const totalWidth =
      geometry.pieces.reduce((s, p) => s + p.maxRadius * 2 * SCALE, 0) +
      (geometry.pieces.length - 1) * PIECE_GAP;

    // Tallest piece (for cam framing)
    const maxHeight = Math.max(...geometry.pieces.map((p) => p.totalHeight * SCALE));

    let xCursor = -totalWidth / 2;
    for (const piece of geometry.pieces) {
      const widthCm = piece.maxRadius * 2 * SCALE;
      const centerX = xCursor + widthCm / 2;
      // Center each piece vertically by its mid-height around y=0
      const centerY = -(piece.totalHeight * SCALE) / 2;
      positions.push([centerX, centerY, 0]);
      xCursor += widthCm + PIECE_GAP;
    }

    // Camera distance proportional to the bigger of width/height
    const sceneSize = Math.max(totalWidth, maxHeight);
    const cameraDistance = Math.max(12, sceneSize * 1.8);

    return {
      positions,
      cameraDistance,
      sceneCenter: [0, 0, 0] as [number, number, number],
      floorY: -maxHeight / 2 - 0.3,
    };
  }, [geometry]);

  if (!geometry || geometry.pieces.length === 0) {
    return (
      <div
        className="flex h-full w-full items-center justify-center text-cream-500"
        style={{ backgroundColor: background }}
      >
        <p>Pegá un patrón para ver la vista 3D</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Render mode toggle */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full bg-white/85 backdrop-blur border border-cream-200 px-1 py-1 shadow-sm">
        <button
          onClick={() => setRenderMode('plush')}
          className={`text-xs px-3 py-1 rounded-full transition ${
            renderMode === 'plush'
              ? 'bg-terracotta-500 text-white'
              : 'text-cream-700 hover:bg-cream-100'
          }`}
          title={language === 'es' ? 'Vista realista (con relleno)' : 'Realistic view (with stuffing)'}
        >
          🧸 {language === 'es' ? 'Peluche' : 'Plush'}
        </button>
        <button
          onClick={() => setRenderMode('technical')}
          className={`text-xs px-3 py-1 rounded-full transition ${
            renderMode === 'technical'
              ? 'bg-terracotta-500 text-white'
              : 'text-cream-700 hover:bg-cream-100'
          }`}
          title={language === 'es' ? 'Vista técnica (rondas visibles)' : 'Technical view (rounds visible)'}
        >
          📐 {language === 'es' ? 'Técnico' : 'Technical'}
        </button>
      </div>
      <Canvas
      shadows
      gl={{ preserveDrawingBuffer: true }}
      camera={{
        position: [
          layout.cameraDistance * 0.6,
          layout.cameraDistance * 0.45,
          layout.cameraDistance,
        ],
        fov: 35,
      }}
      style={{ background }}
    >
      <Suspense fallback={null}>
        {/* Warm ambient base */}
        <hemisphereLight args={['#FFE4B5', '#7a6452', 0.5]} />

        {/* Key light: main directional from upper-front-right */}
        <directionalLight
          position={[10, 15, 8]}
          intensity={1.6}
          color="#FFF4E0"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-25}
          shadow-camera-right={25}
          shadow-camera-top={25}
          shadow-camera-bottom={-25}
          shadow-bias={-0.0001}
        />

        {/* Fill light: warm rim from the left to catch fiber sheen */}
        <directionalLight
          position={[-12, 4, 6]}
          intensity={0.55}
          color="#FFD9A8"
        />

        {/* Back rim: soft pink kicker behind to separate from background */}
        <directionalLight
          position={[-5, 8, -10]}
          intensity={0.4}
          color="#F2C0C8"
        />

        {/* Subtle bottom bounce */}
        <pointLight position={[0, -5, 5]} intensity={0.3} color="#FFE9C4" />

        {geometry.pieces.map((piece, i) => (
          <AmigurumiMesh
            key={piece.pieceId}
            geometry={piece}
            position={layout.positions[i]}
            renderMode={renderMode}
          />
        ))}

        <ContactShadows
          position={[0, layout.floorY, 0]}
          opacity={0.35}
          scale={layout.cameraDistance * 1.5}
          blur={2.5}
          far={layout.cameraDistance}
        />

        <Environment preset="sunset" environmentIntensity={0.5} />

        <OrbitControls
          autoRotate={autoRotate}
          autoRotateSpeed={0.6}
          enablePan={true}
          enableZoom={true}
          minDistance={3}
          maxDistance={layout.cameraDistance * 4}
          target={layout.sceneCenter}
        />
      </Suspense>
    </Canvas>
    </div>
  );
}
