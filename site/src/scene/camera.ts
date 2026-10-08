/*
 * Shared between the Remotion film and the website.
 * One continuous camera move through a single 3D world; the website uses the exact same
 * path to pin HTML labels onto 3D points so the type travels with the footage.
 *
 * World (units ~ cm):
 *   cup + saucer at the origin
 *   mist band          y 18-30          (crane-up wipe on the bar line at p=0.25)
 *   cherry field       y 30-52, z +10..-30
 *   roast tunnel       axis x=0 y=40, z -30..-140
 * Shot list (p = fraction of the film; 40 s cut lands every beat on a 96 BPM bar):
 *   0.000-0.250  orbit the cup, rise with the steam
 *   0.250-0.437  crane up through mist into floating cherries
 *   0.437-0.625  fly down a spinning tunnel of roasting beans (camera rolls)
 *   0.625        hard cut on the bar line (bean burst flash) to a high angle over the cup
 *   0.625-1.000  descend and orbit around the pour, land on the exact opening frame
 */

export type Vec3 = [number, number, number];
export type Cam = { pos: Vec3; target: Vec3; fov: number; roll: number };
type Key = { p: number } & Cam;

export const CUT = 0.625;

const A: Key[] = [
  { p: 0.0, pos: [0, 12.5, 31], target: [0, 4.6, 0], fov: 28, roll: 0 },
  { p: 0.08, pos: [12, 12, 27], target: [0, 5, 0], fov: 28, roll: -0.02 },
  { p: 0.16, pos: [19, 13, 13], target: [0, 6.5, 0], fov: 29, roll: -0.04 },
  { p: 0.215, pos: [8, 16, 5], target: [0, 14, -3], fov: 31, roll: 0 },
  { p: 0.26, pos: [1.5, 27, 5], target: [0, 38, -12], fov: 33, roll: 0.03 },
  { p: 0.3, pos: [0, 36, 6], target: [0, 40, -14], fov: 34, roll: 0 },
  { p: 0.36, pos: [-3, 39, -6], target: [1, 41, -30], fov: 34, roll: -0.06 },
  { p: 0.42, pos: [0.5, 40, -22], target: [0, 40, -52], fov: 36, roll: 0.1 },
  { p: 0.4375, pos: [0, 40, -28], target: [0, 40, -60], fov: 38, roll: 0.25 },
  { p: 0.53, pos: [0, 40, -60], target: [0, 40, -92], fov: 40, roll: 1.4 },
  { p: CUT, pos: [0, 40, -100], target: [0, 40, -132], fov: 46, roll: 2.8 },
];

const B: Key[] = [
  { p: CUT, pos: [0.6, 23, 6], target: [0, 3, 0], fov: 30, roll: 0.12 },
  { p: 0.7, pos: [-4.5, 18, 7], target: [0, 3.4, 0], fov: 30, roll: 0.06 },
  { p: 0.78, pos: [-13, 15, 15], target: [0, 4.2, 0], fov: 29, roll: 0.02 },
  { p: 0.86, pos: [-12, 13.5, 25], target: [0, 4.4, 0], fov: 28, roll: 0.01 },
  { p: 0.93, pos: [-5, 12.8, 30], target: [0, 4.5, 0], fov: 28, roll: 0 },
  { p: 1.0, pos: [0, 12.5, 31], target: [0, 4.6, 0], fov: 28, roll: 0 },
];

const cr = (a: number, b: number, c: number, d: number, t: number) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
};

const sample = (keys: Key[], p: number): Cam => {
  let i = 0;
  while (i < keys.length - 2 && p > keys[i + 1].p) i++;
  const k0 = keys[Math.max(0, i - 1)];
  const k1 = keys[i];
  const k2 = keys[i + 1];
  const k3 = keys[Math.min(keys.length - 1, i + 2)];
  const t = Math.min(1, Math.max(0, (p - k1.p) / (k2.p - k1.p)));
  const v = (f: (k: Key) => number) => cr(f(k0), f(k1), f(k2), f(k3), t);
  return {
    pos: [v((k) => k.pos[0]), v((k) => k.pos[1]), v((k) => k.pos[2])],
    target: [v((k) => k.target[0]), v((k) => k.target[1]), v((k) => k.target[2])],
    fov: v((k) => k.fov),
    roll: v((k) => k.roll),
  };
};

/** Camera at film fraction p (0..1). Pure maths: no three.js, safe to import on the website. */
export const cameraAt = (p: number, s = 0): Cam => {
  const c = p < CUT ? sample(A, p) : sample(B, Math.min(1, p));
  // hand-held breathing (periods divide 10 s, so it loops in both cuts)
  const k = 0.06;
  c.pos[0] += Math.sin((Math.PI * 2 * s) / 5) * k;
  c.pos[1] += Math.sin((Math.PI * 2 * s) / 2.5 + 1.3) * k * 0.6;
  return c;
};

/** World points the website pins labels to. The film places a hero object at each one. */
export const ANCHORS = {
  cupRim: [4.15, 5.14, 0] as Vec3,
  steam: [0, 9, 0] as Vec3,
  cherries: [3, 41, -19.9] as Vec3,
  greenBeans: [4, 40.5, -34.6] as Vec3,
  tunnel: [1.5, 32.5, -113] as Vec3,
  stream: [0.25, 7.2, 0.3] as Vec3,
  rosetta: [0, 4.76, 0] as Vec3,
};

/**
 * Project a world point to normalised film coordinates (0..1, origin top-left) for a
 * 16:9 frame. Returns null when the point is behind the camera.
 */
export const project = (cam: Cam, point: Vec3, aspect = 16 / 9) => {
  const [px, py, pz] = cam.pos;
  const f = norm(sub(cam.target, cam.pos)); // forward
  let r = norm(cross(f, [0, 1, 0])); // right
  let u = cross(r, f); // up
  const cr0 = Math.cos(cam.roll);
  const sr0 = Math.sin(cam.roll);
  const r2: Vec3 = [r[0] * cr0 + u[0] * sr0, r[1] * cr0 + u[1] * sr0, r[2] * cr0 + u[2] * sr0];
  const u2: Vec3 = [u[0] * cr0 - r[0] * sr0, u[1] * cr0 - r[1] * sr0, u[2] * cr0 - r[2] * sr0];
  r = r2;
  u = u2;
  const d: Vec3 = [point[0] - px, point[1] - py, point[2] - pz];
  const z = dot(d, f);
  if (z <= 0.1) return null;
  const th = Math.tan(((cam.fov * Math.PI) / 180) / 2);
  const x = dot(d, r) / (z * th * aspect);
  const y = dot(d, u) / (z * th);
  return { x: 0.5 + x / 2, y: 0.5 - y / 2, depth: z };
};

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
