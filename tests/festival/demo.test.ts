import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import {
  DEV_DASHBOARD_COOKIE,
  DEV_DASHBOARD_COOKIE_VALUE,
} from '@/lib/dev-dashboard/auth'
import { createDemoDashboardStore } from '@/lib/dev-dashboard/store'
import { handleDemoMemberRequest } from '@/lib/dev-dashboard/handler'

describe('local festival preview', () => {
  it('blocks attendance details for a pending preview member', async () => {
    const store = createDemoDashboardStore()
    store.profile.status = 'pending'
    const response = await handleDemoMemberRequest(new NextRequest('http://localhost:3025/api/member/festival-interest', {
      headers: { host: 'localhost:3025', cookie: `${DEV_DASHBOARD_COOKIE}=${DEV_DASHBOARD_COOKIE_VALUE}` },
    }), ['festival-interest'], store, 'development')
    expect(response.status).toBe(403)
  })
  it('loads the Project100 preview without a missing-route error or live checkout', async () => {
    const store = createDemoDashboardStore()
    const call = (method = 'GET', body?: unknown) => handleDemoMemberRequest(new NextRequest('http://localhost:3025/api/member/project100/impact', {
      method,
      headers: { host: 'localhost:3025', cookie: `${DEV_DASHBOARD_COOKIE}=${DEV_DASHBOARD_COOKIE_VALUE}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }), ['project100', 'impact'], store, 'development')
    const response = await call()
    expect(response.status).toBe(200)
    const view = await response.json()
    expect(view.groups).toHaveLength(43)
    expect(view.totals.raised).toEqual({ NGN: 0, USD: 0 })
    expect(view.checkoutEnabled).toBe(false)
    expect((await call('POST', { action: 'checkout', input: {} })).status).toBe(503)
  })
  it('checks the sample payment without manufacturing a successful payment', async () => {
    const store = createDemoDashboardStore()
    const check = () => handleDemoMemberRequest(new NextRequest('http://localhost:3025/api/member/award/payment/reconcile?payment=done', {
      method: 'POST', headers: { host: 'localhost:3025', cookie: `${DEV_DASHBOARD_COOKIE}=${DEV_DASHBOARD_COOKIE_VALUE}` },
    }), ['award', 'payment', 'reconcile'], store, 'development')
    expect(await (await check()).json()).toMatchObject({ status: 'unpaid', confirmedPayment: null })
    store.awardPayment.status = 'pending'
    expect(await (await check()).json()).toMatchObject({ status: 'pending', confirmedPayment: null })
    store.awardPayment.status = 'paid'
    store.awardPayment.confirmedPayment = { currency: 'NGN', amountMinor: 2500000, paidAt: new Date().toISOString() }
    expect(await (await check()).json()).toMatchObject({ status: 'paid', confirmedPayment: store.awardPayment.confirmedPayment })
  })
  it('persists sample interest and derives payment from the sample payment record', async () => {
    const store = createDemoDashboardStore()
    const call = async (body?: unknown) => {
      const request = new NextRequest(
        'http://localhost:3025/api/member/festival-interest',
        {
          method: body ? 'POST' : 'GET',
          headers: {
            host: 'localhost:3025',
            cookie: `${DEV_DASHBOARD_COOKIE}=${DEV_DASHBOARD_COOKIE_VALUE}`,
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
        },
      )
      return handleDemoMemberRequest(
        request,
        ['festival-interest'],
        store,
        'development',
      )
    }
    expect(await (await call()).json()).toMatchObject({
      interest: null,
      payment: 'required',
    })
    const input = {
      fullName: 'Amara Okafor',
      phone: '+2348031234567',
      pickupRequested: true,
    }
    expect(await (await call(input)).json()).toMatchObject({
      interest: input,
      payment: 'required',
    })
    store.awardPayment.status = 'paid'
    store.awardPayment.confirmedPayment = {
      currency: 'NGN',
      amountMinor: 2500000,
      paidAt: new Date().toISOString(),
    }
    expect(await (await call()).json()).toMatchObject({
      interest: input,
      payment: 'confirmed',
    })
    store.awardPayment.status = 'refunded'
    expect(await (await call()).json()).toMatchObject({
      interest: input,
      payment: 'required',
    })
    expect((await call({ ...input, paid: true })).status).toBe(400)
  })
})
