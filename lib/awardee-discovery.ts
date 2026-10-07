import { COUNTRY_OPTIONS } from './avatars'

const countryNames = new Map(COUNTRY_OPTIONS.map(name => [name.toLowerCase(), name]))
const aliases: Record<string, string> = { 'the gambia': 'gambia', 'usa': 'united states', 'us': 'united states', 'uk': 'united kingdom', 'uae': 'united arab emirates', 'cabo verde': 'cape verde', "côte d'ivoire": 'ivory coast', "cote d'ivoire": 'ivory coast', 'drc': 'democratic republic of the congo' }

/** Fisher–Yates preserves every record and never mutates the directory. */
export function shufflePeople<T>(people: readonly T[], random = Math.random): T[] {
  const shuffled = [...people]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]
  }
  return shuffled
}

export const countryKey = (country?: string | null) => {
  const key = country?.trim().toLowerCase() ?? ''
  return aliases[key] ?? key
}

export function hasProfilePhoto(person: { avatar_url?: string | null; cover_image_url?: string | null }) {
  const photo = person.avatar_url?.trim()
  return Boolean(photo && photo !== '/image-unavailable.svg')
}

export function getDiscoverySummary(people: readonly { country?: string | null; year?: number | string | null }[]) {
  const countries = new Map<string, { key: string; name: string; count: number }>()
  const cohorts = new Set<string>()
  for (const person of people) {
    const key = countryKey(person.country)
    const name = countryNames.get(key)
    if (name) {
      const entry = countries.get(key)
      if (entry) entry.count++
      else countries.set(key, { key, name, count: 1 })
    }
    if (person.year) cohorts.add(String(person.year))
  }
  return {
    leaders: people.length,
    countries: [...countries.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    cohorts: cohorts.size,
  }
}
