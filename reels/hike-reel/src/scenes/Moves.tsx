import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {anton, C, goldGradient, inter, mono, CUE, T} from '../theme';
import {ease, lin, shake, rnd, easeIn, backOut, easeInOut} from '../util';

// ---------- the metric for move 1 (MUST come from Anand's real career; placeholder until supplied) ----------
export const METRIC = {
  label: '[YOUR METRIC]',
  before: '[BEFORE]',
  after: '[AFTER]',
};

const MoveBg: React.FC<{f: number; hue: string}> = ({f, hue}) => (
  <AbsoluteFill style={{background: `radial-gradient(120% 70% at 50% 35%, #0c1730 0%, #060a14 55%, #020306 100%)`}}>
    {/* perspective grid floor */}
    <div
      style={{
        position: 'absolute',
        left: -540,
        width: 2160,
        top: 1050,
        height: 1400,
        transform: 'perspective(900px) rotateX(68deg)',
        transformOrigin: '50% 0%',
        backgroundImage: `linear-gradient(rgba(14,165,217,0.22) 2px, transparent 2px), linear-gradient(90deg, rgba(14,165,217,0.22) 2px, transparent 2px)`,
        backgroundSize: '120px 120px',
        backgroundPosition: `0 ${(f * 3) % 120}px`,
        maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.9), transparent 70%)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: -300 + Math.sin(f * 0.02) * 120,
        top: 200,
        width: 1000,
        height: 1000,
        borderRadius: '50%',
        background: `radial-gradient(closest-side, ${hue}33, transparent)`,
        filter: 'blur(40px)',
      }}
    />
  </AbsoluteFill>
);

const MoveHeader: React.FC<{f: number; n: number; title: string[]}> = ({f, n, title}) => {
  const p = ease(f, 0, 14, 0, 1, backOut);
  const draw = ease(f, 0, 26);
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 250,
          fontFamily: anton,
          fontSize: 520,
          lineHeight: 1,
          color: 'transparent',
          WebkitTextStroke: '5px rgba(255,194,61,0.9)',
          opacity: 0.85 * draw,
          transform: `translateX(${(1 - p) * -200}px) scale(${0.9 + 0.1 * p})`,
          filter: `drop-shadow(0 0 24px rgba(255,194,61,0.35)) blur(${(1 - p) * 8}px)`,
          clipPath: `inset(${(1 - draw) * 100}% 0 0 0)`,
        }}
      >
        {n}
      </div>
      <div style={{position: 'absolute', left: 300, top: 330, width: 590}}>
        {title.map((t, i) => {
          const q = ease(f, 6 + i * 5, 18 + i * 5, 0, 1, backOut);
          return (
            <div
              key={i}
              style={{
                fontFamily: inter,
                fontWeight: 900,
                fontSize: 78,
                lineHeight: 1.02,
                letterSpacing: -1.5,
                color: i === title.length - 1 ? C.gold : C.white,
                textTransform: 'uppercase',
                opacity: q,
                transform: `translateY(${(1 - q) * 50}px)`,
                filter: `blur(${(1 - q) * 8}px)`,
              }}
            >
              {t}
            </div>
          );
        })}
      </div>
    </>
  );
};

// whip transition: blur & slide out the last 8 frames
const whip = (f: number, len: number) => {
  const o = ease(f, len - 8, len, 0, 1, easeIn);
  const i = 1 - ease(f, 0, 8);
  return {transform: `translateX(${(o * -1080 + i * 1080) * 0.6}px)`, filter: `blur(${(o + i) * 26}px)`};
};

// ============ MOVE 1: Bring a number, not effort ============
export const Move1: React.FC = () => {
  const f = useCurrentFrame();
  const crack = CUE.m1crack as number;
  const shards = 22;
  const shatter = ease(f, crack, crack + 22, 0, 1, Easing0);
  const reform = ease(f, crack + 30, crack + 58, 0, 1, easeInOut);
  const card = ease(f, crack + 52, crack + 70, 0, 1, backOut);
  const s = shake(f, crack, 16, 12);
  return (
    <AbsoluteFill style={{background: '#000', ...whip(f, T.move2 - T.move1)}}>
      <MoveBg f={f} hue={C.blue} />
      <MoveHeader f={f} n={1} title={['Bring a', 'number,', 'not effort']} />
      {/* glass phrase, cut into shards */}
      <div style={{position: 'absolute', left: 70, top: 760, width: 800, height: 260, transform: `translate(${s.x}px,${s.y}px)`, perspective: 1200}}>
        {new Array(shards).fill(0).map((_, i) => {
          const cx = (i % 6) / 6;
          const cy = Math.floor(i / 6) / 4;
          const poly = `polygon(${cx * 100}% ${cy * 100}%, ${(cx + 1 / 6 + rnd(i, 1) * 0.06) * 100}% ${(cy + rnd(i, 2) * 0.08) * 100}%, ${(cx + 1 / 6) * 100}% ${(cy + 0.25 + rnd(i, 3) * 0.08) * 100}%, ${(cx - rnd(i, 4) * 0.05) * 100}% ${(cy + 0.25) * 100}%)`;
          const dx = (rnd(i, 5) - 0.5) * 900 * shatter;
          const dy = (rnd(i, 6) - 0.3) * 700 * shatter + shatter * shatter * 200;
          const rz = (rnd(i, 7) - 0.5) * 220 * shatter;
          const rx = (rnd(i, 8) - 0.5) * 300 * shatter;
          // reform: shards fly to the card centre and vanish into it
          const tx = dx * (1 - reform) + (cx * 800 - 400) * -reform * 0.9;
          const ty = dy * (1 - reform) + (420 - cy * 260) * reform;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                inset: 0,
                clipPath: poly,
                transform: `translate3d(${tx}px, ${ty}px, ${shatter * 200 * rnd(i, 9)}px) rotateZ(${rz * (1 - reform)}deg) rotateX(${rx * (1 - reform)}deg) scale(${1 - reform * 0.7})`,
                opacity: 1 - reform,
              }}
            >
              <GlassPhrase f={f} crack={crack} />
            </div>
          );
        })}
      </div>
      {/* metric card */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          top: 820,
          width: 780,
          padding: '34px 40px',
          borderRadius: 34,
          background: 'linear-gradient(160deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))',
          border: '2px solid rgba(255,255,255,0.18)',
          boxShadow: `0 40px 90px rgba(0,0,0,0.6), 0 0 60px rgba(34,176,95,${0.25 * card})`,
          opacity: card,
          transform: `scale(${0.7 + 0.3 * card}) rotateX(${(1 - card) * 40}deg)`,
          fontFamily: inter,
        }}
      >
        <div style={{fontWeight: 800, fontSize: 30, letterSpacing: 4, color: 'rgba(245,247,251,0.6)'}}>{METRIC.label}</div>
        <div style={{display: 'flex', alignItems: 'center', gap: 24, marginTop: 18}}>
          <div style={{flex: 1}}>
            <div style={{fontWeight: 700, fontSize: 26, color: 'rgba(245,247,251,0.55)', letterSpacing: 3}}>BEFORE</div>
            <div style={{fontFamily: mono, fontWeight: 800, fontSize: 70, color: 'rgba(245,247,251,0.75)'}}>{METRIC.before}</div>
          </div>
          <div style={{fontSize: 70, color: C.gold, transform: `translateX(${Math.sin(f * 0.2) * 6}px)`}}>→</div>
          <div style={{flex: 1}}>
            <div style={{fontWeight: 700, fontSize: 26, color: C.lime, letterSpacing: 3}}>AFTER</div>
            <div style={{fontFamily: mono, fontWeight: 800, fontSize: 70, color: C.lime, textShadow: `0 0 30px rgba(126,217,87,0.5)`}}>{METRIC.after}</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
const Easing0 = (t: number) => 1 - Math.pow(1 - t, 3);

const GlassPhrase: React.FC<{f: number; crack: number}> = ({f, crack}) => {
  const strike = ease(f, crack - 20, crack - 4);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 30,
        background: 'linear-gradient(160deg, rgba(190,225,255,0.22), rgba(190,225,255,0.05))',
        border: '2px solid rgba(220,240,255,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: inter,
        fontWeight: 800,
        fontStyle: 'italic',
        fontSize: 70,
        color: 'rgba(235,245,255,0.92)',
      }}
    >
      “Worked really hard”
      <div style={{position: 'absolute', left: 60, right: 60, top: '50%', height: 6, background: C.hot, transform: `scaleX(${strike}) rotate(-3deg)`, transformOrigin: 'left', boxShadow: `0 0 20px ${C.hot}`}} />
    </div>
  );
};

// ============ MOVE 2: Name who benefited ============
export const Move2: React.FC = () => {
  const f = useCurrentFrame();
  const hit = CUE.m2hit as number;
  const beam = ease(f, hit - 56, hit, 0, 1, easeInOut);
  const lit = ease(f, hit, hit + 12);
  const pathD = 'M 230 1160 C 260 820, 700 1020, 720 720';
  const L = 820;
  return (
    <AbsoluteFill style={{background: '#000', ...whip(f, T.move3 - T.move2)}}>
      <MoveBg f={f} hue={C.green} />
      <MoveHeader f={f} n={2} title={['Name who', 'benefited']} />
      <svg width="1080" height="1920" style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id="bm" x1="0" x2="1">
            <stop offset="0" stopColor={C.blue} />
            <stop offset="0.5" stopColor={C.cyan} />
            <stop offset="1" stopColor={C.lime} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="10" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={pathD} stroke="rgba(255,255,255,0.12)" strokeWidth="6" fill="none" strokeDasharray="4 16" strokeLinecap="round" />
        <path d={pathD} stroke="url(#bm)" strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={`${L}`} strokeDashoffset={L * (1 - beam)} filter="url(#glow)" />
        {/* comet head */}
        <path d={pathD} stroke="#fff" strokeWidth="18" fill="none" strokeLinecap="round" strokeDasharray={`20 ${L}`} strokeDashoffset={-L * beam + 20} filter="url(#glow)" opacity={beam > 0 && beam < 1 ? 1 : 0} />
        {/* ripples */}
        {[0, 1, 2].map((k) => {
          const r = ease(f, hit + k * 8, hit + 40 + k * 8);
          return <circle key={k} cx={720} cy={640} r={90 + r * 220} fill="none" stroke={C.lime} strokeWidth={6 * (1 - r)} opacity={(1 - r) * (f >= hit + k * 8 ? 1 : 0)} />;
        })}
      </svg>
      {/* your work node */}
      <Node x={230} y={1160} label="YOUR WORK" glow={C.cyan} on={1} icon="chart" f={f} />
      {/* stakeholder */}
      <Node x={720} y={640} label="WHO BENEFITED" sub="team · client · leader" glow={C.lime} on={lit} icon="person" f={f} big />
    </AbsoluteFill>
  );
};

const Node: React.FC<{x: number; y: number; label: string; sub?: string; glow: string; on: number; icon: 'chart' | 'person'; f: number; big?: boolean}> = ({
  x,
  y,
  label,
  sub,
  glow,
  on,
  icon,
  f,
  big,
}) => {
  const R = big ? 96 : 78;
  const p = ease(f, 10, 26, 0, 1, backOut);
  return (
    <div style={{position: 'absolute', left: x - R, top: y - R, width: R * 2, transform: `scale(${p * (1 + on * 0.08)})`}}>
      <div
        style={{
          width: R * 2,
          height: R * 2,
          borderRadius: '50%',
          background: on > 0.01 ? `radial-gradient(circle at 35% 30%, ${glow}, #0b2b1a 75%)` : 'radial-gradient(circle at 35% 30%, #2b3448, #0c1120 75%)',
          border: `3px solid ${on > 0.01 ? glow : 'rgba(255,255,255,0.25)'}`,
          boxShadow: `0 0 ${20 + on * 80}px ${glow}${on > 0.01 ? 'aa' : '33'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon === 'person' ? (
          <svg width={R * 1.1} height={R * 1.1} viewBox="0 0 100 100">
            <circle cx="50" cy="34" r="18" fill={on > 0.3 ? '#06110A' : 'rgba(255,255,255,0.7)'} />
            <path d="M16 90 C 20 62, 80 62, 84 90 Z" fill={on > 0.3 ? '#06110A' : 'rgba(255,255,255,0.7)'} />
          </svg>
        ) : (
          <svg width={R * 1.1} height={R * 1.1} viewBox="0 0 100 100">
            <rect x="16" y="56" width="14" height="28" rx="3" fill="#fff" />
            <rect x="40" y="40" width="14" height="44" rx="3" fill="#fff" />
            <rect x="64" y="22" width="14" height="62" rx="3" fill={C.lime} />
          </svg>
        )}
      </div>
      <div style={{position: 'absolute', top: R * 2 + 16, left: -150, width: R * 2 + 300, textAlign: 'center', fontFamily: inter, fontWeight: 900, fontSize: 34, letterSpacing: 3, color: C.white}}>
        {label}
        {sub ? <div style={{fontWeight: 700, fontSize: 28, letterSpacing: 1, color: on > 0.3 ? C.lime : 'rgba(245,247,251,0.5)', marginTop: 4}}>{sub}</div> : null}
      </div>
    </div>
  );
};

// ============ MOVE 3: Ask early ============
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
export const Move3: React.FC = () => {
  const f = useCurrentFrame();
  // page flips: accelerate then brake
  const flipT = ease(f, 12, (CUE.m3snap as number) - 12, 0, 1, easeInOut);
  const pages = 16;
  const flipPos = flipT * pages; // fractional page index
  const snap = CUE.m3snap as number; // meeting block lands on 'chat'
  const stampAt = CUE.m3stamp as number; // stamp on 'lock'
  const blockIn = ease(f, snap - 14, snap, 0, 1, easeIn);
  const blockSettle = shake(f, snap, 8, 8);
  const st = ease(f, stampAt, stampAt + 5, 0, 1, easeIn);
  const stShake = shake(f, stampAt + 5, 26, 14);
  return (
    <AbsoluteFill style={{background: '#000', ...whip(f, T.payoff - T.move3)}}>
      <MoveBg f={f} hue={C.cyan} />
      <AbsoluteFill style={{transform: `translate(${stShake.x}px,${stShake.y}px)`}}>
        <MoveHeader f={f} n={3} title={['Ask', 'early']} />
        {/* 3D flip calendar */}
        <div style={{position: 'absolute', left: 190, top: 560, width: 560, height: 390, perspective: 1600}}>
          <div style={{position: 'absolute', inset: 0, transform: 'rotateX(14deg) rotateY(-16deg)', transformStyle: 'preserve-3d'}}>
            {/* base / back board */}
            <div style={{position: 'absolute', inset: 0, borderRadius: 26, background: 'linear-gradient(180deg,#1b2436,#0b0f19)', transform: 'translateZ(-30px)', boxShadow: '0 60px 90px rgba(0,0,0,0.7)'}} />
            {/* resting page (next) */}
            <CalPage n={Math.min(pages, Math.floor(flipPos) + 1)} z={0} />
            {/* flipping page */}
            {flipPos < pages ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  transformOrigin: '50% 0%',
                  transform: `translateZ(2px) rotateX(${(flipPos % 1) * 180}deg)`,
                  transformStyle: 'preserve-3d',
                  filter: `blur(${flipT > 0.1 && flipT < 0.9 ? 2.5 : 0}px)`,
                }}
              >
                <CalPage n={Math.floor(flipPos)} z={0} shade={(flipPos % 1) * 0.6} />
              </div>
            ) : null}
            {/* rings */}
            {[0, 1, 2, 3, 4, 5].map((k) => (
              <div key={k} style={{position: 'absolute', top: -22, left: 70 + k * 88, width: 20, height: 46, borderRadius: 10, background: 'linear-gradient(90deg,#666,#eee,#777)', transform: 'translateZ(6px)'}} />
            ))}
          </div>
        </div>
        {/* week strip */}
        <div style={{position: 'absolute', left: 70, top: 1000, width: 800, height: 230, display: 'flex', gap: 12, opacity: ease(f, snap - 40, snap - 22)}}>
          {DAYS.map((d, i) => (
            <div key={d} style={{flex: 1, borderRadius: 18, background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.14)', padding: '14px 0', textAlign: 'center', position: 'relative'}}>
              <div style={{fontFamily: inter, fontWeight: 800, fontSize: 26, letterSpacing: 3, color: 'rgba(245,247,251,0.6)'}}>{d}</div>
            </div>
          ))}
          {/* meeting block snapping into TUE */}
          <div
            style={{
              position: 'absolute',
              left: 162 * 1 + 6 + blockSettle.x * 0.3,
              top: 64 + (1 - blockIn) * -520,
              width: 150,
              height: 140,
              borderRadius: 16,
              background: `linear-gradient(160deg, ${C.lime}, ${C.green})`,
              boxShadow: `0 20px 40px rgba(0,0,0,0.5), 0 0 ${30 * blockIn}px rgba(126,217,87,0.6)`,
              transform: `rotate(${(1 - blockIn) * -14}deg) scale(${1 + (1 - blockIn) * 0.3})`,
              opacity: lin(f, snap - 14, snap - 10),
              padding: 12,
              fontFamily: inter,
              color: '#06110A',
            }}
          >
            <div style={{fontWeight: 900, fontSize: 30, lineHeight: 1}}>1:1</div>
            <div style={{fontWeight: 800, fontSize: 22, lineHeight: 1.1, marginTop: 8}}>Appraisal chat</div>
          </div>
          {/* FRI shaded locked */}
          <div style={{position: 'absolute', left: 162 * 4 + 6, top: 64, width: 150, height: 140, borderRadius: 16, background: `repeating-linear-gradient(135deg, rgba(255,74,28,0.25) 0 10px, transparent 10px 20px)`, opacity: st}} />
        </div>
      </AbsoluteFill>
      {/* RATINGS LOCKED stamp */}
      {f >= stampAt ? (
        <div
          style={{
            position: 'absolute',
            left: 575,
            top: 930,
            transform: `translate(${stShake.x * 0.5}px, ${stShake.y * 0.5}px) rotate(${-12 + (1 - st) * -10}deg) scale(${3 - 2 * st})`,
            opacity: Math.min(1, st * 1.5),
            transformOrigin: '50% 50%',
          }}
        >
          <div
            style={{
              fontFamily: anton,
              fontSize: 76,
              lineHeight: 0.95,
              letterSpacing: 4,
              textAlign: 'center',
              color: '#ff3b1f',
              border: '9px solid #ff3b1f',
              borderRadius: 14,
              padding: '12px 26px 8px',
              background: 'rgba(40,6,2,0.55)',
              boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
              maskImage:
                'radial-gradient(circle at 20% 30%, rgba(0,0,0,0.6) 0 3%, #000 4%), radial-gradient(circle at 70% 60%, rgba(0,0,0,0.5) 0 2%, #000 3%)',
              WebkitMaskComposite: 'source-in',
              textShadow: '0 0 24px rgba(255,59,31,0.5)',
            }}
          >
            RATINGS
            <br />
            LOCKED
          </div>
        </div>
      ) : null}
      {/* dust burst */}
      {f >= stampAt + 5 && f < stampAt + 30
        ? new Array(18).fill(0).map((_, i) => {
            const t = (f - stampAt - 5) / 25;
            const a = rnd(i, 3) * Math.PI * 2;
            const d = 80 + t * (160 + rnd(i, 4) * 200);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: 720 + Math.cos(a) * d,
                  top: 1010 + Math.sin(a) * d * 0.5,
                  width: 10 + rnd(i, 5) * 16,
                  height: 10 + rnd(i, 5) * 16,
                  borderRadius: '50%',
                  background: 'rgba(255,200,170,0.5)',
                  opacity: 1 - t,
                  filter: 'blur(3px)',
                }}
              />
            );
          })
        : null}
    </AbsoluteFill>
  );
};

const CalPage: React.FC<{n: number; z: number; shade?: number}> = ({n, shade = 0}) => {
  const day = 3 + n; // tear-off day numbers, no month implied
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 22,
        background: `linear-gradient(180deg, #f6f7fb 0%, #e4e7ef 100%)`,
        overflow: 'hidden',
        backfaceVisibility: 'hidden',
        boxShadow: 'inset 0 -6px 0 rgba(0,0,0,0.08)',
      }}
    >
      <div style={{height: 92, background: `linear-gradient(90deg, ${C.blue}, ${C.cyan} 55%, ${C.green})`}} />
      <div style={{fontFamily: anton, fontSize: 250, lineHeight: 1.05, color: '#0F1E3D', textAlign: 'center'}}>{String(day).padStart(2, '0')}</div>
      <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${shade})`}} />
    </div>
  );
};
