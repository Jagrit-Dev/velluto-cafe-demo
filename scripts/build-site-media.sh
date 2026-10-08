#!/usr/bin/env bash
# Builds every media file the website needs from the Remotion renders.
# Run after `npm run render` + `npm run render:film` and C:\Jagrit Mondal\demos\scripts\export-web.ps1 -In out\hero.mp4
#   film-*.mp4   scroll-scrub cuts: short GOP (6) + no B-frames so any frame decodes fast on seek
#   film-portrait centre crop for phones (cup + steam stay in frame)
#   gallery/*    stills rendered losslessly by Remotion, then cropped
set -euo pipefail
cd "$(dirname "$0")/.."

M=site/public/media
G=$M/gallery
mkdir -p "$G" out/stills

cp out/web/hero.mp4 out/web/hero.webm out/web/hero-poster.jpg "$M/"

X=(-c:v libx264 -preset slow -tune animation -pix_fmt yuv420p -g 6 -keyint_min 6 -sc_threshold 0 -bf 0 -movflags +faststart -an)
ffmpeg -y -loglevel error -i out/film.mp4 -vf "scale=1920:-2:flags=lanczos" "${X[@]}" -crf 24 "$M/film-1080.mp4" &
ffmpeg -y -loglevel error -i out/film.mp4 -vf "scale=1280:-2:flags=lanczos" "${X[@]}" -crf 24 "$M/film-720.mp4" &
ffmpeg -y -loglevel error -i out/film.mp4 -vf "crop=720:1080:600:0" "${X[@]}" -crf 24 "$M/film-portrait.mp4" &
ffmpeg -y -loglevel error -i out/film.mp4 -frames:v 1 -q:v 3 "$M/film-poster.jpg" &

for f in 30 375 465 630 840 990; do
  npx remotion still Film "out/stills/g$f.png" --frame=$f --log=error >/dev/null &
done
wait

Q=(-frames:v 1 -q:v 4)
ffmpeg -y -loglevel error -i out/stills/g30.png  -vf "crop=760:1080:540:0,scale=640:-2:flags=lanczos"   "${Q[@]}" "$G/ritual-steam.jpg"
ffmpeg -y -loglevel error -i out/stills/g375.png -vf "crop=1920:860:0:110,scale=1200:-2:flags=lanczos"  "${Q[@]}" "$G/origin-cherries.jpg"
ffmpeg -y -loglevel error -i out/stills/g630.png -vf "crop=1080:1080:420:0,scale=720:-2:flags=lanczos"  "${Q[@]}" "$G/roast-drum.jpg"
ffmpeg -y -loglevel error -i out/stills/g840.png -vf "crop=1000:1000:420:80,scale=720:-2:flags=lanczos" "${Q[@]}" "$G/pour.jpg"
ffmpeg -y -loglevel error -i out/stills/g465.png -vf "crop=1080:1080:240:0,scale=720:-2:flags=lanczos"  "${Q[@]}" "$G/green-beans.jpg"
ffmpeg -y -loglevel error -i out/stills/g990.png -vf "crop=1000:560:430:330,scale=1200:-2:flags=lanczos" "${Q[@]}" "$G/rosetta.jpg"

ls -l "$M" "$G" | awk 'NF>4 {printf "%8.2f MB  %s\n", $5/1048576, $9}'
