import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import { POST as fixAdmin } from '@/app/api/profiles/fix-admin/route'
import { POST as setAdmin } from '@/app/api/profiles/set-admin/route'

function bootstrapRequest(body: Record<string, string>) {
  return new NextRequest('http://localhost:3000/api/profiles/bootstrap', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('legacy administrator bootstrap endpoints', () => {
  it.each([
    ['fix-admin', fixAdmin, { email: 'nwosupaul3@gmail.com' }],
    [
      'set-admin',
      setAdmin,
      { userId: '00000000-0000-4000-8000-000000000000', email: 'nwosupaul3@gmail.com' },
    ],
  ])('keeps %s unavailable even when the old allowlisted payload is supplied', async (_, handler, body) => {
    const response = await handler(bootstrapRequest(body))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ message: 'Not found.' })
  })
})
