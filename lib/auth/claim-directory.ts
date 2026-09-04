export type ClaimDirectoryEntry = {
  name: string
  country: string | null
  course: string | null
}

export const CLAIM_DIRECTORY_RESULT_LIMIT = 30

export function filterClaimDirectory<T extends ClaimDirectoryEntry>(
  directory: T[],
  query: string,
  limit = CLAIM_DIRECTORY_RESULT_LIMIT
): T[] {
  const normalizedQuery = query.trim().toLowerCase()
  const matches = normalizedQuery
    ? directory.filter((entry) =>
        [entry.name, entry.country ?? '', entry.course ?? ''].some((field) =>
          field.toLowerCase().includes(normalizedQuery)
        )
      )
    : directory

  return matches.slice(0, limit)
}

export function isPersistentAvatarUrl(value: string | null): value is string {
  if (!value) return false

  try {
    const url = new URL(value, 'https://top100africafutureleaders.com')
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}
