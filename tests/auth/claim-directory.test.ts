import { describe, expect, it } from 'vitest'

import {
  CLAIM_DIRECTORY_RESULT_LIMIT,
  filterClaimDirectory,
  isPersistentAvatarUrl,
} from '@/lib/auth/claim-directory'

const directory = Array.from({ length: 45 }, (_, index) => ({
  name: `Leader ${String(index + 1).padStart(2, '0')}`,
  country: index === 44 ? 'Kenya' : 'Nigeria',
  course: index === 44 ? 'Climate Technology' : 'Engineering',
}))

describe('filterClaimDirectory', () => {
  it('limits the initial directory instead of rendering every profile', () => {
    expect(filterClaimDirectory(directory, '')).toHaveLength(CLAIM_DIRECTORY_RESULT_LIMIT)
  })

  it('searches the full directory before applying the result limit', () => {
    expect(filterClaimDirectory(directory, 'Kenya')).toEqual([directory[44]])
  })
})

describe('isPersistentAvatarUrl', () => {
  it('accepts web URLs and rejects browser-local blob URLs', () => {
    expect(isPersistentAvatarUrl('https://cdn.example.com/avatar.jpg')).toBe(true)
    expect(isPersistentAvatarUrl('/awardees/avatar.jpg')).toBe(true)
    expect(isPersistentAvatarUrl('blob:http://localhost:3000/not-persistent')).toBe(false)
  })
})
