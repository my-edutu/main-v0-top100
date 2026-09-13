import { createHmac } from 'node:crypto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { handleBachsEvent, type BachsWebhookDeps } from '@/lib/awards/bachs-webhook'
import type { BachsWebhookEvent } from '@/lib/payments/bachs/types'

const SECRET = 'webhook-secret'
const NOW = 1_757_000_000

type Attempt = {
  id: string
  order_id: string
  provider: 'bachs'
  charge_scope: 'award_fee'
  status: string
  requested_amount_minor: number
  captured_amount_minor: number | null
  currency: 'NGN' | 'USD'
  provider_reference: string
  provider_checkout_id: string | null
  provider_status: string | null
  provider_charge_id: string | null
  price_version: string
}

type EventRow = {
  id: string
  provider: string
  event_type: string
  organization_id: string | null
  payment_attempt_id: string | null
  processing_status: string
  payload: unknown
  error: string | null
}

type DbState = {
  attempt: Attempt | null
  order?: {
    id: string
    profile_id?: string | null
    recipient_name?: string | null
    email?: string | null
    award_payment_status?: string | null
    award_paid_at?: string | null
    award_paid_attempt_id?: string | null
  } | null
  canonicalAttempt?: Attempt | null
  processResult?: Record<string, unknown>
  processError?: { code?: string; message?: string } | null
  rpcError?: { code?: string; message?: string } | null
  updates: Array<{ table: string; payload: Record<string, unknown> }>
  rpcCalls: Array<{ fn: string; args: Record<string, unknown> }>
}

function chainResult<T>(result: T) {
  const chain: any = {
    eq: () => chain,
    in: () => chain,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    then: (resolve: (value: T) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return chain
}

function makeDb(state: DbState) {
  const client = {
    from(table: string) {
      return {
        select() {
          if (table === 'award_payment_attempts') return chainResult({ data: state.attempt, error: null })
          if (table === 'award_orders') return chainResult({ data: state.order ?? null, error: null })
          return chainResult({ data: null, error: null })
        },
        insert(payload: Record<string, unknown>) {
          return Promise.resolve({ data: null, error: null })
        },
        update(payload: Record<string, unknown>) {
          state.updates.push({ table, payload })
          if (table === 'award_payment_attempts' && state.attempt) {
            state.attempt = { ...state.attempt, ...(payload as Partial<Attempt>) }
          }
          return chainResult({ data: null, error: null })
        },
      }
    },
    rpc(fn: string, args: Record<string, unknown>) {
      state.rpcCalls.push({ fn, args })
      const processResult = state.processResult ?? { outcome: 'succeeded', notification_needed: true }
      if (processResult.outcome === 'succeeded' && state.attempt) {
        state.attempt = {
          ...state.attempt,
          status: 'succeeded',
          captured_amount_minor: Number(args.p_captured_amount_minor),
        }
      }
      return Promise.resolve({ data: processResult, error: state.processError ?? null })
    },
  }
  return client
}

function signedHeaders(rawBody: string, timestamp = NOW) {
  const signature = createHmac('sha256', SECRET).update(`${timestamp}.${rawBody}`).digest('hex')
  return {
    'x-bachs-timestamp': String(timestamp),
    'x-bachs-signature': signature,
  }
}

function eventFor(currency: 'NGN' | 'USD', amount: string): BachsWebhookEvent {
  return {
    id: `evt-${currency.toLowerCase()}`,
    type: 'collection.succeeded',
    created_at: new Date(NOW * 1000).toISOString(),
    organization_id: 'org-1',
    data: {
      checkout_id: 'chk-1',
      reference: 'AFL-AWARD-order-1-attempt-1',
      metadata: {
        order_id: 'order-1',
        payment_attempt_id: 'attempt-1',
        purpose: 'afl_award_fee_v1',
      },
      status: 'SUCCEEDED',
      amount,
      currency,
      charge_id: `ch-${currency.toLowerCase()}`,
    },
  }
}

function attemptFor(currency: 'NGN' | 'USD'): Attempt {
  return {
    id: 'attempt-1',
    order_id: 'order-1',
    provider: 'bachs',
    charge_scope: 'award_fee',
    status: 'open',
    requested_amount_minor: currency === 'NGN' ? 2_500_000 : 2_000,
    captured_amount_minor: null,
    currency,
    provider_reference: 'AFL-AWARD-order-1-attempt-1',
    provider_checkout_id: 'chk-1',
    provider_status: null,
    provider_charge_id: null,
    price_version: 'afl-award-2026-v1',
  }
}

function depsFor(state: DbState, notify = vi.fn()): BachsWebhookDeps {
  return {
    db: makeDb(state) as never,
    config: {
      apiKey: 'sk_sandbox_test',
      apiBaseUrl: 'https://sandbox-api.bachs.io',
      webhookSecret: SECRET,
      organizationId: 'org-1',
      webhookToleranceSeconds: 300,
      checkoutHosts: new Set(['checkout.bachs.io']),
      siteUrl: 'https://top100afl.com',
    },
    nowSeconds: () => NOW,
    notifyAwardPayment: notify,
  }
}

describe('handleBachsEvent', () => {
  beforeEach(() => vi.restoreAllMocks())

  it.each([
    ['NGN', '25000.00', 2_500_000],
    ['USD', '20.00', 2_000],
  ] as const)('confirms exact %s payment and notifies once', async (currency, amount, minor) => {
    const state: DbState = {
      attempt: attemptFor(currency),
      order: { id: 'order-1', award_payment_status: 'paid', award_paid_attempt_id: 'attempt-1' },
      updates: [],
      rpcCalls: [],
    }
    const notify = vi.fn().mockResolvedValue(undefined)
    const event = eventFor(currency, amount)
    const rawBody = JSON.stringify(event)

    const result = await handleBachsEvent(rawBody, signedHeaders(rawBody), depsFor(state, notify))

    expect(result.status).toBe('processed')
    expect(state.rpcCalls).toHaveLength(1)
    expect(state.rpcCalls[0].fn).toBe('process_bachs_webhook_event')
    expect(state.rpcCalls[0].args).toMatchObject({
      p_attempt_id: 'attempt-1',
      p_captured_amount_minor: minor,
      p_provider_status: 'SUCCEEDED',
      p_provider_charge_id: `ch-${currency.toLowerCase()}`,
    })
    expect(notify).toHaveBeenCalledTimes(1)
    expect(notify.mock.calls[0][0]).toMatchObject({ currency, amountMinor: minor, orderId: 'order-1' })
  })

  it('rejects a bad signature before touching the event ledger', async () => {
    const state: DbState = { attempt: attemptFor('NGN'), updates: [], rpcCalls: [] }
    const event = eventFor('NGN', '25000.00')
    const rawBody = JSON.stringify(event)
    const result = await handleBachsEvent(
      rawBody,
      { ...signedHeaders(rawBody), 'x-bachs-signature': '0'.repeat(64) },
      depsFor(state),
    )

    expect(result.status).toBe('rejected')
    expect(result.httpStatus).toBe(401)
    expect(state.rpcCalls).toHaveLength(0)
  })

  it('does not confirm an amount mismatch and records an overpayment exception', async () => {
    const state: DbState = {
      attempt: attemptFor('NGN'),
      processResult: { outcome: 'exception', attempt_status: 'overpaid', notification_needed: false },
      updates: [],
      rpcCalls: [],
    }
    const event = eventFor('NGN', '25001.00')
    const rawBody = JSON.stringify(event)
    const result = await handleBachsEvent(rawBody, signedHeaders(rawBody), depsFor(state))

    expect(result.status).toBe('exception')
    expect(state.rpcCalls).toHaveLength(1)
    expect(state.rpcCalls[0].args).toMatchObject({ p_captured_amount_minor: 2_500_100 })
  })

  it('acknowledges a replay without repeating the claim or notification', async () => {
    const event = eventFor('USD', '20.00')
    const rawBody = JSON.stringify(event)
    const state: DbState = {
      attempt: { ...attemptFor('USD'), status: 'succeeded', captured_amount_minor: 2_000 },
      order: { id: 'order-1', award_payment_status: 'paid', award_paid_attempt_id: 'attempt-1' },
      processResult: { outcome: 'duplicate_event', notification_needed: false },
      updates: [],
      rpcCalls: [],
    }
    const notify = vi.fn().mockResolvedValue(undefined)

    const result = await handleBachsEvent(rawBody, signedHeaders(rawBody), depsFor(state, notify))

    expect(result.status).toBe('duplicate')
    expect(state.rpcCalls).toHaveLength(1)
    expect(notify).toHaveBeenCalledTimes(1)
  })

  it('returns retryable failure when the event cannot be durably recorded', async () => {
    const state: DbState = {
      attempt: attemptFor('NGN'),
      processError: { code: '08006', message: 'connection failure' },
      updates: [],
      rpcCalls: [],
    }
    const event = eventFor('NGN', '25000.00')
    const rawBody = JSON.stringify(event)

    const result = await handleBachsEvent(rawBody, signedHeaders(rawBody), depsFor(state))

    expect(result.status).toBe('retryable_error')
    expect(result.httpStatus).toBe(503)
    expect(state.rpcCalls).toHaveLength(1)
  })

  it('acknowledges an expiry that only identifies the checkout', async () => {
    const state: DbState = { attempt: attemptFor('NGN'), updates: [], rpcCalls: [] }
    const event: BachsWebhookEvent = {
      id: 'evt-expired',
      type: 'checkout.expired',
      created_at: new Date(NOW * 1000).toISOString(),
      organization_id: 'org-1',
      data: { checkout_id: 'chk-1' },
    }
    const rawBody = JSON.stringify(event)
    const result = await handleBachsEvent(rawBody, signedHeaders(rawBody), depsFor(state))

    expect(result.status).toBe('processed')
    expect(state.rpcCalls[0].args).toMatchObject({ p_attempt_id: 'attempt-1', p_captured_amount_minor: null })
  })

  it('does not repair a notification from a replayed exception event', async () => {
    const state: DbState = {
      attempt: { ...attemptFor('USD'), status: 'underpaid', captured_amount_minor: 1_900 },
      order: { id: 'order-1', award_payment_status: 'unpaid', award_paid_attempt_id: null },
      processResult: { outcome: 'duplicate_event', notification_needed: false },
      updates: [],
      rpcCalls: [],
    }
    const event = eventFor('USD', '19.00')
    const rawBody = JSON.stringify(event)
    const notify = vi.fn().mockResolvedValue(undefined)
    const result = await handleBachsEvent(rawBody, signedHeaders(rawBody), depsFor(state, notify))

    expect(result.status).toBe('duplicate')
    expect(notify).not.toHaveBeenCalled()
  })

  it('rejects an event from a different configured organization before database work', async () => {
    const state: DbState = { attempt: attemptFor('NGN'), updates: [], rpcCalls: [] }
    const event = { ...eventFor('NGN', '25000.00'), organization_id: 'another-org' }
    const rawBody = JSON.stringify(event)
    const result = await handleBachsEvent(rawBody, signedHeaders(rawBody), depsFor(state))

    expect(result.status).toBe('rejected')
    expect(result.httpStatus).toBe(400)
    expect(state.rpcCalls).toHaveLength(0)
  })

  it('durably acknowledges malformed attempt metadata without querying a UUID column', async () => {
    const state: DbState = {
      attempt: attemptFor('NGN'),
      processResult: { outcome: 'exception', notification_needed: false },
      updates: [],
      rpcCalls: [],
    }
    const event = eventFor('NGN', '25000.00')
    event.data.metadata = { ...event.data.metadata, payment_attempt_id: 'provider-garbage' }
    const rawBody = JSON.stringify(event)
    const result = await handleBachsEvent(rawBody, signedHeaders(rawBody), depsFor(state))

    expect(result.status).toBe('exception')
    expect(state.rpcCalls[0].args.p_attempt_id).toBeNull()
  })
})
