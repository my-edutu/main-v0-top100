import { describe, expect, it } from 'vitest'

import {
  buildAccessCodeInsert,
  buildAccessCodeConsumption,
  evaluateAccessCode,
  parseAccessCodeRequest,
  type AccessCode,
} from '@/lib/access-codes'

const activeCode: AccessCode = {
  id: 'code-id',
  code: 'AFL-READY',
  label: 'Awardee invite',
  status: 'active',
  redemption_mode: 'single_use',
  uses_left: 1,
  email: 'awardee@example.com',
  created_by: null,
  used_by: null,
  used_at: null,
  expires_at: '2026-09-15T12:00:00.000Z',
  created_at: '2026-09-15T10:00:00.000Z',
}

describe('access-code policies', () => {
  it('creates an individual code bound to one email and one use', () => {
    expect(buildAccessCodeInsert({
      mode: 'single_use',
      email: ' Awardee@Example.com ',
      now: new Date('2026-09-15T10:00:00.000Z'),
    })).toMatchObject({
      redemption_mode: 'single_use',
      email: 'awardee@example.com',
      uses_left: 1,
      expires_at: '2026-12-14T10:00:00.000Z',
    })
  })

  it.each([1, 24] as const)('creates a reusable code that expires after %i hour(s)', (durationHours) => {
    expect(buildAccessCodeInsert({
      mode: 'time_limited',
      durationHours,
      now: new Date('2026-09-15T10:00:00.000Z'),
    })).toMatchObject({
      redemption_mode: 'time_limited',
      email: null,
      expires_at: new Date(Date.parse('2026-09-15T10:00:00.000Z') + durationHours * 60 * 60 * 1000).toISOString(),
    })
  })

  it('keeps a reusable code valid after prior redemptions while its time window is open', () => {
    expect(evaluateAccessCode({
      ...activeCode,
      redemption_mode: 'time_limited',
      uses_left: 0,
      email: null,
      used_by: 'previous-user',
      used_at: '2026-09-15T10:15:00.000Z',
    }, 'another@example.com', Date.parse('2026-09-15T11:00:00.000Z'))).toEqual({ ok: true })
  })

  it('rejects a reusable code after its expiry time', () => {
    expect(evaluateAccessCode({
      ...activeCode,
      redemption_mode: 'time_limited',
      email: null,
    }, 'awardee@example.com', Date.parse('2026-09-15T12:00:00.001Z'))).toEqual({ ok: false, reason: 'expired' })
  })

  it('does not consume the remaining-use counter for a reusable time-window code', () => {
    expect(buildAccessCodeConsumption({
      ...activeCode,
      redemption_mode: 'time_limited',
      uses_left: 1,
      email: null,
    }, 'new-user', new Date('2026-09-15T11:00:00.000Z'))).toEqual({
      uses_left: 1,
      status: 'active',
      used_by: 'new-user',
      used_at: '2026-09-15T11:00:00.000Z',
    })
  })

  it('requires an email for a per-individual code', () => {
    expect(() => parseAccessCodeRequest({ mode: 'single_use', email: '' })).toThrow('email')
  })

  it('accepts only one-hour or 24-hour reusable windows', () => {
    expect(() => parseAccessCodeRequest({ mode: 'time_limited', durationHours: 12 })).toThrow('duration')
    expect(parseAccessCodeRequest({ mode: 'time_limited', durationHours: 24 })).toMatchObject({
      mode: 'time_limited',
      durationHours: 24,
      email: null,
    })
  })

  it('rejects unknown code modes instead of silently changing their meaning', () => {
    expect(() => parseAccessCodeRequest({ mode: 'forever', email: 'awardee@example.com' })).toThrow('type')
  })
})
