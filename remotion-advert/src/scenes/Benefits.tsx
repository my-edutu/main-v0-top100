import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../components/Scene";
import { RisingWords } from "../components/Text";
import { COLORS, FONT_STACK, GRADIENT } from "../theme";

const STATS = [
  { value: "31", label: "countries represented" },
  { value: "2", label: "days of summit + festival" },
  { value: "100", label: "future leaders honoured" },
];

const BENEFITS = [
  "Recognition on a continental stage",
  "Learning tracks with global voices",
  "A network that outlasts the event",
  "Doors to real opportunities",
];

// Count-up number that eases to its target.
const StatNumber: React.FC<{ value: string; delay: number }> = ({ value, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const target = parseInt(value, 10);
  const display = Math.round(interpolate(s, [0, 1], [0, target]));
  return (
    <span
      style={{
        fontFamily: FONT_STACK,
        fontSize: 96,
        fontWeight: 700,
        color: "transparent",
        backgroundImage: GRADIENT,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        lineHeight: 1,
      }}
    >
      {display}
    </span>
  );
};

export const Benefits: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Scene>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 64 }}>
        <RisingWords text="More than an award." fontSize={80} />

        <div style={{ display: "flex", gap: 60 }}>
          {STATS.map((s, i) => (
            <div
              key={s.label}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}
            >
              <StatNumber value={s.value} delay={12 + i * 8} />
              <span
                style={{
                  fontFamily: FONT_STACK,
                  fontSize: 26,
                  fontWeight: 500,
                  color: COLORS.textMuted,
                  maxWidth: 220,
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 10 }}>
          {BENEFITS.map((b, i) => {
            const s = spring({ frame: frame - 40 - i * 8, fps, config: { damping: 20 } });
            return (
              <div
                key={b}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  opacity: s,
                  transform: `translateX(${interpolate(s, [0, 1], [-40, 0])}px)`,
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    background: GRADIENT,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: FONT_STACK,
                    fontSize: 40,
                    fontWeight: 600,
                    color: COLORS.white,
                  }}
                >
                  {b}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Scene>
  );
};
