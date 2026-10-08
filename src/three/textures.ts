import * as THREE from "three";
import { rng, smooth } from "../lib";

const canvas = (w: number, h = w) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

/* ---------- crema + latte art (redrawn per frame while the art is pouring) ---------- */

const cremaSpeckle = (() => {
  const r = rng(91);
  return Array.from({ length: 1400 }, () => ({ a: r() * Math.PI * 2, d: Math.sqrt(r()), s: 0.6 + r() * 2.2, l: r() }));
})();

export class CremaTexture {
  readonly canvas = canvas(1024);
  readonly texture = new THREE.CanvasTexture(this.canvas);
  private key = "";
  constructor() {
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
  }

  /** art: 0..1 rosetta progress; milk: 0..1 how much white foam has spread; swirl: radians */
  draw(art: number, milk: number, swirl: number) {
    const key = `${art.toFixed(3)}|${milk.toFixed(3)}|${swirl.toFixed(3)}`;
    if (key === this.key) return;
    this.key = key;
    const g = this.canvas.getContext("2d")!;
    const S = 1024;
    const C = S / 2;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, S, S);
    g.translate(C, C);
    g.rotate(swirl);

    // espresso crema: tiger-striped caramel with a darker rim
    const base = g.createRadialGradient(-40, -60, 20, 0, 0, C);
    base.addColorStop(0, "#d79b5c");
    base.addColorStop(0.45, "#b0703a");
    base.addColorStop(0.8, "#7a4220");
    base.addColorStop(0.95, "#4d2610");
    base.addColorStop(1, "#3a1c0b");
    g.fillStyle = base;
    g.fillRect(-C, -C, S, S);
    // marbling
    g.globalAlpha = 0.18;
    for (let i = 0; i < 9; i++) {
      g.strokeStyle = i % 2 ? "#f0c084" : "#5a2c10";
      g.lineWidth = 18 + i * 3;
      g.beginPath();
      g.arc(Math.sin(i * 1.7) * 60, Math.cos(i * 2.3) * 60, 120 + i * 42, i, i + 2.4);
      g.stroke();
    }
    g.globalAlpha = 1;
    for (const p of cremaSpeckle) {
      g.fillStyle = p.l > 0.5 ? "rgba(255,226,180,0.22)" : "rgba(60,25,8,0.25)";
      g.beginPath();
      g.arc(Math.cos(p.a) * p.d * C * 0.96, Math.sin(p.a) * p.d * C * 0.96, p.s, 0, Math.PI * 2);
      g.fill();
    }
    // foam ring at the cup wall
    const ring = g.createRadialGradient(0, 0, C * 0.8, 0, 0, C);
    ring.addColorStop(0, "rgba(232,190,140,0)");
    ring.addColorStop(0.85, "rgba(232,196,150,0.55)");
    ring.addColorStop(1, "rgba(120,70,35,0.9)");
    g.fillStyle = ring;
    g.fillRect(-C, -C, S, S);

    if (milk > 0) {
      // milk spreading under the art (a soft pale base)
      const m = g.createRadialGradient(0, 40, 0, 0, 40, C * 0.66 * milk);
      m.addColorStop(0, "rgba(243,226,200,0.5)");
      m.addColorStop(1, "rgba(243,226,200,0)");
      g.fillStyle = m;
      g.beginPath();
      g.arc(0, 40, C * 0.7, 0, Math.PI * 2);
      g.fill();
    }
    if (art > 0) drawRosetta(g, art);
    this.texture.needsUpdate = true;
  }
}

/** Rosetta poured from the bottom (near the handle) up: leaves, heart, pull-through. */
const drawRosetta = (g: CanvasRenderingContext2D, art: number) => {
  const LEAVES = 9;
  const n = LEAVES + 2;
  const seg = (i: number) => smooth(i / n, (i + 1) / n, art);
  g.save();
  g.rotate(-Math.PI / 2 + 0.08);
  g.scale(1.32, 1.32);
  g.fillStyle = "#f6ead8";
  g.shadowColor = "rgba(255,240,215,0.6)";
  g.shadowBlur = 6;
  for (let i = 0; i < LEAVES; i++) {
    const k = seg(i);
    if (k <= 0) continue;
    const x = -250 + i * 46; // along the stem
    const w = (230 - i * 19) * k; // half-width of each leaf
    const t = 26 - i * 1.4; // leaf thickness
    g.beginPath();
    g.moveTo(x + 6, -w);
    g.quadraticCurveTo(x - 40, 0, x + 6, w);
    g.quadraticCurveTo(x - 40 + t, 0, x + 6, -w);
    g.fill();
  }
  const heart = seg(LEAVES);
  if (heart > 0) {
    const hx = 190;
    const r = 70 * heart;
    g.beginPath();
    g.moveTo(hx + r * 1.1, 0);
    g.bezierCurveTo(hx + r * 0.2, -r * 1.4, hx - r * 1.1, -r * 0.6, hx - r * 0.3, 0);
    g.bezierCurveTo(hx - r * 1.1, r * 0.6, hx + r * 0.2, r * 1.4, hx + r * 1.1, 0);
    g.fill();
  }
  const pull = seg(LEAVES + 1);
  if (pull > 0) {
    g.strokeStyle = "#f6ead8";
    g.lineCap = "round";
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(-290, 0);
    g.lineTo(-290 + pull * 560, 0);
    g.stroke();
    // the pull drags the crema through the leaves
    g.strokeStyle = "rgba(150,90,45,0.55)";
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(-280, 0);
    g.lineTo(-280 + pull * 530, 0);
    g.stroke();
  }
  g.restore();
};

/* ---------- simple sprite textures ---------- */

export const discTexture = () => {
  const c = canvas(128);
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.55, "rgba(255,255,255,0.75)");
  r.addColorStop(0.75, "rgba(255,255,255,0.12)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  return t;
};

/** Radial alpha for the tabletop: a pool of light that dissolves into the dark. */
export const tableFade = () => {
  const c = canvas(512);
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  r.addColorStop(0, "#fff");
  r.addColorStop(0.18, "#fff");
  r.addColorStop(0.42, "#555");
  r.addColorStop(0.7, "#000");
  g.fillStyle = r;
  g.fillRect(0, 0, 512, 512);
  return new THREE.CanvasTexture(c);
};

export const shadowTexture = () => {
  const c = canvas(256);
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, "rgba(0,0,0,0.85)");
  r.addColorStop(0.55, "rgba(0,0,0,0.45)");
  r.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
};

export const leafTexture = () => {
  const c = canvas(256, 512);
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, "#1d3214");
  grad.addColorStop(0.5, "#3c5a22");
  grad.addColorStop(1, "#1a2c12");
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(128, 6);
  g.bezierCurveTo(250, 140, 240, 380, 128, 506);
  g.bezierCurveTo(16, 380, 6, 140, 128, 6);
  g.fill();
  g.strokeStyle = "rgba(150,180,110,0.5)";
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(128, 20);
  g.lineTo(128, 500);
  g.stroke();
  g.lineWidth = 2;
  for (let i = 1; i < 9; i++) {
    const y = 40 + i * 50;
    g.beginPath();
    g.moveTo(128, y);
    g.quadraticCurveTo(170, y - 20, 215, y - 50);
    g.moveTo(128, y);
    g.quadraticCurveTo(86, y - 20, 41, y - 50);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** Big serif word rendered to a texture, for type that lives inside the 3D world. */
export const wordTexture = (word: string, font: string) => {
  const c = canvas(2048, 512);
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `italic 300 330px ${font}`;
  g.fillText(word, 1024, 270);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

/* ---------- shaders ---------- */

const NOISE = /* glsl */ `
  vec3 hash3(vec3 p){ p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6)));
    return -1.0 + 2.0*fract(sin(p)*43758.5453123); }
  float noise(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); vec3 u=f*f*(3.0-2.0*f);
    return mix(mix(mix(dot(hash3(i),f), dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),
                   mix(dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0)), dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
               mix(mix(dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1)), dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),
                   mix(dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1)), dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z); }
  float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*noise(p); p*=2.03; a*=0.5; } return s; }
`;

/**
 * Wispy smoke on a camera-facing plane. `loop` is 0..1 around a 10 s cycle: noise is
 * sampled on a circle in a 3rd dimension, so the motion loops with no seam.
 */
export const steamMaterial = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uLoop: { value: 0 }, uOpacity: { value: 1 }, uSeed: { value: 0 }, uColor: { value: new THREE.Color("#ffe9d0") } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform float uLoop, uOpacity, uSeed; uniform vec3 uColor; varying vec2 vUv;
      void main(){
        float a = uLoop*6.2831853;
        vec2 uv = vUv;
        // rising: scroll noise downward in uv; curl sideways more as it climbs
        float rise = uLoop*2.0;
        float sway = fbm(vec3(uv.y*1.4+uSeed, cos(a)*0.7, sin(a)*0.7))*0.55*uv.y;
        float x = (uv.x-0.5) + sway;
        float n = fbm(vec3(x*3.0+uSeed, uv.y*2.2 - rise*1.0, cos(a)*1.3+sin(a)*0.4));
        float n2 = fbm(vec3(x*4.0-uSeed, uv.y*2.6 - rise*1.4, sin(a)*1.3));
        float width = mix(0.07, 0.32, smoothstep(0.0,1.0,uv.y));
        float body = exp(-pow(x/width,2.0));
        float strands = smoothstep(-0.1, 0.6, n + n2*0.35);
        float fade = smoothstep(0.0,0.1,uv.y) * (1.0-smoothstep(0.35,0.9,uv.y));
        float alpha = body*strands*fade*uOpacity;
        gl_FragColor = vec4(uColor*alpha*0.3, 1.0);
      }`,
  });

export const mistMaterial = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uLoop: { value: 0 }, uOpacity: { value: 0 }, uSeed: { value: 0 }, uColor: { value: new THREE.Color("#cfc5ad") } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform float uLoop, uOpacity, uSeed; uniform vec3 uColor; varying vec2 vUv;
      void main(){
        float a = uLoop*6.2831853;
        vec2 c = vUv-0.5;
        float edge = 1.0-smoothstep(0.18,0.5,length(c*vec2(1.0,1.6)));
        float n = fbm(vec3(vUv*2.5+uSeed, 0.0) + vec3(cos(a),sin(a),0.0)*0.6);
        float alpha = edge*smoothstep(-0.25,0.55,n)*uOpacity;
        gl_FragColor = vec4(uColor, alpha);
      }`,
  });
