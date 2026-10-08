#!/usr/bin/env bash
# Renders 16 half-res stills across the Film composition and tiles them: out/stills/sheet.jpg
# Usage: bash scripts/contact-sheet.sh [frame frame ...]
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p out/stills
rm -f out/stills/c*.png
FRAMES=(${@:-0 120 230 280 330 390 440 500 560 620 700 760 830 900 990 1100})
i=0
for f in "${FRAMES[@]}"; do
  npx remotion still Film "out/stills/c$(printf %02d $i).png" --frame=$f --scale=0.5 --log=error >/dev/null 2>&1 &
  i=$((i + 1))
  (( i % 4 == 0 )) && wait
done
wait
ffmpeg -y -loglevel error -i out/stills/c%02d.png -vf "tile=4x$(( (i + 3) / 4 )):padding=4" -frames:v 1 out/stills/sheet.jpg && echo "sheet: ${FRAMES[*]}"
