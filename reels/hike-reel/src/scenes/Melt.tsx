import React from 'react';
import * as THREE from 'three';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {Studio, Post, Bokeh} from '../three/Studio';
import {GoldNumber, Hit} from '../three/GoldNumber';
import {PriceTag, Sparks, Drips, Puddle, Floor} from '../three/MeltFX';
import {anton, C, inter, mono, CUE} from '../theme';
import {ease, lin, shake, easeIn, backOut, clamp} from '../util';

export const NUM_SCALE = 0.33;
export const NUM_Y = 0.42;
export const TAGS = ['RENT ↑', 'GROCERIES ↑', 'FUEL ↑', 'SCHOOL FEES ↑'];
export const HIT_AT = CUE.hits as number[]; // local frames, synced to VO words
export const HIT_X = [-2.2, 2.25, -0.6, 1.0]; // object-space x of each bite
export const SPLIT_AT = CUE.split as number;
export const DRAIN = CUE.drain as number[];
export const STAMP_AT = CUE.stamp as number;

export const meltState = (f: number) => {
  const hits: Hit[] = HIT_AT.map((h, i) => {
    const m = ease(f, h, h + 30) * 0.3;
    const heat = f < h ? 0 : Math.max(0, 1.25 * Math.exp(-(f - h) / 26));
    return [HIT_X[i], m, heat];
  });
  const base = ease(f, 40, 330, 0.0, 0.22);
  const bites = hits.reduce((a, h) => a + h[1], 0);
  return {hits, base, puddle: clamp(base * 0.8 + bites * 0.55, 0, 1.2)};
};

const tagPos = (i: number, f: number) => {
  const a = f * 0.034 + i * (Math.PI / 2) + 0.6;
  return new THREE.Vector3(Math.cos(a) * 0.95, NUM_Y + 0.2 + Math.sin(a * 1.0 + i * 1.3) * 0.75, Math.sin(a) * 1.1 + 0.2);
};

export const Melt: React.FC = () => {
  const f = useCurrentFrame();
  const st = meltState(f);
  const split = ease(f, SPLIT_AT, SPLIT_AT + 16, 0, 1);
  const numX = split * 0.6;
  const numS = NUM_SCALE * (1 - split * 0.5);
  const camShake = HIT_AT.map((h) => shake(f, h, 0.035, 10)).reduce((a, s) => ({x: a.x + s.x, y: a.y + s.y, r: 0}), {x: 0, y: 0, r: 0});
  const stampShake = shake(f, STAMP_AT + 5, 0.06, 14);
  const floorY = NUM_Y - 0.55;
  const hazeScale = 2 + ease(f, 0, 120) * 5;

  const sparkBursts: [number, number, number, number][] = HIT_AT.map((h, i) => [h, numX + HIT_X[i] * numS, NUM_Y + 0.12, 0.25]);
  const dripSrc: [number, number, number][] = HIT_AT.map((h, i) => [h, numX + HIT_X[i] * numS, 0.1]);

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg width="0" height="0" style={{position: 'absolute'}}>
        <filter id="haze" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={`0.004 ${0.016 + 0.002 * Math.sin(f * 0.2)}`} numOctaves="2" seed={Math.floor(f / 2)} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={hazeScale} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <AbsoluteFill style={{filter: 'url(#haze)'}}>
        <ThreeCanvas width={1080} height={1920} camera={{position: [0, 0.25, 7.6], fov: 34}}>
          <color attach="background" args={['#030305']} />
          <group position={[camShake.x + stampShake.x, camShake.y + stampShake.y, 0]} rotation={[0.16, Math.sin(f * 0.012) * 0.05, 0]}>
            <Studio />
            <Bokeh frame={f} opacity={0.16} palette={['#ff7a2a', C.gold, '#ff4a1c', C.cyan]} />
            
            <GoldNumber
              melt={st.base}
              hits={st.hits}
              time={f / 30}
              position={[numX, NUM_Y, 0]}
              rotation={[0.08, Math.sin(f * 0.025) * 0.28, 0]}
              scale={numS}
            />
            <Puddle amount={st.puddle * (1 - split * 0.3)} y={floorY - 0.04} time={f} />
            <Drips f={f} sources={dripSrc} floorY={floorY} y0={NUM_Y - 0.2} />
            <Sparks f={f} bursts={sparkBursts} />
            {TAGS.map((label, i) => {
              const h = HIT_AT[i];
              if (f > h + 3) return null;
              const orbit = tagPos(i, f);
              const dive = ease(f, h - 12, h, 0, 1, easeIn);
              const target = new THREE.Vector3(numX + HIT_X[i] * numS, NUM_Y + 0.1, 0.35);
              const p = orbit.clone().lerp(target, dive);
              const heat = ease(f, h - 34, h - 4);
              const sc = f > h ? 1 - (f - h) / 3 : 1;
              return (
                <PriceTag
                  key={i}
                  label={label}
                  heat={heat}
                  position={p}
                  rotation={[0.1, -0.25 * Math.sin(f * 0.04 + i) + dive * 0.6, Math.sin(f * 0.05 + i) * 0.12 + dive * (i % 2 ? 0.5 : -0.5)]}
                  scale={0.62 * sc}
                />
              );
            })}
          </group>
          <Post bloom={1.05} />
        </ThreeCanvas>
      </AbsoluteFill>
      {/* heat glow from below */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 50% at 50% 70%, rgba(255,90,20,${0.04 + 0.07 * ease(f, 40, 160)}), transparent 60%)`,
          mixBlendMode: 'screen',
        }}
      />
      <SplitScreen f={f} />
      <Stamp f={f} />
    </AbsoluteFill>
  );
};

const SplitScreen: React.FC<{f: number}> = ({f}) => {
  if (f < SPLIT_AT) return null;
  const cut = ease(f, SPLIT_AT, SPLIT_AT + 10, 0, 1, easeIn);
  const ui = ease(f, SPLIT_AT + 8, SPLIT_AT + 22, 0, 1, backOut);
  const drain = ease(f, DRAIN[0], DRAIN[1], 0, 1, Easing2);
  const val = Math.round((91000 - 40000 * drain) / 100) * 100;
  const fmt = (n: number) => n.toLocaleString('en-IN');
  return (
    <>
      {/* left paper half */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 470,
          height: 1920,
          background: 'linear-gradient(90deg, rgba(10,14,24,0.92), rgba(10,14,24,0.75))',
          clipPath: `inset(0 0 ${(1 - cut) * 100}% 0)`,
        }}
      />
      {/* slicing line */}
      <div
        style={{
          position: 'absolute',
          left: 468,
          top: 0,
          width: 5,
          height: `${cut * 1920}px`,
          background: `linear-gradient(180deg, ${C.goldHi}, #fff 60%, ${C.gold})`,
          boxShadow: `0 0 30px 6px rgba(255,214,120,0.75)`,
        }}
      />
      <div style={{position: 'absolute', left: 50, top: 470, width: 390, opacity: ui, transform: `translateY(${(1 - ui) * 30}px)`}}>
        <div style={{fontFamily: inter, fontWeight: 800, fontSize: 34, letterSpacing: 4, color: 'rgba(245,247,251,0.6)'}}>ON PAPER</div>
        <div style={{fontFamily: mono, fontWeight: 800, fontSize: 82, color: C.white, marginTop: 6, letterSpacing: -2}}>₹91,000</div>
        {/* paper slip */}
        <div
          style={{
            marginTop: 60,
            height: 330,
            borderRadius: 18,
            background: 'linear-gradient(160deg, #f3f1ea, #d9d5c8)',
            transform: 'rotate(-4deg)',
            boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
            padding: 30,
            fontFamily: mono,
            color: '#2a2a2a',
          }}
        >
          <div style={{fontSize: 22, fontWeight: 700, opacity: 0.6, letterSpacing: 2}}>REVISION LETTER</div>
          <div style={{height: 2, background: '#999', margin: '14px 0 22px'}} />
          <div style={{fontSize: 26, fontWeight: 700}}>Increment: 9.1%</div>
          <div style={{fontSize: 26, fontWeight: 700, marginTop: 10}}>+ ₹91,000</div>
          <div style={{marginTop: 30, fontFamily: anton, fontSize: 40, color: C.green, border: `4px solid ${C.green}`, display: 'inline-block', padding: '2px 14px', transform: 'rotate(-6deg)'}}>
            APPROVED
          </div>
        </div>
      </div>
      <div style={{position: 'absolute', left: 500, top: 470, width: 400, opacity: ui, transform: `translateY(${(1 - ui) * 30}px)`}}>
        <div style={{fontFamily: inter, fontWeight: 800, fontSize: 34, letterSpacing: 4, color: C.gold}}>IN YOUR POCKET</div>
        <div
          style={{
            fontFamily: mono,
            fontWeight: 800,
            fontSize: 82,
            marginTop: 6,
            letterSpacing: -2,
            color: drain > 0 && drain < 1 ? '#ff8a5c' : C.gold,
            textShadow: `0 0 ${drain > 0 && drain < 1 ? 30 : 12}px rgba(255,120,60,0.6)`,
          }}
        >
          ≈₹{fmt(val)}
        </div>
      </div>
    </>
  );
};
const Easing2 = (t: number) => 1 - Math.pow(1 - t, 2.2);

const Stamp: React.FC<{f: number}> = ({f}) => {
  if (f < STAMP_AT) return null;
  const p = ease(f, STAMP_AT, STAMP_AT + 6, 0, 1, easeIn);
  const s = shake(f, STAMP_AT + 6, 14, 12);
  const dust = ease(f, STAMP_AT + 6, STAMP_AT + 30);
  return (
    <div
      style={{
        position: 'absolute',
        left: 70,
        width: 800,
        top: 1040,
        display: 'flex',
        justifyContent: 'center',
        transform: `translate(${s.x}px,${s.y}px) scale(${2.4 - 1.4 * p}) rotate(${-4 + (1 - p) * -8}deg)`,
        opacity: Math.min(1, p * 1.6),
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: -60,
          borderRadius: 999,
          background: `radial-gradient(closest-side, rgba(255,230,180,${0.5 * (1 - dust)}), transparent)`,
          transform: `scale(${0.6 + dust * 1.2})`,
        }}
      />
      <div
        style={{
          padding: '18px 34px 22px',
          borderRadius: 14,
          background: 'linear-gradient(180deg, #4a4f5a, #1b1e25 55%, #2b2f38)',
          border: '3px solid #8b919c',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8), inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -3px 0 rgba(0,0,0,0.6)',
          textAlign: 'center',
        }}
      >
        <div style={{fontFamily: inter, fontWeight: 900, fontSize: 34, letterSpacing: 6, color: '#c9ced8'}}>REAL WAGE GROWTH</div>
        <div
          style={{
            fontFamily: anton,
            fontSize: 150,
            lineHeight: 1,
            backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #cfd5df 40%, #7d8592 52%, #e9edf3 80%, #9aa2ae 100%)',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            filter: 'drop-shadow(0 3px 0 rgba(0,0,0,0.7))',
          }}
        >
          5.1%
        </div>
      </div>
    </div>
  );
};
