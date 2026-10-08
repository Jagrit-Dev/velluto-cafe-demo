import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CHAPTERS, openStatus } from "../content";
import { useFilm, useFilmState } from "../film/FilmContext";
import type { Music } from "../music";

export const Nav = ({ onReserve }: { onReserve: () => void }) => {
  const film = useFilm();
  const { chapter } = useFilmState();
  const [open, setOpen] = useState(false);
  const links = [
    { label: "Story", i: 1 },
    { label: "Menu", i: 3 },
    { label: "Gallery", i: 4 },
    { label: "Visit", i: 5 },
  ];
  useEffect(() => {
    if (!open) return;
    document.documentElement.classList.add("is-modal");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.classList.remove("is-modal");
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const go = (i: number) => {
    setOpen(false);
    film.goTo(i);
  };
  return (
    <>
      <header className={`nav ${chapter > 0 ? "nav--solid" : ""} ${open ? "nav--open" : ""}`}>
        <button className="nav__mark" onClick={() => go(0)} aria-label="Velluto, back to top">
          Velluto
        </button>
        <nav className="nav__links" aria-label="Sections">
          {links.map((l) => (
            <button key={l.label} className={chapter === l.i ? "is-active" : ""} onClick={() => film.goTo(l.i)}>
              {l.label}
            </button>
          ))}
        </nav>
        <div className="nav__end">
          <ReserveButton onClick={onReserve} />
          <button
            className="nav__burger"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="sheet"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            <span />
            <span />
          </button>
        </div>
      </header>
      {/* phones and tablets: every chapter as a full-screen index */}
      <div id="sheet" className={`sheet ${open ? "is-open" : ""}`} aria-hidden={!open} inert={!open}>
        <ol>
          {CHAPTERS.map((c, i) => (
            <li key={c.id} style={{ "--i": i } as CSSProperties}>
              <button className={i === chapter ? "is-active" : ""} onClick={() => go(i)}>
                <span className="sheet__n">{c.n}</span>
                <span className="sheet__label">{c.label}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="sheet__foot">{openStatus().text}</p>
      </div>
    </>
  );
};

/**
 * The header's call to action: a gold hairline that keeps circling the pill, a live
 * open/closed light, and on hover the arrow's disc floods the button while the label
 * rolls over to "Book a table".
 */
const ReserveButton = ({ onClick }: { onClick: () => void }) => {
  const status = useMemo(() => openStatus(), []);
  return (
    <button className="reserve-btn" onClick={onClick} title={status.text} aria-label={`Reserve a table. ${status.text}`}>
      <span className="reserve-btn__flood" aria-hidden="true" />
      <span className={`reserve-btn__dot ${status.open ? "is-open" : ""}`} aria-hidden="true" />
      <span className="reserve-btn__roll" aria-hidden="true">
        <span>Reserve</span>
        <span>Book now</span>
      </span>
      <span className="reserve-btn__arrow" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="12" height="12">
          <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
};

/**
 * Record player: an album sleeve with the track name and a vinyl that slides out and
 * spins at 33 1/3 rpm while the music plays. Click it to stop; the record coasts to a
 * halt and slides back into its sleeve.
 */
export const MusicButton = ({ music }: { music: Music }) => {
  if (!music.available) return null;
  const { track, trackIndex } = music;
  // on a track change the record slips back into the sleeve and comes out again with the new song
  const [swapping, setSwapping] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSwapping(true);
    const id = window.setTimeout(() => setSwapping(false), 750);
    return () => window.clearTimeout(id);
  }, [trackIndex]);
  const label = `${music.playing ? "Pause" : "Play"} music: ${track.title}`;
  return (
    <button
      className={`vinyl ${music.playing ? "is-on" : ""} ${music.playing && !swapping ? "is-out" : ""}`}
      data-tour-ui
      onClick={music.toggle}
      aria-pressed={music.playing}
      aria-label={label}
      title={label}
    >
      <span className="vinyl__record" aria-hidden="true">
        <span className="vinyl__disc">
          <span className="vinyl__label" />
        </span>
        <span className="vinyl__sheen" />
      </span>
      <span className="vinyl__sleeve" aria-hidden="true">
        <span className="vinyl__art" />
        <span className="vinyl__no">{String(trackIndex + 1).padStart(2, "0")}</span>
        <span className="vinyl__title" key={trackIndex}>
          {track.title}
        </span>
      </span>
    </button>
  );
};
