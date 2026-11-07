"""Deterministic music bed + sound effects (generated here, no licence needed).
Usage: sound.py <seconds> <bed.wav> <sfx.wav>   — reads cue times from scenes/main/cues.js"""
import sys, wave, math, struct, json, re, random
dur, bed_out, sfx_out, sr = float(sys.argv[1]), sys.argv[2], sys.argv[3], 48000
C = json.loads(re.search(r"window.CUES = (\{.*?\});", open("scenes/main/cues.js", encoding="utf-8").read()).group(1))
n = int(dur * sr); rnd = random.Random(30)
def write(path, buf):
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, v)) * 32767)) for v in buf))
# --- bed: 104 bpm, dark pad until the product, then brighter pad + soft kick + offbeat shaker
bpm = 96; beat = 60 / bpm; bed = [0.0] * n
dark = [[110.0, 130.81, 164.81], [98.0, 123.47, 146.83]]
bright = [[220.0, 277.18, 329.63], [246.94, 311.13, 369.99], [196.0, 246.94, 293.66], [220.0, 277.18, 329.63]]
lp = 0.0
for i in range(n):
    t = i / sr
    if t < C["s3"]:
        ch = dark[int(t // (beat * 4)) % 2]; amp = 0.22
    else:
        ch = bright[int((t - C["s3"]) // (beat * 4)) % 4]; amp = 0.26
    v = sum(math.sin(2 * math.pi * f * t) + 0.4 * math.sin(2 * math.pi * f * 2.003 * t) for f in ch) / 5
    lp += 0.06 * (v - lp)
    fade = min(1.0, t / 0.4, max(0.0, (dur - t) / 1.2))
    bed[i] = lp * amp * fade
# kick + shaker after the product lands
t = C["s3"]
while t < dur - 0.3:
    k0 = int(t * sr)
    for j in range(int(0.18 * sr)):
        if k0 + j >= n: break
        tt = j / sr; f = 55 + 70 * math.exp(-tt * 30)
        bed[k0 + j] += 0.42 * math.sin(2 * math.pi * f * tt) * math.exp(-tt * 18)
    s0 = int((t + beat / 2) * sr)
    for j in range(int(0.05 * sr)):
        if s0 + j >= n: break
        bed[s0 + j] += 0.05 * (rnd.random() * 2 - 1) * math.exp(-j / sr * 80)
    t += beat
# --- sfx
sfx = [0.0] * n
def pop(at, f0=900, f1=420, d=0.09, a=0.55):
    s0 = int(at * sr)
    for j in range(int(d * sr)):
        if 0 <= s0 + j < n:
            tt = j / sr; f = f0 + (f1 - f0) * tt / d
            sfx[s0 + j] += a * math.sin(2 * math.pi * f * tt) * math.exp(-tt * 40)
def thump(at, a=0.9):
    s0 = int(at * sr)
    for j in range(int(0.35 * sr)):
        if 0 <= s0 + j < n:
            tt = j / sr; f = 48 + 90 * math.exp(-tt * 22)
            sfx[s0 + j] += a * math.sin(2 * math.pi * f * tt) * math.exp(-tt * 10) + 0.15 * (rnd.random() * 2 - 1) * math.exp(-tt * 60)
def whoosh(at, d=0.4, a=0.35):
    s0 = int((at - d) * sr); lpv = 0.0
    for j in range(int(d * sr)):
        if 0 <= s0 + j < n:
            p = j / (d * sr); lpv += (0.02 + 0.5 * p) * ((rnd.random() * 2 - 1) - lpv)
            sfx[s0 + j] += a * lpv * math.sin(math.pi * p) ** 1.5
thump(C["alma"] + 0.05, 0.8)
whoosh(C["s2"]); pop(C["semaks"] - 0.25, 700, 380)
whoosh(C["bagimsiz"] - 0.05, 0.3, 0.25)
thump(C["janosik"] - 0.06, 0.95); pop(C["test"], 1300, 900, 0.1)
for k in range(10): pop(C["yuzde"] - 0.1 + k * 0.1, 2200, 2000, 0.025, 0.25)
pop(C["yuzde"] + 0.6, 1200, 800, 0.1)
for k in range(12): pop(C["s4"] + 0.41 + k * 0.06, 3000, 2600, 0.015, 0.2)
pop(C["olculmus"] - 0.1, 800, 400, 0.12, 0.6); pop(C["s5"] + 0.3, 1200, 700)
write(bed_out, bed); write(sfx_out, sfx)
print("bed + sfx", dur, "s")
