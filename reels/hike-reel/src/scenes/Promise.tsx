import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {Studio, Post, Bokeh} from '../three/Studio';
import {Confetti} from '../three/Confetti';
import {GoldNumber} from '../three/GoldNumber';
import {NUM_SCALE, NUM_Y} from './Melt';
import {FREEZE_T} from './Hook';
import {C, inter, mono, CUE, T} from '../theme';
import {ease, lin, easeInOut, backOut, easeIn} from '../util';

const FLY = 24; // frames to fly through the frozen confetti
const ROLL = CUE.roll as number[]; // slot-machine digit roll
const RISE = CUE.rise as number[];

// One slot-machine column
const Reel: React.FC<{from: number; to: number; f: number; start: number; end: number; spins: number}> = ({from, to, f, start, end, spins}) => {
  const p = ease(f, start, end, 0, 1, easeInOut);
  const total = spins * 10 + ((to - from + 10) % 10);
  const pos = from + p * total; // fractional digit position
  const h = 128;
  const speed = Math.abs(ease(f + 1, start, end, 0, 1, easeInOut) - p) * total;
  return (
    <div style={{position: 'relative', height: h, width: 76, overflow: 'hidden'}}>
      <div style={{position: 'absolute', top: -((pos % 10) * h), left: 0, filter: `blur(${Math.min(8, speed * 6)}px)`}}>
        {new Array(11).fill(0).map((_, i) => (
          <div key={i} style={{height: h, lineHeight: `${h}px`, textAlign: 'center'}}>
            {i % 10}
          </div>
        ))}
      </div>
    </div>
  );
};

const SalaryCard: React.FC<{f: number}> = ({f}) => {
  const enter = ease(f, FLY - 8, FLY + 12, 0, 1, backOut);
  const away = ease(f, RISE[0] - 6, RISE[0] + 18, 0, 1, easeIn);
  const done = f >= ROLL[1];
  const chip = ease(f, ROLL[1], ROLL[1] + 10, 0, 1, backOut);
  // ₹10,00,000 -> ₹10,91,000 : only the lakh digits change, but every column spins for show
  const digits: [number, number][] = [
    [1, 1],
    [0, 0],
    [0, 9],
    [0, 1],
    [0, 0],
    [0, 0],
    [0, 0],
  ];
  const sep = [1, 3]; // commas after these indices (Indian grouping)
  return (
    <div
      style={{
        position: 'absolute',
        left: 80,
        top: 860,
        width: 780,
        perspective: 1400,
        opacity: lin(f, FLY - 8, FLY) * (1 - away),
      }}
    >
      <div
        style={{
          borderRadius: 40,
          padding: '36px 40px 40px',
          background: 'linear-gradient(155deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04) 60%)',
          border: '2px solid rgba(255,255,255,0.22)',
          boxShadow: '0 50px 100px rgba(0,0,0,0.65), inset 0 2px 0 rgba(255,255,255,0.3)',
          transform: `translateY(${(1 - enter) * 120 + away * 380}px) rotateX(${(1 - enter) * -30 + away * 62}deg) scale(${0.9 + 0.1 * enter})`,
          transformOrigin: '50% 100%',
          fontFamily: inter,
          color: C.white,
          backdropFilter: 'blur(14px)',
        }}
      >
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{fontWeight: 800, fontSize: 30, letterSpacing: 5, opacity: 0.65}}>ANNUAL CTC</div>
          <div
            style={{
              fontWeight: 900,
              fontSize: 34,
              padding: '6px 18px',
              borderRadius: 999,
              color: '#06110A',
              background: `linear-gradient(135deg, ${C.lime}, ${C.green})`,
              transform: `scale(${chip})`,
              opacity: chip,
            }}
          >
            +9.1%
          </div>
        </div>
        <div style={{display: 'flex', alignItems: 'center', fontFamily: mono, fontWeight: 800, fontSize: 112, marginTop: 14, color: done ? C.goldHi : C.white, textShadow: done ? '0 0 30px rgba(255,194,61,0.5)' : 'none'}}>
          <span style={{marginRight: 6}}>₹</span>
          {digits.map(([a, b], i) => (
            <React.Fragment key={i}>
              <Reel from={a} to={b} f={f} start={ROLL[0] + i * 3} end={ROLL[1] - (6 - i) * 2} spins={1 + (i % 3)} />
              {sep.includes(i) ? <span style={{width: 44, display: 'flex', justifyContent: 'center'}}>,</span> : null}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export const PromiseScene: React.FC = () => {
  const f = useCurrentFrame();
  const fly = ease(f, 0, FLY, 0, 1, easeInOut);
  const flyBlur = Math.sin(Math.min(1, f / FLY) * Math.PI) * 7;
  const rise = ease(f, RISE[0], Math.min(RISE[0] + 62, T.melt - T.promise - 4), 0, 1, Easing3);
  const numY = -0.15 + (NUM_Y + 0.15) * rise;
  const end = T.melt - T.promise;
  const drift = Math.sin((f - end) * 0.045) * 0.22 * ease(f, RISE[0] + 40, RISE[0] + 70);
  const spin = (1 - rise) * -1.6 + drift;
  const tilt = ease(f, RISE[0], T.melt - T.promise, 0, 0.16);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{filter: `blur(${flyBlur}px)`}}>
        <ThreeCanvas width={1080} height={1920} camera={{position: [0, 0.25, 7.6], fov: 34}}>
          <color attach="background" args={['#020306']} />
          <Studio />
          {f < FLY + 2 ? (
            <group position={[0, -fly * 0.8, fly * 7.2]}>
              <Confetti t={FREEZE_T} freeze={FREEZE_T} />
            </group>
          ) : null}
          <group rotation={[tilt, 0, 0]}>
            <Bokeh frame={f + 60} opacity={0.22 * ease(f, FLY - 10, FLY + 20)} />
            {f >= RISE[0] - 2 ? (
              <GoldNumber position={[0, numY, 0]} rotation={[0.08 * rise, spin, 0]} scale={NUM_SCALE * (0.35 + 0.65 * rise)} glow={0.12 * (1 - rise)} time={f / 30} />
            ) : null}
          </group>
          <Post bloom={0.95} />
        </ThreeCanvas>
      </AbsoluteFill>
      <SalaryCard f={f} />
      {/* rise flare */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(40% 18% at 50% 44%, rgba(255,210,120,${0.35 * Math.sin(rise * Math.PI)}), transparent)`,
          mixBlendMode: 'screen',
        }}
      />
    </AbsoluteFill>
  );
};
const Easing3 = (t: number) => 1 - Math.pow(1 - t, 3);
