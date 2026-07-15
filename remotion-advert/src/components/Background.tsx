import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS, LIGHT_FAN, RADIAL_GLOW } from "../theme";

// The recurring dark stage with a slowly drifting warm light-fan.
export const Background: React.FC<{ drift?: boolean }> = ({ drift = true }) => {
  const frame = useCurrentFrame();
  const rotate = drift ? Math.sin(frame / 90) * 4 : 0;
  const scale = 1 + (drift ? Math.sin(frame / 70) * 0.03 : 0);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: LIGHT_FAN,
          transform: `rotate(${rotate}deg) scale(${scale})`,
          transformOrigin: "50% 100%",
          opacity: 0.9,
        }}
      />
      <AbsoluteFill style={{ background: RADIAL_GLOW }} />
      {/* Subtle vignette to keep text legible */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(120% 120% at 50% 40%, rgba(5,6,15,0) 50%, rgba(5,6,15,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
