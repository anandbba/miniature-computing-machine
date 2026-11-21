import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Environment, Lightformer} from '@react-three/drei';
import {EffectComposer, Bloom, Vignette, DepthOfField} from '@react-three/postprocessing';
import {C} from '../theme';
import {rnd} from '../util';

// Studio lighting rendered into an env map: softboxes + brand-coloured rim strips.
export const Studio: React.FC<{warm?: number; mono?: boolean}> = ({warm = 1, mono = false}) => (
  <>
    <Environment resolution={512} frames={1}>
      <color attach="background" args={['#020305']} />
      <Lightformer form="rect" intensity={5} position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[12, 4, 1]} />
      <Lightformer form="rect" intensity={2.4 * warm} color="#ffe2b0" position={[-6, 1, 3]} rotation-y={Math.PI / 2} scale={[3, 10, 1]} />
      <Lightformer form="rect" intensity={2.4 * warm} color="#ffe2b0" position={[6, 1, 3]} rotation-y={-Math.PI / 2} scale={[3, 10, 1]} />
      <Lightformer form="rect" intensity={mono ? 0 : 3} color={C.cyan} position={[-5, 0, -4]} rotation-y={Math.PI / 4} scale={[1.2, 12, 1]} />
      <Lightformer form="rect" intensity={mono ? 0 : 2.2} color={C.green} position={[5, -1, -4]} rotation-y={-Math.PI / 4} scale={[1.2, 12, 1]} />
      <Lightformer form="rect" intensity={4} color="#fff1d6" position={[0, 1.6, 8]} rotation-y={Math.PI} scale={[14, 1.6, 1]} />
      <Lightformer form="rect" intensity={1.4} color="#ffd9a0" position={[0, -1.6, 8]} rotation-y={Math.PI} scale={[14, 0.9, 1]} />
      <Lightformer form="rect" intensity={1.3} color="#fff4e0" position={[0, 0.5, 9]} rotation-y={Math.PI} scale={[14, 6, 1]} />
      <Lightformer form="rect" intensity={1.2} position={[0, -5, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} color="#3a2a10" />
    </Environment>
    <ambientLight intensity={0.05} />
    <directionalLight position={[3, 5, 6]} intensity={1.2} />
  </>
);

export const Post: React.FC<{bloom?: number; dof?: {focus: number; range: number; bokeh: number} | null; vignette?: number}> = ({
  bloom = 0.9,
  dof = null,
  vignette = 0.55,
}) => (
  <EffectComposer multisampling={4}>
    {dof ? (
      <DepthOfField focusDistance={dof.focus} focalLength={dof.range} bokehScale={dof.bokeh} height={960} />
    ) : (
      <></>
    )}
    <Bloom intensity={bloom} luminanceThreshold={0.86} luminanceSmoothing={0.2} mipmapBlur radius={0.55} />
    <Vignette offset={0.25} darkness={vignette} />
  </EffectComposer>
);

// Soft bokeh discs far behind the subject.
const bokehTex = (() => {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)');
  gr.addColorStop(0.6, 'rgba(255,255,255,0.5)');
  gr.addColorStop(0.82, 'rgba(255,255,255,0.6)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();

export const Bokeh: React.FC<{frame: number; count?: number; opacity?: number; palette?: string[]; z?: number}> = ({
  frame,
  count = 18,
  opacity = 0.25,
  palette = [C.gold, C.goldHi, C.cyan, C.blue, C.green],
  z = -9,
}) => {
  const items = useMemo(
    () =>
      new Array(count).fill(0).map((_, i) => ({
        x: (rnd(i, 1) - 0.5) * 14,
        y: (rnd(i, 2) - 0.5) * 22,
        z: z - rnd(i, 3) * 6,
        s: 0.5 + rnd(i, 4) * 1.6,
        c: palette[Math.floor(rnd(i, 5) * palette.length)],
        sp: 0.3 + rnd(i, 6),
        ph: rnd(i, 7) * 6.28,
      })),
    [count, z, palette.join()],
  );
  return (
    <>
      {items.map((b, i) => (
        <mesh key={i} position={[b.x + Math.sin(frame * 0.01 * b.sp + b.ph) * 0.4, b.y + Math.cos(frame * 0.008 * b.sp + b.ph) * 0.5, b.z]}>
          <planeGeometry args={[b.s, b.s]} />
          <meshBasicMaterial
            map={bokehTex}
            color={b.c}
            transparent
            opacity={opacity * (0.55 + 0.45 * Math.sin(frame * 0.03 * b.sp + b.ph))}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
};
