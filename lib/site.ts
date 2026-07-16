/**
 * Canonical site origin for SEO surfaces (metadata, sitemap, robots, JSON-LD).
 *
 * The live domain is top100afl.com — several files historically pointed at
 * top100afl.org, which told search engines the canonical home of every page
 * was a different domain. Override with NEXT_PUBLIC_SITE_URL per environment.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.top100afl.com").replace(/\/$/, "")

export const SITE_NAME = "Top100 Africa Future Leaders"
