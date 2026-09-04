import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import ImpactSection from "@/app/components/ImpactSection"
import RotatingVisionSection from "@/app/components/RotatingVisionSection"
import Counter from "@/components/Counter"

describe("hydration-stable motion", () => {
  it("server-renders the vision words statically without mocking a motion preference", () => {
    const markup = renderToStaticMarkup(
      createElement(RotatingVisionSection, { images: ["/IMG_0672.jpg", "/IMG_0675.jpg"] }),
    )

    expect(markup).toContain(">youth<")
    expect(markup).toContain(">leaders<")
  })

  it("server-renders a counter's final formatted value", () => {
    const markup = renderToStaticMarkup(createElement(Counter, { target: 97000 }))

    expect(markup).toContain("97,000")
    expect(markup).not.toContain(">0<")
  })

  it("server-renders final visible metrics without an entrance transform", () => {
    const markup = renderToStaticMarkup(createElement(ImpactSection))

    expect(markup).toContain("2,000")
    expect(markup).not.toContain("translateY")
    expect(markup).not.toContain("opacity:0")
  })
})
