import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

// Centers scene content and fades it out over the final frames so the
// continuous background carries between cuts.
export const Scene: React.FC<{
  children: React.ReactNode;
  fadeOut?: number;
  justify?: "center" | "flex-start" | "flex-end";
}> = ({ children, fadeOut = 14, justify = "center" }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const out =
    fadeOut <= 0
      ? 1
      : interpolate(
          frame,
          [durationInFrames - fadeOut, durationInFrames - 1],
          [1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
  return (
    <AbsoluteFill
      style={{
        opacity: out,
        justifyContent: justify,
        alignItems: "center",
        padding: "0 90px",
        textAlign: "center",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
