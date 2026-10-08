import type { CSSProperties } from "react";

/*
 * Scroll scene between Roast and Pour: six marquee stripes slide in from alternating sides and
 * close over the tunnel like a shutter, then swing open from the centre outward (in 3D) as the
 * film hits the bean burst, revealing the pour and the menu behind them.
 */
const STRIPES = [
  { words: ["Single estate", "Hand roasted", "Slow bar"], style: "outline", speed: 1 },
  { words: ["Huila", "Guji", "1,900 metres"], style: "gold", speed: 2 },
  { words: ["Chapter III", "The Pour"], style: "hero", speed: 1 },
  { words: ["18 g in", "36 g out", "28 seconds"], style: "outline", speed: 2 },
  { words: ["Rosetta", "Cortado", "Flat white"], style: "gold", speed: 3 },
  { words: ["Poured slow", "Since 2019"], style: "outline", speed: 1 },
] as const;

const CENTER = (STRIPES.length - 1) / 2;

export const StripeDoors = () => (
  <section className="doors" data-progress aria-label="Chapter III, the pour">
    <div className="doors__stage">
      {STRIPES.map((s, i) => {
        const run = (
          <div className="stripe__run">
            {s.words.map((w) => (
              <span key={w} className="stripe__word">
                {w}
                <i aria-hidden="true">✦</i>
              </span>
            ))}
          </div>
        );
        return (
          <div
            key={i}
            className={`stripe stripe--${s.style} ${i % 2 ? "stripe--rev" : ""}`}
            style={{ "--side": i % 2 ? 1 : -1, "--d": Math.abs(i - CENTER), "--speed": s.speed } as CSSProperties}
            aria-hidden="true"
          >
            <div className="stripe__track">
              {run}
              {run}
              {run}
              {run}
            </div>
          </div>
        );
      })}
    </div>
  </section>
);
