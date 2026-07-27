import { describe, expect, it } from "vitest"

import { GET } from "@/app/og/route"
import { SITE_URL } from "@/lib/site"

const render = (query: string) => GET(new Request(`${SITE_URL}/og?${query}`))

// Rendering runs satori + resvg; the first call also warms the font cache.
const RENDER_TIMEOUT = 30_000

describe("GET /og", () => {
  it("renders a banner card as a png", async () => {
    const response = await render("title=Events+%26+Summits&eyebrow=Events")
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("image/png")
  }, RENDER_TIMEOUT)

  it("caches aggressively because the url is the cache key", async () => {
    const response = await render("title=Legal")
    const cacheControl = response.headers.get("cache-control") ?? ""
    expect(cacheControl).toContain("public")
    expect(cacheControl).toContain("s-maxage=31536000")
    expect(cacheControl).not.toContain("no-store")
  }, RENDER_TIMEOUT)

  it("still renders when the hero is missing", async () => {
    const response = await render("title=No+Hero+Here")
    expect(response.status).toBe(200)
  }, RENDER_TIMEOUT)

  it("still renders when the hero is on a disallowed host", async () => {
    const response = await render("title=Blocked&hero=https%3A%2F%2Fevil.example.com%2Fx.jpg")
    expect(response.status).toBe(200)
  }, RENDER_TIMEOUT)

  it("still renders when the hero url is allowed but unfetchable", async () => {
    const response = await render("title=Broken+Hero&hero=%2Fthis-file-does-not-exist.jpg")
    expect(response.status).toBe(200)
  }, RENDER_TIMEOUT)

  it("renders a profile card", async () => {
    const response = await render("title=Amina+Okonkwo&subtitle=Climate-tech+founder&meta=Nigeria&variant=profile")
    expect(response.status).toBe(200)
  }, RENDER_TIMEOUT)

  it("renders a cover card", async () => {
    const response = await render("title=Magazine+2024&eyebrow=Magazine&variant=cover&hero=%2Fmagazine-cover-2025.jpg")
    expect(response.status).toBe(200)
  }, RENDER_TIMEOUT)

  it("renders with no parameters at all", async () => {
    const response = await GET(new Request(`${SITE_URL}/og`))
    expect(response.status).toBe(200)
  }, RENDER_TIMEOUT)

  it("renders an over-long title without failing", async () => {
    const response = await render(`title=${"word+".repeat(120)}`)
    expect(response.status).toBe(200)
  }, RENDER_TIMEOUT)
})
