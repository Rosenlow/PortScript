"""Scratch word timings (NOT the real voice): spread the spoken text at ~2.05 words/s,
with pauses after punctuation. Used only until audio/voice.wav exists; marked scratch."""
import json, re, sys
text = open("audio/tts-spoken.txt", encoding="utf-8").read().split()
t, out = 0.25, []
for w in text:
    d = 0.16 + 0.055 * len(re.sub(r"\W", "", w))
    out.append({"w": w, "s": round(t, 2), "e": round(t + d, 2)})
    t += d + 0.04
    if w[-1] in ".?!": t += 0.38
    elif w[-1] == ",": t += 0.18
json.dump(out, open("audio/words.scratch.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(f"scratch end {out[-1]['e']} s, {len(out)} words")
