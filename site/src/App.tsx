import { useEffect, useState } from "react";
import { FilmProvider, useFilm, useFilmState } from "./film/FilmContext";
import { loadFilm, pickFilmSource } from "./film/engine";
import { useMusic } from "./music";
import { MusicButton, Nav } from "./components/Chrome";
import { Gallery, Hero, Menu, Origin, Reserve, Roast, Visit } from "./components/Sections";
import { ReserveDialog } from "./components/ReserveDialog";
import { StripeDoors } from "./components/StripeDoors";

export const App = () => {
  const music = useMusic();
  const [reserving, setReserving] = useState(false);
  const openReserve = () => setReserving(true);

  return (
    <FilmProvider poster="/media/film-poster.jpg">
      <Boot />
      <Stage />
      <Nav onReserve={openReserve} />
      <main>
        <Hero />
        <Origin />
        <Roast />
        <StripeDoors />
        <Menu />
        <Gallery />
        <Visit />
        <Reserve onReserve={openReserve} />
      </main>
      <MusicButton music={music} />
      <ReserveDialog open={reserving} onClose={() => setReserving(false)} />
      <div className="cursor" aria-hidden="true" />
    </FilmProvider>
  );
};

/**
 * No splash screen: the page opens on the hero while the film downloads into memory (so
 * every seek is instant), then the auto tour starts by itself. If the visitor has already
 * scrolled by then, they keep the wheel instead.
 */
const Boot = () => {
  const film = useFilm();
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, behavior: "instant" });
    let alive = true;
    loadFilm(pickFilmSource(), () => undefined).then((src) => {
      if (!alive) return;
      film.video.src = src;
      film.video.addEventListener(
        "loadedmetadata",
        () => {
          film.measure();
          if (window.scrollY > 40) film.explore();
          else film.play();
        },
        { once: true },
      );
      film.video.load();
    });
    return () => {
      alive = false;
    };
  }, [film]);
  return null;
};

/** Page-level reactions to the film: dim the footage under dense sections, reveal-on-scroll. */
const Stage = () => {
  const { chapter, mode } = useFilmState();
  useEffect(() => {
    document.documentElement.dataset.chapter = String(chapter);
    document.documentElement.dataset.mode = mode;
  }, [chapter, mode]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
};
