export type AwardeeCandidate = {
  id: string
  name: string | null
  email: string | null
  year: number | null
}

export type MatchResult = {
  awardeeId: string | null
  verification: 'matched' | 'unmatched'
}

const DIACRITICS = /[̀-ͯ]/g

/**
 * Names arrive typed by hand, so accents, punctuation and stray spacing all
 * differ from the directory copy. Compare on a flattened form.
 */
export function normaliseName(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normaliseEmail(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Advisory only. Awardees routinely apply from a personal address that is not
 * the one in the directory, so a miss flags the application for review rather
 * than blocking it.
 */
export function matchAwardee(
  input: { email: string; fullName: string; cohortYear: number },
  candidates: AwardeeCandidate[],
): MatchResult {
  const email = normaliseEmail(input.email)
  const byEmail = candidates.find(
    (candidate) => candidate.email && normaliseEmail(candidate.email) === email,
  )
  if (byEmail) {
    return { awardeeId: byEmail.id, verification: 'matched' }
  }

  const name = normaliseName(input.fullName)
  const byNameAndYear = candidates.find(
    (candidate) =>
      candidate.name && normaliseName(candidate.name) === name && candidate.year === input.cohortYear,
  )
  if (byNameAndYear) {
    return { awardeeId: byNameAndYear.id, verification: 'matched' }
  }

  return { awardeeId: null, verification: 'unmatched' }
}

export function slugifyInterview(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')

  return slug || 'interview'
}

/** Two awardees sharing a name must not collide on slug. */
export function uniqueSlug(base: string, taken: string[]): string {
  const used = new Set(taken)
  if (!used.has(base)) {
    return base
  }

  let suffix = 2
  while (used.has(`${base}-${suffix}`)) {
    suffix += 1
  }

  return `${base}-${suffix}`
}
