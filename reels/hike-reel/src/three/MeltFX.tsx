import React, {useEffect, useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {RoundedBox, Text} from '@react-three/drei';
import {continueRender, delayRender, staticFile} from 'remotion';
import {rnd, clamp} from '../util';

const FONT = staticFile('fonts/JetBrainsMono-Bold.ttf');

// glass price tag with label
export const PriceTag: React.FC<{
  label: string;
  heat: number; // 0..1
  position: THREE.Vector3;
  rotation?: [number, number, number];
  scale?: number;
  grey?: number;
}> = ({label, heat, position, rotation = [0, 0, 0], scale = 1, grey = 0}) => {
  const hRef = useRef<number | null>(null);
  const advance = useThree((st) => st.advance);
  useEffect(() => {
    hRef.current = delayRender('tag-text ' + label);
    return () => {
      if (hRef.current !== null) continueRender(hRef.current);
      hRef.current = null;
    };
  }, []);
  const col = new THREE.Color('#d6f0ff').lerp(new THREE.Color('#ff3a10'), heat);
  if (grey) col.lerp(new THREE.Color('#8a8a8a'), grey);
  const emis = new THREE.Color('#ff2a00').multiplyScalar(heat * heat * 2.2 * (1 - grey));
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <RoundedBox args={[0.5 + label.length * 0.135, 0.5, 0.06]} radius={0.06} smoothness={4}>
        <meshPhysicalMaterial
          color={col}
          emissive={emis}
          metalness={0.2}
          roughness={0.08 + heat * 0.2}
          clearcoat={1}
          envMapIntensity={1.6}
          transparent
          opacity={0.22 + heat * 0.7}
          depthWrite={false}
        />
      </RoundedBox>
      {/* bright rim */}
      <mesh position={[0, 0, -0.035]}>
        <planeGeometry args={[0.56 + label.length * 0.135, 0.56]} />
        <meshBasicMaterial color={heat > 0.05 ? '#ff6a2a' : '#7fd0ff'} transparent opacity={0.1 + heat * 0.5} toneMapped={false} />
      </mesh>
      <Text
        font={FONT}
        fontSize={0.2}
        position={[0, 0, 0.04]}
        color={heat > 0.4 ? '#fff4e0' : '#ffffff'}
        anchorX="center"
        anchorY="middle"
        renderOrder={10}
        letterSpacing={0.02}
        outlineWidth={0.004}
        outlineColor="#000000"
        outlineOpacity={0.25}
        onSync={() => {
          if (hRef.current !== null) {
            const h = hRef.current;
            hRef.current = null;
            advance(performance.now());
            requestAnimationFrame(() => continueRender(h));
          }
        }}
      >
        {label}
      </Text>
    </group>
  );
};

// spark streaks from impacts. bursts: [frame, x, y, z]
export const Sparks: React.FC<{f: number; bursts: [number, number, number, number][]; per?: number}> = ({f, bursts, per = 46}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = bursts.length * per;
  const geo = useMemo(() => new THREE.BoxGeometry(0.006, 0.006, 1), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffd27a', toneMapped: false}), []);
  useLayoutEffect(() => {
    const m = ref.current!;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    bursts.forEach(([bf, x, y, z], b) => {
      for (let k = 0; k < per; k++) {
        const i = b * per + k;
        const t = f - bf - rnd(i, 1) * 3;
        const life = 14 + rnd(i, 2) * 16;
        if (t < 0 || t > life) {
          o.scale.set(0, 0, 0);
          o.updateMatrix();
          m.setMatrixAt(i, o.matrix);
          continue;
        }
        const th = rnd(i, 3) * Math.PI * 2;
        const el = rnd(i, 4) * 1.2 - 0.2;
        const sp = 0.03 + rnd(i, 5) * 0.06;
        const v = new THREE.Vector3(Math.cos(th) * Math.cos(el), Math.sin(el) + 0.25, Math.sin(th) * Math.cos(el) * 0.6 + 0.4).multiplyScalar(sp);
        const g = 0.0035;
        const p = new THREE.Vector3(x + v.x * t, y + v.y * t - 0.5 * g * t * t, z + v.z * t);
        const vel = new THREE.Vector3(v.x, v.y - g * t, v.z);
        o.position.copy(p);
        o.lookAt(p.clone().add(vel));
        const k2 = 1 - t / life;
        o.scale.set(k2 * 1.2 + 0.4, k2 * 1.2 + 0.4, vel.length() * 1.6);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
        c.setRGB(1.6 * k2 + 0.6, 0.9 * k2 + 0.25, 0.3 * k2 * k2);
        m.setColorAt(i, c);
      }
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, N]} frustumCulled={false} />;
};

// liquid gold drops falling from impact points to the floor
export const Drips: React.FC<{f: number; sources: [number, number, number][]; floorY: number; y0: number; per?: number; grey?: number}> = ({
  f,
  sources,
  floorY,
  y0,
  per = 7,
  grey = 0,
}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = sources.length * per;
  const geo = useMemo(() => new THREE.SphereGeometry(0.05, 20, 14), []);
  const mat = useMemo(
    () => new THREE.MeshPhysicalMaterial({color: '#FFC14A', metalness: 1, roughness: 0.12, clearcoat: 1, envMapIntensity: 1.8}),
    [],
  );
  mat.color.set('#FFC14A').lerp(new THREE.Color('#8c8c8c'), grey);
  useLayoutEffect(() => {
    const m = ref.current!;
    const o = new THREE.Object3D();
    sources.forEach(([sf, x, z], s) => {
      for (let k = 0; k < per; k++) {
        const i = s * per + k;
        const born = sf + 4 + k * 6 + rnd(i, 8) * 4;
        const t = f - born;
        const xx = x + (rnd(i, 9) - 0.5) * 0.35;
        const zz = z + (rnd(i, 10) - 0.5) * 0.2;
        if (t < 0) {
          o.scale.set(0, 0, 0);
        } else {
          // hang & stretch for 8 frames, then fall
          const hang = clamp(t / 8);
          const ft = Math.max(0, t - 8);
          const y = y0 - 0.04 - hang * 0.06 - 0.5 * 0.006 * ft * ft;
          const sz = 0.6 + rnd(i, 11) * 0.7;
          if (y < floorY) {
            o.scale.set(0, 0, 0);
          } else {
            const v = 0.006 * ft;
            o.position.set(xx, y, zz);
            o.rotation.set(0, 0, 0);
            o.scale.set(sz * (1 - v * 1.2), sz * (1 + hang * 0.6 + v * 6), sz * (1 - v * 1.2));
          }
        }
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
      }
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, N]} frustumCulled={false} />;
};

// molten puddle on the floor
export const Puddle: React.FC<{amount: number; y: number; time: number; grey?: number}> = ({amount, y, time, grey = 0}) => {
  const col = new THREE.Color('#FFC14A').lerp(new THREE.Color('#8c8c8c'), grey);
  if (amount <= 0.001) return null;
  return (
    <group position={[0, y, 0.1]}>
      {[0, 1, 2, 3, 4].map((i) => {
        const s = amount * (0.55 + rnd(i, 30) * 0.6);
        return (
          <mesh key={i} position={[(rnd(i, 31) - 0.5) * 0.6 * amount + (i - 2) * 0.22, 0, 0.15 + (rnd(i, 32) - 0.5) * 0.4]} scale={[s * 0.75, 0.035 + 0.008 * Math.sin(time * 0.1 + i), s * 0.75]}>
            <sphereGeometry args={[0.6, 40, 20]} />
            <meshPhysicalMaterial color={col} metalness={1} roughness={0.08} clearcoat={1} envMapIntensity={1.8} />
          </mesh>
        );
      })}
    </group>
  );
};

// glossy dark floor (cheap): reflects env only
export const Floor: React.FC<{y: number}> = ({y}) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
    <planeGeometry args={[40, 40]} />
    <meshPhysicalMaterial color="#050608" metalness={0.6} roughness={0.35} clearcoat={1} clearcoatRoughness={0.05} />
  </mesh>
);
