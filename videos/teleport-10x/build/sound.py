# Sound for "What If Every Teleport Took You 10x Farther?" - synthesised with numpy only.
# Rule of the mix: one dry click per jump (the same sample 28 times), location ambience that is cut by each jump,
# breath in space, a sparse pad that never swells on a jump, opens widest at the Milky Way reveal and is cut at the last press.
import numpy as np, wave, sys, os
SR = 48000; DUR = 600.0; N = int(SR * DUR); rng = np.random.default_rng(7)
JUMPS = [11, 29, 52, 70, 113, 141, 186, 211, 234, 261, 287, 308, 345, 363, 381, 402, 412, 424, 437, 466, 486, 506, 533, 551, 565, 580, 585, 596]
t = np.arange(N) / SR
def band(x, lo, hi, soft=0.25):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    m = 1 / (1 + (lo / np.maximum(f, 1e-3)) ** (2 / soft)) * 1 / (1 + (f / hi) ** (2 / soft)); return np.fft.irfft(X * m, len(x))
def env(points):  # piecewise-linear envelope from (time, value) pairs
    ts, vs = zip(*points); return np.interp(t, ts, vs)
def place(buf, s, at, gain=1.0, pan=0.0):
    i = int(at * SR); n = min(len(s), N - i)
    if n <= 0: return
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4); buf[0, i:i + n] += s[:n] * gain * l * 1.414; buf[1, i:i + n] += s[:n] * gain * r * 1.414
def reverb(x, secs=2.5, mix=0.3, seed=1):
    r = np.random.default_rng(seed); n = int(secs * SR); ir = r.standard_normal(n) * np.exp(-np.arange(n) / (secs * SR / 6.9)); ir = band(ir, 200, 6000); ir /= np.sqrt((ir ** 2).sum())
    L = len(x) + n; y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[:len(x)]; return x * (1 - mix) + y * mix
out = np.zeros((2, N))
# ---- click: dry, tiny, identical every time ----
n = int(0.035 * SR); tt = np.arange(n) / SR
click = (np.sin(2 * np.pi * 2900 * tt) * np.exp(-tt * 420) + 0.6 * np.sin(2 * np.pi * 1150 * tt) * np.exp(-tt * 260) + rng.standard_normal(n) * np.exp(-tt * 1500) * 0.5); click *= 0.62 / np.abs(click).max()
for T in JUMPS: place(out, click, T - 0.004, 1.0, 0.12)
# ---- ambience helpers ----
def horn(d=2.4, f0=118.0):
    n = int(d * SR); tt = np.arange(n) / SR; s = sum(np.sin(2 * np.pi * f0 * k * tt + 0.3 * k) / k ** 1.1 for k in range(1, 9)) + 0.6 * sum(np.sin(2 * np.pi * f0 * 1.26 * k * tt) / k ** 1.2 for k in range(1, 6))
    e = np.minimum(tt / 0.18, 1) * np.minimum((d - tt) / 0.5, 1); return s * e / 6
def gull(seed):
    r = np.random.default_rng(seed); parts = []
    for k in range(r.integers(2, 6)):
        d = r.uniform(0.18, 0.42); n = int(d * SR); tt = np.arange(n) / SR; f = r.uniform(1500, 2100) * (1 + 0.35 * np.sin(np.pi * tt / d)) * (1 - 0.25 * tt / d)
        ph = 2 * np.pi * np.cumsum(f) / SR; s = (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.25 * np.sin(3 * ph)) * np.sin(np.pi * tt / d) ** 1.5; parts += [s, np.zeros(int(r.uniform(0.05, 0.16) * SR))]
    return np.concatenate(parts) * 0.3
def chirps(seed, d=1.2):
    r = np.random.default_rng(seed); n = int(d * SR); s = np.zeros(n)
    for k in range(r.integers(3, 9)):
        dd = r.uniform(0.04, 0.09); m = int(dd * SR); tt = np.arange(m) / SR; f = r.uniform(3200, 5200) * (1 + r.uniform(-0.3, 0.3) * tt / dd); i = r.integers(0, n - m); s[i:i + m] += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / dd) ** 2
    return s * 0.2
noise = rng.standard_normal(N); noise2 = rng.standard_normal(N)
hum = band(noise, 40, 260); wind = band(noise2, 180, 1400) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.07 * t + 1) * np.sin(2 * np.pi * 0.023 * t)); sea = band(noise, 500, 5000) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.11 * t)) ** 2
hum /= hum.std(); wind /= wind.std(); sea /= sea.std()
# location envelopes (hard cuts at the jumps)
room = env([(0, 1), (28.99, 1), (29, 0), (600, 0)]); roofs = env([(0, 0), (28.99, 0), (29, 1), (51.99, 1), (52, 1.0), (69.99, 1.0), (70, 1.0), (112.99, 1.0), (113, 0), (600, 0)]); street = env([(0, 0), (112.99, 0), (113, 1), (140.99, 1), (141, 0), (600, 0)])
shore = env([(0, 0), (69.99, 0), (70, 1), (112.99, 1), (113, 0), (600, 0)])
amb = np.zeros((2, N))
for ch in range(2):
    sh = np.roll if ch else (lambda a, k: a)
    amb[ch] += room * (0.020 * hum + 0.006 * np.roll(wind, ch * 3111) + 0.004 * sea)
    amb[ch] += roofs * (0.030 * hum + 0.030 * np.roll(wind, ch * 5231) + 0.010 * sea + shore * 0.030 * np.roll(sea, ch * 911))
    amb[ch] += street * (0.045 * hum + 0.012 * np.roll(wind, ch * 1777))
ev = np.zeros((2, N))
h = reverb(band(horn(), 60, 900), 3.0, 0.45, 3)
place(ev, h, 1.6, 0.16, 0.35); place(ev, band(horn(1.3), 60, 700), 5.2, 0.10, 0.35); place(ev, h, 21.5, 0.08, 0.3)
hh = reverb(horn(2.6), 3.5, 0.4, 4); place(ev, hh, 33.0, 0.30, 0.4); place(ev, hh, 77.5, 0.34, -0.5); place(ev, reverb(horn(1.2, 140), 3, 0.5, 5), 95, 0.12, 0.6)
for i, (at, g, pan) in enumerate([(3.4, 0.05, 0.5), (9.0, 0.035, 0.6), (17, 0.03, 0.4), (24.5, 0.04, 0.5), (30.5, 0.16, -0.3), (36, 0.12, 0.6), (41, 0.2, -0.6), (47, 0.1, 0.2), (55, 0.14, 0.5), (61.5, 0.1, -0.4), (67, 0.07, 0.3), (71.5, 0.22, 0.5), (76, 0.17, -0.2), (84, 0.2, 0.7), (90, 0.12, -0.6), (97, 0.15, 0.1), (104, 0.18, -0.4), (109, 0.1, 0.5)]):
    place(ev, reverb(gull(100 + i), 1.2, 0.25, i), at, g, pan)
for i, at in enumerate([114.5, 117, 120.2, 123, 126.5, 129, 131.5, 135, 138]): place(ev, chirps(200 + i), at, 0.22, (-1) ** i * 0.6)
car = band(rng.standard_normal(int(7 * SR)), 90, 1800) * np.exp(-((np.arange(int(7 * SR)) / SR - 3.5) / 1.6) ** 2); place(ev, car, 121, 0.05, -0.2)
gate = env([(0, 1), (140.99, 1), (141, 0), (600, 0)])
for at in [29, 52, 70, 113]:  # an event that started before a jump does not ring on after it
    i = int(at * SR); ev[:, i:] *= 0;  # (events are placed in time order below again)
ev2 = np.zeros((2, N))
place(ev2, hh, 33.0, 0.30, 0.4); place(ev2, hh, 77.5, 0.34, -0.5); place(ev2, reverb(horn(1.2, 140), 3, 0.5, 5), 95, 0.12, 0.6)
for i, (at, g, pan) in enumerate([(30.5, 0.16, -0.3), (36, 0.12, 0.6), (41, 0.2, -0.6), (47, 0.1, 0.2), (55, 0.14, 0.5), (61.5, 0.1, -0.4), (65, 0.07, 0.3), (71.5, 0.22, 0.5), (76, 0.17, -0.2), (84, 0.2, 0.7), (90, 0.12, -0.6), (97, 0.15, 0.1), (104, 0.18, -0.4), (108, 0.1, 0.5)]): place(ev2, reverb(gull(100 + i), 1.2, 0.25, i), at, g, pan)
for i, at in enumerate([114.5, 117, 120.2, 123, 126.5, 129, 131.5, 135, 138]): place(ev2, chirps(200 + i), at, 0.22, (-1) ** i * 0.6)
place(ev2, car, 121, 0.05, -0.2)
cutm = np.ones(N)
for at in [52, 70, 113, 141]: i = int(at * SR); cutm[i - int(0.004 * SR):i] = 0
# events crossing a jump are muted from the jump on, per segment
seg = [29, 52, 70, 113, 141]
for a, bnd in zip(seg[:-1], seg[1:]):
    pass
ev2[:, int(141 * SR):] = 0
out += amb + ev + ev2 * gate
# ---- breath in space (only the breath and the click between 3:00 and 4:15) ----
ph = 2 * np.pi * t / 4.4; cyc = np.sin(ph); inh = np.clip(cyc, 0, 1) ** 1.3; exh = np.clip(-cyc, 0, 1) ** 0.8
br = band(rng.standard_normal(N), 350, 2600) * inh * 0.8 + band(rng.standard_normal(N), 200, 1500) * exh * 1.0
benv = env([(0, 0), (141, 0), (141.6, 1), (250, 1), (262, 0.75), (505, 0.6), (520, 0.35), (560, 0.5), (590, 0.7), (595.9, 0.8), (596, 0), (600, 0)])
br = br / np.abs(br).max() * 0.085 * benv; out[0] += br; out[1] += np.roll(br, 37) * 0.95
# ---- music: slow pad, absent for the first minute and for the first steps into space ----
def pad(freqs, a, d, amp=1.0, bright=1.0):
    n = int(d * SR); tt = np.arange(n) / SR; s = np.zeros((2, n))
    for k, f in enumerate(freqs):
        for det, pan in [(-0.25, -0.6), (0.2, 0.6), (0.0, 0.0)]:
            ff = f * 2 ** (det * 0.012) ; lfo = 1 + 0.25 * np.sin(2 * np.pi * (0.05 + 0.013 * k) * tt + k)
            v = (np.sin(2 * np.pi * ff * tt + k) + bright * 0.28 * np.sin(2 * np.pi * 2 * ff * tt) + bright * 0.10 * np.sin(2 * np.pi * 3 * ff * tt + 1)) * lfo / (1 + k * 0.25)
            s[0] += v * np.cos((pan + 1) * np.pi / 4); s[1] += v * np.sin((pan + 1) * np.pi / 4)
    e = np.minimum(tt / (d * 0.35), 1) * np.minimum((d - tt) / (d * 0.4), 1); e = e * e * (3 - 2 * e); s *= e * amp / (3 * len(freqs))
    i = int(a * SR); m = min(n, N - i); mus[:, i:i + m] += s[:, :m]
mus = np.zeros((2, N)); A = 110.0
D2, A2, D3, F3, A3, C4, E4, G4, D4, Bb2, F2, C3, Bb3, F4, A4, C5, E5, D5 = [A * 2 ** (x / 12) for x in (-19, -12, -7, -4, 0, 3, 7, 10, 5, -23, -28, -9, 1, 8, 12, 15, 19, 17)]
chords = [[D2, A2, D3, F3, C4], [Bb2, F3, Bb3, D4], [F2, C3, F3, A3, E4], [A2 / 2 * 2, C3, G4 / 2, E4]]
# 1:02-2:21  quiet bed under the hesitation and the crossing (cut by the jump into space)
for i, a in enumerate(np.arange(62, 141, 13.0)): pad(chords[i % 4], a, 20, 0.5, 0.6)
mus[:, int(141 * SR):] = 0
# 4:15 onwards: returns thin, grows by distance travelled rather than by jump
for i, a in enumerate(np.arange(255, 596, 13.0)):
    g = np.interp(a, [255, 330, 400, 460, 500, 512], [0.35, 0.5, 0.6, 0.7, 0.75, 0.8]) if a < 512 else np.interp(a, [512, 545, 575, 596], [1.0, 0.75, 0.6, 0.55])
    pad(chords[i % 4], a, 21, g * 1.5, 0.5 + 0.5 * g)
# the widest opening: the whole Milky Way comes into view (8:34-8:47)
pad([D2 / 2, D2, A2, D3, F3, A3, C4, E4, A4], 512, 30, 2.3, 1.2); pad([F4, A4, C5, E5], 515, 24, 1.1, 0.8); pad([D4, A4, D5, E5 * 1.0], 519, 20, 0.9, 0.7)
mus = np.stack([reverb(mus[0], 4.5, 0.5, 11), reverb(mus[1], 4.5, 0.5, 12)]); mus = np.stack([band(mus[0], 45, 7000), band(mus[1], 45, 7000)])
mus[:, int(141 * SR):int(255 * SR)] *= np.exp(-np.arange(int(114 * SR)) / (0.02 * SR))      # the reverb tail does not survive the jump into space
mus[:, int(596 * SR) - 96:] = 0                                                              # cut on the last press
out += mus * 0.5 / max(np.abs(mus).max(), 1e-9) * 1.0
# ---- master ----
out[:, int(596.05 * SR):] = 0
peak = np.abs(out).max(); out = out / peak * 0.89
fade = np.minimum(t / 0.4, 1); out *= fade
pcm = (out.T * 32767).astype('<i2'); dst = sys.argv[1] if len(sys.argv) > 1 else 'audio/mix.wav'; os.makedirs(os.path.dirname(dst), exist_ok=True)
with wave.open(dst, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('wrote', dst, 'peak', peak)
