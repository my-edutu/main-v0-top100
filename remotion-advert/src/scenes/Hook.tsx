import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../components/Scene";
import { RisingWords } from "../components/Text";
import { COLORS, FONT_STACK, GRADIENT } from "../theme";

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const line = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  const barGrow = spring({ frame: frame - 44, fps, config: { damping: 18 } });

  return (
    <Scene>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
        <div
          style={{
            fontFamily: FONT_STACK,
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: COLORS.orangeLight,
            opacity: line,
            transform: `translateY(${interpolate(line, [0, 1], [16, 0])}px)`,
          }}
        >
          The 2026 cohort is calling
        </div>

        <RisingWords text="Applications" delay={14} fontSize={128} weight={700} />
        <RisingWords text="are open." delay={24} fontSize={128} weight={700} gradient />

        <div
          style={{
            width: interpolate(barGrow, [0, 1], [0, 340]),
            height: 8,
            borderRadius: 999,
            background: GRADIENT,
            marginTop: 8,
          }}
        />
      </div>
    </Scene>
  );
};
