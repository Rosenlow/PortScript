"""Word timings without ASR: script phrases pinned to measured speech segments (silencedetect -35 dB / 0.15 s),
words spread by letter weight inside each phrase. Check: only the segments at 0.00 s ("Semaks") and 21.71 s
("sonrasını") open with /s/ (>95 % energy above 4.5 kHz); all others open with a vowel or /b/ (<5 %)."""
import json, re
P = [
 (0.10, 3.07, "Semaks sinir hücrelerini nasıl etkiliyor olabilir?"),
 (3.49, 10.06, "Bir sıçan çalışmasında, Semaks'tan sonra hipokampusta Bi Di En Ef proteini yüzde kırk kadar arttı."),
 (10.48, 14.94, "Yine sıçanlarda, reseptörü Trek Bi'nin aktivasyonu yüzde altmış arttı."),
 (15.37, 19.02, "Bu yol, nöron sağkalımı ve bağlantılarla ilişkilendiriliyor."),
 (19.40, 21.39, "Araştırmacılar bu iki adımı ölçtü,"),
 (21.71, 22.45, "sonrasını değil."),
 (22.92, 24.71, "Bu şişede ölçülen ise saflık:"),
 (25.02, 27.43, "Janoşik'te yüzde doksan dokuzun üzerinde."),
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
