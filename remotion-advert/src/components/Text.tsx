import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_STACK, GRADIENT } from "../theme";

// Small uppercase kicker with wide tracking (e.g. "AFL 2026").
export const Kicker: React.FC<{ children: React.ReactNode; delay?: number }> = ({
  children,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        fontFamily: FONT_STACK,
        fontSize: 30,
        fontWeight: 700,
        letterSpacing: "0.42em",
        textTransform: "uppercase",
        color: COLORS.textFaint,
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
      }}
    >
      {children}
    </div>
  );
};

// Headline where each word springs up in sequence.
export const RisingWords: React.FC<{
  text: string;
  delay?: number;
  fontSize?: number;
  gradient?: boolean;
  stagger?: number;
  weight?: number;
}> = ({ text, delay = 0, fontSize = 96, gradient = false, stagger = 4, weight = 700 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: `0 ${fontSize * 0.26}px`,
        maxWidth: "92%",
      }}
    >
      {words.map((word, i) => {
        const s = spring({
          frame: frame - delay - i * stagger,
          fps,
          config: { damping: 18, mass: 0.7 },
        });
        return (
          <span
            key={i}
            style={{
              fontFamily: FONT_STACK,
              fontSize,
              fontWeight: weight,
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              color: gradient ? "transparent" : COLORS.white,
              backgroundImage: gradient ? GRADIENT : undefined,
              backgroundClip: gradient ? "text" : undefined,
              WebkitBackgroundClip: gradient ? "text" : undefined,
              display: "inline-block",
              opacity: s,
              transform: `translateY(${interpolate(s, [0, 1], [fontSize * 0.7, 0])}px)`,
              textShadow: gradient ? "none" : "0 4px 30px rgba(0,0,0,0.45)",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

// Gradient pill CTA button.
export const Pill: React.FC<{
  children: React.ReactNode;
  delay?: number;
  outline?: boolean;
}> = ({ children, delay = 0, outline = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 14 } });
  return (
    <div
      style={{
        fontFamily: FONT_STACK,
        fontSize: 40,
        fontWeight: 600,
        color: COLORS.white,
        padding: "28px 56px",
        borderRadius: 999,
        background: outline ? "rgba(255,255,255,0.06)" : GRADIENT,
        border: outline ? "2px solid rgba(255,255,255,0.28)" : "none",
        boxShadow: outline ? "none" : "0 20px 60px -20px rgba(249,115,22,0.7)",
        opacity: s,
        transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
      }}
    >
      {children}
    </div>
  );
};
