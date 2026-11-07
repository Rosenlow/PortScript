#!/usr/bin/env bash
# voice (light comp) + bed (sidechained, ~-24 dB under voice) + sfx -> audio/mix.wav at -14 LUFS / -1.5 dBTP
set -euo pipefail; cd "$(dirname "$0")/.."
END=$(cat audio/duration.txt)
python3 build/sound.py "$END" audio/bed.wav audio/sfx.wav
ffmpeg -y -v error -i audio/voice.wav -i audio/bed.wav -i audio/sfx.wav -filter_complex \
 "[0]acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120:makeup=2,apad=whole_dur=${END},asplit=2[v][key];\
  [1]volume=-17dB[m];[m][key]sidechaincompress=threshold=0.05:ratio=4:attack=30:release=500[md];\
  [2]volume=-3dB[fx];[v][md][fx]amix=inputs=3:normalize=0[out]" \
 -map "[out]" -t "$END" -ar 48000 audio/mix-raw.wav
ffmpeg -y -v error -i audio/mix-raw.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=summary -ar 48000 audio/mix.wav 2>&1 | tail -0
ffmpeg -v info -i audio/mix.wav -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I:|Peak:)" | tr -s ' '
