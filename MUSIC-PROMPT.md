# Velluto — music brief (Google Flow)

The site plays a looping café playlist that is independent of the film (it is not synced to
any scene). Current tracks, in order, crossfading into each other forever:

| # | Title | File |
|---|---|---|
| 01 | Cozy Corner | `site/public/audio/cozy-corner.mp3` |
| 02 | Window Seat | `site/public/audio/window-seat.mp3` |

## Prompt used for the tracks

```
Wholesome café lo-fi instrumental. Warm, cozy, unhurried, around 80 BPM. Soft felt piano and
mellow Rhodes chords, warm upright bass, gentle brushed drums with a dusty kick, light vinyl
crackle, a little nylon guitar and soft rain-window ambience. Jazzy seventh chords, no sudden
drops or build-ups, nothing that grabs attention: background music for a quiet specialty
coffee shop in the late afternoon. No vocals. Clean ending.
```

## Adding or replacing a track

1. Put the master WAV in `assets-src/` (gitignored).
2. Encode it loudness-matched to the others:

   ```bash
   ffmpeg -i assets-src/new-track.wav -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:a libmp3lame -b:a 192k site/public/audio/new-track.mp3
   ```

3. Add it to `PLAYLIST` in `site/src/music.ts`.
