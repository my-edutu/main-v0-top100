import { readFileSync } from "node:fs"
import { readdir } from "node:fs/promises"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { PAGE_OG } from "@/lib/og-pages"

const APP_DIR = path.join(process.cwd(), "app")

/** Routes that are never shared publicly and keep the root layout's card. */
const EXCLUDED_SEGMENTS = ["admin", "auth", "dashboard", "edit-profile"]

async function findPages(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const found: string[] = []

  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (EXCLUDED_SEGMENTS.includes(entry.name)) continue
      found.push(...(await findPages(full)))
    } else if (entry.name === "page.tsx") {
      found.push(full)
    }
  }

  return found
}

/** app/(group)/a/[slug]/page.tsx -> /a/[slug] */
function routeFor(pageFile: string): string {
  const relative = path.relative(APP_DIR, path.dirname(pageFile))
  const segments = relative
    .split(path.sep)
    .filter((segment) => segment.length > 0 && !(segment.startsWith("(") && segment.endsWith(")")))
  return `/${segments.join("/")}`
}

function read(file: string): string {
  try {
    return readFileSync(file, "utf8")
  } catch {
    return ""
  }
}

/**
 * A page that only calls redirect() never renders HTML, so it has nowhere to
 * put a meta tag. The destination carries the card instead.
 */
function isRedirectOnly(source: string): boolean {
  return /\b(?:redirect|permanentRedirect)\(/.test(source) && !source.includes("export const metadata")
}

/**
 * A page is covered when it wires the helper itself, when a sibling layout
 * does (client pages cannot export metadata), or when it has a registry entry.
 */
function isCovered(pageFile: string, route: string): boolean {
  if (PAGE_OG[route]) return true
  if (read(pageFile).includes("ogMetadata(")) return true
  return read(path.join(path.dirname(pageFile), "layout.tsx")).includes("ogMetadata(")
}

describe("share card coverage", () => {
  it("finds the public pages", async () => {
    const pages = await findPages(APP_DIR)
    expect(pages.length).toBeGreaterThan(20)
  })

  it("gives every public page a share card", async () => {
    const pages = await findPages(APP_DIR)

    const uncovered = pages
      .map((file) => ({ file, route: routeFor(file) }))
      .filter(({ file, route }) => route !== "/" && !isRedirectOnly(read(file)) && !isCovered(file, route))
      .map(({ file, route }) => ({ route, file: path.relative(process.cwd(), file) }))

    expect(
      uncovered,
      `These public pages have no share card. Add a lib/og-pages.ts entry, or spread ogMetadata() into their metadata (or a sibling layout.tsx if the page is a client component):\n${uncovered
        .map(({ route, file }) => `  ${route}  (${file})`)
        .join("\n")}`,
    ).toEqual([])
  })

  it("exempts the home page, which has its own hand-made card", async () => {
    const pages = await findPages(APP_DIR)
    expect(pages.map(routeFor)).toContain("/")
  })
})
