#!/usr/bin/env bash
# Usage: build/from_voice.sh <voice.mp3>   — voice → timings → cues → render → mix → master MP4
set -euo pipefail; cd "$(dirname "$0")/.."
MF=${MF:-/home/user/aykutucesai/motionforge}
SRC="$1"
ffmpeg -y -v error -i "$SRC" -ar 48000 -ac 1 audio/voice.wav
python3 build/align_voice.py   # phrase map is specific to this take; re-check pauses for a new take
python3 build/make_cues.py audio/words.json
python3 build/srt.py > renders/captions.srt
END=$(cat audio/duration.txt)
# soft pad bed (generated locally, no licence needed): A–F–C–G, slow swells
python3 build/bed.py "$END" audio/bed.wav
ffmpeg -y -v error -i audio/voice.wav -i audio/bed.wav -filter_complex \
 "[0]apad=whole_dur=${END},asplit=2[v][key];[1]volume=-21dB[m];[m][key]sidechaincompress=threshold=0.04:ratio=6:attack=20:release=400[md];[v][md]amix=inputs=2:normalize=0[out]" \
 -map "[out]" -t "$END" -ar 48000 audio/mix-raw.wav
bash "$MF/tools/loudness.sh" normalize audio/mix-raw.wav audio/mix.wav -14 -1.5
(cd scenes/main && npx hyperframes render -q delivery -o ../../renders/scenes/main.mp4 --quiet)
ffmpeg -y -v error -i renders/scenes/main.mp4 -i audio/mix.wav -map 0:v -map 1:a -c:v libx264 -crf 18 -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest renders/cpl-ashwagandha-v1.mp4
bash "$MF/tools/loudness.sh" measure renders/cpl-ashwagandha-v1.mp4
