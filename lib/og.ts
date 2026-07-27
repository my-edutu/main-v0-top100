import type { Metadata } from "next"

import { SITE_NAME, SITE_URL } from "@/lib/site"

export type OgVariant = "banner" | "profile"

export type OgCard = {
  /** The page header. The one line that must be readable in a preview strip. */
  title: string
  /** Small-caps kicker above the title, e.g. "Blog", "Summit 2026". */
  eyebrow?: string
  /** Optional supporting line under the title. */
  subtitle?: string
  /** Profile variant only: country, cohort, or similar. */
  meta?: string
  /** The page's hero image: a same-origin path or an allowed remote URL. */
  hero?: string | null
  variant?: OgVariant
}

export type OgMetadataOptions = {
  /** Canonical path or absolute URL for og:url. */
  url?: string
  type?: "website" | "article" | "profile"
  /** Overrides the card subtitle as the og/twitter description. */
  description?: string
}

export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

/**
 * Text is clamped before layout because these values arrive as query
 * parameters. An unbounded title does not just look wrong — it pushes the
 * rest of the composition off the canvas.
 */
export const OG_LIMITS = {
  title: 120,
  subtitle: 160,
  eyebrow: 48,
  meta: 64,
} as const

const SITE_HOSTNAMES = new Set(["top100afl.com", "www.top100afl.com", new URL(SITE_URL).hostname])

/** Mirrors the remotePatterns already allowed in next.config.mjs. */
const ALLOWED_HERO_HOSTS = new Set(["flagcdn.com", "i.ytimg.com", "img.youtube.com"])
const ALLOWED_HERO_HOST_SUFFIXES = [".supabase.co"]

export function clampText(value: string | null | undefined, max: number): string | undefined {
  if (!value) return undefined
  const normalized = value.replace(/\s+/g, " ").trim()
  if (normalized.length === 0) return undefined
  if (normalized.length <= max) return normalized

  const head = normalized.slice(0, max - 1)
  const lastSpace = head.lastIndexOf(" ")
  // Break on a word boundary when there is a reasonable one, so the clamp
  // does not slice a word in half.
  const body = lastSpace > max * 0.6 ? head.slice(0, lastSpace) : head
  return `${body.trimEnd()}…`
}

export function isAllowedHero(hero: string): boolean {
  if (!hero) return false

  // Same-origin path. "//host" is protocol-relative and would leave the origin.
  if (hero.startsWith("/")) return !hero.startsWith("//")

  let parsed: URL
  try {
    parsed = new URL(hero)
  } catch {
    return false
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false

  const host = parsed.hostname.toLowerCase()
  if (SITE_HOSTNAMES.has(host)) return true
  if (ALLOWED_HERO_HOSTS.has(host)) return true
  return ALLOWED_HERO_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
}

function safeHero(hero: string | null | undefined): string | null {
  if (!hero) return null
  const trimmed = hero.trim()
  return isAllowedHero(trimmed) ? trimmed : null
}

/**
 * Serialises a card into its /og URL. The parameters fully determine the
 * rendered image, so the URL is its own cache key: change the title or the
 * hero and you get a different URL rather than a stale cached card.
 */
export function ogImageUrl(card: OgCard): string {
  const params = new URLSearchParams()
  const title = clampText(card.title, OG_LIMITS.title) ?? SITE_NAME
  const eyebrow = clampText(card.eyebrow, OG_LIMITS.eyebrow)
  const subtitle = clampText(card.subtitle, OG_LIMITS.subtitle)
  const meta = clampText(card.meta, OG_LIMITS.meta)
  const hero = safeHero(card.hero)

  // Fixed insertion order keeps the URL byte-identical for an identical card.
  params.set("title", title)
  if (eyebrow) params.set("eyebrow", eyebrow)
  if (subtitle) params.set("subtitle", subtitle)
  if (meta) params.set("meta", meta)
  if (hero) params.set("hero", hero)
  if (card.variant === "profile") params.set("variant", "profile")

  return `${SITE_URL}/og?${params.toString()}`
}

/** Inverse of ogImageUrl, used by the renderer. Always returns a usable card. */
export function parseOgCard(params: URLSearchParams): OgCard {
  const variant = params.get("variant") === "profile" ? "profile" : "banner"

  return {
    title: clampText(params.get("title"), OG_LIMITS.title) ?? SITE_NAME,
    eyebrow: clampText(params.get("eyebrow"), OG_LIMITS.eyebrow),
    subtitle: clampText(params.get("subtitle"), OG_LIMITS.subtitle),
    meta: clampText(params.get("meta"), OG_LIMITS.meta),
    hero: safeHero(params.get("hero")),
    variant,
  }
}

function absoluteUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  return `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`
}

/**
 * Returns the openGraph and twitter blocks for a page. Spread this into a
 * page's metadata so no page hand-writes a share image URL twice.
 */
export function ogMetadata(card: OgCard, opts: OgMetadataOptions = {}): Metadata {
  const image = ogImageUrl(card)
  const title = clampText(card.title, OG_LIMITS.title) ?? SITE_NAME
  const description = opts.description ?? card.subtitle

  return {
    openGraph: {
      title,
      description,
      url: absoluteUrl(opts.url),
      siteName: SITE_NAME,
      type: opts.type ?? "website",
      images: [{ url: image, width: OG_WIDTH, height: OG_HEIGHT, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  }
}
