import {Easing, interpolate} from 'remotion';
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const ease = (f: number, a: number, b: number, from = 0, to = 1, e = Easing.bezier(0.22, 1, 0.36, 1)) =>
  interpolate(f, [a, b], [from, to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e});
export const lin = (f: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
export const easeIn = Easing.bezier(0.55, 0, 1, 0.45);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const backOut = Easing.bezier(0.34, 1.56, 0.64, 1);
// deterministic hash random
export const rnd = (i: number, s = 0) => {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
// impact shake: decays after frame `at`
export const shake = (f: number, at: number, amp = 18, dur = 12) => {
  const t = f - at;
  if (t < 0 || t > dur) return {x: 0, y: 0, r: 0};
  const k = Math.pow(1 - t / dur, 2);
  return {x: Math.sin(t * 2.9) * amp * k, y: Math.cos(t * 3.7) * amp * k * 0.7, r: Math.sin(t * 2.1) * 0.6 * k};
};
