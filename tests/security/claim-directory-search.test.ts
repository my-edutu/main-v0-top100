import { describe, expect, it } from 'vitest'

describe('claim directory search', () => {
  it('requires two meaningful characters before querying the directory', async () => {
    const module = await import('@/lib/claim-directory-search').catch(() => null)
    expect(module?.normalizeClaimDirectorySearch).toBeTypeOf('function')
    expect(module!.normalizeClaimDirectorySearch(' p ')).toBeNull()
    expect(module!.normalizeClaimDirectorySearch('  paul   light ')).toBe('paul light')
  })

  it('escapes database wildcard characters and caps long searches', async () => {
    const { toIlikePattern } = await import('@/lib/claim-directory-search')
    expect(toIlikePattern('Ada%_\\Okafor')).toBe('%Ada\\%\\_\\\\Okafor%')
    expect(toIlikePattern('a'.repeat(120))).toBe(`%${'a'.repeat(80)}%`)
  })
})
