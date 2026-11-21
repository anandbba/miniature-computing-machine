import {loadFont as loadAnton} from '@remotion/google-fonts/Anton';
import {loadFont as loadInterTight} from '@remotion/google-fonts/InterTight';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';

export const anton = loadAnton('normal', {subsets: ['latin']}).fontFamily;
export const inter = loadInterTight('normal', {weights: ['500', '700', '800', '900'], subsets: ['latin']}).fontFamily;
export const mono = loadMono('normal', {weights: ['700', '800'], subsets: ['latin']}).fontFamily;

export const C = {
  bg: '#04060B',
  navy: '#0F1E3D',
  blue: '#0A63D8',
  cyan: '#0EA5D9',
  green: '#22B05F',
  lime: '#7ED957',
  gold: '#FFC23D',
  goldHi: '#FFE7A3',
  goldDeep: '#A8700F',
  hot: '#FF4A1C',
  white: '#F5F7FB',
};

export const FPS = 30;
import TL from './timeline.json';
// Scene starts (frames) — derived from the real VO durations (audio/build_timeline.py)
const sc = TL.scenes as Record<string, [number, number]>;
export const T = {
  hook: sc.hook[0],
  promise: sc.promise[0],
  melt: sc.melt[0],
  turn: sc.turn[0],
  move1: sc.move1[0],
  move2: sc.move2[0],
  move3: sc.move3[0],
  payoff: sc.payoff[0],
  end: sc.end[0],
  total: TL.total,
};
export const CUE = TL.cues as any;
export const LINES = TL.lines as Record<string, [number, number]>;

export const goldGradient =
  'linear-gradient(180deg, #FFF3C4 0%, #FFD36B 28%, #E9A52A 55%, #FFD978 72%, #9C6408 100%)';
