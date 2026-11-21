import React, {useMemo} from 'react';
import * as THREE from 'three';
import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import {TTFLoader} from 'three/examples/jsm/loaders/TTFLoader.js';
import {Font} from 'three/examples/jsm/loaders/FontLoader.js';
import {TextGeometry} from 'three/examples/jsm/geometries/TextGeometry.js';
import {TessellateModifier} from 'three/examples/jsm/modifiers/TessellateModifier.js';
import {mergeVertices, toCreasedNormals} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---------- font + geometry cache ----------
let fontPromise: Promise<Font> | null = null;
const loadFont = () => {
  if (!fontPromise) {
    fontPromise = new Promise((res, rej) => {
      const l = new TTFLoader();
      (l as any).reversed = true;
      l.load(staticFile('fonts/InterDisplay-Black.otf'), (json) => res(new Font(json)), undefined, rej);
    });
  }
  return fontPromise;
};

const geoCache = new Map<string, THREE.BufferGeometry>();
const buildGeo = (font: Font, text: string) => {
  let g: THREE.BufferGeometry = new TextGeometry(text, {
    font,
    size: 1,
    depth: 0.34,
    curveSegments: 12,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.035,
    bevelSegments: 5,
  });
  g.center();
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = new TessellateModifier(0.07, 6).modify(g);
  g.deleteAttribute('normal');
  if (g.getAttribute('uv')) g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-4);
  g = toCreasedNormals(g, Math.PI / 4);
  g.computeBoundingBox();
  return g;
};
// Preload at module level so suspense remounts can never orphan a delayRender handle.
export const GOLD_TEXTS = ['+₹91,000'];
if (typeof window !== 'undefined') {
  const h = delayRender('gold-geo');
  loadFont()
    .then((font) => {
      GOLD_TEXTS.forEach((t) => geoCache.set(t, buildGeo(font, t)));
      continueRender(h);
    })
    .catch((e) => cancelRender(e));
}
export const useGoldGeometry = (text: string) => geoCache.get(text) ?? null;

// ---------- melt shader ----------
const HEADER = /* glsl */ `
uniform float uMelt;
uniform float uTime;
uniform float uYMin;
uniform float uYMax;
uniform vec4 uHits[4];   // x, strength, heat, unused
varying float vHeat;
float h31(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vnoise(vec3 x){
  vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h31(i+vec3(0,0,0)),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float localMelt(vec3 p){
  float m = uMelt;
  for(int i=0;i<4;i++){ float d = p.x - uHits[i].x; m += uHits[i].y * exp(-d*d/0.5); }
  return clamp(m, 0.0, 1.35);
}
float localHeat(vec3 p){
  float h = 0.0;
  for(int i=0;i<4;i++){ float d = p.x - uHits[i].x; h += uHits[i].z * exp(-d*d/0.12); }
  return h;
}
vec3 meltP(vec3 p){
  float H = uYMax - uYMin;
  float yn = clamp((p.y - uYMin)/H, 0.0, 1.0);
  float m = localMelt(p);
  float n = vnoise(p*2.7 + vec3(0.0, 0.0, 3.0));
  float streak = smoothstep(0.52, 0.92, vnoise(vec3(p.x*6.5, 1.7, p.z*1.5)));
  // top sags down, more where noise is high
  p.y -= m * yn*yn * H * (0.5 + 0.35*n);
  // bottom drips stretch below the baseline
  float low = pow(1.0 - yn, 3.0);
  p.y -= m * streak * low * H * 0.95;
  // body slumps & spreads in depth near the floor
  p.z *= 1.0 + m * 0.6 * (1.0 - yn) * (1.0 - yn);
  p.x += (n - 0.5) * 0.09 * m;
  // viscous wobble
  p.y += sin(uTime*2.2 + p.x*7.0 + p.z*3.0) * 0.012 * m;
  return p;
}
`;

export type Hit = [number, number, number]; // x, meltStrength, heat

export const makeGoldMaterial = (opts: {color?: string; rough?: number} = {}) => {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(opts.color ?? '#FFCB5C'),
    metalness: 1,
    roughness: opts.rough ?? 0.13,
    clearcoat: 0.7,
    clearcoatRoughness: 0.08,
    envMapIntensity: 2.8,
  });
  const uniforms = {
    uMelt: {value: 0},
    uTime: {value: 0},
    uYMin: {value: -0.4},
    uYMax: {value: 0.4},
    uHits: {value: [0, 1, 2, 3].map(() => new THREE.Vector4(99, 0, 0, 0))},
    uHeatColor: {value: new THREE.Color('#ff5a14')},
    uEmissiveBoost: {value: 0},
  };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + HEADER)
      .replace(
        '#include <beginnormal_vertex>',
        `
        vec3 _n = normalize(normal);
        vec3 _t = normalize(cross(_n, abs(_n.y) < 0.95 ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0)));
        vec3 _b = cross(_n, _t);
        float _e = 0.01;
        vec3 _p0 = meltP(position);
        vec3 _p1 = meltP(position + _t*_e);
        vec3 _p2 = meltP(position + _b*_e);
        vec3 objectNormal = normalize(cross(_p1 - _p0, _p2 - _p0));
        if (dot(objectNormal, _n) < 0.0) objectNormal = -objectNormal;
        vHeat = localHeat(position);
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3( tangent.xyz );
        #endif
        `,
      )
      .replace('#include <begin_vertex>', 'vec3 transformed = _p0;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vHeat;\nuniform vec3 uHeatColor;\nuniform float uEmissiveBoost;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         totalEmissiveRadiance += uHeatColor * pow(clamp(vHeat,0.0,1.5), 1.3) * 3.0 + vec3(1.0,0.78,0.35) * uEmissiveBoost;`,
      );
  };
  (mat as any).userData.u = uniforms;
  return mat;
};

export const GoldNumber: React.FC<{
  text?: string;
  melt?: number;
  hits?: Hit[];
  time?: number;
  glow?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  material?: THREE.MeshPhysicalMaterial;
}> = ({text = '+₹91,000', melt = 0, hits = [], time = 0, glow = 0, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, material}) => {
  const geo = useGoldGeometry(text);
  const mat = useMemo(() => material ?? makeGoldMaterial(), [material]);
  const u = (mat as any).userData.u;
  if (geo) {
    u.uYMin.value = geo.boundingBox!.min.y;
    u.uYMax.value = geo.boundingBox!.max.y;
  }
  u.uMelt.value = melt;
  u.uTime.value = time;
  u.uEmissiveBoost.value = glow;
  for (let i = 0; i < 4; i++) {
    const h = hits[i];
    u.uHits.value[i].set(h ? h[0] : 99, h ? h[1] : 0, h ? h[2] : 0, 0);
  }
  if (!geo) return null;
  return <mesh geometry={geo} material={mat} position={position} rotation={rotation} scale={scale} />;
};
