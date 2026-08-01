import { afterEach, describe, expect, it, vi } from "vitest"

import { GET } from "@/app/og/route"
import { SITE_URL } from "@/lib/site"

const RENDER_TIMEOUT = 30_000

const HERO = "https://zsavekrhfwrpqudhjvlq.supabase.co/storage/v1/object/public/awardees/portrait.jpg"

/** A 1x1 png, so a stubbed "download" is measurable but tiny. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)

const heroResponse = () =>
  new Response(PNG, { status: 200, headers: { "content-type": "image/png" } })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("GET /og hero probing", () => {
  it("probes the hero with HEAD instead of downloading it to check the content type", async () => {
    const real = globalThis.fetch
    const calls: Array<{ url: string; method: string }> = []

    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
      const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase()
      if (url === HERO) {
        calls.push({ url, method })
        return Promise.resolve(heroResponse())
      }
      return real(input as RequestInfo, init)
    })

    const response = await GET(
      new Request(`${SITE_URL}/og?title=Portrait&variant=profile&hero=${encodeURIComponent(HERO)}`),
    )

    expect(response.status).toBe(200)
    // The route's own existence check must not pull the bytes; only the
    // renderer's fetch is entitled to a body.
    expect(calls[0]?.method).toBe("HEAD")
  }, RENDER_TIMEOUT)

  it("falls back to GET when an origin refuses HEAD, and still renders", async () => {
    const real = globalThis.fetch
    const methods: string[] = []

    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
      const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase()
      if (url === HERO) {
        methods.push(method)
        if (method === "HEAD") return Promise.resolve(new Response(null, { status: 405 }))
        return Promise.resolve(heroResponse())
      }
      return real(input as RequestInfo, init)
    })

    const response = await GET(
      new Request(`${SITE_URL}/og?title=Portrait&variant=profile&hero=${encodeURIComponent(HERO)}`),
    )

    expect(response.status).toBe(200)
    expect(methods[0]).toBe("HEAD")
    expect(methods).toContain("GET")
  }, RENDER_TIMEOUT)

  it("drops a hero whose probe reports a non-image, without rendering it", async () => {
    const real = globalThis.fetch

    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
      if (url === HERO) {
        return Promise.resolve(
          new Response(null, { status: 200, headers: { "content-type": "text/html" } }),
        )
      }
      return real(input as RequestInfo, init)
    })

    const response = await GET(
      new Request(`${SITE_URL}/og?title=Portrait&variant=profile&hero=${encodeURIComponent(HERO)}`),
    )

    expect(response.status).toBe(200)
  }, RENDER_TIMEOUT)
})
