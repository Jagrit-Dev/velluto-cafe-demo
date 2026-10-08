# 01 — Velluto Coffee Atelier

A fictional specialty café, told as one scroll-driven film. *Slow coffee, poured like velvet.*

Two projects in one repo: the **film** (Remotion, at the root) renders the video, and the
**website** (`site/`) plays it. The site never needs Remotion at build time; the rendered
media is committed in `site/public/`.

```
Demo project 1/
  package.json         Remotion project (film) + shortcuts: npm run dev / build -> site/
  src/                 Remotion + three.js: Velluto3D.tsx, three/, Root.tsx (two cuts)
  remotion.config.ts   render settings (GPU via ANGLE)
  scripts/             build-site-media.sh  -> encodes everything the site needs
  out/                 renders (gitignored): hero.mp4, film.mp4, web/
  assets-src/          audio masters (WAVs gitignored)
  site/                Vite + React website (deploy this folder)
  MUSIC-PROMPT.md      Google Flow prompt + playlist notes
```

## The film (real 3D: Remotion + three.js)

| Composition | Length | Use |
|---|---|---|
| `HeroLoop` | 10 s · 300 f · 1920×1080 | Seamless loop with brand type and all 3D words: portfolio / hero |
| `Film` | 40 s · 1200 f · 1920×1080 | Same camera move slowed 4×, drives the website |

One continuous camera move through one 3D world (`site/src/scene/camera.ts`, shared with the website):
orbit a lathe-modelled porcelain cup (gold rim, live-drawn crema + rosetta texture, shader steam) →
crane up through volumetric mist into floating glossy cherries and leaves ("Origin" set in the world) →
cherries pop into sculpted green beans that sweep into a spinning, rolling tunnel of 360 roasting beans
with sparks and ember light → bean burst + white-out cut on the bar line → top-down pour (espresso,
then milk drawing the rosetta) → orbit back to the exact opening frame. Bloom, depth of field and ACES
tone mapping via postprocessing. Beats land on 96 BPM bar lines in the 40 s cut.

```
src/Velluto3D.tsx      ThreeCanvas, post FX, cut flash, HeroLoop typography
src/three/World.tsx    lights, fog, cup, liquid, stream, steam, mist, cherries, beans, sparks, 3D type
src/three/geometry.ts  lathe cup/saucer, swept handle, sculpted bean, cherry, leaf
src/three/textures.ts  crema + latte art canvas, steam/mist GLSL, sprites
```

```powershell
npm run studio        # preview at localhost:3000
npm run render        # out/hero.mp4  (~40 s on the RTX 3050, GPU via ANGLE)
npm run render:film   # out/film.mp4  (~2 min)
& "C:\Jagrit Mondal\demos\scripts\export-web.ps1" -In out\hero.mp4
bash scripts/build-site-media.sh   # film cuts + gallery stills -> site/public/media
bash scripts/contact-sheet.sh      # 16-frame art-direction sheet -> out/stills/sheet.jpg
```

## The website (`site/`)

The page is the film. A fixed full-screen `<video>` sits under every section:

- **Auto tour (default).** No splash screen: the page opens on the hero, the film downloads into memory,
  then plays at 1× and drives the page scroll so panels arrive on their beats. It stops at the end of the
  page and stays there.
- **Take the wheel.** Any wheel, touch, key or click pauses the tour; from then on scroll position scrubs
  the film frame by frame (piecewise mapping from chapter anchors to film timestamps).
- **Music is independent.** It starts with the page and loops forever; only the visitor's click on the
  record player stops it. Browsers usually block sound until a gesture, so if autoplay is refused the first
  click, tap or key press anywhere starts it (that click doesn't stop the tour).
- The film is downloaded whole into memory (blob URL) so every seek is instant; short-GOP encodes
  (keyframe every 6 frames, no B-frames) keep decoding cheap. Phones in portrait get a centre-cropped cut.
- **Motion layer** (`site/src/film/motion.ts` + `motion.css`): HTML callouts pinned to 3D points using the
  film's own camera maths; panels drift against the camera orbit, bank with its roll and fly past the
  lens on exit; pointer parallax across video, labels and type; kinetic word-by-word 3D headlines;
  scroll-turned 3D gallery ring; velocity-reactive marquee; tilting menu card; custom cursor.
- Reduced motion: no eased scrubbing, no grain, no decorative animation.

Media budget: film 12.0 MB (1080p) / 6.9 MB (720p) / 6.2 MB (portrait); hero loop 3.1 MB mp4 / 2.2 MB webm.

```bash
cd site
npm install
npm run dev        # localhost:5173  (or `npm run dev` from the repo root)
npm run build      # site/dist/
```

## Music

A two-track café playlist (Google Flow): `site/public/audio/cozy-corner.mp3` then `window-seat.mp3`,
looping forever with a 3 s crossfade, independent of the tour. Masters live in `assets-src/` (gitignored).
Each is trimmed at its silent tail, loudness-matched to -16 LUFS, 1.2 s fade-out, 192 kbps.
The record-player toggle (bottom right) shows the current track; edit `PLAYLIST` in `site/src/music.ts`.

## Deploy to Vercel

`site/` is self-contained (`vercel.json` sets the Vite framework, `dist` output and immutable caching
for `/media`, `/audio`, `/assets`).

- **Git:** push the repo, import it in Vercel, set **Root Directory = `site`**. Defaults do the rest.
- **CLI:** `cd site && npx vercel` (preview) then `npx vercel --prod`.

The media files are committed under `site/public/media`, so no build step needs ffmpeg or Remotion.
