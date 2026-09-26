import type { RankedSelectionApplication, SelectionAssessment } from './contracts'

const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, ' ')

const titleCaseWord = (value: string) =>
  value
    .split('-')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : part))
    .join('-')

export const normalizeSelectionCountry = (value: string | null | undefined) => {
  const normalized = normalizeWhitespace(value ?? '')
  if (!normalized) return 'Unspecified'
  return normalized.split(' ').map(titleCaseWord).join(' ')
}

const compareAssessments = (left: SelectionAssessment, right: SelectionAssessment) => {
  const comparisons = [
    right.totalScore - left.totalScore,
    right.scoreBreakdown.academic - left.scoreBreakdown.academic,
    right.scoreBreakdown.impact - left.scoreBreakdown.impact,
    right.scoreBreakdown.leadership - left.scoreBreakdown.leadership,
    right.scoreBreakdown.initiative - left.scoreBreakdown.initiative,
    right.scoreBreakdown.communication - left.scoreBreakdown.communication,
  ]

  for (const comparison of comparisons) {
    if (comparison !== 0) return comparison
  }

  const nameComparison = left.fullName.localeCompare(right.fullName, 'en', {
    sensitivity: 'base',
    numeric: true,
  })
  if (nameComparison !== 0) return nameComparison

  return left.applicationId.localeCompare(right.applicationId, 'en', {
    sensitivity: 'base',
    numeric: true,
  })
}

export function rankSelectionAssessments(
  assessments: readonly SelectionAssessment[],
): RankedSelectionApplication[] {
  const qualified = assessments
    .filter((assessment) => assessment.verdict === 'qualified')
    .slice()
    .sort(compareAssessments)

  const countryCounts = new Map<string, number>()

  return qualified.map((assessment, index) => {
    const country = normalizeSelectionCountry(assessment.country)
    const countryRank = (countryCounts.get(country) ?? 0) + 1
    countryCounts.set(country, countryRank)

    return {
      ...assessment,
      country,
      overallRank: index + 1,
      countryRank,
    }
  })
}
