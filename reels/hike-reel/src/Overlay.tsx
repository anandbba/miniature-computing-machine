import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {C, inter, T} from './theme';
import {lin, ease} from './util';
import words from './captions.json';

type W = {w: string; s: number; e: number; hl?: boolean};

export const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'overlay', opacity: 0.22}}>
      <svg width="1080" height="1920">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f % 97} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="1080" height="1920" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

export const Watermark: React.FC = () => {
  const f = useCurrentFrame();
  // hidden during end card (logo is the hero there)
  const o = Math.min(lin(f, 4, 16, 0, 0.82), lin(f, T.end - 6, T.end + 4, 0.82, 0));
  return (
    <div
      style={{
        position: 'absolute',
        left: 44,
        top: 118,
        width: 104,
        height: 104,
        borderRadius: 999,
        overflow: 'hidden',
        opacity: o,
        boxShadow: '0 6px 24px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.18)',
        background: '#fff',
      }}
    >
      <Img src={staticFile('logo.jpg')} style={{width: '118%', marginLeft: '-9%', marginTop: '-4%'}} />
    </div>
  );
};

export const Footnote: React.FC<{from: number; to: number}> = ({from, to}) => {
  const f = useCurrentFrame();
  const o = Math.min(lin(f, from, from + 10), lin(f, to - 10, to, 1, 0));
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 64,
        top: 1488,
        width: 820,
        fontFamily: inter,
        fontWeight: 500,
        fontSize: 25,
        letterSpacing: 0.2,
        color: 'rgba(245,247,251,0.62)',
        opacity: o,
        textShadow: '0 2px 8px rgba(0,0,0,0.9)',
      }}
    >
      Source: Aon India Salary Survey 2026-27. Illustrative example.
    </div>
  );
};

// Word-by-word captions, grouped into short phrases. Safe zone: above y=1536, clear of right 170px.
export const Captions: React.FC<{hide?: [number, number][]}> = ({hide = []}) => {
  const f = useCurrentFrame();
  const list = words as W[];
  // group into chunks of max 4 words or at punctuation
  const chunks: W[][] = [];
  let cur: W[] = [];
  list.forEach((w, i) => {
    cur.push(w);
    const next = list[i + 1];
    const brk = /[.?!,:]$/.test(w.w) || cur.length >= 4 || !next || next.s - w.e > 8;
    if (brk) {
      chunks.push(cur);
      cur = [];
    }
  });
  const chunk = chunks.find((c, i) => {
    const end = chunks[i + 1] ? Math.min(chunks[i + 1][0].s, c[c.length - 1].e + 14) : c[c.length - 1].e + 14;
    return f >= c[0].s - 2 && f < end;
  });
  if (!chunk) return null;
  if (hide.some(([a, b]) => f >= a && f < b)) return null;
  const pop = ease(f, chunk[0].s - 2, chunk[0].s + 4);
  return (
    <div
      style={{
        position: 'absolute',
        left: 70,
        width: 800,
        top: 1290,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '4px 16px',
        transform: `translateY(${(1 - pop) * 18}px) scale(${0.94 + pop * 0.06})`,
        opacity: pop,
      }}
    >
      {chunk.map((w, i) => {
        const active = f >= w.s && f < w.e + 3;
        const said = f >= w.s;
        return (
          <span
            key={i}
            style={{
              fontFamily: inter,
              fontWeight: 900,
              fontSize: 66,
              lineHeight: 1.12,
              letterSpacing: -0.5,
              padding: '2px 14px 6px',
              borderRadius: 16,
              color: active ? '#06110A' : said ? C.white : 'rgba(245,247,251,0.55)',
              background: active ? `linear-gradient(135deg, ${C.lime}, ${C.green})` : 'transparent',
              boxShadow: active ? `0 8px 30px rgba(34,176,95,0.45)` : 'none',
              textShadow: active ? 'none' : '0 4px 14px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9)',
              transform: active ? 'scale(1.06) rotate(-1.5deg)' : 'none',
              textTransform: 'uppercase',
            }}
          >
            {w.w}
          </span>
        );
      })}
    </div>
  );
};
