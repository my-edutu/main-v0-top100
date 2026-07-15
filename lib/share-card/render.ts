/**
 * Canvas compositor for ambassador share cards.
 *
 * Draw order is background → photo (clipped to the cut-out) → frame artwork →
 * text. The photo is clipped so it can never bleed outside the cut-out no
 * matter how far the user pans or zooms, and the artwork sits on top so its
 * transparent hole reveals the photo.
 *
 * Everything here is browser-only (needs `document` and `Image`).
 */

import type { PhotoHole, ShareCardFrame, TextSpec } from "./frame"

/** User's framing of their photo inside the cut-out. */
export interface PhotoTransform {
  /** 1 = smallest size that still covers the cut-out. */
  scale: number
  /** Pan away from centre, in canvas px. */
  offsetX: number
  offsetY: number
}

export const IDENTITY_TRANSFORM: PhotoTransform = { scale: 1, offsetX: 0, offsetY: 0 }

export const MIN_SCALE = 1
export const MAX_SCALE = 4

export interface RenderInput {
  frame: ShareCardFrame
  /** null renders the card with an empty cut-out, which is the initial state. */
  photo: HTMLImageElement | null
  transform: PhotoTransform
  name: string
  role: string
  /** Resolved font family for canvas. See resolveFontFamily(). */
  fontFamily: string
  /** Preloaded artwork. null → built-in placeholder. */
  frameImage: HTMLImageElement | null
}

/**
 * next/font hashes the family name (e.g. `__Urbanist_abc123`), so a canvas
 * can't just ask for "Urbanist". Read whatever `--font-sans` actually resolved
 * to, and make sure the weights we draw with are loaded before first paint —
 * canvas silently falls back to a default face otherwise.
 */
export async function resolveFontFamily(): Promise<string> {
  if (typeof document === "undefined") return "sans-serif"

  const probe = document.createElement("span")
  probe.style.fontFamily = "var(--font-sans)"
  probe.style.position = "absolute"
  probe.style.visibility = "hidden"
  document.body.appendChild(probe)
  const family = getComputedStyle(probe).fontFamily || "sans-serif"
  probe.remove()

  try {
    await Promise.all([
      document.fonts.load(`600 34px ${family}`),
      document.fonts.load(`700 74px ${family}`),
    ])
    await document.fonts.ready
  } catch {
    // Font loading is best-effort; a fallback face still produces a usable card.
  }

  return family
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Frame artwork is same-origin, but this keeps the canvas untainted if a
    // frame is ever served from the Supabase CDN.
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Could not load image: ${src}`))
    img.src = src
  })
}

/**
 * Smallest scale factor at which the photo still fully covers the cut-out,
 * i.e. object-fit: cover. All user zoom is a multiple of this.
 */
function coverScale(img: HTMLImageElement, hole: PhotoHole): number {
  return Math.max(hole.width / img.naturalWidth, hole.height / img.naturalHeight)
}

/**
 * How far the photo can pan before a gap opens at the edge of the cut-out.
 * The studio clamps against this so the user physically cannot produce a card
 * with a sliver of background showing through.
 */
export function panBounds(
  img: HTMLImageElement,
  hole: PhotoHole,
  scale: number,
): { maxX: number; maxY: number } {
  const s = coverScale(img, hole) * scale
  return {
    maxX: Math.max(0, (img.naturalWidth * s - hole.width) / 2),
    maxY: Math.max(0, (img.naturalHeight * s - hole.height) / 2),
  }
}

export function clampTransform(
  img: HTMLImageElement,
  hole: PhotoHole,
  transform: PhotoTransform,
): PhotoTransform {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, transform.scale))
  const { maxX, maxY } = panBounds(img, hole, scale)
  return {
    scale,
    offsetX: Math.min(maxX, Math.max(-maxX, transform.offsetX)),
    offsetY: Math.min(maxY, Math.max(-maxY, transform.offsetY)),
  }
}

function clipToHole(ctx: CanvasRenderingContext2D, hole: PhotoHole) {
  ctx.beginPath()
  if (hole.shape === "circle") {
    const r = Math.min(hole.width, hole.height) / 2
    ctx.arc(hole.x + hole.width / 2, hole.y + hole.height / 2, r, 0, Math.PI * 2)
  } else if (hole.shape === "rounded") {
    const r = Math.min(hole.radius, hole.width / 2, hole.height / 2)
    ctx.roundRect(hole.x, hole.y, hole.width, hole.height, r)
  } else {
    ctx.rect(hole.x, hole.y, hole.width, hole.height)
  }
  ctx.clip()
}

function drawPhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  hole: PhotoHole,
  transform: PhotoTransform,
) {
  const s = coverScale(img, hole) * transform.scale
  const w = img.naturalWidth * s
  const h = img.naturalHeight * s
  const x = hole.x + (hole.width - w) / 2 + transform.offsetX
  const y = hole.y + (hole.height - h) / 2 + transform.offsetY

  ctx.save()
  clipToHole(ctx, hole)
  ctx.drawImage(img, x, y, w, h)
  ctx.restore()
}

function applyTransform(text: string, transform: TextSpec["transform"]): string {
  return transform === "uppercase" ? text.toUpperCase() : text
}

function measure(ctx: CanvasRenderingContext2D, text: string, letterSpacing: number): number {
  const base = ctx.measureText(text).width
  // Canvas letterSpacing isn't universal (Safari lagged), so we account for
  // tracking ourselves and draw per-character below when it's non-zero.
  return letterSpacing === 0 ? base : base + letterSpacing * Math.max(0, text.length - 1)
}

/**
 * Draws text centred vertically on spec.y, shrinking the size until it fits
 * spec.maxWidth. Long names get smaller rather than overflowing the artwork.
 */
function drawText(
  ctx: CanvasRenderingContext2D,
  rawText: string,
  spec: TextSpec,
  fontFamily: string,
) {
  const text = applyTransform(rawText.trim(), spec.transform)
  if (!text) return

  let size = spec.size
  const setFont = () => {
    ctx.font = `${spec.weight} ${size}px ${fontFamily}`
  }

  setFont()
  while (size > spec.minSize && measure(ctx, text, spec.letterSpacing) > spec.maxWidth) {
    size -= 1
    setFont()
  }

  ctx.fillStyle = spec.color
  ctx.textBaseline = "middle"

  if (spec.letterSpacing === 0) {
    ctx.textAlign = spec.align
    // Final guard: if it still doesn't fit at minSize, squeeze horizontally
    // rather than spill outside the frame.
    ctx.fillText(text, spec.x, spec.y, spec.maxWidth)
    return
  }

  // Manual tracking: place each glyph, so start from the left edge of the run.
  const total = measure(ctx, text, spec.letterSpacing)
  let cursor = spec.x
  if (spec.align === "center") cursor = spec.x - total / 2
  else if (spec.align === "right") cursor = spec.x - total

  ctx.textAlign = "left"
  for (const char of text) {
    ctx.fillText(char, cursor, spec.y)
    cursor += ctx.measureText(char).width + spec.letterSpacing
  }
}

/**
 * Stand-in artwork so the studio is fully usable before the designer delivers.
 * Deliberately reads as unfinished — it labels itself — so a placeholder card
 * never gets mistaken for the real thing in review.
 */
function drawPlaceholderFrame(ctx: CanvasRenderingContext2D, frame: ShareCardFrame) {
  const { width, height, photo } = frame

  const wash = ctx.createLinearGradient(0, height * 0.55, width, height)
  wash.addColorStop(0, "rgba(249, 115, 22, 0.35)")
  wash.addColorStop(1, "rgba(251, 191, 36, 0.12)")
  ctx.fillStyle = wash
  ctx.fillRect(0, height * 0.55, width, height * 0.45)

  // Ring around the cut-out.
  ctx.save()
  ctx.strokeStyle = "#f97316"
  ctx.lineWidth = 10
  ctx.beginPath()
  const r = Math.min(photo.width, photo.height) / 2 + 12
  ctx.arc(photo.x + photo.width / 2, photo.y + photo.height / 2, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  // Bottom band the text sits against.
  const band = ctx.createLinearGradient(0, 0, width, 0)
  band.addColorStop(0, "#f97316")
  band.addColorStop(1, "#fbbf24")
  ctx.fillStyle = band
  ctx.fillRect(0, height - 44, width, 44)

  ctx.save()
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
  ctx.font = "600 22px sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("PLACEHOLDER FRAME — AWAITING ARTWORK", width / 2, 58)
  ctx.restore()
}

/** Paints one complete card. Safe to call on every pointer move. */
export function renderCard(ctx: CanvasRenderingContext2D, input: RenderInput) {
  const { frame, photo, transform, name, role, fontFamily, frameImage } = input

  ctx.clearRect(0, 0, frame.width, frame.height)
  ctx.fillStyle = frame.background
  ctx.fillRect(0, 0, frame.width, frame.height)

  if (photo) drawPhoto(ctx, photo, frame.photo, transform)

  if (frameImage) ctx.drawImage(frameImage, 0, 0, frame.width, frame.height)
  else drawPlaceholderFrame(ctx, frame)

  drawText(ctx, name, frame.name, fontFamily)
  drawText(ctx, role, frame.role, fontFamily)
}

export function toSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "ambassador"
  )
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not export the card."))),
      "image/png",
    )
  })
}
