import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {rnd} from '../util';

export const CONFETTI_N = 650;
export const CONFETTI_ORIGIN = new THREE.Vector3(0, 2.15, 0.5);

// Position of every flake at local time t (frames since burst), frozen at `freeze`.
export const flakeState = (i: number, t: number, freeze: number, drift = 0) => {
  const tt = Math.max(0, Math.min(t, freeze)) + drift; // drift = tiny post-freeze creep
  const th = rnd(i, 11) * Math.PI * 2;
  const up = rnd(i, 12) * 2 - 1;
  const sp = 0.1 + rnd(i, 13) * 0.4;
  // biased toward camera (+z) and outwards
  const dir = new THREE.Vector3(Math.cos(th) * Math.sqrt(1 - up * up) * 1.25, up * 1.1 - 0.15, 0.55 + Math.abs(Math.sin(th)) * 1.3 + rnd(i, 14) * 0.6).normalize();
  const k = 0.085;
  const d = (sp * (1 - Math.exp(-k * tt))) / k;
  const g = 0.0009 * tt * tt;
  const p = CONFETTI_ORIGIN.clone().addScaledVector(dir, d);
  p.y -= g;
  const rot = new THREE.Euler(rnd(i, 15) * 6.28 + tt * (rnd(i, 16) - 0.5) * 0.5, rnd(i, 17) * 6.28 + tt * (rnd(i, 18) - 0.5) * 0.6, rnd(i, 19) * 6.28);
  return {p, rot};
};

export const Confetti: React.FC<{t: number; freeze: number; drift?: number; desat?: number}> = ({t, freeze, drift = 0}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(0.1, 0.056, 0.004), []);
  const mat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#FFC54D',
        metalness: 1,
        roughness: 0.22,
        clearcoat: 1,
        envMapIntensity: 2.2,
        side: THREE.DoubleSide,
      }),
    [],
  );
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    for (let i = 0; i < CONFETTI_N; i++) {
      const {p, rot} = flakeState(i, t, freeze, drift);
      o.position.copy(p);
      o.rotation.copy(rot);
      const s = t <= 0 ? 0 : 0.6 + rnd(i, 20) * 0.9;
      o.scale.set(s, s, s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      const r = rnd(i, 21);
      col.set(r < 0.7 ? '#FFC54D' : r < 0.9 ? '#FFE3A0' : '#D9902A');
      m.setColorAt(i, col);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, CONFETTI_N]} frustumCulled={false} />;
};
