#!/usr/bin/env bash
# Copies reproducible vendor files (git-ignored) into the scene and prepares the real brand assets.
set -e; cd "$(dirname "$0")/.."
A=scenes/main/assets; mkdir -p $A/vendor $A/fonts $A/photos
cp node_modules/gsap/dist/gsap.min.js $A/vendor/
for f in inter/files/inter-latin-600 inter/files/inter-latin-ext-600 inter/files/inter-latin-700 inter/files/inter-latin-ext-700 \
         inter/files/inter-latin-800 inter/files/inter-latin-ext-800 \
         barlow-condensed/files/barlow-condensed-latin-700 barlow-condensed/files/barlow-condensed-latin-ext-700; do
  cp node_modules/@fontsource/$f-normal.woff2 $A/fonts/; done
cp assets/packshot.jpg $A/packshot.jpg                                   # user's real bottle photo, untouched
ffmpeg -y -v error -i assets/report.png -vf "scale=iw*2:ih*2:flags=lanczos" $A/report2x.png   # user's real report, 2x for the zoom
# representative photos: real ones go to assets/photos/p1..p4.jpg; otherwise stand-ins are drawn
for n in p1 p2 p3 p4; do
  if [ -f assets/photos/$n.jpg ]; then cp assets/photos/$n.jpg $A/photos/$n.jpg; else NEED=1; fi; done
[ -n "${NEED:-}" ] && python3 build/placeholders.py --missing-only || true
