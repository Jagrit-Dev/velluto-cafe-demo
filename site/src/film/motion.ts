import { ANCHORS, cameraAt, project } from "../scene/camera";
import { FILM_DURATION } from "../content";
import type { FilmEngine } from "./engine";

/*
 * Makes the page move like it lives inside the film.
 *  --mx/--my       eased pointer position (-1..1)        -> depth parallax on every layer
 *  --cx/--cy       cursor position (px, eased)            -> custom cursor
 *  --cam-vx        camera orbit speed (deg/s, eased)      -> panels drift + swing against the orbit
 *  --cam-roll      camera roll (deg)                      -> type banks with the camera in the tunnel
 *  --vel           scroll velocity (k px/s, eased)        -> skew / stretch on fast scroll
 * plus 3D-pinned labels: HTML projected onto world points with the film's own camera.
 */

export type PinnedLabel = { el: HTMLElement; anchor: keyof typeof ANCHORS; t0: number; t1: number };

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const ease = (dt: number, rate: number) => 1 - Math.exp(-dt * rate);

export class MotionRig {
  private root = document.documentElement;
  private target = { x: 0, y: 0 };
  private m = { x: 0, y: 0 };
  private pointer = { x: -100, y: -100 };
  private cursor = { x: -100, y: -100 };
  private lastYaw: number | null = null;
  private vx = 0;
  private lastScroll = window.scrollY;
  private vel = 0;
  private marq = 0;
  private labels = new Set<PinnedLabel>();
  private fine = window.matchMedia("(pointer: fine)").matches;
  /** media time of the frame actually on screen (seeks/decodes lag the scroll) */
  private frameT: number | null = null;

  constructor(private engine: FilmEngine) {
    window.addEventListener("pointermove", this.onMove, { passive: true });
    engine.paintHooks.add(this.tick);
    const v = engine.video as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
    };
    if (v.requestVideoFrameCallback) {
      const onFrame = (_: number, meta: { mediaTime: number }) => {
        this.frameT = meta.mediaTime;
        v.requestVideoFrameCallback!(onFrame);
      };
      v.requestVideoFrameCallback(onFrame);
    }
  }

  pin(label: PinnedLabel) {
    this.labels.add(label);
    return () => this.labels.delete(label);
  }

  private onMove = (e: PointerEvent) => {
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    if (e.pointerType !== "mouse") return;
    this.target.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.target.y = (e.clientY / window.innerHeight) * 2 - 1;
  };

  private tick = (t: number, dt: number) => {
    const r = this.root.style;
    const p = clamp(t / FILM_DURATION, 0, 1);

    // pointer parallax
    const km = ease(dt, 4.5);
    this.m.x += (this.target.x - this.m.x) * km;
    this.m.y += (this.target.y - this.m.y) * km;
    r.setProperty("--mx", this.m.x.toFixed(4));
    r.setProperty("--my", this.m.y.toFixed(4));
    if (this.fine) {
      const kc = ease(dt, 20);
      this.cursor.x += (this.pointer.x - this.cursor.x) * kc;
      this.cursor.y += (this.pointer.y - this.cursor.y) * kc;
      r.setProperty("--cx", `${this.cursor.x.toFixed(1)}px`);
      r.setProperty("--cy", `${this.cursor.y.toFixed(1)}px`);
    }

    // camera motion -> page motion
    const cam = cameraAt(p, t);
    const fx = cam.target[0] - cam.pos[0];
    const fz = cam.target[2] - cam.pos[2];
    const yaw = Math.atan2(fx, fz);
    if (this.lastYaw !== null && dt > 0) {
      let d = yaw - this.lastYaw;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      // ignore the hard cut (a yaw jump in one frame is an edit, not a camera move)
      const v = Math.abs(d) > 0.5 ? 0 : (d / dt) * (180 / Math.PI);
      this.vx += (clamp(v, -60, 60) - this.vx) * ease(dt, 3);
    }
    this.lastYaw = yaw;
    r.setProperty("--cam-vx", this.vx.toFixed(3));
    r.setProperty("--cam-roll", `${((cam.roll * 180) / Math.PI).toFixed(2)}deg`);

    // scroll velocity
    const y = window.scrollY;
    if (dt > 0) {
      const v = (y - this.lastScroll) / dt / 1000;
      this.vel += (clamp(v, -4, 4) - this.vel) * ease(dt, 6);
    }
    this.lastScroll = y;
    r.setProperty("--vel", this.vel.toFixed(4));
    // marquee drifts on its own and surges with scroll speed
    this.marq = (this.marq + dt * 0.022 + Math.abs(this.vel) * dt * 0.09) % 1;
    r.setProperty("--marq", this.marq.toFixed(5));

    // pins follow the frame on screen, not the eased scroll target, so they never slide off their object
    const ft = this.frameT ?? t;
    this.placeLabels(Math.abs(ft - t) < 1.5 ? cameraAt(clamp(ft / FILM_DURATION, 0, 1), ft) : cam, Math.abs(ft - t) < 1.5 ? ft : t);
  };

  private placeLabels(cam: ReturnType<typeof cameraAt>, t: number) {
    if (!this.labels.size) return;
    const v = this.engine.video;
    const W = window.innerWidth;
    const H = window.innerHeight;
    // the on-screen film may be a centre crop (portrait cut) shown with object-fit: cover
    const portrait = v.currentSrc.includes("portrait") || v.dataset.variant === "portrait";
    const crop = portrait ? { x0: 600 / 1920, w: 720 / 1920 } : { x0: 0, w: 1 };
    const aspect = v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : (16 / 9) * crop.w;
    const scale = Math.max(W / (H * aspect), 1) * H;
    const dispW = scale * aspect;
    const dispH = scale;
    const ox = (W - dispW) / 2;
    const oy = (H - dispH) / 2;

    this.labels.forEach((l) => {
      const fade = clamp((t - l.t0) / 0.6, 0, 1) * clamp((l.t1 - t) / 0.6, 0, 1);
      const pt = fade > 0 ? project(cam, ANCHORS[l.anchor]) : null;
      if (!pt) {
        l.el.style.opacity = "0";
        return;
      }
      const u = (pt.x - crop.x0) / crop.w;
      const x = ox + u * dispW;
      const y = oy + pt.y * dispH;
      const onScreen = x > 8 && x < W - 8 && y > 60 && y < H - 60;
      const s = clamp(22 / pt.depth, 0.8, 1.2);
      l.el.style.opacity = onScreen ? fade.toFixed(3) : "0";
      l.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
      l.el.classList.toggle("is-left", x > W * 0.62);
    });
  }

  destroy() {
    window.removeEventListener("pointermove", this.onMove);
    this.engine.paintHooks.delete(this.tick);
  }
}
