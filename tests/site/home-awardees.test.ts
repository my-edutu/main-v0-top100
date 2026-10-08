import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import HomeFeaturedAwardees from "@/app/components/HomeFeaturedAwardees"

const awardees = [
  {
    slug: "abdul-raqeeb-temiloluwa-solotan",
    name: "Abdul-Raqeeb Temiloluwa Solotan",
    country: "Nigeria",
    avatar_url: "https://supabase.top100afl.com/storage/v1/object/public/awardees/abdul.png",
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
  it("renders the 2026 leader marquee with compact profile links", () => {
    const markup = renderToStaticMarkup(createElement(HomeFeaturedAwardees, { awardees }))

    expect(markup).toContain('aria-label="Leader row 1 of 3"')
    expect(markup).toContain('class="leader-marquee-track')
    expect(markup).toContain("bg-slate-950")
    expect(markup).toContain("text-slate-50")
    expect(markup).toContain("Abdul-Raqeeb Temiloluwa Solotan")
    expect(markup).toContain("Nigeria")
    expect(markup).toContain("View profile")
    expect(markup).not.toContain("CGPA")
    expect(markup).not.toContain("Microbiology")
  })
})
