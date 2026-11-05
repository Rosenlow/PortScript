#!/usr/bin/env bash
# Copies reproducible vendor files (git-ignored) into the scene, prepares images.
set -e; cd "$(dirname "$0")/.."
A=scenes/main/assets; mkdir -p $A/vendor $A/fonts
cp node_modules/gsap/dist/gsap.min.js $A/vendor/
for f in barlow-condensed/files/barlow-condensed-latin-700 barlow-condensed/files/barlow-condensed-latin-ext-700 \
         barlow-condensed/files/barlow-condensed-latin-800 barlow-condensed/files/barlow-condensed-latin-ext-800 \
         inter/files/inter-latin-500 inter/files/inter-latin-ext-500 inter/files/inter-latin-700 inter/files/inter-latin-ext-700 \
         jetbrains-mono/files/jetbrains-mono-latin-500 jetbrains-mono/files/jetbrains-mono-latin-ext-500; do
  cp node_modules/@fontsource/$f-normal.woff2 $A/fonts/; done
cp assets/packshot.jpg $A/packshot.jpg
ffmpeg -y -v error -i assets/report.png $A/report.png
# crops of the report (1356x2000 source): results table, QR code
ffmpeg -y -v error -i assets/report.png -vf "crop=1110:160:124:1205" $A/report-results.png
ffmpeg -y -v error -i assets/report.png -vf "crop=96:96:630:1116,scale=288:288:flags=neighbor" $A/report-qr.png
