"""Word timings without ASR: script phrases pinned to measured speech segments
(silencedetect -35 dB / 0.15 s), words spread by letter weight inside each phrase.
Evidence: segments at 8.05 s and 15.14 s open with /s/ (>98 % energy above 4.5 kHz) = "Si Pi El";
the [sighs] breath is 3.55-4.25 s (unvoiced), words resume at 4.25 s."""
import json, re
P = [
 (0.00, 3.09, "Akşam yemeğinden sonra yine buzdolabının önünde misin?"),
 (4.25, 6.46, "Tatlı krizleri, ara öğünler,"),
 (6.62, 7.64, "bitmeyen iştah."),
 (8.05, 9.24, "Si Pi El Termoksin,"),
 (9.59, 13.62, "iştah kontrolüne ve yağ yakımına destek olan formülüyle tam senin için."),
 (13.99, 14.85, "Otuz servis."),
 (15.14, 17.55, "Si Pi El Termoksin ile kontrol sende."),
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
