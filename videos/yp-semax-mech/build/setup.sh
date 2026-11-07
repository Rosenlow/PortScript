#!/usr/bin/env bash
# Copies reproducible vendor files (git-ignored) into the scene, prepares images.
set -e; cd "$(dirname "$0")/.."
A=scenes/main/assets; mkdir -p $A/vendor $A/fonts
cp node_modules/gsap/dist/gsap.min.js $A/vendor/
for f in press-start-2p/files/press-start-2p-latin-400 press-start-2p/files/press-start-2p-latin-ext-400 \
         vt323/files/vt323-latin-400 vt323/files/vt323-latin-ext-400 \
         inter/files/inter-latin-600 inter/files/inter-latin-ext-600; do
  cp node_modules/@fontsource/$f-normal.woff2 $A/fonts/; done
cp assets/packshot.jpg $A/packshot.jpg
ffmpeg -y -v error -i assets/report.png -vf "crop=1110:108:124:1205" $A/report-results.png
ffmpeg -y -v error -i assets/report.png -vf "crop=1110:200:124:250" $A/report-head.png
