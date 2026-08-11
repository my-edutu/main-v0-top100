import { describe, expect, it } from 'vitest'

import { parseMessageRecipient } from '@/app/dashboard/_lib/message-route'

describe('message route state', () => {
  it('accepts a valid directory recipient', () => {
    expect(parseMessageRecipient(new URLSearchParams('to=p-12&name=Amara%20Okafor'))).toEqual({
      profileId: 'p-12',
      name: 'Amara Okafor',
    })
  })

  it('rejects partial recipient state', () => {
    expect(parseMessageRecipient(new URLSearchParams('to=p-12'))).toBeNull()
    expect(parseMessageRecipient(new URLSearchParams('name=Amara'))).toBeNull()
  })

  it('rejects blank recipient values', () => {
    expect(parseMessageRecipient(new URLSearchParams('to=%20%20&name=Amara'))).toBeNull()
    expect(parseMessageRecipient(new URLSearchParams('to=p-12&name=%20%20'))).toBeNull()
  })
})
