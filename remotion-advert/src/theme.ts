// Brand tokens for AFL 2026 — mirrors the site's orange→amber on deep navy.
export const COLORS = {
  ink: "#05060f",
  inkSoft: "#0a0c18",
  white: "#ffffff",
  orange: "#f97316",
  amber: "#f59e0b",
  orangeLight: "#fb923c",
  textMuted: "rgba(255,255,255,0.72)",
  textFaint: "rgba(255,255,255,0.55)",
};

export const GRADIENT = `linear-gradient(90deg, ${COLORS.orange} 0%, ${COLORS.amber} 100%)`;
export const GRADIENT_DIAG = `linear-gradient(135deg, ${COLORS.orange} 0%, ${COLORS.amber} 100%)`;

// Warm conic light-fan used behind hero scenes (matches afl2026 page).
export const LIGHT_FAN =
  "conic-gradient(from 200deg at 50% 118%, transparent 0deg, rgba(249,115,22,0.32) 20deg, transparent 34deg, rgba(245,158,11,0.3) 48deg, transparent 62deg, rgba(249,115,22,0.26) 76deg, transparent 92deg, rgba(251,146,60,0.28) 108deg, transparent 124deg, rgba(245,158,11,0.24) 140deg, transparent 162deg)";

export const RADIAL_GLOW =
  "radial-gradient(120% 90% at 50% 120%, rgba(249,115,22,0.34) 0%, rgba(5,6,15,0) 55%), radial-gradient(90% 70% at 50% -10%, rgba(15,23,42,0.6) 0%, rgba(5,6,15,0) 60%)";

export const FONT_STACK =
  "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif";
