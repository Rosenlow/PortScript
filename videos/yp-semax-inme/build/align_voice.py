"""Word timings without ASR for the ElevenLabs take (Çiçek, 33.96 s).
Phrases are pinned to measured speech segments (ffmpeg silencedetect -35 dB / 0.15 s, plus a 50 ms RMS
envelope); words are spread by letter weight inside each phrase.
Checks: the only segment that opens with /s/ (>95 % energy above 4 kHz) after 0 s is 19.28 s ("Semaks alan"),
so 17.64–18.86 is "Adı Bi Di En Ef" and the two short pauses at 15.46 / 16.18 fall inside "...rol oynuyor";
27.48 s opens with the /ʒ/ of "Janoşik" (32 %). Re-check this map for a new take."""
import json, re
P = [
 (0.15, 2.72, "Semaks verilen insanlarda ne değişti?"),
 (3.38, 7.84, "Bir araştırma ekibi, inme geçiren yüz on hastayı beş ay boyunca izledi."),
 (8.22, 11.08, "Kanda bir proteinin düzeyini ölçtüler."),
 (11.40, 12.12, "Bu protein,"),
 (12.22, 15.46, "sinir hücreleri arasındaki bağlantıların değişmesinde"),
 (15.79, 16.18, "rol"),
 (16.35, 17.19, "oynuyor."),
 (17.64, 18.86, "Adı Bi Di En Ef."),
 (19.28, 22.68, "Semaks alan grupta kandaki düzeyi yükseldi."),
 (23.08, 24.41, "Peki, bizim N-Asetil"),
 (24.76, 27.06, "Semaks numunemizde ne ölçüldü?"),
 (27.45, 31.58, "Janoşik saflığı yüzde doksan dokuz virgül iki yüz"),
 (31.82, 33.85, "otuz yedi olarak raporladı."),
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
