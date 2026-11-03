#!/usr/bin/env bash
# Copies reproducible vendor files (git-ignored) into the scene.
set -e; cd "$(dirname "$0")/.."
A=scenes/main/assets; mkdir -p $A/vendor $A/fonts
cp node_modules/gsap/dist/gsap.min.js $A/vendor/
for f in fraunces/files/fraunces-latin-300 fraunces/files/fraunces-latin-ext-300 \
         nunito-sans/files/nunito-sans-latin-600 nunito-sans/files/nunito-sans-latin-ext-600 \
         nunito-sans/files/nunito-sans-latin-800 nunito-sans/files/nunito-sans-latin-ext-800 \
         dm-mono/files/dm-mono-latin-400 dm-mono/files/dm-mono-latin-ext-400; do
  cp node_modules/@fontsource/$f-normal.woff2 $A/fonts/; done
ffmpeg -y -v error -i assets/packshot.png -vf scale=1600:1600:flags=lanczos $A/packshot.png
