import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PROGRAMME_SCHEDULE } from '@/lib/events/programme'

describe('programme seed contract', () => {
  it('contains every scheduled title and the one-hour WAT timestamps', () => {
    const seed = readFileSync('supabase/seed/20260922_afl_october_programme.sql', 'utf8')
    for (const item of PROGRAMME_SCHEDULE) {
      expect(seed).toContain(item.title.replaceAll("'", "''"))
      expect(item.durationMinutes).toBe(60)
    }
    expect(seed).toContain("'Africa/Lagos'")
    expect(seed).toContain("set visibility = 'awardee_only'")
  })
})
