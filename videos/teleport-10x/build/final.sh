#!/usr/bin/env bash
# concat rendered parts + soundtrack -> renders/teleport-10x.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
ls renders/parts/part_*.mp4 | sort | sed "s|^|file '$PWD/|; s|$|'|" > renders/parts/list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i renders/parts/list.txt -i audio/mix.wav -c:v copy -c:a aac -b:a 192k -af "loudnorm=I=-16:TP=-1.5:LRA=14" -ar 48000 -movflags +faststart -shortest renders/teleport-10x-master.mp4
# delivery encode small enough for the repository (<100 MB)
ffmpeg -y -loglevel error -i renders/teleport-10x-master.mp4 -c:v libx264 -preset slow -b:v ${VBR:-1000k} -maxrate 2600k -bufsize 6000k -pix_fmt yuv420p -c:a copy -movflags +faststart renders/teleport-10x.mp4
ls -la renders/*.mp4
