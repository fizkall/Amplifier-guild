"""Synthesize the music bed + SFX for the BumperMedia promo (fully in code, no samples).
Output: assets/music.wav, assets/sfx.wav (44.1 kHz stereo). Mixed with the voiceover in mix.sh."""
import numpy as np, os
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR = 44100
DUR = 180.6
N = int(SR * DUR)
ROOT = os.path.join(os.path.dirname(__file__), '..')
rng = np.random.default_rng(7)
BPM = 100; BEAT = 60 / BPM; BAR = BEAT * 4

def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def env_sections(points):
    """piecewise-linear automation from [(t, value), ...]"""
    t = np.arange(N) / SR; ts, vs = zip(*points); return np.interp(t, ts, vs)
def note(n): return 440 * 2 ** ((n - 69) / 12)
def saw(f, n, phase=0.0):
    t = np.arange(n) / SR; return 2 * ((t * f + phase) % 1) - 1

L = np.zeros(N); R = np.zeros(N)
def add(sig, start, pan=0.0, gain=1.0):
    i = int(start * SR); j = min(N, i + len(sig))
    if i >= N or j <= 0: return
    s = sig[: j - i] * gain
    L[i:j] += s * np.sqrt((1 - pan) / 2) * 1.41; R[i:j] += s * np.sqrt((1 + pan) / 2) * 1.41

# ---------- chords: Am – F – C – G (2 bars each) ----------
PROG = [[57, 60, 64], [53, 57, 60], [48, 55, 60], [55, 59, 62]]
pad = np.zeros(N); bass = np.zeros(N)
seg = BAR * 2; nseg = int(DUR / seg) + 1
for k in range(nseg):
    ch = PROG[k % 4]; st = k * seg; n = int(seg * SR) + SR // 2
    e = np.minimum(1, np.arange(n) / (SR * .8)) * np.minimum(1, (n - np.arange(n)) / (SR * .5))
    voice = sum(saw(note(m) * d, n, rng.random()) for m in ch for d in (0.996, 1.004))
    i = int(st * SR); j = min(N, i + n); pad[i:j] += (voice * e)[: j - i]
    b = np.sin(2 * np.pi * note(ch[0] - 24) * np.arange(n) / SR) + .3 * saw(note(ch[0] - 24), n)
    bass[i:j] += (b * e)[: j - i]
pad = lp(pad, 1400) * .05
pad_cut = env_sections([(0, 500), (31, 900), (32, 2600), (61, 2600), (61.3, 600), (67.6, 600), (67.7, 3200), (154.2, 3200), (154.4, 700), (164.8, 1600), (165, 4200), (DUR, 4200)])
# time-varying filter approximation: blend dark & bright versions
dark = lp(pad, 500); bright = pad
mixk = np.clip((pad_cut - 500) / 3700, 0, 1)
pad = dark * (1 - mixk) + bright * mixk
pad *= env_sections([(0, 0), (1.5, .8), (31, 1), (61.25, 1), (61.4, .55), (67.6, .7), (67.7, 1), (DUR - 3, 1), (DUR, 0)])
bass = lp(bass, 220) * .22 * env_sections([(0, 0), (31.7, 0), (31.9, 1), (61.2, 1), (61.3, 0), (67.6, 0), (67.7, 1), (154.2, 1), (154.4, 0), (165, 0), (165.05, 1), (DUR - 2.5, 1), (DUR, 0)])

# ---------- drums ----------
def kick():
    n = int(.42 * SR); t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t * 28); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7.5) * .9
def hat(open_=False):
    n = int((.18 if open_ else .05) * SR); t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7000) * np.exp(-t * (18 if open_ else 70)) * .22
def clap():
    n = int(.25 * SR); t = np.arange(n) / SR
    return bp(rng.standard_normal(n), 900, 3000) * np.exp(-t * 18) * .35
K, H, HO, C = kick(), hat(), hat(True), clap()
def section_drums(a, b, kick_on=True, hats=False, claps=False):
    t = a
    i = 0
    while t < b - .01:
        if kick_on: add(K, t, 0, 1.0)
        if hats: add(H, t + BEAT / 2, .3 * (1 if i % 2 else -1), 1.0)
        if hats and i % 4 == 3: add(HO, t + BEAT / 2, .2, .8)
        if claps and i % 2 == 1: add(C, t, -.1, 1.0)
        t += BEAT; i += 1
section_drums(31.85, 61.2, True, False, False)
section_drums(67.65, 88.0, True, True, False)
section_drums(88.0, 154.2, True, True, True)
section_drums(165.0, 177.4, True, True, True)
# clock ticks in the chaos intro
for k in range(int((14 - 6.55) / (BEAT / 2))):
    n = int(.03 * SR); tk = hp(rng.standard_normal(n), 3000) * np.exp(-np.arange(n) / SR * 120) * .25
    add(tk, 6.55 + k * BEAT / 2, .4 * (1 if k % 2 else -1))

# ---------- arpeggio ----------
arp = np.zeros(N)
def arp_section(a, b, gain):
    t = a; k = 0
    while t < b:
        seg_i = int(t / seg) % 4; ch = PROG[seg_i]; m = ch[k % 3] + 12 * (1 + (k // 3) % 2)
        n = int(BEAT / 4 * SR * .9); tt = np.arange(n) / SR
        s = (np.sign(np.sin(2 * np.pi * note(m) * tt)) * .4 + np.sin(2 * np.pi * note(m) * tt)) * np.exp(-tt * 14)
        i = int(t * SR); j = min(N, i + n); arp[i:j] += s[: j - i] * gain
        t += BEAT / 4; k += 1
arp_section(67.65, 111.6, .05)
arp_section(118.75, 154.2, .07)
arp_section(165.0, 177.4, .08)
arp = lp(arp, 4200)
# stereo ping-pong delay on arp
d = int(BEAT * .75 * SR)
arpL = arp.copy(); arpR = np.zeros(N); arpR[d:] += arp[:-d] * .55; arpL[2 * d:] += arp[:-2 * d] * .3

L += pad + bass + arpL; R += pad * .97 + bass + arpR
music = np.stack([L, R], 1)

# ---------- SFX ----------
S = np.zeros((N, 2))
def put(sig, t0, g=1.0, pan=0.0):
    i = int(t0 * SR); j = min(N, i + len(sig))
    if i < 0: sig = sig[-i:]; i = 0
    S[i:j, 0] += sig[: j - i] * g * (1 - pan * .5); S[i:j, 1] += sig[: j - i] * g * (1 + pan * .5)
def whoosh(len_=.7):
    n = int(len_ * SR); t = np.arange(n) / SR; x = rng.standard_normal(n)
    out = np.zeros(n); steps = 24
    for s_ in range(steps):  # sweeping band
        a = s_ * n // steps; b = (s_ + 1) * n // steps; fc = 400 + 5000 * (s_ / steps) ** 2
        out[a:b] = bp(x, fc * .6, min(fc * 1.6, 18000))[a:b]
    return out * np.sin(np.pi * t / len_) ** 2 * .5
def impact():
    n = int(2.2 * SR); t = np.arange(n) / SR
    f = 38 + 70 * np.exp(-t * 9); boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
    noise = lp(rng.standard_normal(n), 900) * np.exp(-t * 6) * .35
    return (boom + noise) * .8
def riser(len_):
    n = int(len_ * SR); t = np.arange(n) / SR; x = rng.standard_normal(n); out = np.zeros(n)
    for s_ in range(30):
        a = s_ * n // 30; b = (s_ + 1) * n // 30; fc = 300 + 7000 * (s_ / 30) ** 2
        out[a:b] = bp(x, fc * .7, min(fc * 1.4, 18000))[a:b]
    tone = np.sin(2 * np.pi * np.cumsum(200 + 900 * (t / len_) ** 2) / SR) * .15
    return (out * .4 + tone) * (t / len_) ** 2
def glitch():
    n = int(.35 * SR); x = np.sign(rng.standard_normal(n)) * (rng.random(n) > .6)
    return bp(x.astype(float), 800, 6000) * .25
def blip(f=1800, l=.08):
    n = int(l * SR); t = np.arange(n) / SR; return np.sin(2 * np.pi * f * t) * np.exp(-t * 40) * .25

for t0 in [13.95, 24.2, 40.85, 61.25, 67.65, 88.0, 111.6, 118.75, 137.8, 147.85, 154.3]:
    put(whoosh(), t0 - .45, .9, rng.uniform(-.5, .5))
put(riser(3.0), 31.85 - 3.0 + .2, .7)
put(impact(), 37.25, 1.0)
put(riser(2.6), 165.0 - 2.6, .75)
put(impact(), 165.05, 1.1)
put(impact(), 177.45, .9)
put(glitch(), 13.15, .9); put(glitch(), 12.4, .5)
put(impact()[: int(.9 * SR)] * .6, 159.75, 1.0)  # "çöpe atın"
# UI blips on key reveals
for t0, f in [(69.9, 1500), (71.85, 1900), (73.8, 1700), (76.3, 2100), (78.4, 1600), (80.4, 2300), (82.0, 1800), (84.6, 2000),
              (90.3, 1500), (100.3, 2200), (108.55, 1800), (172.2, 1400), (173.5, 1600), (174.9, 1800), (175.8, 2100)]:
    put(blip(f), t0, .8)

def norm(x, peak=.89): return x / (np.abs(x).max() + 1e-9) * peak
wavfile.write(os.path.join(ROOT, 'assets', 'music.wav'), SR, (norm(music) * 32767).astype(np.int16))
wavfile.write(os.path.join(ROOT, 'assets', 'sfx.wav'), SR, (norm(S) * 32767).astype(np.int16))
print('music + sfx written', DUR, 's')
