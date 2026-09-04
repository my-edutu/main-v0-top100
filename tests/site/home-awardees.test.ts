import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import HomeFeaturedAwardees from "@/app/components/HomeFeaturedAwardees"

const awardees = [
  {
    slug: "abdul-raqeeb-temiloluwa-solotan",
    name: "Abdul-Raqeeb Temiloluwa Solotan",
    country: "Nigeria",
    avatar_url: "/awardees/abdul.png",
    course: "Microbiology",
    cgpa: "4.83",
  },
  {
    slug: "adamu-muhammad",
    name: "Adamu Muhammad",
    country: "Nigeria",
    avatar_url: null,
    course: "Political Science",
    cgpa: "4.04/5.00",
  },
]

describe("Homepage awardee spotlight", () => {
  it("renders a dark Netflix-style poster rail with compact identity overlays", () => {
    const markup = renderToStaticMarkup(createElement(HomeFeaturedAwardees, { awardees }))

    expect(markup).toContain('data-awardee-rail="featured"')
    expect(markup).toContain('aria-label="Featured awardees"')
    expect(markup).toContain("bg-slate-950")
    expect(markup).toContain("text-slate-50")
    expect(markup).toContain("auto-cols-[8rem]")
    expect(markup).toContain("overflow-x-auto")
    expect(markup).toContain("Abdul-Raqeeb Temiloluwa Solotan")
    expect(markup).toContain("Nigeria")
    expect(markup).not.toContain("CGPA")
    expect(markup).not.toContain("Microbiology")
  })
})
