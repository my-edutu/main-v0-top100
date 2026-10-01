import { describe, expect, it } from 'vitest'

import { shuffleAwardees } from '@/lib/awardees/shuffle'

describe('shuffleAwardees', () => {
  it('returns a randomized permutation without mutating the directory data', () => {
    const awardees = ['a', 'b', 'c', 'd']

    const shuffled = shuffleAwardees(awardees, () => 0)

    expect(shuffled).toEqual(['b', 'c', 'd', 'a'])
    expect(awardees).toEqual(['a', 'b', 'c', 'd'])
    expect([...shuffled].sort()).toEqual([...awardees].sort())
  })
})
