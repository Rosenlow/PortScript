"""Deterministic soft pad: four chords, detuned sines, slow attack/release, lowpassed. Usage: bed.py <seconds> <out.wav>"""
import sys, wave, math, struct
dur, out, sr = float(sys.argv[1]), sys.argv[2], 48000
chords = [[220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [261.63, 329.63, 392.0], [196.0, 246.94, 293.66]]
seg = 4.0; n = int(dur * sr); data = bytearray(); lp = 0.0
for i in range(n):
    t = i / sr; k = int(t // seg) % 4; ph = (t % seg) / seg
    env = math.sin(math.pi * ph) ** 0.6
    v = sum(math.sin(2*math.pi*f*t) + 0.5*math.sin(2*math.pi*f*1.003*t) for f in chords[k]) / 6
    v += 0.25 * math.sin(2*math.pi*chords[k][0]/2*t)
    lp += 0.08 * (v * env - lp)
    fade = min(1.0, t / 1.5, (dur - t) / 1.5)
    data += struct.pack("<h", int(max(-1, min(1, lp * 0.5 * fade)) * 32767))
with wave.open(out, "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(bytes(data))
