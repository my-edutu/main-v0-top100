import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../components/Scene";
import { RisingWords } from "../components/Text";
import { COLORS, FONT_STACK, GRADIENT } from "../theme";

const CARDS = [
  { src: "leader1.jpg", label: "Technology" },
  { src: "leader3.jpg", label: "Fintech" },
  { src: "leader2.jpg", label: "Business" },
  { src: "leader4.jpg", label: "Climate" },
];

const Card: React.FC<{ src: string; label: string; delay: number }> = ({
  src,
  label,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 16, mass: 0.8 } });
  return (
    <div
      style={{
        position: "relative",
        width: 380,
        height: 500,
        borderRadius: 32,
        overflow: "hidden",
        border: "2px solid rgba(255,255,255,0.12)",
        boxShadow: "0 30px 70px -30px rgba(0,0,0,0.7)",
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [70, 0])}px) scale(${interpolate(
          s,
          [0, 1],
          [0.9, 1]
        )})`,
      }}
    >
      <Img
        src={staticFile(src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${1.06 + Math.sin((frame + delay) / 60) * 0.02})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(5,6,15,0) 45%, rgba(5,6,15,0.85) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 24,
          bottom: 24,
          fontFamily: FONT_STACK,
          fontSize: 30,
          fontWeight: 600,
          color: COLORS.white,
          padding: "8px 20px",
          borderRadius: 999,
          background: GRADIENT,
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const Who: React.FC = () => {
  return (
    <Scene>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 70 }}>
        <div>
          <RisingWords text="Are you Africa's" fontSize={92} />
          <div style={{ height: 8 }} />
          <RisingWords text="next leader?" fontSize={92} gradient delay={6} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 34 }}>
          {CARDS.map((c, i) => (
            <Card key={c.src} src={c.src} label={c.label} delay={20 + i * 7} />
          ))}
        </div>
      </div>
    </Scene>
  );
};
