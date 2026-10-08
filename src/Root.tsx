import { Composition } from "remotion";
import { Velluto3D } from "./Velluto3D";

export const Root = () => (
  <>
    {/* 10s seamless loop with brand type: hero background / portfolio embed (4 bars @ 96 BPM) */}
    <Composition
      id="HeroLoop"
      component={Velluto3D}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ showType: true }}
    />
    {/* 40s scroll film for the website: same beats, slowed 4x, no baked type (16 bars @ 96 BPM) */}
    <Composition
      id="Film"
      component={Velluto3D}
      durationInFrames={1200}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ showType: false }}
    />
  </>
);
