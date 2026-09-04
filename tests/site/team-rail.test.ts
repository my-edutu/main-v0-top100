import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import TeamRail from "@/app/components/TeamRail"
import { TEAM_MEMBERS } from "@/lib/impact-content"

describe("homepage team rail", () => {
  it("renders every team member in a compact, accessible horizontal poster rail", () => {
    const markup = renderToStaticMarkup(createElement(TeamRail, { members: TEAM_MEMBERS }))

    expect(markup).toContain('aria-label="Top100 team"')
    expect(markup).toContain('data-team-rail="compact"')
    expect(markup).toContain("overflow-x-auto")
    expect(markup).toContain("auto-cols-[9rem]")
    expect(markup).toContain("sm:auto-cols-[10rem]")
    expect(markup).not.toContain("w-[72vw]")
    expect(markup.match(/data-team-card=/g)).toHaveLength(5)

    for (const name of [
      "Nwosu Paul Light",
      "Emmanuella Igboafu",
      "Gabriel Ajewole",
      "Favour Okolie",
      "Kenechukwu Igboasia",
    ]) {
      expect(markup).toContain(name)
    }

    expect(markup).toContain("Nwosu Paul Light on LinkedIn (opens in a new tab)")
    expect(markup).toContain("Emmanuella Igboafu on LinkedIn (opens in a new tab)")
  })
})
