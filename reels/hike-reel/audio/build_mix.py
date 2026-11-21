"""Procedural music bed + sound design, cued from src/timeline.json, mixed under the VO.

Output: audio/mix.wav (48 kHz stereo). Everything is synthesized here, so there are no licensing questions.
"""
import json
import numpy as np
import soundfile as sf

SR = 48000
FPS = 30
ROOT = __file__.rsplit('/audio/', 1)[0]
TL = json.load(open(f'{ROOT}/src/timeline.json'))
S = {k: v[0] for k, v in TL['scenes'].items()}
CUE = TL['cues']
N = int(TL['total'] / FPS * SR)
rng = np.random.default_rng(7)


def fr(f):  # frame -> sample
    return int(round(f / FPS * SR))


def t_(sec):
    return np.arange(int(sec * SR)) / SR


def env(n, a=0.005, d=0.3, curve=4.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) * curve / max(d, 1e-4))
    return e


def lp(x, cutoff):  # one-pole low-pass (vectorised via cumulative filter approximation)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):  # fine for short sfx
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def lp_fast(x, cutoff):
    # FFT brickwall-ish low pass for long buffers
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x))


def hp_fast(x, cutoff):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 - 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x))


def bp_fast(x, lo, hi):
    return lp_fast(hp_fast(x, lo), hi)


music = np.zeros((N, 2))
sfx = np.zeros((N, 2))


def add(buf, sig, frame, gain=1.0, pan=0.0):
    i = fr(frame) if not isinstance(frame, tuple) else frame[0]
    if i >= N:
        return
    sig = sig[: N - i] * gain
    if sig.ndim == 1:
        l, r = np.sqrt(0.5 * (1 - pan)), np.sqrt(0.5 * (1 + pan))
        buf[i:i + len(sig), 0] += sig * l * 1.414
        buf[i:i + len(sig), 1] += sig * r * 1.414
    else:
        buf[i:i + len(sig)] += sig


# ---------------- SFX library ----------------
def mx(*arrs):
    n = max(len(a) for a in arrs)
    out = np.zeros(n)
    for a in arrs:
        out[: len(a)] += a
    return out


def sub_hit(dur=1.4, f0=90, f1=34, gain=1.0):
    t = t_(dur)
    ph = 2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-t * 9)) / SR
    s = np.sin(ph) * env(len(t), 0.002, dur, 3.2)
    click = rng.standard_normal(len(t)) * env(len(t), 0.0005, 0.02, 8) * 0.5
    return np.tanh((s + lp(click, 3000)) * 1.6) * gain


def impact(dur=1.2):
    t = t_(dur)
    n = rng.standard_normal(len(t))
    body = bp_fast(n, 60, 900) * env(len(t), 0.001, 0.35, 5)
    return mx(body * 1.6, sub_hit(dur, 120, 40) * 0.9)


def whoosh(dur=0.6, lo=300, hi=4000, rev=False):
    n = rng.standard_normal(int(dur * SR))
    x = bp_fast(n, lo, hi)
    e = np.sin(np.linspace(0, np.pi, len(x))) ** 2
    if rev:
        e = np.linspace(0, 1, len(x)) ** 3
    return x * e * 0.6


def ping():
    t = t_(0.9)
    s = (np.sin(2 * np.pi * 1318.5 * t) * env(len(t), 0.002, 0.5, 6) + np.sin(2 * np.pi * 1975.5 * t) * env(len(t), 0.002, 0.5, 6) * np.where(t > 0.09, 1, 0))
    return s * 0.35


def confetti_pop():
    out = np.zeros(int(0.8 * SR))
    for k in range(40):
        i = int(rng.uniform(0, 0.5) * SR)
        n = int(0.03 * SR)
        c = hp_fast(rng.standard_normal(n), 2500) * env(n, 0.0005, 0.03, 6) * rng.uniform(0.2, 0.6)
        out[i:i + n] += c
    burst = bp_fast(rng.standard_normal(len(out)), 200, 3000) * env(len(out), 0.001, 0.15, 6)
    return out + burst * 0.8


def shimmer(dur=1.5, base=2000):
    t = t_(dur)
    s = sum(np.sin(2 * np.pi * base * r * t + rng.uniform(0, 6)) * rng.uniform(0.3, 1) for r in [1, 1.26, 1.5, 1.89, 2.52])
    return s * env(len(t), 0.05, dur, 3) * 0.06


def tick():
    n = int(0.02 * SR)
    return hp_fast(rng.standard_normal(n), 3000) * env(n, 0.0002, 0.01, 6) * 0.4


def ding():
    t = t_(1.2)
    return (np.sin(2 * np.pi * 1760 * t) + 0.5 * np.sin(2 * np.pi * 2637 * t)) * env(len(t), 0.002, 1.0, 5) * 0.22


def riser(dur=2.0, f0=200, f1=1600):
    t = t_(dur)
    ph = 2 * np.pi * np.cumsum(f0 * (f1 / f0) ** (t / dur)) / SR
    tone = np.sin(ph) * 0.15
    noise = hp_fast(rng.standard_normal(len(t)), 1500) * 0.12
    return (tone + noise) * (t / dur) ** 2.5


def sizzle_bed(dur):
    n = rng.standard_normal(int(dur * SR))
    x = bp_fast(n, 2500, 9000)
    crackle = (rng.random(len(x)) < 0.0009) * rng.uniform(-1, 1, len(x)) * 3
    return x * 0.35 + lp_fast(crackle, 6000) * 0.5


def hiss_hit():
    t = t_(1.0)
    n = bp_fast(rng.standard_normal(len(t)), 1800, 10000) * env(len(t), 0.003, 0.7, 4)
    return mx(n * 0.9, sub_hit(0.5, 140, 60) * 0.5)


def plip():
    t = t_(0.18)
    f = 900 + 1400 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.001, 0.1, 6) * 0.25


def clank(heavy=1.0):
    t = t_(1.6)
    partials = [(310, 1), (523, 0.7), (777, 0.6), (1131, 0.45), (1693, 0.3), (2410, 0.2)]
    s = sum(a * np.sin(2 * np.pi * f * heavy ** -0.3 * t) * np.exp(-t * (3 + f / 600)) for f, a in partials)
    hitn = bp_fast(rng.standard_normal(len(t)), 500, 6000) * env(len(t), 0.0005, 0.06, 6)
    return mx(s * 0.35 + hitn * 0.9, sub_hit(0.8, 110, 45) * 0.7 * heavy)


def slice_shing():
    t = t_(0.7)
    f = 3000 + 4000 * t
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.002, 0.5, 5) * 0.12
    return mx(s, whoosh(0.4, 2000, 9000) * 0.6)


def drain_tone(dur):
    t = t_(dur)
    f = 660 * (0.5) ** (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.08 * np.minimum(1, t * 8) * np.minimum(1, (dur - t) * 8)


def glass_shatter():
    out = np.zeros(int(1.6 * SR))
    burst = hp_fast(rng.standard_normal(len(out)), 2000) * env(len(out), 0.0005, 0.25, 6)
    out += burst * 0.9
    for k in range(70):
        i = int(rng.exponential(0.25) * SR)
        if i >= len(out) - 6000:
            continue
        n = int(rng.uniform(0.05, 0.25) * SR)
        n = min(n, len(out) - i)
        tt = np.arange(n) / SR
        out[i:i + n] += np.sin(2 * np.pi * rng.uniform(3000, 9000) * tt) * np.exp(-tt * rng.uniform(20, 50)) * rng.uniform(0.05, 0.2)
    return out


def chime():
    t = t_(1.8)
    return sum(np.sin(2 * np.pi * f * t) * np.exp(-t * 2.5) * a for f, a in [(880, 0.3), (1320, 0.25), (1760, 0.15), (2217, 0.1)])


def thud():
    return mx(sub_hit(0.5, 180, 70) * 0.8, bp_fast(rng.standard_normal(int(0.5 * SR)), 100, 1200) * env(int(0.5 * SR), 0.001, 0.08, 6) * 0.8)


def flutter(dur):
    out = np.zeros(int(dur * SR))
    tt = 0.0
    k = 0
    while tt < dur - 0.05:
        i = int(tt * SR)
        n = int(0.035 * SR)
        out[i:i + n] += bp_fast(rng.standard_normal(n), 800, 6000) * env(n, 0.001, 0.03, 5) * 0.5
        # accelerate then brake
        p = tt / dur
        tt += 0.03 + 0.12 * (abs(p - 0.5) * 2) ** 2
        k += 1
    return out


def pop():
    t = t_(0.25)
    f = 400 + 900 * np.exp(-t * 25)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.001, 0.15, 6) * 0.4


# ---------------- place SFX ----------------
H, P, M, TU, M1, M2, M3, PY, E = (S[k] for k in ['hook', 'promise', 'melt', 'turn', 'move1', 'move2', 'move3', 'payoff', 'end'])
BURST, FREEZE = 10, 23
add(sfx, ping(), 2, 0.9)
add(sfx, confetti_pop(), BURST, 0.9)
add(sfx, whoosh(0.35, 400, 6000, rev=True), FREEZE - 10, 0.7)
add(sfx, sub_hit(1.6, 70, 28), FREEZE, 1.1)           # time-stop bass drop
add(sfx, shimmer(1.4, 2600), FREEZE, 1.0)
add(sfx, impact(1.4), H + CUE['slam'] + 9, 1.1)       # slam
add(sfx, whoosh(0.8, 200, 5000), P - 2, 0.9)          # fly through confetti
r0, r1 = CUE['roll']
for f in range(P + r0, P + r1, 2):
    add(sfx, tick(), f, 0.8 * (0.5 + 0.5 * np.sin((f - P - r0) / (r1 - r0) * np.pi)), pan=rng.uniform(-0.3, 0.3))
add(sfx, ding(), P + r1, 1.0)
add(sfx, riser(1.6, 120, 600), P + CUE['rise'][0] - 10, 0.8)
add(sfx, sub_hit(1.0, 100, 45), P + CUE['rise'][0] + 40, 0.6)
add(sfx, shimmer(2.0, 1800), P + CUE['rise'][0] + 30, 1.2)
# melt
melt_len = (TU - M) / FPS
bed = sizzle_bed(melt_len)
ramp = np.minimum(1, np.arange(len(bed)) / SR / 3.0) * np.minimum(1, (len(bed) / SR - np.arange(len(bed)) / SR) * 4)
add(sfx, bed * ramp, M, 0.35)
for i, h in enumerate(CUE['hits']):
    add(sfx, hiss_hit(), M + h, 0.9, pan=[-0.4, 0.4, -0.15, 0.2][i])
    for k in range(4):
        add(sfx, plip(), M + h + 14 + k * 7 + int(rng.integers(0, 4)), 0.8, pan=rng.uniform(-0.3, 0.3))
add(sfx, slice_shing(), M + CUE['split'], 1.0)
d0, d1 = CUE['drain']
add(sfx, drain_tone((d1 - d0) / FPS), M + d0, 1.0)
add(sfx, clank(1.0), M + CUE['stamp'] + 6, 1.0)
# turn
add(sfx, sub_hit(1.8, 80, 30), TU, 1.1)
add(sfx, whoosh(0.5, 300, 4000, rev=True), TU - 14, 0.6)
add(sfx, thud(), TU + 14, 0.8)
add(sfx, shimmer(2.5, 1500), TU + 16, 0.9)
# moves
for st in [M1, M2, M3, PY]:
    add(sfx, whoosh(0.45, 300, 7000), st - 7, 0.8)
add(sfx, glass_shatter(), M1 + CUE['m1crack'] - 30, 1.0)
add(sfx, pop(), M1 + CUE['m1crack'] - 30 + 40, 1.0)
hit2 = CUE['m2hit']
add(sfx, riser(1.8, 300, 1400) * 0.8, M2 + hit2 - 56, 0.9)
add(sfx, chime(), M2 + hit2, 0.8)
snap, stp = CUE['m3snap'], CUE['m3stamp']
add(sfx, flutter((snap - 24) / FPS), M3 + 12, 0.8)
add(sfx, thud(), M3 + snap, 0.9)
add(sfx, clank(1.4), M3 + stp + 5, 1.2)
# payoff
add(sfx, whoosh(1.4, 200, 5000, rev=True), PY + 46 - 42, 0.7)
add(sfx, impact(2.0), PY + 46, 0.9)
add(sfx, shimmer(3.0, 2200), PY + 46, 1.4)
add(sfx, pop(), PY + CUE['cta'], 0.9)
# end
add(sfx, riser(1.4, 300, 2000), E - 40, 0.7)
add(sfx, shimmer(2.0, 3000), E + 4, 1.0)
add(sfx, sub_hit(1.0, 90, 50) * 0.5, E + 38, 0.6)

# ---------------- music bed ----------------
BPM = 96
beat = 60 / BPM
dur = N / SR
t = np.arange(N) / SR
# A minor -> F -> C -> G progression of soft saw pads
chords = [[220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [130.81, 196.0, 261.63], [196.0, 246.94, 293.66]]
bar = 4 * beat
pad = np.zeros(N)
for ci in range(int(dur / bar) + 1):
    ch = chords[ci % 4]
    i0 = fr(ci * bar * FPS)
    i1 = min(N, fr((ci + 1) * bar * FPS) + int(0.3 * SR))
    if i0 >= N:
        break
    tt = np.arange(i1 - i0) / SR
    seg = np.zeros(i1 - i0)
    for f in ch:
        for det in (-0.12, 0.12):
            ph = 2 * np.pi * (f + det) * tt
            seg += (2 * ((ph / (2 * np.pi)) % 1) - 1) * 0.05
    e = np.minimum(1, tt / 0.6) * np.minimum(1, (tt[-1] - tt) / 0.3)
    pad[i0:i1] += seg * e
pad = lp_fast(pad, 1400)
# pulse: sub kick on beats + offbeat noise hats
pulse = np.zeros(N)
hats = np.zeros(N)
nb = int(dur / beat)
for b in range(nb):
    i = int(b * beat * SR)
    k = sub_hit(0.4, 110, 48) * 0.5
    pulse[i:i + len(k)] += k[: N - i]
    j = int((b + 0.5) * beat * SR)
    n = int(0.05 * SR)
    if j + n < N:
        hats[j:j + n] += rng.standard_normal(n) * env(n, 0.0005, 0.03, 6) * 0.12
hats = hp_fast(hats, 6000)


def curve(points):
    xs = [fr(p[0]) for p in points]
    ys = [p[1] for p in points]
    return np.interp(np.arange(N), xs, ys)


# intensity automation (frames)
pad_g = curve([(0, 0.0), (FREEZE, 0.0), (P, 0.5), (M, 0.7), (TU - 10, 1.0), (TU, 0.15), (TU + 60, 0.5), (M1, 0.7), (PY, 0.8), (PY + 46, 1.2), (E, 1.0), (TL['total'] - 10, 0.0), (TL['total'], 0)])
pulse_g = curve([(0, 0), (P, 0), (P + 30, 0.6), (M, 0.8), (TU - 6, 1.0), (TU, 0), (M1 - 4, 0), (M1, 0.9), (PY, 0.9), (PY + 40, 0.0), (PY + 46, 1.0), (E - 10, 0.8), (E + 20, 0), (TL['total'], 0)])
hat_g = curve([(0, 0), (M, 0), (M + 60, 0.6), (TU, 0.9), (TU + 1, 0), (M1, 0), (M1 + 10, 0.8), (PY, 0.8), (PY + 46, 1), (E, 0.6), (E + 10, 0), (TL['total'], 0)])
mus = pad * pad_g + pulse * pulse_g + hats * hat_g
mus = np.stack([mus, np.roll(mus, int(0.012 * SR))], 1)  # cheap stereo width

# ---------------- VO + ducking ----------------
vo, vsr = sf.read(f'{ROOT}/audio/vo_track.wav', dtype='float64')
vo = np.interp(np.arange(N) * vsr / SR, np.arange(len(vo)), vo)
vo_env = np.abs(vo)
# smooth envelope (attack 10ms / release 250ms) via FFT-friendly box blur
k = int(0.25 * SR)
vo_env = np.convolve(vo_env, np.ones(k) / k, mode='same')
duck = 1 - 0.8 * np.clip(vo_env / 0.04, 0, 1)  # ~ -14 dB under speech

mix = vo[:, None] * 1.0 + mus * 0.13 * duck[:, None] + sfx * 0.32 * (1 - 0.35 * np.clip(vo_env / 0.04, 0, 1))[:, None]
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix *= 0.95 / np.max(np.abs(mix))
sf.write(f'{ROOT}/audio/mix.wav', mix.astype(np.float32), SR)
print('mix', mix.shape, N / SR, 's')
