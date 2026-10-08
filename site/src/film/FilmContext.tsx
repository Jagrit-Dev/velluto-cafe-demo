import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { FilmEngine, type Snapshot } from "./engine";
import { MotionRig } from "./motion";
import { PINNED_LABELS } from "../content";

type Film = { engine: FilmEngine; rig: MotionRig };
const Ctx = createContext<Film | null>(null);
const IDLE: Snapshot = { mode: "idle", chapter: 0 };

/**
 * Owns the fixed full-screen <video>, the engine that binds it to scroll, and the motion
 * rig. The video and the 3D-pinned labels share one "stage" so pointer parallax moves
 * them together, exactly like objects in the same space.
 */
export const FilmProvider = ({ children, poster }: { children: ReactNode; poster: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [film, setFilm] = useState<Film | null>(null);

  useEffect(() => {
    const engine = new FilmEngine(videoRef.current!);
    const rig = new MotionRig(engine);
    if (import.meta.env.DEV) (window as unknown as { __film: FilmEngine }).__film = engine;
    setFilm({ engine, rig });
    return () => {
      rig.destroy();
      engine.destroy();
    };
  }, []);

  return (
    <>
      <div className="film" aria-hidden="true">
        <div className="film__stage">
          <video ref={videoRef} className="film__video" muted playsInline preload="auto" poster={poster} />
          {film && <PinnedLabels rig={film.rig} />}
        </div>
        <div className="film__scrim" />
        <div className="film__grain" />
      </div>
      {film && <Ctx.Provider value={film}>{children}</Ctx.Provider>}
    </>
  );
};

/** Small callouts that sit on 3D points in the footage and travel with the camera. */
const PinnedLabels = ({ rig }: { rig: MotionRig }) => {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const off = PINNED_LABELS.map((l, i) => rig.pin({ el: refs.current[i]!, anchor: l.anchor, t0: l.t0, t1: l.t1 }));
    return () => off.forEach((f) => f());
  }, [rig]);
  return (
    <div className="pins">
      {PINNED_LABELS.map((l, i) => (
        <div key={l.anchor} className="pin3d" ref={(el) => void (refs.current[i] = el)}>
          <span className="pin3d__dot" />
          <span className="pin3d__line" />
          <span className="pin3d__body">
            <span className="pin3d__kicker">{l.kicker}</span>
            <span className="pin3d__text">{l.text}</span>
          </span>
        </div>
      ))}
    </div>
  );
};

export const useFilm = () => {
  const f = useContext(Ctx);
  if (!f) throw new Error("useFilm outside FilmProvider");
  return f.engine;
};

export const useFilmState = () => {
  const e = useFilm();
  return useSyncExternalStore(e.subscribe, e.getSnapshot, () => IDLE);
};
