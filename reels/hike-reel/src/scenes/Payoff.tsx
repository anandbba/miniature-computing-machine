import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {Studio, Post, Bokeh} from '../three/Studio';
import {GoldNumber} from '../three/GoldNumber';
import {Drips, Puddle} from '../three/MeltFX';
import {meltState, NUM_SCALE, NUM_Y, HIT_AT, HIT_X} from './Melt';
import {KineticWords} from './Turn';
import {C, inter, T, CUE, LINES} from '../theme';
import {ease, lin, backOut, easeInOut, shake} from '../util';

const FROZEN = T.turn - T.melt - 1;
const REFORM = [6, 46];
const BURST = 46;

export const Payoff: React.FC = () => {
  const f = useCurrentFrame();
  const st = meltState(FROZEN);
  const r = ease(f, REFORM[0], REFORM[1], 0, 1, easeInOut); // 0 = melted, 1 = whole
  const grow = ease(f, REFORM[1] - 6, BURST + 14, 0, 1, backOut);
  const burst = f >= BURST ? Math.max(0, 1 - (f - BURST) / 22) : 0;
  const cta = CUE.cta;
  const lift = ease(f, cta - 6, cta + 14, 0, 1, easeInOut);
  const s = shake(f, BURST, 0.04, 12);
  const dripSrc: [number, number, number][] = HIT_AT.map((h, i) => [h, HIT_X[i] * NUM_SCALE, 0.1]);
  // drips rewind upward
  const dripF = Math.max(0, FROZEN - 12 - Math.round(r * 160));
  const scale = NUM_SCALE * (1 + 0.12 * grow - 0.18 * lift);
  const y = NUM_Y + 0.12 * grow + lift * 0.55;
  const lineCut = LINES.y3[0] - T.payoff; // first two lines give way to the CTA
  const linesOut = ease(f, lineCut - 10, lineCut);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <ThreeCanvas width={1080} height={1920} camera={{position: [0, 0.25, 7.6], fov: 34}}>
        <color attach="background" args={['#030305']} />
        <group position={[s.x, s.y, 0]} rotation={[0.16, Math.sin(f * 0.02) * 0.08, 0]}>
          <Studio warm={1 + grow * 0.5} />
          <Bokeh frame={f} opacity={0.12 + 0.18 * grow} />
          <GoldNumber
            melt={st.base * (1 - r)}
            hits={st.hits.map((h) => [h[0], h[1] * (1 - r), 0])}
            time={(FROZEN + f) / 30}
            position={[0, y, 0]}
            rotation={[0.08, Math.sin(f * 0.03) * 0.25 + (1 - r) * 0.3, 0]}
            scale={scale}
            glow={0.05 + burst * 0.5 + grow * 0.06}
          />
          <Puddle amount={st.puddle * (1 - r)} y={NUM_Y - 0.59} time={f} />
          {r < 0.98 ? <Drips f={dripF} sources={dripSrc} floorY={NUM_Y - 0.55} y0={NUM_Y - 0.2} /> : null}
        </group>
        <Post bloom={1 + burst * 1.5} vignette={0.5} />
      </ThreeCanvas>
      {/* light burst: god rays + flash */}
      <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen', opacity: f >= BURST - 2 ? Math.max(burst, 0.18 * grow * (1 - lift * 0.6)) : 0}}>
        <div
          style={{
            position: 'absolute',
            left: 540 - 1100,
            top: 790 - 1100 - lift * 260,
            width: 2200,
            height: 2200,
            borderRadius: '50%',
            background: `repeating-conic-gradient(from ${f * 0.6}deg, rgba(255,224,150,0.55) 0deg 4deg, transparent 4deg 14deg)`,
            maskImage: 'radial-gradient(closest-side, #000 10%, transparent 75%)',
          }}
        />
        <div style={{position: 'absolute', inset: 0, background: `radial-gradient(40% 25% at 50% 41%, rgba(255,240,200,${burst}), transparent)`}} />
      </AbsoluteFill>
      {/* type */}
      <div style={{position: 'absolute', left: 70, width: 800, top: 1090, textAlign: 'center', fontFamily: inter, fontWeight: 900, textTransform: 'uppercase', opacity: 1 - linesOut, transform: `translateY(${linesOut * -40}px)`}}>
        <div style={{fontSize: 64, color: 'rgba(220,224,232,0.85)', lineHeight: 1.1}}>
          <KineticWords f={f} from={LINES.y1[0] - 2} to={LINES.y2[0] - 2} offset={T.payoff} style={() => ({})} />
        </div>
        <div style={{fontSize: 80, color: C.white, lineHeight: 1.06, marginTop: 20, letterSpacing: -1}}>
          <KineticWords
            f={f}
            from={LINES.y2[0] - 2}
            to={LINES.y3[0] - 2}
            offset={T.payoff}
            style={(w) => (/proof/i.test(w) ? {color: C.gold, textShadow: '0 0 30px rgba(255,194,61,0.55)'} : {})}
          />
        </div>
      </div>
      <CtaCard f={f} at={cta} />
      <AbsoluteFill style={{background: `rgba(0,0,0,${lin(f, T.end - T.payoff - 8, T.end - T.payoff)})`}} />
    </AbsoluteFill>
  );
};

const CtaCard: React.FC<{f: number; at: number}> = ({f, at}) => {
  if (f < at) return null;
  const p = ease(f, at, at + 14, 0, 1, backOut);
  const bubble = ease(f, at + 4, at + 18, 0, 1, backOut);
  const typing = Math.floor(f / 6) % 4;
  return (
    <div style={{position: 'absolute', left: 70, width: 800, top: 1010, opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * 80}px) scale(${0.92 + 0.08 * p})`}}>
      <div
        style={{
          borderRadius: 40,
          padding: '34px 40px 40px',
          background: 'linear-gradient(155deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04))',
          border: '2px solid rgba(255,255,255,0.2)',
          boxShadow: '0 40px 90px rgba(0,0,0,0.65), inset 0 2px 0 rgba(255,255,255,0.25)',
          fontFamily: inter,
          textAlign: 'center',
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20}}>
          {/* comment bubble icon */}
          <div style={{position: 'relative', width: 92, height: 80, transform: `scale(${bubble}) rotate(${(1 - bubble) * -20}deg)`}}>
            <div style={{position: 'absolute', inset: 0, borderRadius: 26, background: `linear-gradient(135deg, ${C.blue}, ${C.cyan} 55%, ${C.green})`}} />
            <div style={{position: 'absolute', left: 16, bottom: -14, width: 0, height: 0, borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderTop: `20px solid ${C.blue}`, transform: 'rotate(18deg)'}} />
            <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8}}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{width: 12, height: 12, borderRadius: 6, background: 'white', opacity: typing === i ? 1 : 0.45, transform: `translateY(${typing === i ? -4 : 0}px)`}} />
              ))}
            </div>
          </div>
          <div style={{fontWeight: 900, fontSize: 66, color: C.white, letterSpacing: -1, textTransform: 'uppercase'}}>Comment your hike %</div>
        </div>
        <div style={{marginTop: 22, fontWeight: 800, fontSize: 44, lineHeight: 1.2, color: 'rgba(245,247,251,0.85)'}}>
          I'll show you how to work out your{' '}
          <span style={{color: C.gold, fontWeight: 900, textShadow: '0 0 24px rgba(255,194,61,0.5)'}}>REAL number.</span>
        </div>
      </div>
    </div>
  );
};
