import { describe, expect, it } from 'vitest'
import { getPageItems, getPageSlice } from '@/lib/admin/user-pagination'

describe('admin user pagination', () => {
  it('shows at most 20 records on each page', () => {
    const users = Array.from({ length: 45 }, (_, index) => `user-${index + 1}`)

    expect(getPageSlice(users, 1, 20)).toEqual(users.slice(0, 20))
    expect(getPageSlice(users, 2, 20)).toEqual(users.slice(20, 40))
    expect(getPageSlice(users, 3, 20)).toEqual(users.slice(40, 45))
  })

  it('includes page numbers and compact ellipses for long lists', () => {
    expect(getPageItems(1, 12)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 12])
    expect(getPageItems(6, 12)).toEqual([1, 'ellipsis', 5, 6, 7, 'ellipsis', 12])
    expect(getPageItems(12, 12)).toEqual([1, 'ellipsis', 8, 9, 10, 11, 12])
  })

  it('shows every page number when the list is short', () => {
    expect(getPageItems(2, 4)).toEqual([1, 2, 3, 4])
  })
})
