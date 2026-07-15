import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../components/Scene";
import { RisingWords } from "../components/Text";
import { COLORS, FONT_STACK, GRADIENT } from "../theme";

const GATHER = ["gather1.jpg", "gather2.jpg", "gather3.jpg"];

export const Festival: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pill = spring({ frame, fps, config: { damping: 16 } });
  const poster = spring({ frame: frame - 10, fps, config: { damping: 18, mass: 0.9 } });

  return (
    <Scene>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 46 }}>
        <div
          style={{
            fontFamily: FONT_STACK,
            fontSize: 30,
            fontWeight: 600,
            color: COLORS.white,
            padding: "12px 32px",
            borderRadius: 999,
            background: GRADIENT,
            opacity: pill,
            transform: `scale(${interpolate(pill, [0, 1], [0.8, 1])})`,
          }}
        >
          🎉 The grand finale
        </div>

        <div>
          <RisingWords text="Africa Future Leaders" fontSize={76} delay={8} />
          <div style={{ height: 6 }} />
          <RisingWords text="Festival." fontSize={76} gradient delay={14} />
        </div>

        <div
          style={{
            width: 560,
            height: 700,
            borderRadius: 36,
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.14)",
            boxShadow: "0 40px 90px -40px rgba(249,115,22,0.6)",
            opacity: poster,
            transform: `translateY(${interpolate(poster, [0, 1], [60, 0])}px) scale(${interpolate(
              poster,
              [0, 1],
              [0.92, 1]
            )})`,
          }}
        >
          <Img
            src={staticFile("festival.png")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${1.04 + Math.sin(frame / 70) * 0.02})`,
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 22 }}>
          {GATHER.map((g, i) => {
            const s = spring({ frame: frame - 30 - i * 6, fps, config: { damping: 18 } });
            return (
              <div
                key={g}
                style={{
                  width: 210,
                  height: 150,
                  borderRadius: 20,
                  overflow: "hidden",
                  border: "2px solid rgba(255,255,255,0.1)",
                  opacity: s,
                  transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px)`,
                }}
              >
                <Img
                  src={staticFile(g)}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT_STACK,
            fontSize: 32,
            fontWeight: 500,
            color: COLORS.textMuted,
            maxWidth: 760,
            opacity: spring({ frame: frame - 44, fps, config: { damping: 200 } }),
          }}
        >
          Music, culture, and community — come for the sessions, stay for the celebration.
        </div>
      </div>
    </Scene>
  );
};
