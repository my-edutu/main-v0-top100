import { countryNames } from "country-region-data"
import { countryKey } from "@/lib/awardee-discovery"
import type { AwardeeRegisterTotals } from "@/lib/impact-content"

const knownCountries = new Set(countryNames.map(countryKey))

type RegisterEntry = {
  country: string | null
  institution: string | null
}

export function summarizeAwardeeRegister(rows: readonly RegisterEntry[]): AwardeeRegisterTotals {
  const countries = new Set<string>()
  const institutions = new Set<string>()

  for (const row of rows) {
    const country = countryKey(row.country)
    if (knownCountries.has(country)) countries.add(country)

    const institution = row.institution?.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase()
    if (institution && !["n/a", "na", "none", "unknown"].includes(institution)) {
      institutions.add(institution)
    }
  }

  return { awardees: rows.length, countries: countries.size, institutions: institutions.size }
}
