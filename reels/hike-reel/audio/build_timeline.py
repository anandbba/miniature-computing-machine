"""Place VO clips, derive scene boundaries + animation cues, write captions & VO track.

Outputs:
  src/timeline.json  scene starts + cue frames (global)
  src/captions.json  word-level captions (display text, frames)
  audio/vo_track.wav VO placed on the 30fps timeline (24 kHz mono)
"""
import json, re
import numpy as np
import soundfile as sf

FPS = 30
ROOT = __file__.rsplit('/audio/', 1)[0]
dur = json.load(open(f'{ROOT}/audio/durations.json'))
asr = json.load(open(f'{ROOT}/audio/words.json'))

# display text for captions (what the viewer reads)
DISPLAY = {
    'h1': 'Your 9% hike?', 'h2': "It's really 5.",
    'p1': 'Say you earn ₹10 lakh a year.', 'p2': 'A 9.1% hike?', 'p3': "That's ₹91,000.", 'p4': 'On paper.',
    'm1': 'Then inflation shows up.', 'm2': 'Rent. Groceries. Fuel prices. School fees.', 'm6': 'Each one takes a bite.',
    'm8': 'In real buying power? About ₹51,000.', 'm9': 'Real wage growth: 5.1%.',
    't1': "You can't stop inflation.", 't2': 'But you CAN control what you carry into your appraisal.',
    'a1': 'One. Bring a number, not effort.', 'a2': '"I worked really hard" isn\'t a KPI.', 'a3': 'Before → after. Put a number on it.',
    'b1': 'Two. Name who benefited.', 'b2': 'Which team, which client, which leader got the win?',
    'c1': 'Three. Ask early.', 'c2': 'Book that chat before ratings lock. Not after.',
    'y1': 'Inflation takes its cut.', 'y2': 'Your proof decides the rest.', 'y3': 'Comment your hike %.',
    'y4': "I'll show you how to work out your REAL number.",
    'e1': 'Follow for more.',
}

# (scene, [(line, gap_frames_before)], tail_frames, min_len)
PLAN = [
    ('hook', [('h1', 2), ('h2', 1)], 3, 80),
    ('promise', [('p1', 6), ('p2', 4), ('p3', 3), ('p4', 4)], 8, 0),
    ('melt', [('m1', 4), ('m2', 4), ('m6', 6), ('m8', 12), ('m9', 8)], 14, 0),
    ('turn', [('t1', 8), ('t2', 6)], 10, 0),
    ('move1', [('a1', 8), ('a2', 4), ('a3', 4)], 9, 0),
    ('move2', [('b1', 8), ('b2', 4)], 34, 0),
    ('move3', [('c1', 8), ('c2', 4)], 34, 0),
    ('payoff', [('y1', 8), ('y2', 4), ('y3', 10), ('y4', 4)], 14, 0),
    ('end', [('e1', 14)], 0, 84),
]

placed = {}  # line -> (start_frame, end_frame) global
scenes = {}
t = 0
for name, lines, tail, mn in PLAN:
    s0 = t
    cur = s0
    for ln, gap in lines:
        st = cur + gap
        en = st + int(round(dur[ln] * FPS))
        placed[ln] = (st, en)
        cur = en
    end = max(cur + tail, s0 + mn)
    scenes[name] = (s0, end)
    t = end
TOTAL = t


def wstart(line, word_re, nth=0):
    """global frame where ASR word matching regex starts in a line"""
    st = placed[line][0]
    hits = [w for w in asr[line] if re.search(word_re, w[0], re.I)]
    return st + int(round(hits[nth][1] * FPS))


S = {k: v[0] for k, v in scenes.items()}
cues = {
    'slam': placed['h2'][0] - 2 - S['hook'],
    'roll': [placed['p2'][0] - S['promise'], placed['p3'][0] + 8 - S['promise']],
    'rise': [placed['p3'][0] + 6 - S['promise'], placed['p4'][1] - S['promise']],
    'hits': [wstart('m2', r) + 2 - S['melt'] for r in ['rent', 'grocer', 'fuel', 'school']],
    'split_':0,
    'split': placed['m8'][0] - 10 - S['melt'],
    'drain': [wstart('m8', 'about') - S['melt'], placed['m8'][1] + 6 - S['melt']],
    'stamp': placed['m9'][0] + 4 - S['melt'],
    'm3snap': wstart('c2', 'chat') - S['move3'],
    'm3stamp': wstart('c2', 'lock') - S['move3'],
    'm1crack': placed['a2'][1] - 8 - S['move1'],
    'm2hit': placed['b2'][0] + 30 - S['move2'],
    'cta': placed['y3'][0] - 4 - S['payoff'],
}
h = cues['hits']
for i in range(1, 4):
    h[i] = max(h[i], h[i - 1] + 12)
cues.pop('split_')
timeline = {'total': TOTAL, 'scenes': {k: list(v) for k, v in scenes.items()}, 'cues': cues,
            'lines': {k: list(v) for k, v in placed.items()}}
json.dump(timeline, open(f'{ROOT}/src/timeline.json', 'w'), indent=1)

# captions: map display words onto ASR word timings by relative character position
caps = []
for ln, (st, en) in sorted(placed.items(), key=lambda x: x[1][0]):
    words = DISPLAY[ln].split()
    a = asr[ln]
    if not a:
        continue
    alen = sum(len(w[0]) for w in a)
    cum, apos = 0, []
    for w in a:
        apos.append((cum / alen, (cum + len(w[0])) / alen, w[1], w[2]))
        cum += len(w[0])
    dlen = sum(len(w) for w in words)
    cum = 0
    for w in words:
        c0 = cum / dlen
        c1 = (cum + len(w)) / dlen
        cum += len(w)
        # interpolate time at c0 and c1
        def tat(c):
            for p0, p1, t0, t1 in apos:
                if c <= p1 + 1e-9:
                    k = 0 if p1 == p0 else (c - p0) / (p1 - p0)
                    return t0 + max(0, min(1, k)) * (t1 - t0)
            return apos[-1][3]
        caps.append({'w': w, 's': st + int(round(tat(c0) * FPS)), 'e': st + int(round(tat(c1) * FPS)), 'line': ln})
json.dump(caps, open(f'{ROOT}/src/captions.json', 'w'))

# VO track
SR = 24000
track = np.zeros(int(TOTAL / FPS * SR) + SR, dtype=np.float32)
for ln, (st, en) in placed.items():
    a, sr = sf.read(f'{ROOT}/audio/vo/{ln}.wav', dtype='float32')
    i = int(st / FPS * SR)
    track[i:i + len(a)] += a[: len(track) - i]
track = track[: int(TOTAL / FPS * SR)]
peak = np.max(np.abs(track))
track = track / peak * 0.89
sf.write(f'{ROOT}/audio/vo_track.wav', track, SR)
print('TOTAL', TOTAL, 'frames =', TOTAL / FPS, 's')
for k, v in scenes.items():
    print(f'{k:8s} {v[0]:5d}-{v[1]:5d} ({(v[1]-v[0])/FPS:.2f}s)')
print(cues)
