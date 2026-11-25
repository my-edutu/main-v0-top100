import { describe, expect, it } from 'vitest'
import { festivalCsv, loadFestivalList, numberedFestivalNames } from '@/lib/festival/list-export'

describe('festival list exports', () => {
  it('loads the entire list in display order across pages', async () => {
    expect(await loadFestivalList(async (page) => ({
      rows: [{ memberId: String(page) }], pageSize: 1, total: 3,
    }))).toEqual([{ memberId: '1' }, { memberId: '2' }, { memberId: '3' }])
  })

  it('rejects an inconsistent list instead of silently exporting duplicate rows', async () => {
    await expect(loadFestivalList(async () => ({
      rows: [{ memberId: '1' }], pageSize: 1, total: 2,
    }))).rejects.toThrow('The list changed')
  })

  it('numbers names while preserving accents and neutralizes name formulas in CSV', () => {
    expect(numberedFestivalNames(['Dieudonné KEBA', 'Ada\nObi'])).toBe('1. Dieudonné KEBA\n2. Ada Obi')
    expect(festivalCsv(['Name'], [['=1+1'], ['Ada "A", Obi']])).toBe(
      '\uFEFF"No.","Name"\r\n"1","\'=1+1"\r\n"2","Ada ""A"", Obi"\r\n',
    )
  })
})
