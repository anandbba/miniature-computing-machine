import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {Studio, Post, Bokeh} from '../three/Studio';
import {GoldNumber} from '../three/GoldNumber';
import {Drips, Puddle} from '../three/MeltFX';
import {meltState, NUM_SCALE, NUM_Y, HIT_AT, HIT_X} from './Melt';
import {C, inter, T} from '../theme';
import {ease, lin} from '../util';
import words from '../captions.json';

type W = {w: string; s: number; e: number};

// Final melted state carried over from the Melt scene, frozen.
const FROZEN = 352;

export const KineticWords: React.FC<{f: number; from: number; to: number; offset: number; style: (w: string, i: number) => React.CSSProperties}> = ({
  f,
  from,
  to,
  offset,
  style,
}) => {
  const list = (words as W[]).filter((w) => w.s >= from && w.s < to);
  return (
    <>
      {list.map((w, i) => {
        const lf = f + offset; // global frame
        const p = ease(lf, w.s - 3, w.s + 5);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              marginRight: '0.26em',
              opacity: p,
              transform: `translateY(${(1 - p) * 40}px) scale(${0.8 + 0.2 * p})`,
              filter: `blur(${(1 - p) * 10}px)`,
              ...style(w.w, i),
            }}
          >
            {w.w}
          </span>
        );
      })}
    </>
  );
};

export const Turn: React.FC = () => {
  const f = useCurrentFrame();
  const st = meltState(FROZEN);
  const drain = ease(f, 0, 14); // colour drains
  const flash = Math.max(0, 1 - f / 6);
  const spot = ease(f, 14, 26);
  const push = ease(f, 0, 150, 0, 0.55);
  const numS = NUM_SCALE * 0.92;
  const grey = drain;
  const dripSrc: [number, number, number][] = HIT_AT.map((h, i) => [h, HIT_X[i] * numS, 0.1]);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <ThreeCanvas width={1080} height={1920} camera={{position: [0, 0.25, 7.6 - push * 1.1], fov: 34}}>
        <color attach="background" args={['#030305']} />
        <group rotation={[0.16, Math.sin(FROZEN * 0.012) * 0.05 + push * 0.12, 0]}>
          <Studio warm={1 + spot * 0.6} />
          <Bokeh frame={FROZEN} opacity={0.16 * (1 - grey * 0.7)} palette={grey > 0.5 ? ['#777', '#999', '#555'] : ['#ff7a2a', C.gold, '#ff4a1c', C.cyan]} />
          <GoldNumber melt={st.base} hits={st.hits.map((h) => [h[0], h[1], 0])} time={FROZEN / 30} position={[0, NUM_Y, 0]} rotation={[0.08, Math.sin(FROZEN * 0.025) * 0.28, 0]} scale={numS} glow={spot * 0.08} />
          <Puddle amount={st.puddle} y={NUM_Y - 0.59} time={FROZEN} grey={grey} />
          <Drips f={FROZEN - 12} sources={dripSrc} floorY={NUM_Y - 0.55} y0={NUM_Y - 0.2} grey={grey} />
          <spotLight position={[0, 6, 2]} angle={0.35} penumbra={0.6} intensity={spot * 90} color="#fff2d0" />
        </group>
        <Post bloom={0.9} vignette={0.75} />
      </ThreeCanvas>
      {/* volumetric spotlight cone */}
      <AbsoluteFill style={{opacity: spot, mixBlendMode: 'screen', pointerEvents: 'none'}}>
        <div
          style={{
            position: 'absolute',
            left: 540 - 430,
            top: -40,
            width: 860,
            height: 1060,
            clipPath: 'polygon(42% 0, 58% 0, 100% 100%, 0 100%)',
            background: 'linear-gradient(180deg, rgba(255,240,205,0.55), rgba(255,226,160,0.18) 70%, rgba(255,214,120,0))',
            filter: 'blur(18px)',
          }}
        />
        <div style={{position: 'absolute', left: 140, top: 900, width: 800, height: 170, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,226,160,0.4), transparent)'}} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: `rgba(255,255,255,${flash * 0.6})`}} />
      {/* type */}
      <div style={{position: 'absolute', left: 70, width: 800, top: 1130, textAlign: 'center', fontFamily: inter, fontWeight: 900, textTransform: 'uppercase'}}>
        <div style={{fontSize: 60, color: 'rgba(220,224,232,0.8)', letterSpacing: 0, lineHeight: 1.1}}>
          <KineticWords f={f} from={T.turn} to={T.turn + 42} offset={T.turn} style={() => ({})} />
        </div>
        <div style={{fontSize: 74, color: C.white, lineHeight: 1.08, marginTop: 22, letterSpacing: -1}}>
          <KineticWords
            f={f}
            from={T.turn + 42}
            to={T.move1}
            offset={T.turn}
            style={(w) =>
              w === 'CAN'
                ? {
                    color: C.gold,
                    fontSize: 118,
                    textShadow: '0 0 40px rgba(255,194,61,0.6)',
                  }
                : /appraisal/i.test(w)
                  ? {backgroundImage: `linear-gradient(90deg, ${C.lime}, ${C.cyan})`, WebkitBackgroundClip: 'text', color: 'transparent'}
                  : {}
            }
          />
        </div>
      </div>
      <AbsoluteFill style={{background: `rgba(0,0,0,${lin(f, 140, 150)})`}} />
    </AbsoluteFill>
  );
};
