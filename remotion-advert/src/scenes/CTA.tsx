import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../components/Scene";
import { RisingWords } from "../components/Text";
import { COLORS, FONT_STACK, GRADIENT } from "../theme";

const BADGES = ["Dates announced soon", "In person + virtual", "31 countries"];

export const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame, fps, config: { damping: 16 } });
  const btn = spring({ frame: frame - 34, fps, config: { damping: 13 } });
  const url = spring({ frame: frame - 46, fps, config: { damping: 200 } });
  const pulse = 1 + Math.sin(frame / 12) * 0.02;

  return (
    <Scene fadeOut={0}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 50 }}>
        <Img
          src={staticFile("logo.png")}
          style={{
            width: 200,
            height: "auto",
            opacity: logo,
            transform: `translateY(${interpolate(logo, [0, 1], [30, 0])}px)`,
          }}
        />

        <div>
          <RisingWords text="Your seat at" fontSize={78} delay={8} />
          <div style={{ height: 6 }} />
          <RisingWords text="AFL 2026 awaits." fontSize={78} gradient delay={14} />
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center" }}>
          {BADGES.map((b, i) => {
            const s = spring({ frame: frame - 22 - i * 5, fps, config: { damping: 200 } });
            return (
              <span
                key={b}
                style={{
                  fontFamily: FONT_STACK,
                  fontSize: 28,
                  fontWeight: 500,
                  color: COLORS.textMuted,
                  padding: "12px 26px",
                  borderRadius: 999,
                  border: "1.5px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.05)",
                  opacity: s,
                }}
              >
                {b}
              </span>
            );
          })}
        </div>

        {/* Apply button */}
        <div
          style={{
            fontFamily: FONT_STACK,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.white,
            padding: "34px 90px",
            borderRadius: 999,
            background: GRADIENT,
            boxShadow: "0 24px 70px -18px rgba(249,115,22,0.75)",
            opacity: btn,
            transform: `scale(${interpolate(btn, [0, 1], [0.8, 1]) * pulse})`,
          }}
        >
          Apply now →
        </div>

        <div
          style={{
            fontFamily: FONT_STACK,
            fontSize: 40,
            fontWeight: 600,
            letterSpacing: "0.02em",
            color: COLORS.orangeLight,
            opacity: url,
            transform: `translateY(${interpolate(url, [0, 1], [16, 0])}px)`,
          }}
        >
          top100afl.com/apply
        </div>
      </div>
    </Scene>
  );
};
