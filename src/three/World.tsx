import { useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ANCHORS, CUT, cameraAt } from "../scene/camera";
import { colorAt, easeInCubic, easeOutCubic, env, frac, mix, rng, smooth } from "../lib";
import { innerRadiusAt, makeBean, makeCherry, makeCup, makeHandle, makeLeaf, makeSaucer } from "./geometry";
import {
  tableFade,
  CremaTexture,
  discTexture,
  leafTexture,
  mistMaterial,
  shadowTexture,
  steamMaterial,
  wordTexture,
} from "./textures";

const TAU = Math.PI * 2;
export type Beat = { p: number; s: number };

/* ---------- camera, fog, environment ---------- */

const FOG: [number, string][] = [
  [0, "#0c0705"],
  [0.2, "#0c0705"],
  [0.27, "#5a5242"],
  [0.33, "#2b2a22"],
  [0.42, "#1f1a14"],
  [0.4375, "#2a120a"],
  [0.6, "#1d0b05"],
  [CUT - 0.001, "#1d0b05"],
  [CUT, "#0c0705"],
  [1, "#0c0705"],
];

export const CameraRig = ({ p, s }: Beat) => {
  const { camera, scene, gl } = useThree();
  const pmrem = useMemo(() => {
    const gen = new THREE.PMREMGenerator(gl);
    const tex = gen.fromScene(new RoomEnvironment(), 0.04).texture;
    gen.dispose();
    return tex;
  }, [gl]);

  useLayoutEffect(() => {
    const c = cameraAt(p, s);
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(...c.pos);
    cam.up.set(0, 1, 0);
    cam.lookAt(...c.target);
    cam.rotateZ(c.roll);
    cam.fov = c.fov;
    cam.near = 0.1;
    cam.far = 400;
    cam.updateProjectionMatrix();

    const fogColor = new THREE.Color(colorAt(p, FOG));
    const density =
      p < CUT
        ? mix(0.012, 0.045, env(p, 0.2, 0.27, 0.3, 0.36)) + 0.02 * env(p, 0.3, 0.34, 0.42, 0.44) + 0.018 * smooth(0.43, 0.47, p)
        : 0.012;
    scene.fog = new THREE.FogExp2(fogColor, density);
    scene.background = fogColor;
    scene.environment = pmrem;
    scene.environmentIntensity = 0.3;
  }, [p, s, camera, scene, pmrem]);
  return null;
};

/* ---------- lights ---------- */

export const Lights = ({ p, s }: Beat) => {
  const cupLight = Math.max(1 - smooth(0.24, 0.3, p), smooth(CUT, CUT + 0.01, p));
  const ember = p < CUT ? env(p, 0.415, 0.4375, 0.6, 0.625) : 0;
  const flare = p < CUT ? env(p, 0.425, 0.4375, 0.445, 0.47) : 0;
  const cam = cameraAt(p, s);
  const flicker = 1 + 0.12 * Math.sin(TAU * s * 2) + 0.08 * Math.sin((TAU * s * 3) / 2.5 + 1);
  const keyRef = useRef<THREE.SpotLight>(null);
  useLayoutEffect(() => {
    keyRef.current?.target.position.set(0, 2.5, 0);
    keyRef.current?.target.updateMatrixWorld();
  });
  return (
    <>
      <ambientLight intensity={0.05 + 0.1 * env(p, 0.26, 0.3, 0.42, 0.45)} color="#d9c7a8" />
      <hemisphereLight intensity={0.35 * env(p, 0.26, 0.3, 0.42, 0.45)} color="#e7dcc2" groundColor="#2d3a1e" />
      {/* cup stage: warm window key, hot rim from behind, cool fill */}
      <spotLight
        ref={keyRef}
        position={[-16, 22, 14]}
        angle={0.45}
        penumbra={0.9}
        intensity={1150 * cupLight}
        color="#ffd3a1"
        decay={2}
      />
      <pointLight position={[7, 12, -12]} intensity={1300 * cupLight} color="#ff9b4d" decay={2} />
      <pointLight position={[-9, 9, -10]} intensity={380 * cupLight} color="#ffb877" decay={2} />
      <pointLight position={[16, 7, 14]} intensity={90 * cupLight} color="#7d8ca6" decay={2} />
      {/* origin: soft dawn from above */}
      <directionalLight position={[10, 70, 0]} intensity={1.6 * env(p, 0.25, 0.3, 0.42, 0.46)} color="#ffe1b0" />
      {/* roast: embers travel with the camera */}
      <pointLight position={[3, 37, cam.pos[2] - 14]} intensity={520 * ember * flicker} color="#ff6a24" decay={2} />
      <pointLight position={[-4, 43, cam.pos[2] - 22]} intensity={380 * ember * flicker} color="#ff8f3a" decay={2} />
      <pointLight position={[0, 40, cam.pos[2] - 30]} intensity={9000 * flare} color="#ffb070" decay={2} />
    </>
  );
};

/* ---------- table, cup, liquid ---------- */

const cupContents = (p: number) => {
  if (p < 0.5) return { level: 1, art: 1, milk: 1, swirl: 1.2 };
  const espresso = smooth(0.655, 0.75, p) * 0.82;
  const milkFill = smooth(0.75, 0.8, p) * 0.18;
  return {
    level: espresso + milkFill,
    art: smooth(0.762, 0.825, p),
    milk: smooth(0.745, 0.79, p),
    swirl: 1.2 * easeOutCubic(smooth(0.655, 0.8, p)) - 0.9 * (1 - smooth(0.655, 0.8, p)),
  };
};
const surfaceY = (level: number) => mix(0.75, 4.42, level);

export const CupStage = ({ p, s }: Beat) => {
  const geo = useMemo(() => ({ cup: makeCup(), saucer: makeSaucer(), handle: makeHandle() }), []);
  const porcelain = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#eadfce",
        roughness: 0.3,
        envMapIntensity: 0.9,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        sheen: 0.4,
        sheenColor: new THREE.Color("#fff1dc"),
      }),
    [],
  );
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d9a35f", metalness: 1, roughness: 0.22 }), []);
  const table = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#1b0f08", roughness: 0.62, metalness: 0.0, envMapIntensity: 0.02, alphaMap: tableFade(), transparent: true, depthWrite: false }),
    [],
  );
  const shadow = useMemo(() => shadowTexture(), []);
  const crema = useMemo(() => new CremaTexture(), []);
  const surfaceMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: crema.texture,
        roughness: 0.5,
        specularIntensity: 0.25,
        clearcoat: 0.25,
        clearcoatRoughness: 0.4,
      }),
    [crema],
  );

  const { level, art, milk, swirl } = cupContents(p);
  crema.draw(art, milk, swirl + (p >= 0.5 ? 0.02 * Math.sin(TAU * s) : 0));
  const y = surfaceY(level);
  const r = innerRadiusAt(y) * 0.985;
  const visible = p < 0.3 || p >= CUT - 0.002;
  const pouring = env(p, 0.66, 0.67, 0.79, 0.805);

  return (
    <group visible={visible}>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01} material={table}>
        <circleGeometry args={[90, 96]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0.6, 0.02, -0.5]} scale={[17, 15, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} opacity={0.9} />
      </mesh>
      <mesh geometry={geo.saucer} material={porcelain} />
      <mesh rotation-x={-Math.PI / 2} position-y={0.8}>
        <torusGeometry args={[6.88, 0.035, 8, 200]} />
        <primitive object={gold} attach="material" />
      </mesh>
      <group position-y={0.34}>
        <mesh rotation-x={-Math.PI / 2} position={[0.4, 0.01, -0.3]} scale={[9.5, 8.5, 1]}>
          <planeGeometry />
          <meshBasicMaterial map={shadow} transparent depthWrite={false} opacity={0.75} />
        </mesh>
        <mesh geometry={geo.cup} material={porcelain} />
        <mesh geometry={geo.handle} material={porcelain} />
        <mesh rotation-x={-Math.PI / 2} position-y={4.8}>
          <torusGeometry args={[4.07, 0.045, 8, 200]} />
          <primitive object={gold} attach="material" />
        </mesh>
        {level > 0.005 && (
          <mesh rotation-x={-Math.PI / 2} position-y={y} material={surfaceMat}>
            <circleGeometry args={[r, 128]} />
          </mesh>
        )}
        {pouring > 0.01 && <Ripples y={y + 0.01} r={r} s={s} a={pouring} />}
      </group>
    </group>
  );
};

const Ripples = ({ y, r, s, a }: { y: number; r: number; s: number; a: number }) => (
  <group position={[0.25, y, 0.3]} rotation-x={-Math.PI / 2}>
    {[0, 0.33, 0.66].map((o) => {
      const u = frac(s * 1.4 + o);
      const rad = 0.3 + u * r * 0.7;
      return (
        <mesh key={o}>
          <ringGeometry args={[rad, rad + 0.06 + u * 0.08, 96]} />
          <meshBasicMaterial color="#f3cfa0" transparent opacity={(1 - u) * 0.45 * a} depthWrite={false} />
        </mesh>
      );
    })}
  </group>
);

/* ---------- pour stream ---------- */

export const Stream = ({ p, s }: Beat) => {
  const mat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 }),
    [],
  );
  if (p < 0.64 || p > 0.81) return null;
  const { level, milk } = cupContents(p);
  const surf = surfaceY(level) + 0.34;
  const top = 34;
  const head = mix(top, surf, easeInCubic(smooth(0.645, 0.662, p)));
  const tail = mix(top, surf, easeInCubic(smooth(0.79, 0.806, p)));
  if (tail - head < 0.05) return null;
  const isMilk = smooth(0.745, 0.765, p);
  mat.color.set(colorAt(isMilk, [
    [0, "#2b150a"],
    [1, "#f4e6d0"],
  ]));
  const radius = mix(0.13, 0.21, isMilk);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 40; i++) {
    const yy = mix(tail, head, i / 40);
    const w = 0.04 * Math.sin(yy * 1.7 - s * 22) * (1 - (yy - surf) / (top - surf));
    pts.push(new THREE.Vector3(0.25 + w, yy, 0.3 + w * 0.6));
  }
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, radius * (1 + 0.1 * milk), 16, false);
  return <mesh geometry={geo} material={mat} />;
};

/* ---------- steam ---------- */

const STEAM = Array.from({ length: 5 }, (_, i) => ({ x: (i - 2) * 0.9, z: (i % 2) * 0.6 - 0.3, seed: i * 3.7, h: 11 + (i % 3) }));

export const Steam = ({ p, s }: Beat) => {
  const mats = useMemo(() => STEAM.map(() => steamMaterial()), []);
  const k = Math.max(1 - smooth(0.17, 0.26, p), p >= CUT ? smooth(0.72, 0.86, p) : 0);
  if (k < 0.01) return null;
  const cam = cameraAt(p, s);
  const yaw = Math.atan2(cam.pos[0], cam.pos[2]);
  return (
    <group position-y={5.1}>
      {STEAM.map((w, i) => {
        mats[i].uniforms.uLoop.value = frac(s / 10 + i * 0.13);
        mats[i].uniforms.uSeed.value = w.seed;
        mats[i].uniforms.uOpacity.value = k;
        return (
          <mesh key={i} position={[w.x, w.h / 2, w.z]} rotation-y={yaw} material={mats[i]}>
            <planeGeometry args={[6, w.h]} />
          </mesh>
        );
      })}
    </group>
  );
};

/* ---------- origin: mist, cherries, leaves ---------- */

const mistSeed = rng(12);
const MIST = [
  // band the camera cranes through (the wipe on the bar line)
  ...Array.from({ length: 12 }, () => ({ pos: [(mistSeed() - 0.5) * 50, 19 + mistSeed() * 11, -20 + mistSeed() * 30] as const, size: 22 + mistSeed() * 16, band: true })),
  // highland fog around the cherries
  ...Array.from({ length: 22 }, () => ({ pos: [(mistSeed() - 0.5) * 50, 30 + mistSeed() * 24, 8 - mistSeed() * 60] as const, size: 16 + mistSeed() * 18, band: false })),
].map((m, i) => ({ ...m, seed: i * 1.31 }));

export const Mist = ({ p, s }: Beat) => {
  const mats = useMemo(() => MIST.map(() => mistMaterial()), []);
  const band = env(p, 0.17, 0.22, 0.32, 0.37);
  const field = env(p, 0.24, 0.3, 0.42, 0.47);
  if (band + field < 0.01 || p >= CUT) return null;
  const cam = cameraAt(p, s);
  return (
    <>
      {MIST.map((m, i) => {
        const mat = mats[i];
        mat.uniforms.uLoop.value = frac(s / 10 + m.seed);
        mat.uniforms.uSeed.value = m.seed;
        mat.uniforms.uOpacity.value = (m.band ? band * 0.75 : field * 0.4);
        const drift = Math.sin((TAU * s) / 10 + m.seed) * 2;
        const pos = new THREE.Vector3(m.pos[0] + drift, m.pos[1], m.pos[2]);
        const look = new THREE.Object3D();
        look.position.copy(pos);
        look.lookAt(...cam.pos);
        return (
          <mesh key={i} position={pos} quaternion={look.quaternion} material={mat}>
            <planeGeometry args={[m.size, m.size * 0.6]} />
          </mesh>
        );
      })}
    </>
  );
};

const N_CHERRY = 150;
const N_BEAN = 360;
const fieldSeed = rng(2024);
const FIELD = Array.from({ length: N_CHERRY }, () => {
  // keep a clear corridor around the camera path so nothing clips the lens
  let x = 0;
  let y = 0;
  let z = 0;
  do {
    x = (fieldSeed() - 0.5) * 34;
    y = 30 + fieldSeed() * 22;
    z = 8 - fieldSeed() * 46;
  } while (Math.hypot(x, y - 39) < 3.2);
  return { x, y, z, rot: [fieldSeed() * TAU, fieldSeed() * TAU, fieldSeed() * TAU] as const, spin: 0.3 + fieldSeed(), jit: fieldSeed() * 0.03, size: 0.55 + fieldSeed() * 0.25 };
});
const beanSeed = rng(77);
const TUNNEL = Array.from({ length: N_BEAN }, (_, i) => ({
  z: -30 - (i / N_BEAN) * 112 - beanSeed() * 2,
  ang: i * 2.39996 + beanSeed() * 0.3,
  r: 4.6 + beanSeed() * 5,
  dir: i % 3 === 0 ? -1 : 1,
  speed: 0.8 + beanSeed() * 0.7,
  tumble: [beanSeed() * 2 - 1, beanSeed() * 2 - 1, beanSeed() * 2 - 1] as const,
  rot0: [beanSeed() * TAU, beanSeed() * TAU, beanSeed() * TAU] as const,
  shade: 0.82 + beanSeed() * 0.3,
  jit: beanSeed() * 0.04,
}));

const ROAST: [number, string][] = [
  [0.4, "#768a48"],
  [0.47, "#b39b55"],
  [0.52, "#a46a36"],
  [0.56, "#6a3a1b"],
  [0.6, "#3a1e0d"],
];

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const tmpC = new THREE.Color();

export const Cherries = ({ p, s }: Beat) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => makeCherry(), []);
  const mat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: "#a9101c", roughness: 0.38, clearcoat: 0.45, clearcoatRoughness: 0.32, sheen: 0.4, sheenColor: new THREE.Color("#ff6a5a") }),
    [],
  );
  const show = p > 0.2 && p < 0.42;
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    FIELD.forEach((c, i) => {
      const appear = smooth(0.22, 0.29, p);
      const pop = 1 - smooth(0.33 + c.jit * 2, 0.37 + c.jit * 2, p);
      const sc = c.size * appear * pop;
      tmpE.set(c.rot[0] + s * 0.2 * c.spin, c.rot[1] + s * 0.35 * c.spin, c.rot[2]);
      tmpQ.setFromEuler(tmpE);
      tmpV.set(c.x + 0.3 * Math.sin((TAU * s) / 5 + i), c.y + 0.4 * Math.sin((TAU * s) / 10 + i * 0.7), c.z);
      tmpS.setScalar(Math.max(sc, 0.0001));
      m.setMatrixAt(i, tmpM.compose(tmpV, tmpQ, tmpS));
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, N_CHERRY]} visible={show} frustumCulled={false} />;
};

export const Beans = ({ p, s }: Beat) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => makeBean(), []);
  const mat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.48, clearcoat: 0.0, clearcoatRoughness: 0.25 }),
    [],
  );
  const show = p > 0.33 && p < CUT;
  mat.clearcoat = 0.75 * smooth(0.52, 0.6, p); // roasting brings the oils out
  mat.roughness = mix(0.6, 0.36, smooth(0.47, 0.6, p));
  const roast = colorAt(p, ROAST);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m || !show) return;
    const burst = easeInCubic(smooth(0.597, CUT, p));
    TUNNEL.forEach((t, i) => {
      // tunnel slot
      const spin = (p - 0.44) * TAU * 0.9 * t.speed * t.dir;
      const a = t.ang + spin;
      const r = t.r + 0.6 * Math.sin((TAU * s) / 2.5 + i) + burst * 26;
      const tx = Math.cos(a) * r;
      const ty = 40 + Math.sin(a) * r;
      const tz = t.z + burst * 8;
      let x = tx;
      let y = ty;
      let z = tz;
      let scale: number;
      if (i < N_CHERRY) {
        // born from a cherry, then swept into the tunnel
        const c = FIELD[i];
        const born = smooth(0.335 + c.jit * 2, 0.375 + c.jit * 2, p);
        const sweep = easeOutCubic(smooth(0.39 + t.jit, 0.47 + t.jit, p));
        x = mix(c.x, tx, sweep);
        y = mix(c.y, ty, sweep);
        z = mix(c.z, tz, sweep);
        scale = born;
      } else {
        scale = smooth(0.41, 0.45, p);
      }
      const tumbleK = 1.5 + smooth(0.44, 0.6, p) * 2.5;
      tmpE.set(
        t.rot0[0] + s * t.tumble[0] * tumbleK,
        t.rot0[1] + s * t.tumble[1] * tumbleK,
        t.rot0[2] + s * t.tumble[2] * tumbleK,
      );
      tmpQ.setFromEuler(tmpE);
      tmpV.set(x, y, z);
      tmpS.setScalar(Math.max(0.0001, scale * 0.62));
      m.setMatrixAt(i, tmpM.compose(tmpV, tmpQ, tmpS));
      tmpC.set(roast).multiplyScalar(t.shade);
      m.setColorAt(i, tmpC);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, N_BEAN]} visible={show} frustumCulled={false} />;
};

const leafSeed = rng(5);
const LEAVES = Array.from({ length: 34 }, () => {
  let x = 0;
  let y = 0;
  do {
    x = (leafSeed() - 0.5) * 40;
    y = 28 + leafSeed() * 26;
  } while (Math.hypot(x, y - 39) < 4);
  return { x, y, z: 6 - leafSeed() * 44, rot: [leafSeed() * TAU, leafSeed() * TAU, leafSeed() * TAU] as const, size: 1.4 + leafSeed() * 1.4 };
});

export const Leaves = ({ p, s }: Beat) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => makeLeaf(), []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: leafTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55 }),
    [],
  );
  const k = env(p, 0.22, 0.29, 0.41, 0.46);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    LEAVES.forEach((l, i) => {
      tmpE.set(l.rot[0] + 0.2 * Math.sin((TAU * s) / 5 + i), l.rot[1] + (TAU * s) / 10, l.rot[2]);
      tmpQ.setFromEuler(tmpE);
      tmpV.set(l.x, l.y + 0.5 * Math.sin((TAU * s) / 10 + i), l.z);
      tmpS.setScalar(Math.max(0.0001, l.size * k));
      m.setMatrixAt(i, tmpM.compose(tmpV, tmpQ, tmpS));
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, LEAVES.length]} visible={k > 0.01} frustumCulled={false} />;
};

/* ---------- roast: sparks ---------- */

const sparkSeed = rng(31);
const N_SPARK = 700;
const SPARKS = Array.from({ length: N_SPARK }, () => ({
  z: -28 - sparkSeed() * 115,
  a: sparkSeed() * TAU,
  r: 1 + sparkSeed() * 10,
  o: sparkSeed(),
  v: 0.5 + sparkSeed(),
}));

export const Sparks = ({ p, s }: Beat) => {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N_SPARK * 3), 3));
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.22,
        map: discTexture(),
        color: new THREE.Color("#ffb25e").multiplyScalar(3),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    [],
  );
  const k = p < CUT ? env(p, 0.42, 0.45, 0.6, 0.625) : 0;
  useLayoutEffect(() => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    SPARKS.forEach((sp, i) => {
      const u = frac(s / 2.5 + sp.o);
      const a = sp.a + u * 2 * sp.v;
      pos.setXYZ(i, Math.cos(a) * sp.r, 40 + Math.sin(a) * sp.r + u * 3, sp.z + u * 6);
    });
    pos.needsUpdate = true;
    mat.opacity = k;
  });
  return <points geometry={geo} material={mat} visible={k > 0.01} frustumCulled={false} />;
};

/* ---------- bokeh behind the cup ---------- */

const bokehSeed = rng(8);
const N_BOKEH = 70;
export const Bokeh = ({ p, s }: Beat) => {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(N_BOKEH * 3);
    for (let i = 0; i < N_BOKEH; i++) {
      arr[i * 3] = (bokehSeed() - 0.5) * 120;
      arr[i * 3 + 1] = -4 + bokehSeed() * 40;
      arr[i * 3 + 2] = -35 - bokehSeed() * 50;
    }
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 4.5,
        map: discTexture(),
        color: new THREE.Color("#d8954c"),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    [],
  );
  const k = Math.max(1 - smooth(0.2, 0.26, p), p >= CUT ? smooth(CUT, 0.68, p) : 0);
  mat.opacity = 0.28 * k * (0.85 + 0.15 * Math.sin((TAU * s) / 5));
  return <points geometry={geo} material={mat} visible={k > 0.01} rotation-y={0.04 * Math.sin((TAU * s) / 10)} />;
};

/* ---------- type that lives in the world ---------- */

const WORDS = [
  { word: "Origin", pos: [9, 44.5, -24] as const, rotY: -0.22, width: 18, a: 0.27, b: 0.43 },
  { word: "Roast", pos: [0, 40, -84] as const, rotY: 0, width: 20, a: 0.47, b: 0.605 },
  { word: "Pour", pos: [7, 8, -12] as const, rotY: -0.55, width: 15, a: 0.66, b: 0.82 },
];

/** `skip`: words the website covers with its own HTML panel (they would collide on screen). */
export const WorldType = ({ p, font, skip = [] }: Beat & { font: string; skip?: string[] }) => {
  const mats = useMemo(
    () =>
      WORDS.map(
        (w) =>
          new THREE.MeshBasicMaterial({
            map: wordTexture(w.word, font),
            color: new THREE.Color("#e8b06c").multiplyScalar(1.6),
            transparent: true,
            depthWrite: false,
            toneMapped: false,
            side: THREE.DoubleSide,
          }),
      ),
    [font],
  );
  return (
    <>
      {WORDS.map((w, i) => {
        const inStage = i === 2 ? p >= CUT : p < CUT;
        const v = inStage && !skip.includes(w.word) ? env(p, w.a, w.a + 0.025, w.b - 0.025, w.b) : 0;
        mats[i].opacity = 0.75 * v;
        return (
          <mesh key={w.word} position={w.pos as unknown as THREE.Vector3Tuple} rotation-y={w.rotY} material={mats[i]} visible={v > 0.01}>
            <planeGeometry args={[w.width, w.width / 4]} />
          </mesh>
        );
      })}
    </>
  );
};

/* ---------- hero objects: one real subject under every website pin ---------- */

/* coffee branch: woody stem, cherries clustered at the nodes, paired leaves, mixed ripeness */
const RIPENESS = ["#a3101b", "#7e0c16", "#b3121e", "#c4521c", "#a3101b", "#6f8b3a", "#8f0e19", "#b0301a"];
const branchSeed = rng(424);
const NODES = [-1.75, 0, 1.6].map((x, n) => ({
  x,
  cherries: Array.from({ length: n === 1 ? 5 : 4 }, (_, k) => {
    const ang = (k / (n === 1 ? 5 : 4)) * TAU + branchSeed() * 0.4;
    return {
      ang,
      dx: (branchSeed() - 0.5) * 0.25,
      color: n === 1 && k === 0 ? "#b3121e" : RIPENESS[Math.floor(branchSeed() * RIPENESS.length)],
      size: 0.4 + branchSeed() * 0.06,
    };
  }),
}));
const branchY = (x: number) => 0.18 * Math.sin(x * 0.7) - 0.03 * x * x;

const CoffeeBranch = () => {
  const geo = useMemo(() => {
    const pts = Array.from({ length: 12 }, (_, i) => {
      const x = -2.9 + (i / 11) * 5.8;
      return new THREE.Vector3(x, branchY(x), 0);
    });
    const stem = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.075, 10, false);
    return { stem, cherry: makeCherry(), leaf: makeLeaf(), tip: new THREE.SphereGeometry(1, 12, 8) };
  }, []);
  const mats = useMemo(() => {
    const cherry = (c: string) =>
      new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.36, clearcoat: 0.5, clearcoatRoughness: 0.3, sheen: 0.35, sheenColor: new THREE.Color("#ff7a60") });
    return {
      cherry: Object.fromEntries(RIPENESS.concat("#b3121e").map((c) => [c, cherry(c)])) as Record<string, THREE.MeshPhysicalMaterial>,
      wood: new THREE.MeshStandardMaterial({ color: "#5a4630", roughness: 0.8 }),
      tip: new THREE.MeshStandardMaterial({ color: "#2a160c", roughness: 0.9 }),
      leaf: new THREE.MeshStandardMaterial({ map: leafTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5 }),
    };
  }, []);
  return (
    <group>
      <mesh geometry={geo.stem} material={mats.wood} />
      {NODES.map((n, ni) => (
        <group key={ni} position={[n.x, branchY(n.x), 0]}>
          {/* cherries ring the stem, stem-end inward, touching but not intersecting */}
          {n.cherries.map((c, ci) => {
            const r = 0.47;
            const pos: THREE.Vector3Tuple = [c.dx, Math.sin(c.ang) * r - 0.05, Math.cos(c.ang) * r];
            const rot: THREE.Vector3Tuple = [-c.ang + Math.PI / 2, 0, 0];
            return (
              <group key={ci} position={pos} rotation={rot}>
                <mesh geometry={geo.cherry} material={mats.cherry[c.color]} scale={c.size} />
                <mesh geometry={geo.tip} material={mats.tip} position={[0, -c.size * 1.02, 0]} scale={[0.07, 0.03, 0.07]} />
              </group>
            );
          })}
          {/* a pair of opposite leaves at each node */}
          {[1, -1].map((side) => (
            <mesh
              key={side}
              geometry={geo.leaf}
              material={mats.leaf}
              position={[0.15, 0.1, side * 0.35]}
              rotation={[side * 1.15, 0.5 + ni * 0.4, side * 0.35]}
              scale={[1.1, 1.25, 1.1]}
              onUpdate={(m) => m.translateY(1.35)}
            />
          ))}
        </group>
      ))}
    </group>
  );
};

/* ---------- hero objects: one real subject under every website pin ---------- */

export const HeroProps = ({ p, s }: Beat) => {
  const geo = useMemo(() => ({ bean: makeBean() }), []);
  const greenMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#7d8f4c", roughness: 0.55 }), []);
  const roastMat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    [],
  );
  if (p >= CUT) return null;
  roastMat.color.set(colorAt(p, ROAST));

  // coffee branch: in until the cherries pop into beans
  const cl = env(p, 0.24, 0.29, 0.365, 0.385);
  // the green bean they become
  const gb = env(p, 0.355, 0.375, 0.43, 0.45);
  // one bean riding the tunnel wall while the rest spin past it
  const tb = env(p, 0.43, 0.46, 0.585, 0.6);
  const bob = 0.25 * Math.sin((TAU * s) / 5);

  // the ripe cherry the website pin points at sits at the middle node, front: offset the branch so it lands on the anchor
  const sway = 0.12 * Math.sin((TAU * s) / 5);
  return (
    <>
      {cl > 0.01 && (
        <group position={[ANCHORS.cherries[0], ANCHORS.cherries[1] + bob, ANCHORS.cherries[2] - 0.47 * 1.5]} rotation={[0.1 + sway, -0.35, -0.12]} scale={1.5 * cl}>
          <CoffeeBranch />
        </group>
      )}
      {gb > 0.01 && (
        <mesh
          geometry={geo.bean}
          material={greenMat}
          position={[ANCHORS.greenBeans[0], ANCHORS.greenBeans[1] + bob, ANCHORS.greenBeans[2]]}
          rotation={[0.6 + s * 0.35, s * 0.5, 0.3]}
          scale={1.05 * gb}
        />
      )}
      {tb > 0.01 && (
        <mesh
          geometry={geo.bean}
          material={roastMat}
          position={ANCHORS.tunnel as unknown as THREE.Vector3Tuple}
          rotation={[s * 0.8, s * 1.1, 0.4]}
          scale={1.9 * tb}
        />
      )}
    </>
  );
};
