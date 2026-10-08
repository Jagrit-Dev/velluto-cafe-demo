import { useMemo, useState, type CSSProperties, type PointerEvent } from "react";
import { ADDRESS, CHAPTERS, GALLERY, HOURS, MENU, openStatus } from "../content";
import { Count, Kinetic } from "./Kinetic";

const t = (id: string) => CHAPTERS.find((c) => c.id === id)!.t;

export const Hero = () => (
  <section id="top" className="chapter chapter--hero" data-film-t={t("top")}>
    <div className="pin">
      <div className="hero">
        <p className="eyebrow depth" style={{ "--d": 10 } as CSSProperties}>
          Coffee Atelier · Old Harbour Quarter
        </p>
        <h1 className="hero__title depth" style={{ "--d": 26 } as CSSProperties} aria-label="Slow coffee, poured like velvet.">
          <Letters text="Slow coffee," start={0} />
          <br />
          <Letters text="poured like " start={11} />
          <em>
            <Letters text="velvet." start={23} />
          </em>
        </h1>
        <p className="hero__lede depth" style={{ "--d": 14 } as CSSProperties}>
          Single-estate beans, roasted by hand on a 1962 drum and poured one cup at a time. Scroll, or sit back and
          let the film play.
        </p>
      </div>
      <div className="hero__cue" aria-hidden="true">
        <span>Scroll</span>
        <i />
      </div>
    </div>
  </section>
);

/** Letters that rise out of depth as the page opens (staggered via --li). */
const Letters = ({ text, start }: { text: string; start: number }) => {
  let i = start;
  // letters are inline-blocks, so keep each word in a no-wrap box or lines break mid-word
  return (
    <>
      {text.split(/(\s+)/).map((word, wi) =>
        /^\s+$/.test(word) ? (
          " "
        ) : (
          <span key={wi} className="word">
            {word.split("").map((ch) => (
              <span key={i} className="letter" aria-hidden="true" style={{ "--li": i++ } as CSSProperties}>
                {ch}
              </span>
            ))}
          </span>
        ),
      )}
    </>
  );
};

export const Origin = () => (
  <section id="origin" className="chapter chapter--left" data-film-t={t("origin")}>
    <div className="pin">
      <div className="panel">
        <p className="eyebrow">Chapter I — Origin</p>
        <Kinetic text="It begins at *1,900 metres.*" />
        <p>
          Three families in Huila, Colombia and Guji, Ethiopia grow every bean we pour. Cherries are picked by hand,
          only when they turn the colour of garnet, then washed, sun-dried and rested in the mountain air.
        </p>
        <dl className="stats">
          <div>
            <dt>
              <Count to={1900} suffix=" m" />
            </dt>
            <dd>average altitude</dd>
          </div>
          <div>
            <dt>3</dt>
            <dd>partner farms, visited every harvest</dd>
          </div>
          <div>
            <dt>
              <Count to={2.4} decimals={1} suffix="×" />
            </dt>
            <dd>the Fairtrade minimum, paid direct</dd>
          </div>
        </dl>
        <p className="coords">2.53° N, 75.52° W · 5.95° N, 38.71° E</p>
      </div>
    </div>
  </section>
);

export const Roast = () => (
  <section id="roast" className="chapter chapter--right" data-film-t={t("roast")}>
    <div className="pin">
      <div className="panel">
        <p className="eyebrow">Chapter II — Roast</p>
        <Kinetic text="Fourteen minutes. *By ear, by nose.*" />
        <p>
          We roast in twelve-kilo batches on a restored 1962 drum roaster. No presets: our roaster listens for first
          crack, then stretches the finish until the sugars turn to caramel, never to smoke.
        </p>
        <RoastCurve />
        <dl className="stats">
          <div>
            <dt>
              <Count to={12} suffix=" kg" />
            </dt>
            <dd>per batch, three a day</dd>
          </div>
          <div>
            <dt>
              <Count to={14} suffix=" min" />
            </dt>
            <dd>from charge to drop</dd>
          </div>
          <div>
            <dt>
              <Count to={72} suffix=" h" />
            </dt>
            <dd>rested before brewing</dd>
          </div>
        </dl>
      </div>
    </div>
  </section>
);

/** Bean-temperature curve that draws itself as the chapter scrolls. */
const RoastCurve = () => (
  <figure className="curve" aria-label="Roast curve: bean temperature rising over fourteen minutes, first crack at minute ten">
    <svg viewBox="0 0 320 120" preserveAspectRatio="none">
      <path className="curve__grid" d="M0 30H320M0 60H320M0 90H320" />
      <path
        className="curve__line"
        pathLength={1}
        d="M0 30 C 18 92, 40 104, 70 98 S 140 70, 190 52 S 260 30, 320 22"
      />
      <circle className="curve__mark" cx="228" cy="40" r="4" />
    </svg>
    <figcaption>
      <span>0:00 charge</span>
      <span className="curve__crack">10:12 first crack</span>
      <span>14:00 drop</span>
    </figcaption>
  </figure>
);

export const Menu = () => {
  const [tab, setTab] = useState(MENU[0].id);
  const active = MENU.find((m) => m.id === tab)!;
  // card tilts toward the pointer like a physical object in the scene
  const tilt = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--tx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    e.currentTarget.style.setProperty("--ty", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  };
  const untilt = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty("--tx", "0");
    e.currentTarget.style.setProperty("--ty", "0");
  };
  return (
    <section id="menu" className="flow" data-film-t={t("menu")}>
      <div className="flow__head" data-reveal>
        <p className="eyebrow">Chapter III — Pour</p>
        <Kinetic text="The menu, *poured slowly.*" />
        <p>Everything is made to order. Oat, whole and A2 milk at no extra cost.</p>
      </div>
      <div className="menu glass tilt" data-reveal onPointerMove={tilt} onPointerLeave={untilt}>
        <div className="menu__tabs" role="tablist" aria-label="Menu categories">
          {MENU.map((m) => (
            <button
              key={m.id}
              role="tab"
              id={`tab-${m.id}`}
              aria-selected={m.id === tab}
              aria-controls="menu-panel"
              className={m.id === tab ? "is-active" : ""}
              onClick={() => setTab(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="menu__panel" role="tabpanel" id="menu-panel" aria-labelledby={`tab-${tab}`} key={tab}>
          <p className="menu__note">{active.note}</p>
          <ul>
            {active.items.map((it, i) => (
              <li key={it.name} style={{ animationDelay: `${i * 70}ms` }}>
                <div className="menu__row">
                  <h3>
                    {it.name}
                    {it.tag && <span className="tag">{it.tag}</span>}
                  </h3>
                  <span className="menu__dots" />
                  <span className="menu__price">{it.price}</span>
                </div>
                <p>{it.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

/** Stills from the film on a 3D ring that turns as you scroll (and leans toward the pointer). */
export const Gallery = () => (
  <section id="gallery" className="chapter chapter--ring" data-film-t={t("gallery")}>
    <div className="pin pin--ring">
      <div className="ring-head">
        <p className="eyebrow">Chapter IV — Ritual</p>
        <Kinetic text="The ritual, *in frames.*" />
      </div>
      <div className="ring-stage">
        <div className="ring">
          {GALLERY.map((g, i) => (
            <figure key={g.src} className="ring__item" style={{ "--k": i } as CSSProperties}>
              <img src={g.src} alt={g.alt} loading="lazy" decoding="async" />
              <figcaption>
                <span>{String(i + 1).padStart(2, "0")}</span> {g.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export const Visit = () => {
  const { text: status, open: isOpen } = useMemo(() => openStatus(), []);
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(`${ADDRESS.line1}, ${ADDRESS.line2}`).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <section id="visit" className="flow" data-film-t={t("visit")}>
      <div className="flow__head" data-reveal>
        <p className="eyebrow">Chapter V — Visit</p>
        <Kinetic text="Find us by the *old harbour.*" />
      </div>
      <div className="visit">
        <div className="glass visit__card" data-reveal>
          <p className={`status ${isOpen ? "status--open" : ""}`}>
            <i /> {status}
          </p>
          <address>
            {ADDRESS.line1}
            <br />
            {ADDRESS.line2}
          </address>
          <table className="hours">
            <caption className="sr-only">Opening hours</caption>
            <tbody>
              {HOURS.map((h) => (
                <tr key={h.day} className={h.idx.includes(new Date().getDay()) ? "is-today" : ""}>
                  <th scope="row">{h.day}</th>
                  <td>
                    {h.open} – {h.close}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="visit__actions">
            <button className="btn btn--ghost btn--sm" onClick={copy}>
              {copied ? "Address copied" : "Copy address"}
            </button>
            <a className="link" href={`mailto:${ADDRESS.email}`}>
              {ADDRESS.email}
            </a>
          </div>
        </div>
        <div className="glass visit__map" data-reveal>
          <HarbourMap />
        </div>
      </div>
    </section>
  );
};

/** Illustrated map of the (fictional) Old Harbour Quarter. */
const HarbourMap = () => (
  <svg viewBox="0 0 400 300" role="img" aria-label="Map: Velluto sits on Calder Row, two streets from the harbour">
    <defs>
      <linearGradient id="sea" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#1b2a2c" />
        <stop offset="1" stopColor="#0f1819" />
      </linearGradient>
    </defs>
    <rect width="400" height="300" fill="#140d09" />
    <path d="M0 210 C 80 190 140 240 220 225 S 340 190 400 205 V300 H0Z" fill="url(#sea)" />
    <path d="M150 222 v-26 h46 v30" fill="none" stroke="#3b2c22" strokeWidth="6" />
    <g stroke="#3a2a1f" strokeWidth="9" strokeLinecap="round" fill="none">
      <path d="M-10 70 C 120 60 260 90 410 64" />
      <path d="M-10 150 C 120 140 260 160 410 140" />
      <path d="M90 -10 C 100 80 84 160 98 220" />
      <path d="M250 -10 C 240 90 262 150 252 215" />
    </g>
    <g stroke="#2a1e16" strokeWidth="4" strokeLinecap="round" fill="none">
      <path d="M-10 108 H 410" />
      <path d="M170 -10 V 200" />
      <path d="M330 -10 C 320 80 340 140 330 200" />
    </g>
    <g fill="#8c7258" fontFamily="Manrope, sans-serif" fontSize="9" letterSpacing="2">
      <text x="14" y="62">HARBOUR ROAD</text>
      <text x="270" y="134">CALDER ROW</text>
      <text x="20" y="272" fill="#5f7c7c">OLD HARBOUR</text>
    </g>
    <g className="map__pin" transform="translate(206 145)">
      <circle r="22" fill="#d6964e" opacity="0.18" className="map__pulse" />
      <circle r="9" fill="#d6964e" />
      <circle r="3.5" fill="#140d09" />
    </g>
    <text x="222" y="174" fill="#f3e6d3" fontFamily="Fraunces, serif" fontSize="15" fontStyle="italic">
      Velluto
    </text>
  </svg>
);

export const Reserve = ({ onReserve }: { onReserve: () => void }) => (
  <section id="reserve" className="flow flow--end" data-film-t={t("reserve")}>
    <div className="reserve" data-reveal>
      <p className="eyebrow">Chapter VI — Reserve</p>
      <Kinetic className="reserve__title" text="Your table is *warming.*" />
      <p>Twelve seats at the counter, eight by the window. Walk-ins always welcome; reservations held for 15 minutes.</p>
      <button className="btn btn--gold btn--lg" onClick={onReserve}>
        Reserve a table
      </button>
    </div>
    <footer className="footer">
      <span className="footer__mark">Velluto</span>
      <span>© 2026 Velluto Coffee Atelier · a fictional brand, made for a motion design demo</span>
      <span className="footer__links">
        <a href={`mailto:${ADDRESS.email}`}>{ADDRESS.email}</a>
      </span>
    </footer>
  </section>
);
