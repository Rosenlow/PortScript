"""Word timings without ASR: script phrases pinned to speech segments (silencedetect -35 dB / 0.15 s),
words spread by letter weight inside each phrase. 6 segments = 5 sentences, the last split at its colon."""
import json, re
P = [
 (0.00, 2.78, "Saflığından emin olmadığın bir peptit alma."),
 (3.11, 7.27, "Yang Farma En Asetil Semaks, bağımsız laboratuvar Janoşik'te test edildi."),
 (7.59, 9.98, "Saflık: yüzde doksan dokuzun üzerinde."),
 (10.25, 11.47, "Raporu kendin doğrula."),
 (11.77, 12.48, "Yang Farma:"),
 (12.78, 13.73, "ölçülmüş kalite."),
]
script = open("audio/tts-spoken.txt", encoding="utf-8").read().split()
assert script == " ".join(p for _, _, p in P).split(), "phrases do not match the script"
wt = lambda w: max(2, len(re.sub(r"\W", "", w))) + (1.5 if w[-1] in ",.?!:" else 0)
out = []
for a, b, ph in P:
    ws = ph.split(); tot = sum(wt(w) for w in ws); t = a
    for w in ws:
        d = (b - a) * wt(w) / tot; out.append({"w": w, "s": round(t, 3), "e": round(t + d, 3)}); t += d
json.dump(out, open("audio/words.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(len(out), "words, voice ends", out[-1]["e"])
