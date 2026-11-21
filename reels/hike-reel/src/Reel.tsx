import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {T, CUE} from './theme';
import {Hook} from './scenes/Hook';
import {Melt} from './scenes/Melt';
import {PromiseScene} from './scenes/Promise';
import {Payoff} from './scenes/Payoff';
import {Turn} from './scenes/Turn';
import {Move1, Move2, Move3} from './scenes/Moves';
import {EndCard} from './scenes/EndCard';
import {Captions, Footnote, Grain, Watermark} from './Overlay';

const scenes: [number, number, React.FC | null][] = [
  [T.hook, T.promise, Hook],
  [T.promise, T.melt, PromiseScene],
  [T.melt, T.turn, Melt],
  [T.turn, T.move1, Turn],
  [T.move1, T.move2, Move1],
  [T.move2, T.move3, Move2],
  [T.move3, T.payoff, Move3],
  [T.payoff, T.end, Payoff],
  [T.end, T.total, EndCard],
];

export const Reel: React.FC = () => (
  <AbsoluteFill style={{background: '#000'}}>
    {scenes.map(([a, b, S], i) => (S ? <Sequence key={i} from={a} durationInFrames={b - a}><S /></Sequence> : null))}
    <Footnote from={T.promise + 10} to={T.turn} />
    <Captions hide={[[CUE.slam - 2, T.promise], [T.turn, T.move1], [T.payoff, T.total]]} />
    <Watermark />
    <Grain />
  </AbsoluteFill>
);
