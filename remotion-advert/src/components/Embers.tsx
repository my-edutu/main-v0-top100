import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../theme";

// Deterministic pseudo-random so particles are stable across renders.
const rand = (seed: number) => {
  const x = Math.sin(seed * 999.13) * 43758.5453;
  return x - Math.floor(x);
};

const COUNT = 40;

// Gently rising warm embers to give the stage some life.
export const Embers: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {new Array(COUNT).fill(0).map((_, i) => {
        const seed = i + 1;
        const x = rand(seed) * width;
        const size = 2 + rand(seed * 2) * 5;
        const speed = 0.4 + rand(seed * 3) * 0.9;
        const sway = 30 + rand(seed * 4) * 60;
        const phase = rand(seed * 5) * Math.PI * 2;
        const life = (frame * speed + rand(seed * 6) * durationInFrames) % (height + 200);
        const y = height + 100 - life;
        const dx = Math.sin(frame / 40 + phase) * sway;
        const opacity =
          0.15 + rand(seed * 7) * 0.4 * (0.5 + 0.5 * Math.sin(frame / 25 + phase));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + dx,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              background: i % 2 === 0 ? COLORS.orange : COLORS.amber,
              boxShadow: `0 0 ${size * 3}px ${COLORS.orange}`,
              opacity,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
