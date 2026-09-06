export const onboardingFields = [
  {
    key: 'headline',
    title: 'What do you do?',
    hint: 'A short introduction people will see beside your name.',
    placeholder: 'e.g. Software engineer and youth mentor',
    min: 3,
    max: 160,
  },
  {
    key: 'location',
    title: 'Where are you based?',
    hint: 'Choose your country so your community can find you.',
    placeholder: 'City, country',
    min: 2,
    max: 160,
  },
  {
    key: 'field',
    title: 'What are your interests?',
    hint: 'Add five interests. Each one becomes a tag on this form.',
    placeholder: 'e.g. Education, technology or public health',
    min: 2,
    max: 160,
  },
  {
    key: 'bio',
    title: 'Tell your story.',
    hint: 'Introduce your work, what matters to you, and the impact you hope to make.',
    placeholder: 'Start with what you are working on…',
    min: 30,
    max: 2000,
  },
] as const

export function onboardingComplete(
  prefs: Record<string, unknown> | null | undefined,
) {
  return (
    typeof prefs?.onboardingCompletedAt === 'string' &&
    Number.isFinite(Date.parse(prefs.onboardingCompletedAt))
  )
}

export function validateOnboarding(
  values: Record<string, unknown>,
): string | null {
  for (const field of onboardingFields) {
    const value =
      typeof values[field.key] === 'string'
        ? (values[field.key] as string).trim()
        : ''
    if (field.key === 'bio' && !value) continue
    if (value.length < field.min || value.length > field.max)
      return `${field.title} Please use ${field.min}–${field.max} characters.`
  }
  return null
}
