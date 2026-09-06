export const CLAIM_DIRECTORY_PAGE_SIZE = 25
export const CLAIM_DIRECTORY_MIN_QUERY_LENGTH = 2

export function normalizeClaimDirectorySearch(value: string | null | undefined): string | null {
  const normalized = (value ?? '').trim().replace(/\s+/g, ' ').slice(0, 80)
  return normalized.length >= CLAIM_DIRECTORY_MIN_QUERY_LENGTH ? normalized : null
}

export function toIlikePattern(value: string): string {
  const bounded = value.trim().replace(/\s+/g, ' ').slice(0, 80)
  const escaped = bounded.replace(/[\\%_]/g, '\\$&')
  return `%${escaped}%`
}
