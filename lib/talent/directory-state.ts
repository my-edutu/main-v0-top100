export const EMPTY_DIRECTORY_FILTERS = { q: '', sector: '', skill: '', country: '', interest: '', language: '', workMode: '', year: '' }
export type DirectoryFilters = typeof EMPTY_DIRECTORY_FILTERS
export type DirectoryView = 'talent' | 'archive'
const keys = Object.keys(EMPTY_DIRECTORY_FILTERS) as (keyof DirectoryFilters)[]

/** Existing year/search/page links belong to the recognition archive. New talent
 * searches declare their mode, so a year filter is unambiguous and shareable. */
export function readDirectoryState(params: URLSearchParams, hasArchive: boolean): { view: DirectoryView; filters: DirectoryFilters } {
  const explicit = params.get('view')
  const legacyArchive = ['year', 'page', 'search', 'country'].some(key => params.has(key))
  const view = hasArchive && (explicit === 'archive' || (explicit !== 'talent' && legacyArchive)) ? 'archive' : 'talent'
  const filters = Object.fromEntries(keys.map(key => [key, (params.get(key) || '').trim().slice(0, 100)])) as DirectoryFilters
  return { view, filters }
}
export function directorySearch(current: URLSearchParams, view: DirectoryView, filters: DirectoryFilters): string {
  const next = new URLSearchParams(current)
  const keepArchive = view === 'archive' && readDirectoryState(current, true).view === 'archive'
  for (const key of [...keys, 'page', 'search', 'view']) {
    if (keepArchive && ['year', 'country', 'page', 'search'].includes(key)) continue
    next.delete(key)
  }
  next.set('view', view)
  if (view === 'talent') for (const key of keys) if (filters[key].trim()) next.set(key, filters[key].trim())
  return next.toString()
}

/** Never send a member to an external destination supplied in a query string. */
export function directoryReturnHref(value: string | null, year?: number | string | null): string {
  if (value && value.length <= 2000 && !/[\\\u0000-\u001f\u007f]/.test(value)) {
    const path = value.split('?')[0]
    if (['/awardees', '/dashboard/discover/members'].includes(path)) return value
  }
  const params = new URLSearchParams({ view: 'archive' })
  if (year && /^(19|20|21)\d{2}$/.test(String(year))) params.set('year', String(year))
  return `/awardees?${params}`
}
