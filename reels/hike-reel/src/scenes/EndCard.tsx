import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {Post} from '../three/Studio';
import {C, inter} from '../theme';
import {ease, lin, rnd, easeInOut, backOut} from '../util';
import pts from '../logoPoints.json';

const LOGO_W = 1.09; // world units
const LOGO_Y = 0.53;

const dotTex = (() => {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.5, 'rgba(255,255,255,0.8)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

const LogoParticles: React.FC<{f: number}> = ({f}) => {
  const ref = useRef<THREE.Points>(null);
  const P = pts as number[][];
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P.length * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(P.length * 3), 3));
    return g;
  }, []);
  useLayoutEffect(() => {
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const col = geo.getAttribute('color') as THREE.BufferAttribute;
    const gold = new THREE.Color('#FFC94F');
    const c = new THREE.Color();
    P.forEach(([x, y, r, g, b], i) => {
      const delay = rnd(i, 1) * 10;
      const t = ease(f, 2 + delay, 34 + delay, 0, 1, easeInOut);
      // start: burst cloud around where the gold number was
      const a = rnd(i, 2) * Math.PI * 2;
      const rad = 0.4 + rnd(i, 3) * 2.2;
      const sx = Math.cos(a) * rad;
      const sy = 0.4 + Math.sin(a) * rad * 1.3;
      const sz = (rnd(i, 4) - 0.5) * 3;
      const tx = x * LOGO_W;
      const ty = LOGO_Y + y * LOGO_W;
      const swirl = (1 - t) * 1.2;
      pos.setXYZ(i, THREE.MathUtils.lerp(sx, tx, t) + Math.sin(f * 0.1 + i) * 0.03 * swirl, THREE.MathUtils.lerp(sy, ty, t) + Math.cos(f * 0.1 + i) * 0.03 * swirl, sz * (1 - t));
      c.setRGB(r / 255, g / 255, b / 255);
      const cc = gold.clone().lerp(c, ease(f, 22 + delay, 40 + delay));
      col.setXYZ(i, cc.r * 1.4, cc.g * 1.4, cc.b * 1.4);
    });
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.038} map={dotTex} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} sizeAttenuation />
    </points>
  );
};

export const EndCard: React.FC = () => {
  const f = useCurrentFrame();
  const logo = ease(f, 36, 50);
  const tag = ease(f, 46, 60, 0, 1, backOut);
  const follow = ease(f, 54, 68, 0, 1, backOut);
  const out = lin(f, 70, 83); // fade to pure black = matches frame 0
  const R = 250;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{background: 'radial-gradient(80% 50% at 50% 38%, #0c1730, #000 70%)', opacity: ease(f, 0, 20)}} />
      <AbsoluteFill style={{opacity: 1 - logo}}>
        <ThreeCanvas width={1080} height={1920} camera={{position: [0, 0, 7.6], fov: 34}}>
          <LogoParticles f={f} />
          <Post bloom={1.1} vignette={0.4} />
        </ThreeCanvas>
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: 540 - R,
          top: 760 - R - 18,
          width: R * 2,
          height: R * 2,
          borderRadius: '50%',
          overflow: 'hidden',
          background: '#fff',
          opacity: logo,
          transform: `scale(${0.94 + 0.06 * logo})`,
          boxShadow: `0 0 ${80 * logo}px rgba(14,165,217,0.45), 0 0 0 4px rgba(255,255,255,0.2)`,
        }}
      >
        <Img src={staticFile('logo_hd.png')} style={{width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.06)'}} />
      </div>
      <div style={{position: 'absolute', left: 70, width: 800, top: 1080, textAlign: 'center', fontFamily: inter}}>
        <div style={{fontWeight: 800, fontSize: 52, letterSpacing: 6, color: C.white, opacity: tag, transform: `translateY(${(1 - tag) * 30}px)`}}>
          LEARN <span style={{color: C.cyan}}>·</span> GROW <span style={{color: C.green}}>·</span> SUCCEED
        </div>
        <div
          style={{
            display: 'inline-block',
            marginTop: 46,
            padding: '22px 54px',
            borderRadius: 999,
            background: `linear-gradient(90deg, ${C.blue}, ${C.cyan} 50%, ${C.green})`,
            fontWeight: 900,
            fontSize: 50,
            color: 'white',
            letterSpacing: 1,
            opacity: follow,
            transform: `scale(${0.8 + 0.2 * follow})`,
            boxShadow: '0 20px 50px rgba(10,99,216,0.45)',
          }}
        >
          Follow for more →
        </div>
      </div>
      <AbsoluteFill style={{background: `rgba(0,0,0,${out})`}} />
    </AbsoluteFill>
  );
};
