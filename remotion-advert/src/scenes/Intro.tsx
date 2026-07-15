import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../components/Scene";
import { Kicker, RisingWords } from "../components/Text";
import { COLORS, FONT_STACK } from "../theme";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoSpring = spring({ frame, fps, config: { damping: 16, mass: 0.8 } });
  const logoGlow = interpolate(Math.sin(frame / 18), [-1, 1], [0.3, 0.7]);

  return (
    <Scene>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 46 }}>
        <div
          style={{
            opacity: logoSpring,
            transform: `translateY(${interpolate(logoSpring, [0, 1], [40, 0])}px) scale(${interpolate(
              logoSpring,
              [0, 1],
              [0.85, 1]
            )})`,
            filter: `drop-shadow(0 0 ${40 * logoGlow}px rgba(249,115,22,${logoGlow}))`,
          }}
        >
          <Img src={staticFile("logo.png")} style={{ width: 260, height: "auto" }} />
        </div>

        <Kicker delay={10}>AFL 2026</Kicker>

        <div style={{ maxWidth: 900 }}>
          <RisingWords text="Africa Future Leaders" delay={18} fontSize={104} />
          <div style={{ height: 10 }} />
          <RisingWords text="Summit 2026" delay={30} fontSize={104} gradient />
        </div>

        <div
          style={{
            fontFamily: FONT_STACK,
            fontSize: 34,
            fontWeight: 500,
            color: COLORS.textMuted,
            opacity: spring({ frame: frame - 46, fps, config: { damping: 200 } }),
          }}
        >
          The continent&apos;s boldest young leaders. One stage.
        </div>
      </div>
    </Scene>
  );
};
