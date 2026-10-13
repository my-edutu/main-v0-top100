import { expect, it, vi } from 'vitest'

import { processAwardPaymentReminders, type AwardPaymentReminderRow } from '@/lib/awards/payment-reminders'

const reminder: AwardPaymentReminderRow = {
  reminder_id: 'reminder-1',
  order_id: 'order-1',
  payment_attempt_id: 'attempt-1',
  reminder_kind: 'retry',
  recipient_name: 'Ama Test',
  email: 'ama@example.com',
  currency: 'NGN',
  amount_minor: 100000,
}

it('cancels a claimed reminder when payment is confirmed before delivery', async () => {
  const sendEmail = vi.fn(async () => ({ ok: true }))
  const db = {
    rpc: vi.fn(async (name: string) => {
      if (name === 'claim_award_payment_reminders') return { data: [reminder], error: null }
      if (name === 'prepare_award_payment_reminder_delivery') return { data: false, error: null }
      throw new Error(`Unexpected RPC: ${name}`)
    }),
  }

  const result = await processAwardPaymentReminders(db, { sendEmail })

  expect(result).toMatchObject({ claimed: 1, sent: 0, failed: 0 })
  expect(sendEmail).not.toHaveBeenCalled()
  expect(db.rpc).toHaveBeenCalledWith('prepare_award_payment_reminder_delivery', { p_reminder_id: 'reminder-1' })
})

it('sends an eligible reminder after the live payment-state recheck', async () => {
  const sendEmail = vi.fn(async () => ({ ok: true }))
  const db = {
    rpc: vi.fn(async (name: string) => {
      if (name === 'claim_award_payment_reminders') return { data: [reminder], error: null }
      if (name === 'prepare_award_payment_reminder_delivery') return { data: true, error: null }
      if (name === 'finish_award_payment_reminder') return { data: null, error: null }
      throw new Error(`Unexpected RPC: ${name}`)
    }),
  }

  const result = await processAwardPaymentReminders(db, { sendEmail })

  expect(result).toMatchObject({ claimed: 1, sent: 1, failed: 0 })
  expect(sendEmail).toHaveBeenCalledOnce()
  expect(db.rpc).toHaveBeenCalledWith('finish_award_payment_reminder', {
    p_reminder_id: 'reminder-1',
    p_sent: true,
    p_error: null,
  })
})
