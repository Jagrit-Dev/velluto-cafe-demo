import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Bloom, DepthOfField, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";
import { ANCHORS, CUT, cameraAt, type Vec3 } from "./scene/camera";
import { env, smooth } from "./lib";
import { Beans, Bokeh, CameraRig, Cherries, CupStage, HeroProps, Leaves, Lights, Mist, Sparks, Steam, Stream, WorldType } from "./three/World";

const fraunces = loadFraunces("normal", { weights: ["300", "400"], subsets: ["latin"] });
const frauncesItalic = loadFraunces("italic", { weights: ["300"], subsets: ["latin"] });
const manrope = loadManrope("normal", { weights: ["500"], subsets: ["latin"] });

type Props = { showType: boolean; noPost?: boolean };

/** Where depth of field focuses, per shot. */
const focusAt = (p: number, s: number): Vec3 => {
  if (p >= CUT) return [0, 4.2, 0];
  if (p < 0.24) return [0, 4, 0];
  // rack focus onto the coffee branch while it is the subject
  if (p > 0.27 && p < 0.375) return ANCHORS.cherries;
  const c = cameraAt(p, s);
  const d = [c.target[0] - c.pos[0], c.target[1] - c.pos[1], c.target[2] - c.pos[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const dist = p < 0.43 ? 12 : 9;
  return [c.pos[0] + (d[0] / l) * dist, c.pos[1] + (d[1] / l) * dist, c.pos[2] + (d[2] / l) * dist];
};

export const Velluto3D = ({ showType, noPost }: Props) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const p = frame / durationInFrames;
  const s = frame / fps;

  // canvas-drawn 3D words need the webfont fully loaded first
  const [handle] = useState(() => delayRender("fonts"));
  const [fontReady, setFontReady] = useState(false);
  useEffect(() => {
    Promise.all([
      fraunces.waitUntilDone(),
      frauncesItalic.waitUntilDone(),
      manrope.waitUntilDone(),
      document.fonts.load(`italic 300 330px ${frauncesItalic.fontFamily}`),
    ]).then(() => {
      setFontReady(true);
      continueRender(handle);
    });
  }, [handle]);

  const flash = env(p, CUT - 0.012, CUT, CUT, CUT + 0.016);
  const beat = { p, s };

  return (
    <AbsoluteFill style={{ background: "#0c0705" }}>
      {fontReady && (
        <ThreeCanvas
          width={width}
          height={height}
          camera={{ fov: 28, near: 0.1, far: 400, position: [0, 13, 33] }}
          gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.NoToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
          dpr={1}
        >
          <SettledRender frame={frame} />
          <CameraRig {...beat} />
          <Lights {...beat} />
          <CupStage {...beat} />
          <Stream {...beat} />
          <Steam {...beat} />
          <Bokeh {...beat} />
          <Mist {...beat} />
          <Cherries {...beat} />
          <Leaves {...beat} />
          <Beans {...beat} />
          <HeroProps {...beat} />
          <Sparks {...beat} />
          <WorldType {...beat} font={frauncesItalic.fontFamily} skip={showType ? [] : ["Roast"]} />
          {!noPost && <EffectComposer multisampling={4}>
            <DepthOfField target={focusAt(p, s)} focalLength={0.045} bokehScale={p < CUT && p > 0.25 ? 3.2 : 2.6} />
            <Bloom intensity={0.9} luminanceThreshold={0.72} luminanceSmoothing={0.2} mipmapBlur />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            <Vignette offset={0.28} darkness={0.72} />
          </EffectComposer>}
        </ThreeCanvas>
      )}
      {/* warm white-out that hides the cut on the bar line */}
      <AbsoluteFill style={{ background: "#ffdfb4", opacity: flash * 0.9, mixBlendMode: "screen" }} />
      {showType && <Typography p={p} />}
    </AbsoluteFill>
  );
};

/**
 * Remotion advances R3F once per frame from an effect that can fire before the effect
 * composer has finished wiring its passes (first frame renders black). Hold the frame,
 * wait one animation frame for every effect to settle, then render twice.
 */
const SettledRender = ({ frame }: { frame: number }) => {
  const { advance } = useThree();
  useEffect(() => {
    const handle = delayRender(`settle frame ${frame}`);
    const id = requestAnimationFrame(() => {
      advance(performance.now());
      advance(performance.now());
      continueRender(handle);
    });
    return () => {
      cancelAnimationFrame(id);
      continueRender(handle);
    };
  }, [frame, advance]);
  return null;
};

/* ---------- HeroLoop brand type (the website sets its own) ---------- */

const CREAM = "#f3e6d3";
const WORD = "VELLUTO";

const Typography = ({ p }: { p: number }) => {
  const out = smooth(0.15, 0.22, p);
  const chapters = [
    { n: "I", t: "Origin", m: "Huila, Colombia · 1,900 m", a: 0.29, b: 0.42 },
    { n: "II", t: "Roast", m: "Fourteen minutes, by hand", a: 0.46, b: 0.6 },
    { n: "III", t: "Pour", m: "18 g in · 36 g out · 28 s", a: 0.665, b: 0.8 },
  ];
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 120,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          fontFamily: fraunces.fontFamily,
          fontWeight: 300,
          fontSize: 132,
          letterSpacing: "0.34em",
          paddingLeft: "0.34em",
          color: CREAM,
          textShadow: "0 8px 40px rgba(0,0,0,0.5)",
        }}
      >
        {WORD.split("").map((ch, i) => {
          const back = smooth(0.86 + i * 0.009, 0.915 + i * 0.009, p);
          const v = Math.max(1 - out, back);
          const rise = p < 0.5 ? -out * 40 : (1 - back) * 30;
          return (
            <span key={i} style={{ display: "inline-block", opacity: v, transform: `translateY(${rise}px)`, filter: `blur(${(1 - v) * 14}px)` }}>
              {ch}
            </span>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          top: 290,
          width: "100%",
          textAlign: "center",
          fontFamily: manrope.fontFamily,
          fontWeight: 500,
          fontSize: 20,
          letterSpacing: "0.5em",
          color: CREAM,
          opacity: 0.72 * Math.max(1 - out, smooth(0.9, 0.96, p)),
        }}
      >
        COFFEE ATELIER — SLOW POURED SINCE 2019
      </div>
      {chapters.map((c) => {
        const v = env(p, c.a, c.a + 0.03, c.b - 0.03, c.b);
        if (v < 0.01) return null;
        return (
          <div key={c.n} style={{ position: "absolute", left: 120, bottom: 110, color: CREAM, opacity: v, transform: `translateY(${(1 - v) * 24}px)` }}>
            <div style={{ fontFamily: manrope.fontFamily, fontSize: 18, letterSpacing: "0.4em", opacity: 0.6 }}>CHAPTER {c.n}</div>
            <div style={{ fontFamily: frauncesItalic.fontFamily, fontWeight: 300, fontSize: 84, lineHeight: 1.1 }}>{c.t}</div>
            <div style={{ fontFamily: manrope.fontFamily, fontSize: 20, letterSpacing: "0.2em", opacity: 0.7 }}>{c.m}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
