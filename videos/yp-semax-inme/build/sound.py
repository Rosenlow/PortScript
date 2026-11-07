"""Deterministic documentary bed + sound effects (synthesised here, no licence needed).
Usage: sound.py <seconds> <bed.wav> <sfx.wav>  — reads cue times from scenes/main/cues.js
SFX: glass tube touching the stand (0.06 s), soft air at the label-to-label cut, paper sheet at the report."""
import sys, wave, math, struct, json, re, random
import numpy as np
dur, bed_out, sfx_out, sr = float(sys.argv[1]), sys.argv[2], sys.argv[3], 48000
C = json.loads(re.search(r"window.CUES = (\{.*?\});", open("scenes/main/cues.js", encoding="utf-8").read()).group(1))
n = int(dur * sr); t = np.arange(n) / sr; rng = np.random.default_rng(7)
def write(path, x):
    x = np.clip(x, -1, 1); w = wave.open(path, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((x * 32767).astype("<i2").tobytes()); w.close()
def onepole(x, a):                                   # simple low-pass
    y = np.empty_like(x); s = 0.0
    for i, v in enumerate(x): s += a * (v - s); y[i] = s
    return y
# --- bed: slow, airy pad (Am9 -> Fmaj7 -> Cadd9 -> G6), quiet, brighter after the product cut
chords = [[110.0, 164.81, 246.94, 261.63], [87.31, 130.81, 220.0, 164.81], [130.81, 196.0, 293.66, 329.63], [98.0, 146.83, 246.94, 164.81]]
seg = 4.5; bed = np.zeros(n)
for k in range(int(dur / seg) + 2):
    a0 = k * seg - 0.8; ch = chords[k % 4]
    m = (t >= a0) & (t < a0 + seg + 1.6); tt = t[m] - a0
    env = np.clip(tt / 1.2, 0, 1) * np.clip((seg + 1.6 - tt) / 1.6, 0, 1)
    v = sum(np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * f * 2.004 * tt + 0.3) for f in ch) / len(ch)
    bed[m] += v * env
bed = onepole(bed, 0.05) * 0.5
bed *= np.clip(t / 0.6, 0, 1) * np.clip((dur - t) / 1.8, 0, 1) * np.where(t < C["prod"], 0.8, 1.0)
# --- sfx
sfx = np.zeros(n)
def add(at, x):
    s0 = int(at * sr); e = min(n, s0 + len(x))
    if s0 < n: sfx[max(0, s0):e] += x[max(0, -s0):e - s0]
def clink(at, a=0.5):                                # small glass tap: inharmonic partials, fast decay
    tt = np.arange(int(0.6 * sr)) / sr
    x = sum(g * np.sin(2 * np.pi * f * tt) * np.exp(-tt * d) for f, g, d in [(2650, 1, 9), (4120, .6, 14), (5830, .45, 20), (7710, .3, 28), (1630, .25, 12)])
    x += 0.4 * rng.standard_normal(len(tt)) * np.exp(-tt * 400)
    add(at, a * x / 2.6)
def air(at, d=0.5, a=0.18):                          # soft breath of air for the white-label cut
    m = int(d * sr); x = onepole(rng.standard_normal(m), 0.08); p = np.linspace(0, 1, m)
    add(at, a * x * np.sin(np.pi * p) ** 2 * 3)
def paper(at, a=0.5):                                # sheet lifted / laid open: band-limited noise with crackle grains
    m = int(0.75 * sr); tt = np.arange(m) / sr
    nz = rng.standard_normal(m); hp = nz - onepole(nz, 0.25); body = onepole(hp, 0.6)
    env = np.clip(tt / 0.04, 0, 1) * np.exp(-tt * 4.5) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * tt) ** 2)
    x = body * env
    for g in rng.uniform(0.0, 0.45, 26):             # crackle
        s = int(g * sr); L = int(0.006 * sr); x[s:s + L] += rng.standard_normal(L) * np.exp(-np.arange(L) / (0.0015 * sr)) * 0.7 * np.exp(-g * 3)
    add(at, a * x)
clink(0.06, 0.55); clink(0.19, 0.16)                 # tube touches the stand, tiny settle
air(C["prod"] + 0.05)
paper(C["report"] - 0.02, 0.5)
write(bed_out, bed); write(sfx_out, sfx)
print("bed + sfx", dur, "s")
