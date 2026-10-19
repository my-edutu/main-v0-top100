/**
 * Canonical site origin for SEO surfaces (metadata, sitemap, robots, JSON-LD).
 *
 * The live domain is top100afl.com — several files historically pointed at
 * top100afl.org, which told search engines the canonical home of every page
 * was a different domain. Override with NEXT_PUBLIC_SITE_URL per environment.
 */
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://top100afl.com"
const siteOrigin = new URL(configuredSiteUrl)

// Keep one public canonical host even when a deployment environment is set to
// the equivalent www alias. This keeps canonical, Open Graph, and JSON-LD URLs
// aligned with the host members already share.
if (siteOrigin.hostname.toLowerCase() === "www.top100afl.com") {
  siteOrigin.hostname = "top100afl.com"
}

export const SITE_URL = siteOrigin.origin

export const SITE_NAME = "Top100 Africa Future Leaders"
