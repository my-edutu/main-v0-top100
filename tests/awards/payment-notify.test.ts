import { describe, expect, it, vi } from 'vitest'

import { buildAwardPaymentNotification, notifyAwardPaymentConfirmed } from '@/lib/awards/payment-notify'

describe('buildAwardPaymentNotification', () => {
  it('uses exact award-only amount wording for NGN', () => {
    const notification = buildAwardPaymentNotification({
      orderId: 'order-1',
      recipientName: 'Ada Lovelace',
      email: 'ada@example.com',
      currency: 'NGN',
      amountMinor: 2_500_000,
      paidAt: '2026-09-08T10:00:00.000Z',
    })

    expect(notification.subject).toBe('Award payment confirmed')
    expect(notification.text).toContain('₦25,000')
    expect(notification.text.toLowerCase()).toContain('delivery through gig logistics and its delivery charge are handled separately')
    expect(notification.text.toLowerCase()).not.toContain('packed')
    expect(notification.text.toLowerCase()).not.toContain('shipped')
    expect(notification.html).toContain('₦25,000')
  })

  it('formats the USD award fee and never includes courier logistics', () => {
    const notification = buildAwardPaymentNotification({
      orderId: 'order-2',
      recipientName: 'Grace Hopper',
      email: 'grace@example.com',
      currency: 'USD',
      amountMinor: 2_000,
      paidAt: '2026-09-08T10:00:00.000Z',
    })

    expect(notification.text).toContain('$20.00')
    expect(notification.text).toContain('award fee')
    expect(notification.text.toLowerCase()).not.toContain('tracking')
    expect(notification.text.toLowerCase()).not.toContain('waybill')
  })

  it('claims the paid milestone before sending award-only channels', async () => {
    const calls: Array<{ table: string; operation: string; payload?: unknown }> = []
    const db = {
      from(table: string) {
        return {
          insert(payload: unknown) {
            calls.push({ table, operation: 'insert', payload })
            return Promise.resolve({ error: null })
          },
          update(payload: unknown) {
            calls.push({ table, operation: 'update', payload })
            const chain: any = { eq: () => chain, then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve) }
            return chain
          },
        }
      },
    }
    const sendEmail = vi.fn().mockResolvedValue(true)

    const result = await notifyAwardPaymentConfirmed(
      {
        orderId: 'order-1',
        profileId: 'profile-1',
        recipientName: 'Ada Lovelace',
        email: 'ada@example.com',
        currency: 'NGN',
        amountMinor: 2_500_000,
        paidAt: '2026-09-08T10:00:00.000Z',
      },
      { db, sendEmail, now: () => '2026-09-08T10:01:00.000Z' },
    )

    expect(calls[0]).toMatchObject({ table: 'award_notification_log', operation: 'insert' })
    expect(calls.some((call) => call.table === 'user_notifications')).toBe(true)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(result.channels).toEqual(['in_app', 'email'])
  })

  it('does not send channels after another delivery owns the paid claim', async () => {
    const sendEmail = vi.fn().mockResolvedValue(true)
    const db = {
      from(table: string) {
        return {
          insert() {
            return Promise.resolve(table === 'award_notification_log' ? { error: { code: '23505' } } : { error: null })
          },
        }
      },
    }

    const result = await notifyAwardPaymentConfirmed(
      {
        orderId: 'order-1',
        email: 'ada@example.com',
        currency: 'USD',
        amountMinor: 2_000,
        paidAt: '2026-09-08T10:00:00.000Z',
      },
      { db, sendEmail },
    )

    expect(result.duplicate).toBe(true)
    expect(sendEmail).not.toHaveBeenCalled()
  })
})
