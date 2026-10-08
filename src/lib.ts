// Small deterministic helpers shared by every scene layer.

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const frac = (x: number) => x - Math.floor(x);

/** Hermite smoothstep of x between a and b. */
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Rises over [a,b], holds, falls over [c,d]. */
export const env = (x: number, a: number, b: number, c: number, d: number) =>
  smooth(a, b, x) * (1 - smooth(c, d, x));

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInCubic = (t: number) => Math.pow(clamp01(t), 3);

/** mulberry32: seeded PRNG so every render frame is identical. */
export const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const mixColor = (a: string, b: string, t: number) => {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const c = ca.map((v, i) => Math.round(mix(v, cb[i], clamp01(t))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

/** Piecewise colour ramp over sorted [position, hex] stops. */
export const colorAt = (x: number, stops: [number, string][]) => {
  if (x <= stops[0][0]) return mixColor(stops[0][1], stops[0][1], 0);
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i];
    const [p1, c1] = stops[i + 1];
    if (x <= p1) return mixColor(c0, c1, smooth(p0, p1, x));
  }
  const last = stops[stops.length - 1][1];
  return mixColor(last, last, 0);
};

export const rgba = (rgb: string, a: number) => rgb.replace("rgb(", "rgba(").replace(")", `,${a})`);

/**
 * Story beats, as fractions of the composition. Both HeroLoop (10s) and Film (40s)
 * read the same beats so the 40s film is a slow-motion cut of the loop.
 * In the 40s film every beat lands on a bar line at 96 BPM (1 bar = 2.5s = 0.0625).
 */
export const BEATS = {
  awakeningEnd: 0.25, // bars 1-4   0.0-10.0s
  originEnd: 0.4375, // bars 5-7   10.0-17.5s
  roastEnd: 0.625, // bars 8-10  17.5-25.0s
  pourEnd: 0.8125, // bars 11-13 25.0-32.5s
  // ritual / return: bars 14-16  32.5-40.0s
};
