/**
 * Share-card frame definitions.
 *
 * A frame is artwork (a PNG with a transparent cut-out) plus the geometry
 * describing where the ambassador's photo and text land underneath it.
 * Everything is expressed in canvas pixels against `width` x `height`, so a
 * designer only has to match the canvas size and the cut-out rectangle.
 *
 * To ship real artwork: drop the PNG in /public/share-frames/ and point `src`
 * at it. `src: null` renders the built-in placeholder instead. See
 * docs/AMBASSADOR_SHARE_CARD.md for the full designer brief.
 */

export type TextTransform = "uppercase" | "none"

export interface TextSpec {
  /** Anchor point, canvas px. `align` decides what x means. */
  x: number
  /** Baseline-independent: y is the vertical centre of the text box. */
  y: number
  /** Text is shrunk until it fits this width. */
  maxWidth: number
  /** Starting font size, canvas px. Only ever shrinks from here. */
  size: number
  /** Lower bound for auto-shrink, so long names stay legible rather than vanishing. */
  minSize: number
  weight: number
  color: string
  align: CanvasTextAlign
  transform: TextTransform
  /** Extra tracking in canvas px. Applied per character. */
  letterSpacing: number
}

export type PhotoShape = "rect" | "rounded" | "circle"

export interface PhotoHole {
  x: number
  y: number
  width: number
  height: number
  shape: PhotoShape
  /** Corner radius in canvas px. Only used when shape is "rounded". */
  radius: number
}

export interface ShareCardFrame {
  id: string
  label: string
  /** Overlay artwork drawn on top of the photo. null → built-in placeholder. */
  src: string | null
  width: number
  height: number
  /** Painted before the photo, so it shows through any gap the photo doesn't cover. */
  background: string
  photo: PhotoHole
  name: TextSpec
  role: TextSpec
  /** Prefilled into the role input; ambassadors can override it. */
  defaultRole: string
}

const ORANGE = "#f97316"
const INK = "#05060f"

/**
 * 1080x1080 — the safe default for Instagram/WhatsApp/X. If the designer
 * delivers a different canvas, change `width`/`height` and the rects below to
 * match; nothing else in the pipeline assumes a square.
 */
export const AMBASSADOR_FRAME: ShareCardFrame = {
  id: "ambassador-2026",
  label: "Ambassador",
  src: null, // ← set to "/share-frames/ambassador-2026.png" once artwork lands
  width: 1080,
  height: 1080,
  background: INK,
  photo: {
    x: 240,
    y: 132,
    width: 600,
    height: 600,
    shape: "circle",
    radius: 0,
  },
  name: {
    x: 540,
    y: 838,
    maxWidth: 860,
    size: 74,
    minSize: 40,
    weight: 700,
    color: "#ffffff",
    align: "center",
    transform: "none",
    letterSpacing: 0,
  },
  role: {
    x: 540,
    y: 916,
    maxWidth: 780,
    size: 34,
    minSize: 22,
    weight: 600,
    color: ORANGE,
    align: "center",
    transform: "uppercase",
    letterSpacing: 3,
  },
  defaultRole: "AFL 2026 Ambassador",
}

export const FRAMES: ShareCardFrame[] = [AMBASSADOR_FRAME]
