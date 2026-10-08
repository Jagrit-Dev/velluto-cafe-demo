import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.setConcurrency(3);
// real GPU WebGL for the three.js scene (RTX 3050 via ANGLE)
Config.setChromiumOpenGlRenderer("angle");
