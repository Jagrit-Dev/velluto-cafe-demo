import { useCallback, useEffect, useRef, useState } from "react";
import { spareEvent } from "./film/engine";

/** The café playlist: plays in order, loops forever, crossfading between tracks. */
export const PLAYLIST = [
  { src: "/audio/cozy-corner.mp3", title: "Cozy Corner", artist: "Velluto Sessions" },
  { src: "/audio/window-seat.mp3", title: "Window Seat", artist: "Velluto Sessions" },
] as const;

const VOLUME = 0.8;
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

  /** Must be called from a user gesture (browsers block audible autoplay). */
  const play = useCallback(
    (fromStart = false) => {
      const a = decks.current[active.current];
      if (!a) return;
      wants.current = true;
      setPlaying(true);
      if (fromStart) a.currentTime = 0;
      if (a.paused) a.volume = 0;
      a.play()
        .then(() => fade(a, VOLUME, 900))
        .catch(() => {
          wants.current = false;
          setPlaying(false);
        });
    },
    [fade],
  );

  const pause = useCallback(() => {
    wants.current = false;
    fading.current = false; // an interrupted crossfade must not block the next one
    setPlaying(false); // the record stops and slides home right away; audio fades out under it
    decks.current.forEach((a) => {
      if (a.paused) return;
      fade(a, 0, 450, () => {
        if (!wants.current) a.pause();
      });
    });
  }, [fade]);

  const userPaused = useRef(false);
  const toggle = useCallback(() => {
    userPaused.current = wants.current;
    if (wants.current) pause();
    else play();
  }, [play, pause]);

  // Start with the page. Browsers usually block sound until the visitor interacts, so if the
  // first attempt is refused, the first click, tap or key press anywhere starts it instead
  // (without also stopping the auto tour). Scrolling alone doesn't count as a gesture.
  useEffect(() => {
    const events = ["pointerdown", "keydown", "touchend"] as const;
    const stop = () => events.forEach((ev) => window.removeEventListener(ev, unlock, true));
    const unlock = (e: Event) => {
      stop();
      // a click on the record player is handled by its own toggle
      if ((e.target as Element | null)?.closest?.(".vinyl")) return;
      if (wants.current || userPaused.current) return;
      if (e.type === "pointerdown") spareEvent(e);
      play();
    };
    const a = decks.current[active.current];
    wants.current = true;
    setPlaying(true);
    a.volume = 0;
    a.play()
      .then(() => fade(a, VOLUME, 1500))
      .catch(() => {
        if (userPaused.current) return;
        wants.current = false;
        setPlaying(false);
        events.forEach((ev) => window.addEventListener(ev, unlock, true));
      });
    return stop;
  }, [play, fade]);

  return { playing, available, play, pause, toggle, track: PLAYLIST[track], trackIndex: track };
};

const load = (a: HTMLAudioElement, index: number) => {
  a.src = PLAYLIST[index].src;
  a.load();
};

export type Music = ReturnType<typeof useMusic>;
