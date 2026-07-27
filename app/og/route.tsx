import { ImageResponse } from "next/og"

import { OG_HEIGHT, OG_WIDTH, parseOgCard, type OgCard } from "@/lib/og"
import { SITE_URL } from "@/lib/site"

export const runtime = "nodejs"

const BASE = "#070B18"
const ACCENT = "#F59E0B"
const TITLE = "#FFFFFF"
const MUTED = "#C7CEDB"

const BRAND_GRADIENT = `linear-gradient(135deg, ${BASE} 0%, #101A33 55%, #1B2340 100%)`

/**
 * Two scrim layers, not one. Heroes range from dark photographs to bright
 * yellow flyers, so a directional gradient alone cannot guarantee contrast —
 * the flat wash underneath is what makes white text safe on any of them.
 */
const SCRIM_FLAT = "rgba(7,11,24,0.55)"
const SCRIM_DIRECTIONAL =
  "linear-gradient(90deg, rgba(7,11,24,0.92) 0%, rgba(7,11,24,0.78) 45%, rgba(7,11,24,0.30) 100%)"

/** satori does not honour the `inset` shorthand; edges must be explicit. */
const FILL = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const

type FontSpec = { name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: "normal" }

/**
 * Fonts are fetched once per process, not once per request. A failed fetch
 * resolves to an empty set and satori falls back to its built-in font — an
 * off-brand card beats a 500 on a link someone already shared.
 */
let fontsPromise: Promise<FontSpec[]> | null = null

async function loadFonts(): Promise<FontSpec[]> {
  if (!fontsPromise) {
    fontsPromise = fetchUrbanist().catch(() => [])
  }
  return fontsPromise
}

async function fetchUrbanist(): Promise<FontSpec[]> {
  const weights: Array<400 | 700 | 800> = [400, 700, 800]
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Urbanist:wght@${weights.join(";")}&display=swap`,
    {
      // Google serves woff2 to modern browsers; satori needs ttf, which is
      // what the legacy user agent below gets us.
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1)" },
    },
  ).then((res) => (res.ok ? res.text() : Promise.reject(new Error(`font css ${res.status}`))))

  const urls = [...css.matchAll(/src:\s*url\((https:\/\/[^)]+)\)/g)].map((match) => match[1])
  if (urls.length === 0) throw new Error("no font urls in css")

  const specs = await Promise.all(
    weights.map(async (weight, index) => {
      const url = urls[index] ?? urls[urls.length - 1]
      const data = await fetch(url).then((res) =>
        res.ok ? res.arrayBuffer() : Promise.reject(new Error(`font ${res.status}`)),
      )
      return { name: "Urbanist", data, weight, style: "normal" as const }
    }),
  )

  return specs
}

/**
 * Resolves the hero to a fetchable absolute URL. Validation already happened
 * in parseOgCard; this only turns a same-origin path into an absolute URL and
 * confirms the bytes actually exist, so the layout can fall back cleanly.
 */
async function resolveHeroSrc(hero: string | null): Promise<string | null> {
  if (!hero) return null

  const absolute = hero.startsWith("/") ? new URL(hero, SITE_URL).toString() : hero

  try {
    const response = await fetch(absolute)
    if (!response.ok) return null
    const type = response.headers.get("content-type") ?? ""
    if (!type.startsWith("image/")) return null
    return absolute
  } catch {
    return null
  }
}

/** Titles step down as they grow so three lines always fit the canvas. */
function titleSize(title: string): number {
  if (title.length <= 42) return 72
  if (title.length <= 78) return 56
  return 44
}

function Eyebrow({ text }: { text: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: 4,
        textTransform: "uppercase",
        color: ACCENT,
      }}
    >
      <div style={{ width: 44, height: 4, background: ACCENT, borderRadius: 2 }} />
      <span>{text}</span>
    </div>
  )
}

function Wordmark() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <span style={{ fontSize: 22, fontWeight: 800, color: TITLE, letterSpacing: 1 }}>TOP100 AFL</span>
      <span style={{ fontSize: 18, color: MUTED }}>top100afl.com</span>
    </div>
  )
}

function BannerCard({ card, heroSrc }: { card: OgCard; heroSrc: string | null }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: BRAND_GRADIENT,
        fontFamily: "Urbanist, sans-serif",
      }}
    >
      {heroSrc ? (
        <img
          src={heroSrc}
          width={OG_WIDTH}
          height={OG_HEIGHT}
          style={{ ...FILL, width: OG_WIDTH, height: OG_HEIGHT, objectFit: "cover" }}
        />
      ) : null}

      {/* Scrim so the header holds contrast over any hero, dark or bright. */}
      <div style={{ ...FILL, background: SCRIM_FLAT, display: "flex" }} />
      <div style={{ ...FILL, background: SCRIM_DIRECTIONAL, display: "flex" }} />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          width: "100%",
          height: "100%",
          padding: 72,
        }}
      >
        {card.eyebrow ? <Eyebrow text={card.eyebrow} /> : null}

        <div
          style={{
            display: "flex",
            fontSize: titleSize(card.title),
            fontWeight: 800,
            color: TITLE,
            lineHeight: 1.08,
            marginTop: card.eyebrow ? 22 : 0,
            maxWidth: 940,
          }}
        >
          {card.title}
        </div>

        {card.subtitle ? (
          <div style={{ display: "flex", fontSize: 28, color: MUTED, lineHeight: 1.35, marginTop: 20, maxWidth: 880 }}>
            {card.subtitle}
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 34 }}>
          <Wordmark />
        </div>
      </div>
    </div>
  )
}

/**
 * For posters and magazine covers. The asset carries its own typography, so
 * putting the header on top of it produces text over text — here the artwork
 * is shown whole on the right and the header gets clean space on the left.
 */
function CoverCard({ card, heroSrc }: { card: OgCard; heroSrc: string | null }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: BRAND_GRADIENT,
        fontFamily: "Urbanist, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: 720,
          height: "100%",
          padding: 72,
        }}
      >
        {card.eyebrow ? <Eyebrow text={card.eyebrow} /> : null}

        <div
          style={{
            display: "flex",
            fontSize: card.title.length <= 42 ? 60 : 46,
            fontWeight: 800,
            color: TITLE,
            lineHeight: 1.1,
            marginTop: card.eyebrow ? 22 : 0,
          }}
        >
          {card.title}
        </div>

        {card.subtitle ? (
          <div style={{ display: "flex", fontSize: 26, color: MUTED, lineHeight: 1.35, marginTop: 18 }}>
            {card.subtitle}
          </div>
        ) : null}

        <div style={{ display: "flex", marginTop: 36 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: TITLE, letterSpacing: 1 }}>TOP100 AFL</span>
          <span style={{ fontSize: 20, color: MUTED, marginLeft: 14 }}>top100afl.com</span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
          background: "rgba(255,255,255,0.04)",
        }}
      >
        {heroSrc ? (
          <img src={heroSrc} style={{ maxWidth: 384, maxHeight: 534, objectFit: "contain" }} />
        ) : null}
      </div>
    </div>
  )
}

function ProfileCard({ card, heroSrc }: { card: OgCard; heroSrc: string | null }) {
  const PORTRAIT_WIDTH = 420

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: BRAND_GRADIENT,
        fontFamily: "Urbanist, sans-serif",
      }}
    >
      <div
        style={{ display: "flex", width: PORTRAIT_WIDTH, height: "100%", position: "relative", background: "#101A33" }}
      >
        {heroSrc ? (
          <img
            src={heroSrc}
            width={PORTRAIT_WIDTH}
            height={OG_HEIGHT}
            style={{ width: PORTRAIT_WIDTH, height: OG_HEIGHT, objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 140,
              fontWeight: 800,
              color: ACCENT,
            }}
          >
            {card.title.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div
          style={{ position: "absolute", top: 0, right: 0, width: 6, height: OG_HEIGHT, background: ACCENT, display: "flex" }}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
          height: "100%",
          padding: 64,
        }}
      >
        {card.eyebrow ? <Eyebrow text={card.eyebrow} /> : null}

        <div
          style={{
            display: "flex",
            fontSize: card.title.length <= 24 ? 64 : 48,
            fontWeight: 800,
            color: TITLE,
            lineHeight: 1.1,
            marginTop: card.eyebrow ? 24 : 0,
          }}
        >
          {card.title}
        </div>

        {card.subtitle ? (
          <div style={{ display: "flex", fontSize: 28, color: MUTED, lineHeight: 1.35, marginTop: 18 }}>
            {card.subtitle}
          </div>
        ) : null}

        {card.meta ? (
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: ACCENT, marginTop: 24 }}>{card.meta}</div>
        ) : null}

        <div style={{ display: "flex", marginTop: 40 }}>
          <span style={{ fontSize: 20, color: MUTED, letterSpacing: 1 }}>top100afl.com</span>
        </div>
      </div>
    </div>
  )
}

export async function GET(request: Request): Promise<Response> {
  const card = parseOgCard(new URL(request.url).searchParams)

  const [heroSrc, fonts] = await Promise.all([resolveHeroSrc(card.hero ?? null), loadFonts()])

  const layout =
    card.variant === "profile" ? (
      <ProfileCard card={card} heroSrc={heroSrc} />
    ) : card.variant === "cover" ? (
      <CoverCard card={card} heroSrc={heroSrc} />
    ) : (
      <BannerCard card={card} heroSrc={heroSrc} />
    )

  return new ImageResponse(
    layout,
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts: fonts.length > 0 ? fonts : undefined,
      headers: {
        // The query string fully determines the pixels, so the URL is the
        // cache key and a card can be cached indefinitely.
        "Cache-Control": "public, max-age=0, s-maxage=31536000, immutable",
      },
    },
  )
}
