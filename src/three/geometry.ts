import * as THREE from "three";

/** Lathe profile helper: [radius, height] pairs, smoothed with a spline. */
const lathe = (pts: [number, number][], segments = 160, divisions = 220) => {
  const curve = new THREE.SplineCurve(pts.map(([r, y]) => new THREE.Vector2(r, y)));
  const g = new THREE.LatheGeometry(curve.getPoints(divisions), segments);
  g.computeVertexNormals();
  return g;
};

/** Porcelain cup: outer wall, rolled lip, inner wall, foot ring. Height ~4.8, rim radius 4.15. */
export const makeCup = () =>
  lathe([
    [0.001, 0.0],
    [2.35, 0.0],
    [2.55, 0.05],
    [2.6, 0.22],
    [2.75, 0.32],
    [3.25, 0.75],
    [3.72, 1.7],
    [4.0, 2.9],
    [4.12, 4.0],
    [4.16, 4.62],
    [4.12, 4.8],
    [4.02, 4.84],
    [3.92, 4.76],
    [3.88, 4.4],
    [3.78, 3.2],
    [3.45, 1.9],
    [2.85, 0.98],
    [1.9, 0.62],
    [0.001, 0.56],
  ]);

/** Inner radius of the cup at height y (matches the inner wall above). */
export const innerRadiusAt = (y: number) => {
  const prof: [number, number][] = [
    [0.56, 0.0],
    [0.62, 1.9],
    [0.98, 2.85],
    [1.9, 3.45],
    [3.2, 3.78],
    [4.4, 3.88],
    [4.76, 3.92],
  ];
  for (let i = 0; i < prof.length - 1; i++) {
    const [y0, r0] = prof[i];
    const [y1, r1] = prof[i + 1];
    if (y <= y1) return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0);
  }
  return 3.92;
};

export const makeSaucer = () =>
  lathe(
    [
      [0.001, 0.0],
      [3.0, 0.0],
      [3.2, 0.12],
      [5.2, 0.16],
      [6.3, 0.42],
      [6.85, 0.7],
      [6.95, 0.78],
      [6.8, 0.8],
      [6.1, 0.58],
      [4.9, 0.36],
      [3.6, 0.3],
      [3.1, 0.36],
      [2.75, 0.32],
      [0.001, 0.3],
    ],
    160,
    160,
  );

/** C-shaped handle swept along a curve so it tapers into the body like real porcelain. */
export const makeHandle = () => {
  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(3.95, 3.9, 0),
    new THREE.Vector3(6.6, 4.4, 0),
    new THREE.Vector3(6.6, 1.2, 0),
    new THREE.Vector3(3.55, 1.45, 0),
  );
  const g = new THREE.TubeGeometry(curve, 80, 1, 24, false);
  // taper: thick at the top, thinner toward the bottom join; flatten across z
  const pos = g.attributes.position as THREE.BufferAttribute;
  const pts = curve.getSpacedPoints(80);
  for (let i = 0; i < pos.count; i++) {
    const seg = Math.floor(i / 25);
    const c = pts[Math.min(seg, pts.length - 1)];
    const t = seg / 80;
    const w = 0.42 - 0.12 * t;
    const v = new THREE.Vector3().fromBufferAttribute(pos, i).sub(c);
    v.multiplyScalar(w);
    v.z *= 0.72;
    pos.setXYZ(i, c.x + v.x, c.y + v.y, c.z + v.z);
  }
  g.computeVertexNormals();
  return g;
};

/**
 * Coffee bean: squashed ellipsoid, flattened belly with an S-shaped centre cut.
 * Long axis = y (length ~2), belly faces +z.
 */
export const makeBean = () => {
  const g = new THREE.SphereGeometry(1, 64, 48);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    let x = v.x * 0.66;
    const y = v.y * 1.0;
    let z = v.z * 0.5;
    if (z > 0) z *= 0.55; // flat belly
    // S-curve crease along the belly
    const sx = 0.13 * Math.sin(y * 2.6);
    const d = x - sx;
    const groove = Math.exp(-(d * d) / 0.006) * 0.2 * (1 - Math.abs(y) ** 4);
    if (v.z > 0.05) z -= groove;
    // tiny organic irregularity
    const n = 0.018 * Math.sin(v.x * 9 + v.y * 7) * Math.cos(v.y * 5 - v.z * 6);
    x += n;
    pos.setXYZ(i, x, y, z + n);
  }
  g.computeVertexNormals();
  return g;
};

export const makeCherry = () => {
  const g = new THREE.SphereGeometry(1, 48, 32);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // slightly oval with a dimple where the calyx sits
    const dimple = Math.exp(-((v.x * v.x + v.z * v.z) / 0.04)) * (v.y > 0 ? 0.12 : 0);
    pos.setXYZ(i, v.x * 0.94, v.y * 1.05 - dimple, v.z * 0.94);
  }
  g.computeVertexNormals();
  return g;
};

/** Leaf: subdivided plane bent along its midrib (alpha comes from the texture). */
export const makeLeaf = () => {
  const g = new THREE.PlaneGeometry(1, 2.4, 12, 24);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, -Math.abs(x) * 0.35 + Math.sin(y * 1.2) * 0.18);
  }
  g.computeVertexNormals();
  return g;
};
