"""Word timings for audio/voice.wav without ASR: script phrases pinned to measured speech
segments (silencedetect -35 dB, 0.18 s), words spread inside a phrase by letter weight.
Phrase -> segment map checked by ear-free evidence: sentence pauses (>0.5 s) match the 6 sentences."""
import json, re
P = [  # (start, end, phrase) — from audio/segments.fine.json, regrouped on script punctuation
 (0.00, 0.82, "Gün bitiyor"), (0.97, 2.79, "ama zihnin hâlâ çalışıyor mu?"),
 (3.54, 4.45, "Yoğun tempo,"), (4.58, 5.20, "stres"), (5.30, 6.59, "ve yarım kalan uykular."),
 (7.35, 10.93, "Aşvaganda, yüzyıllardır kullanılan adaptojen bir bitki."),
 (11.54, 13.13, "Si Pi El Aşvaganda,"), (13.28, 14.15, "Ke Se Me altmış"),
 (14.26, 17.44, "altı kök ekstresiyle stresle başa çıkmana ve daha"),
 (17.60, 19.80, "dinlendirici bir uykuya destek olur."),
 (20.48, 23.36, "Altmış servis, günlük rutinine kolayca eklenir."),
 (23.91, 26.16, "Si Pi El Aşvaganda ile dengeni bul."),
]
script = open("audio/tts-spoken.txt", encoding="utf-8").read().split()
assert script == " ".join(p for _, _, p in P).split(), "phrases do not match the script"
wt = lambda w: max(2, len(re.sub(r"\W", "", w))) + (1.5 if w[-1] in ",.?!" else 0)
out = []
for a, b, ph in P:
    ws = ph.split(); tot = sum(wt(w) for w in ws); t = a
    for w in ws:
        d = (b - a) * wt(w) / tot; out.append({"w": w, "s": round(t, 3), "e": round(t + d, 3)}); t += d
json.dump(out, open("audio/words.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(len(out), "words, voice ends", out[-1]["e"])
