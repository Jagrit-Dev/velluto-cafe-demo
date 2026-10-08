import { useCallback, useEffect, useRef, useState } from "react";
import { spareEvent } from "./film/engine";

/** The café playlist: plays in order, loops forever, crossfading between tracks. */
export const PLAYLIST = [
  { src: "/audio/cozy-corner.mp3", title: "Cozy Corner", artist: "Velluto Sessions" },
  { src: "/audio/window-seat.mp3", title: "Window Seat", artist: "Velluto Sessions" },
] as const;

const VOLUME = 0.8;
/** events browsers accept as the interaction that unlocks sound */
const GESTURES = ["pointerdown", "keydown", "touchend", "click"] as const;
const XFADE = 3; // seconds of overlap between tracks

/**
 * Background score. Deliberately independent of the film: it starts with the page, cycles
 * the playlist forever, and only the visitor's own click on the record player stops it.
 * Two <audio> elements ping-pong so each track crossfades into the next.
 */
export const useMusic = () => {
  const decks = useRef<HTMLAudioElement[]>([]);
  const active = useRef(0); // which deck holds the current track
  const wants = useRef(false); // what the visitor asked for (an element may still be mid-fade)
  const trackRef = useRef(0);
  const fading = useRef(false);
  const timers = useRef(new Map<HTMLAudioElement, number>());
  const [playing, setPlaying] = useState(false);
  const [available, setAvailable] = useState(true);
  const [track, setTrack] = useState(0);
  const [waiting, setWaiting] = useState(false); // on, but the browser is holding sound until a gesture

  // timer-driven (not rAF) so fades still finish in background tabs / minimised windows
  const fade = useCallback((a: HTMLAudioElement, to: number, ms: number, done?: () => void) => {
    window.clearInterval(timers.current.get(a));
    const from = a.volume;
    const start = performance.now();
    const id = window.setInterval(() => {
      const k = Math.min(1, (performance.now() - start) / ms);
      a.volume = from + (to - from) * k;
      if (k >= 1) {
        window.clearInterval(id);
        done?.();
      }
    }, 30);
    timers.current.set(a, id);
  }, []);

  /** Start the next track on the idle deck and crossfade into it. */
  const advance = useCallback(() => {
    if (fading.current) return;
    fading.current = true;
    const cur = decks.current[active.current];
    const nextDeck = 1 - active.current;
    const next = decks.current[nextDeck];
    const nextTrack = (trackRef.current + 1) % PLAYLIST.length;
    if (!next.src.endsWith(PLAYLIST[nextTrack].src)) load(next, nextTrack);
    next.currentTime = 0;
    next.volume = 0;
    active.current = nextDeck;
    trackRef.current = nextTrack;
    setTrack(nextTrack);
    next.play().catch(() => undefined);
    fade(next, VOLUME, XFADE * 1000);
    fade(cur, 0, XFADE * 1000, () => {
      cur.pause();
      // queue the track after this one on the deck that just went quiet
      load(cur, (nextTrack + 1) % PLAYLIST.length);
      fading.current = false;
    });
  }, [fade]);

  useEffect(() => {
    const ds = [0, 1 % PLAYLIST.length].map((index) => {
      const a = new Audio();
      a.preload = "auto";
      a.volume = 0;
      load(a, index);
      return a;
    });
    decks.current = ds;
    if (import.meta.env.DEV) (window as unknown as { __decks: HTMLAudioElement[] }).__decks = ds;
    const onError = (e: Event) => {
      // only give up on music if the current track itself is missing
      if (e.currentTarget === ds[active.current]) setAvailable(false);
    };
    const onTime = (e: Event) => {
      const a = e.currentTarget as HTMLAudioElement;
      if (a !== ds[active.current] || !wants.current || !Number.isFinite(a.duration)) return;
      if (a.duration - a.currentTime <= XFADE) advance();
    };
    const onEnded = (e: Event) => {
      // safety net if timeupdate was throttled past the crossfade window
      if (e.currentTarget === ds[active.current] && wants.current) advance();
    };
    ds.forEach((a) => {
      a.addEventListener("error", onError);
      a.addEventListener("timeupdate", onTime);
      a.addEventListener("ended", onEnded);
    });
    const t = timers.current;
    return () => {
      ds.forEach((a) => {
        a.pause();
        a.removeEventListener("error", onError);
        a.removeEventListener("timeupdate", onTime);
        a.removeEventListener("ended", onEnded);
      });
      t.forEach((id) => window.clearInterval(id));
    };
  }, [advance]);

  /*
   * Music is ON by default. Browsers refuse sound until the visitor interacts with the page,
   * so when that happens the player stays "on" but shows it is waiting (record out, not spinning,
 * "Tap for sound") and is *armed*: the
   * very first click, tap or key press anywhere starts the sound, without also stopping the
   * auto tour. Scrolling alone never counts as an interaction for browsers.
   */
  const armed = useRef(false);
  const userPaused = useRef(false);
  const unlockRef = useRef<(e: Event) => void>(() => undefined);
  const disarm = useCallback(() => {
    armed.current = false;
    setWaiting(false);
    GESTURES.forEach((ev) => window.removeEventListener(ev, unlockRef.current, true));
  }, []);

  const play = useCallback(
    (fromStart = false) => {
      const a = decks.current[active.current];
      if (!a) return;
      wants.current = true;
      setPlaying(true);
      if (fromStart) a.currentTime = 0;
      if (a.paused) a.volume = 0;
      a.play()
        .then(() => {
          disarm();
          fade(a, VOLUME, 1500);
        })
        .catch(() => {
          if (userPaused.current || !wants.current) return;
          // blocked until the visitor interacts: stay on, start at the first gesture
          armed.current = true;
          setWaiting(true);
          GESTURES.forEach((ev) => window.addEventListener(ev, unlockRef.current, true));
        });
    },
    [fade, disarm],
  );

  unlockRef.current = (e: Event) => {
    if (!armed.current) return;
    // a click on the record player is handled by its own toggle (which starts the sound)
    if ((e.target as Element | null)?.closest?.(".vinyl")) return;
    disarm();
    if (e.type === "pointerdown") spareEvent(e);
    play();
  };

  const pause = useCallback(() => {
    disarm();
    wants.current = false;
    fading.current = false; // an interrupted crossfade must not block the next one
    setPlaying(false); // the record stops and slides home right away; audio fades out under it
    decks.current.forEach((a) => {
      if (a.paused) return;
      fade(a, 0, 450, () => {
        if (!wants.current) a.pause();
      });
    });
  }, [fade, disarm]);

  const toggle = useCallback(() => {
    // still waiting for a first gesture: this click is it, so start the sound rather than stop
    if (armed.current) {
      disarm();
      play();
      return;
    }
    userPaused.current = wants.current;
    if (wants.current) pause();
    else play();
  }, [play, pause, disarm]);

  // start with the page
  useEffect(() => {
    play(true);
    return disarm;
  }, [play, disarm]);

  return { playing, waiting, available, play, pause, toggle, track: PLAYLIST[track], trackIndex: track };
};

const load = (a: HTMLAudioElement, index: number) => {
  a.src = PLAYLIST[index].src;
  a.load();
};

export type Music = ReturnType<typeof useMusic>;
