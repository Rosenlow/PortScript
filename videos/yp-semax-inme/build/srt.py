import json
def ts(t): h=int(t//3600); m=int(t%3600//60); s=t%60; return f"{h:02}:{m:02}:{int(s):02},{int(round((s%1)*1000)):03}"
for i, ch in enumerate(json.load(open("audio/captions.chunks.json", encoding="utf-8")), 1):
    print(i); print(ts(ch["s"]), "-->", ts(ch["e"])); print(" ".join(w["w"] for w in ch["words"])); print()
