import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {Studio, Post, Bokeh} from '../three/Studio';
import {Confetti} from '../three/Confetti';
import {anton, C, goldGradient, inter, CUE} from '../theme';
import {ease, lin, shake, backOut} from '../util';

export const BURST = 10;
export const FREEZE_T = 13; // flakes freeze 13 frames after burst
export const SLAM = CUE.slam;

export const Notification: React.FC<{f: number; strike?: number; dim?: number}> = ({f, strike = 0, dim = 0}) => {
  const enter = ease(f, 1, 11, 0, 1, backOut);
  const jolt = shake(f, BURST, 10, 8);
  return (
    <div
      style={{
        position: 'absolute',
        left: 70,
        top: 260,
        width: 800,
        transform: `translate(${jolt.x}px, ${(1 - enter) * -260 + jolt.y}px) scale(${0.85 + 0.15 * enter})`,
        opacity: lin(f, 1, 6) * (1 - dim * 0.55),
        filter: `blur(${(1 - enter) * 10}px)`,
      }}
    >
      {/* light spill */}
      <div
        style={{
          position: 'absolute',
          inset: -140,
          background: 'radial-gradient(closest-side, rgba(255,214,120,0.28), rgba(14,165,217,0.10) 60%, transparent)',
          opacity: enter * (1 - dim),
        }}
      />
      <div
        style={{
          position: 'relative',
          borderRadius: 48,
          padding: '30px 34px',
          background: 'linear-gradient(160deg, rgba(58,64,80,0.82), rgba(22,25,34,0.86))',
          border: '1.5px solid rgba(255,255,255,0.16)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.22)',
          display: 'flex',
          gap: 26,
          alignItems: 'center',
          fontFamily: inter,
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 24,
            flexShrink: 0,
            background: `linear-gradient(135deg, ${C.blue}, ${C.cyan} 50%, ${C.green})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 900,
            fontSize: 58,
            boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.35)',
          }}
        >
          ₹
        </div>
        <div style={{flex: 1, color: C.white}}>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 26, fontWeight: 700, opacity: 0.6, letterSpacing: 1.5}}>
            <span>PAYROLL</span>
            <span>now</span>
          </div>
          <div style={{fontSize: 44, fontWeight: 800, marginTop: 6, letterSpacing: -0.5}}>Congratulations!</div>
          <div style={{fontSize: 44, fontWeight: 700, marginTop: 2, position: 'relative', display: 'inline-block'}}>
            Your hike:{' '}
            <span style={{position: 'relative', color: C.gold}}>
              9%
              <span
                style={{
                  position: 'absolute',
                  left: -8,
                  top: '52%',
                  height: 8,
                  width: `${strike * 120}%`,
                  background: C.hot,
                  borderRadius: 6,
                  transform: 'rotate(-12deg)',
                  boxShadow: `0 0 18px ${C.hot}`,
                }}
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SlamType: React.FC<{f: number; at: number}> = ({f, at}) => {
  const t1 = ease(f, at, at + 5, 0, 1, backOut);
  const t2 = ease(f, at + 5, at + 10, 0, 1, backOut);
  const blur1 = (1 - ease(f, at, at + 5)) * 16;
  const blur2 = (1 - ease(f, at + 5, at + 10)) * 22;
  const s = shake(f, at + 9, 26, 14);
  const sheen = lin(f, at + 12, at + 34, -40, 140);
  if (f < at) return null;
  return (
    <div style={{position: 'absolute', left: 0, width: 980, top: 700, textAlign: 'center', transform: `translate(${s.x}px,${s.y}px) rotate(${s.r - 2}deg)`}}>
      <div
        style={{
          fontFamily: anton,
          fontSize: 150,
          lineHeight: 1,
          color: C.white,
          letterSpacing: 6,
          transform: `scale(${2.6 - 1.6 * t1})`,
          opacity: Math.min(1, t1 * 2),
          filter: `blur(${blur1}px)`,
          textShadow: '0 12px 40px rgba(0,0,0,0.8)',
        }}
      >
        IT'S REALLY
      </div>
      <div style={{position: 'relative', height: 560, marginTop: 0}}>
        {[2, 1, 0].map((k) => (
          <div
            key={k}
            style={{
              position: 'absolute',
              inset: 0,
              fontFamily: anton,
              fontSize: 560,
              lineHeight: 0.98,
              backgroundImage: k === 0 ? `linear-gradient(105deg, transparent ${sheen - 12}%, rgba(255,255,255,0.85) ${sheen}%, transparent ${sheen + 12}%), ${goldGradient}` : goldGradient,
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              transform: `scale(${3 - 2 * t2 + k * 0.12 * (1 - t2)})`,
              opacity: k === 0 ? Math.min(1, t2 * 2) : 0.25 * (1 - t2),
              filter: `blur(${blur2 + k * 6}px) drop-shadow(0 24px 50px rgba(255,170,40,0.35))`,
            }}
          >
            5%
          </div>
        ))}
      </div>
    </div>
  );
};

export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f - BURST;
  const frozen = t >= FREEZE_T;
  const sinceFreeze = Math.max(0, t - FREEZE_T);
  const burstShake = shake(f, BURST, 0.06, 10);
  const flash = f >= BURST + FREEZE_T ? Math.max(0, 1 - (f - BURST - FREEZE_T) / 5) : 0;
  const slamFlash = f >= SLAM + 9 ? Math.max(0, 1 - (f - SLAM - 9) / 6) : 0;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{filter: frozen ? `saturate(${0.9}) contrast(1.08)` : 'none', opacity: lin(f, BURST - 1, BURST + 2)}}>
        <ThreeCanvas width={1080} height={1920} camera={{position: [0, 0, 7], fov: 34}} gl={{antialias: true}}>
          <color attach="background" args={['#020306']} />
          <group
            position={[burstShake.x + sinceFreeze * 0.006, burstShake.y - sinceFreeze * 0.003, sinceFreeze * 0.035]}
            rotation={[0, sinceFreeze * -0.0035, sinceFreeze * 0.0012]}
          >
            <Studio />
            <Confetti t={t} freeze={FREEZE_T} />
            <Bokeh frame={f} opacity={0.18} />
          </group>
          <Post bloom={0.8} dof={{focus: 0.012, range: 0.03, bokeh: 5}} />
        </ThreeCanvas>
      </AbsoluteFill>
      <Notification f={f} strike={ease(f, SLAM + 9, SLAM + 15)} dim={ease(f, SLAM, SLAM + 10)} />
      {/* time-stop flash + chroma ring */}
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 22%, rgba(255,255,255,${flash * 0.9}), rgba(120,200,255,${flash * 0.25}) 40%, transparent 70%)`}} />
      <SlamType f={f} at={SLAM} />
      <AbsoluteFill style={{background: `rgba(255,214,120,${slamFlash * 0.25})`, mixBlendMode: 'screen'}} />
    </AbsoluteFill>
  );
};
