import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { Background } from "./components/Background";
import { Embers } from "./components/Embers";
import { Intro } from "./scenes/Intro";
import { Hook } from "./scenes/Hook";
import { Who } from "./scenes/Who";
import { Benefits } from "./scenes/Benefits";
import { Festival } from "./scenes/Festival";
import { CTA } from "./scenes/CTA";

loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

// Scene lengths in frames (@30fps). Scenes overlap by OVERLAP for cross-fades.
const OVERLAP = 15;
const SCENES = [
  { c: Intro, d: 120 },
  { c: Hook, d: 110 },
  { c: Who, d: 170 },
  { c: Benefits, d: 165 },
  { c: Festival, d: 185 },
  { c: CTA, d: 190 },
];

// Total = sum(durations) - overlaps between consecutive scenes.
export const ADVERT_DURATION =
  SCENES.reduce((sum, s) => sum + s.d, 0) - OVERLAP * (SCENES.length - 1);

export const Advert: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background />
      <Embers />
      <Series>
        {SCENES.map((scene, i) => {
          const Comp = scene.c;
          return (
            <Series.Sequence
              key={i}
              durationInFrames={scene.d}
              offset={i === 0 ? 0 : -OVERLAP}
            >
              <Comp />
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};
