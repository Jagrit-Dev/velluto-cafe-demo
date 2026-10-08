import { FILM_DURATION } from "../content";

/*
 * The page IS the film. Two directions of control:
 *   auto   -> the <video> plays at 1x (in sync with the music) and drives window scroll
 *   manual -> the user scrolls and the scroll position scrubs the video frame by frame
 * Any wheel / touch / key / click from the user drops auto into manual. Music is not
 * owned here: it keeps looping on its own controller.
 */

export type Mode = "idle" | "auto" | "manual" | "ended";

export type Snapshot = { mode: Mode; chapter: number };

type Anchor = { y: number; t: number };

const NAV_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Spacebar"]);
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export class FilmEngine {
  readonly video: HTMLVideoElement;
  private snap: Snapshot = { mode: "idle", chapter: 0 };
  private listeners = new Set<() => void>();
  private anchors: Anchor[] = [{ y: 0, t: 0 }];
  private chapters: HTMLElement[] = [];
  /** non-chapter scroll scenes that only need their own --sp (e.g. the stripe doors) */
  private scenes: HTMLElement[] = [];
  private raf = 0;
  private shown = 0; // the film time currently on screen
  private clockT = 0;
  private clockAt = 0;
  private lastVideoT = -1;
  private lastNow = 0;
  private timeEls = new Set<HTMLElement>();
  private progressEls = new Set<HTMLElement>();
  /** Per-frame subscribers (motion rig, 3D labels): receive film time and frame delta. */
  readonly paintHooks = new Set<(t: number, dt: number) => void>();
  private reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  constructor(video: HTMLVideoElement) {
    this.video = video;
    video.addEventListener("ended", () => this.finish());
    for (const ev of ["wheel", "touchstart"] as const) window.addEventListener(ev, this.interrupt, { passive: true });
    window.addEventListener("keydown", this.onKey);
    window.addEventListener("pointerdown", this.onPointer, { passive: true });
    window.addEventListener("resize", this.measure);
    new ResizeObserver(this.measure).observe(document.body);
    this.raf = requestAnimationFrame(this.tick);
  }

  get duration() {
    return Number.isFinite(this.video.duration) && this.video.duration > 0 ? this.video.duration : FILM_DURATION;
  }

  /* ---------- store for React ---------- */

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getSnapshot = () => this.snap;
  private set(patch: Partial<Snapshot>) {
    const next = { ...this.snap, ...patch };
    if (next.mode === this.snap.mode && next.chapter === this.snap.chapter) return;
    this.snap = next;
    this.listeners.forEach((l) => l());
  }

  /** Elements whose text becomes the running timecode / whose --film-progress tracks the film. */
  bindTime = (el: HTMLElement | null) => {
    if (el) this.timeEls.add(el);
  };
  bindProgress = (el: HTMLElement | null) => {
    if (el) this.progressEls.add(el);
  };

  /* ---------- scroll <-> time mapping ---------- */

  measure = () => {
    this.chapters = Array.from(document.querySelectorAll<HTMLElement>("[data-film-t]"));
    this.scenes = Array.from(document.querySelectorAll<HTMLElement>("[data-progress]"));
    const vh = window.innerHeight;
    const max = Math.max(1, document.documentElement.scrollHeight - vh);
    const anchors = this.chapters.map((el, i) => ({
      y: i === 0 ? 0 : clamp(el.getBoundingClientRect().top + window.scrollY - vh * 0.3, 0, max),
      t: Number(el.dataset.filmT),
    }));
    anchors.push({ y: max, t: this.duration });
    for (let i = 1; i < anchors.length; i++) anchors[i].y = Math.max(anchors[i].y, anchors[i - 1].y + 1);
    this.anchors = anchors;
  };

  scrollToTime(y: number) {
    const a = this.anchors;
    if (y <= a[0].y) return a[0].t;
    for (let i = 0; i < a.length - 1; i++) {
      if (y <= a[i + 1].y) return a[i].t + ((y - a[i].y) / (a[i + 1].y - a[i].y)) * (a[i + 1].t - a[i].t);
    }
    return a[a.length - 1].t;
  }

  timeToScroll(t: number) {
    const a = this.anchors;
    if (t <= a[0].t) return a[0].y;
    for (let i = 0; i < a.length - 1; i++) {
      if (t <= a[i + 1].t) return a[i].y + ((t - a[i].t) / (a[i + 1].t - a[i].t)) * (a[i + 1].y - a[i].y);
    }
    return a[a.length - 1].y;
  }

  anchorFor(index: number) {
    return this.anchors[index]?.y ?? 0;
  }

  /* ---------- transport ---------- */

  play = () => {
    this.measure();
    let t = this.scrollToTime(window.scrollY);
    if (t >= this.duration - 0.05) {
      t = 0;
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    this.video.currentTime = t;
    this.clockT = t;
    this.clockAt = performance.now();
    this.lastVideoT = t;
    this.set({ mode: "auto" });
    this.video.play().catch(() => {
      // a tab opened in the background may not start video yet: begin the tour once it's seen
      if (document.hidden && this.snap.mode === "auto") {
        this.set({ mode: "idle" });
        document.addEventListener("visibilitychange", () => this.snap.mode === "idle" && this.play(), { once: true });
      } else this.set({ mode: "manual" });
    });
  };

  pause = () => {
    if (this.snap.mode !== "auto") return;
    this.video.pause();
    this.shown = this.video.currentTime;
    this.set({ mode: "manual" });
  };

  /** Manual exploration (no auto tour), e.g. when the visitor scrolled before the film loaded. */
  explore = () => this.set({ mode: "manual" });

  goTo = (index: number) => {
    this.pause();
    if (this.snap.mode === "idle" || this.snap.mode === "ended") this.set({ mode: "manual" });
    this.measure();
    const el = this.chapters[index];
    const top = index === 0 || !el ? 0 : el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: this.reduced ? "instant" : "smooth" });
  };

  private finish() {
    if (this.snap.mode !== "auto") return;
    this.video.pause();
    this.shown = this.duration;
    // `ended` can fire while rAF is throttled (hidden tab), so land on the last frame explicitly
    window.scrollTo({ top: this.timeToScroll(this.duration), behavior: "instant" });
    this.set({ mode: "ended" });
  }

  private interrupt = (e: Event) => {
    if ((e.target as Element | null)?.closest?.("[data-tour-ui]")) return;
    this.pause();
  };
  private onKey = (e: KeyboardEvent) => {
    if (NAV_KEYS.has(e.key)) this.pause();
  };
  private onPointer = (e: PointerEvent) => {
    if (spared.has(e) || (e.target as Element | null)?.closest?.("[data-tour-ui]")) return;
    this.pause();
  };

  /* ---------- frame loop ---------- */

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick);
    const v = this.video;
    const mode = this.snap.mode;
    const dt = Math.min(0.5, (now - (this.lastNow || now)) / 1000);
    this.lastNow = now;

    if (mode === "auto") {
      // currentTime only advances per decoded frame; extrapolate between frames so scroll is silky
      if (v.currentTime !== this.lastVideoT) {
        this.lastVideoT = v.currentTime;
        this.clockT = v.currentTime;
        this.clockAt = now;
      }
      const t = Math.min(this.clockT + ((now - this.clockAt) / 1000) * v.playbackRate, v.currentTime + 0.07);
      this.shown = t;
      window.scrollTo({ top: this.timeToScroll(t), behavior: "instant" });
      if (t >= this.duration - 0.03) this.finish();
    } else if (mode !== "idle") {
      const target = this.scrollToTime(window.scrollY);
      // after the tour ends, scrolling back into the page hands control back to the visitor
      if (mode === "ended" && target < this.duration - 0.25) this.set({ mode: "manual" });
      // frame-rate independent easing: ~90% of the way in 0.22s on any refresh rate
      const k = this.reduced ? 1 : 1 - Math.exp(-dt * 10.5);
      this.shown += (target - this.shown) * k;
      if (Math.abs(target - this.shown) < 0.002) this.shown = target;
      if (!v.seeking && v.readyState >= 1 && Math.abs(v.currentTime - this.shown) > 1 / 60) {
        v.currentTime = this.shown;
      }
    }

    this.paint(dt);
  };

  private paint(dt: number) {
    const vh = window.innerHeight;
    let active = 0;
    this.chapters.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const sp = clamp((vh - r.top) / (r.height + vh), 0, 1);
      // --vis: panel visibility for pinned chapters (in while pinned, out before un-pinning)
      const enter = smooth(0.1, 0.3, sp);
      const exit = smooth(0.66, 0.86, sp);
      const vis = enter * (1 - exit);
      el.style.setProperty("--sp", sp.toFixed(4));
      el.style.setProperty("--vis", vis.toFixed(4));
      el.style.setProperty("--in", enter.toFixed(4));
      el.style.setProperty("--out", exit.toFixed(4));
      if (r.top < vh * 0.5) active = i;
    });
    this.set({ chapter: active });
    this.scenes.forEach((el) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--sp", clamp((vh - r.top) / (r.height + vh), 0, 1).toFixed(4));
    });

    const t = clamp(this.shown, 0, this.duration);
    const label = `${fmt(t)} / ${fmt(this.duration)}`;
    this.timeEls.forEach((el) => {
      if (el.textContent !== label) el.textContent = label;
    });
    const prog = (t / this.duration).toFixed(4);
    this.progressEls.forEach((el) => el.style.setProperty("--film-progress", prog));
    this.paintHooks.forEach((h) => h(t, dt));
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    for (const ev of ["wheel", "touchstart"] as const) window.removeEventListener(ev, this.interrupt);
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("pointerdown", this.onPointer);
    window.removeEventListener("resize", this.measure);
  }
}

const fmt = (t: number) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(1).padStart(4, "0")}`;
};

/** Pick the film variant for this screen. Portrait phones get a centre-cropped cut. */
const spared = new WeakSet<Event>();
/** Mark a pointer event as not meant to take the wheel (e.g. the click that unlocks audio). */
export const spareEvent = (e: Event) => void spared.add(e);

export const pickFilmSource = () => {
  const portrait = window.matchMedia("(max-aspect-ratio: 4/5)").matches;
  if (portrait) return "/media/film-portrait.mp4";
  const px = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2);
  return px > 1400 ? "/media/film-1080.mp4" : "/media/film-720.mp4";
};

/**
 * Download the whole film into memory so every seek is instant (scroll-scrub needs it,
 * Safari especially). Reports progress; falls back to streaming if it stalls.
 */
export const loadFilm = async (url: string, onProgress: (p: number) => void, timeoutMs = 15000) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok || !res.body) throw new Error(String(res.status));
    const total = Number(res.headers.get("content-length")) || 0;
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      onProgress(total ? got / total : Math.min(0.95, got / 12e6));
    }
    onProgress(1);
    return URL.createObjectURL(new Blob(chunks as BlobPart[], { type: "video/mp4" }));
  } catch {
    onProgress(1);
    return url; // stream instead; scrubbing is a little less instant but everything still works
  } finally {
    clearTimeout(timer);
  }
};
