import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ rpc:vi.fn(), from:vi.fn(), create:vi.fn(), config:vi.fn(), fee:vi.fn(), isDefinitiveNoSessionError:vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({rpc:mocks.rpc,from:mocks.from}) }))
vi.mock('@/lib/payments/bachs/checkout', () => ({ createCheckoutSession:mocks.create, isDefinitiveNoSessionError:mocks.isDefinitiveNoSessionError }))
vi.mock('@/lib/payments/bachs/config', () => ({bachsConfig:mocks.config}))
vi.mock('@/lib/awards/payment-price', () => ({awardFee:mocks.fee}))
import { createAwardPaymentCheckout, getAwardPaymentView } from '@/lib/awards/payment-server'
const member = {id:'11b7e533-cc9e-4792-a5a8-428a746ae634',email:'member@example.com'}
let update: ReturnType<typeof vi.fn>
beforeEach(() => {
 vi.resetAllMocks()
 mocks.config.mockReturnValue({checkoutHosts:new Set(['checkout.bachs.io'])})
 mocks.fee.mockReturnValue({amountMinor:2500000,priceVersion:'afl-award-2026-v1'})
 mocks.isDefinitiveNoSessionError.mockReturnValue(false)
 mocks.rpc.mockResolvedValue({data:{outcome:'created',order_id:'order',attempt_id:'attempt',provider_reference:'ref',idempotency_key:'key',currency:'NGN',requested_amount_minor:2500000},error:null})
 mocks.create.mockResolvedValue({checkoutId:'checkout',checkoutUrl:'https://checkout.bachs.io/c/checkout',status:'open',expiresAt:'2026-09-09T00:00:00Z',safeProviderResponse:{checkout_url:'https://checkout.bachs.io/c/checkout'}})
 update=vi.fn()
 const query:any={update,eq:vi.fn(()=>query),select:vi.fn().mockResolvedValue({data:[{id:'attempt'}],error:null})}
 update.mockReturnValue(query)
 mocks.from.mockReturnValue(query)
})
describe('award payment checkout service',()=>{
 it('reserves server price before contacting Bachs, then durably stores the checkout',async()=>{
  expect(await createAwardPaymentCheckout(member,'NGN')).toEqual({checkoutUrl:'https://checkout.bachs.io/c/checkout',attemptId:'attempt'})
  expect(mocks.rpc).toHaveBeenCalledWith('reserve_bachs_award_checkout',expect.objectContaining({p_profile_id:member.id,p_currency:'NGN',p_requested_amount_minor:2500000}))
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({orderId:'order',attemptId:'attempt',reference:'ref',idempotencyKey:'key',currency:'NGN',customer:{email:member.email}}))
  expect(update).toHaveBeenCalledWith(expect.objectContaining({provider_checkout_id:'checkout',status:'open'}))
 })
 it.each(['already_paid','legacy_pending','existing','blocked'])('does not mint a provider session for %s',async outcome=>{
  mocks.rpc.mockResolvedValue({data:{outcome},error:null})
  await expect(createAwardPaymentCheckout(member,'NGN')).rejects.toMatchObject({statusCode:409})
  expect(mocks.create).not.toHaveBeenCalled()
 })
 it('does not expose checkout when persistence loses a concurrent webhook race',async()=>{
  const query:any={update:vi.fn(()=>query),eq:vi.fn(()=>query),select:vi.fn().mockResolvedValue({data:[],error:null})}
  mocks.from.mockReturnValue(query)
  await expect(createAwardPaymentCheckout(member,'NGN')).rejects.toMatchObject({statusCode:409})
 })
 it('retains the reserved attempt on uncertain provider failure',async()=>{
  mocks.create.mockRejectedValue(new Error('network timeout'))
  await expect(createAwardPaymentCheckout(member,'NGN')).rejects.toThrow()
  expect(update).not.toHaveBeenCalled()
 })
 it('marks a definitively rejected provider reservation failed so it can be retried',async()=>{
  const providerError = new Error('provider rejected')
  mocks.create.mockRejectedValue(providerError)
  mocks.isDefinitiveNoSessionError.mockReturnValue(true)
  await expect(createAwardPaymentCheckout(member,'NGN')).rejects.toBe(providerError)
  expect(mocks.rpc).toHaveBeenNthCalledWith(2,'fail_bachs_award_checkout_creation',expect.objectContaining({p_attempt_id:'attempt',p_order_id:'order'}))
  expect(update).not.toHaveBeenCalled()
 })
 it('retries checkout persistence and never returns before the guarded write succeeds',async()=>{
  let persistCalls = 0
  const query:any = {
   update:vi.fn(()=>query),
   eq:vi.fn(()=>query),
   select:vi.fn(()=>{
    persistCalls += 1
    return Promise.resolve(persistCalls < 3
      ? {data:null,error:{message:'temporary database error'}}
      : {data:[{id:'attempt'}],error:null})
   }),
  }
  mocks.from.mockReturnValue(query)
  await expect(createAwardPaymentCheckout(member,'NGN')).resolves.toEqual({checkoutUrl:'https://checkout.bachs.io/c/checkout',attemptId:'attempt'})
  expect(persistCalls).toBe(3)
 })
 it('records the provider checkout as an exception when the open write cannot be saved',async()=>{
  let persistCalls = 0
  const query:any = {
   update:vi.fn(()=>query),
   eq:vi.fn(()=>query),
   select:vi.fn(()=>{
    persistCalls += 1
    return Promise.resolve(persistCalls === 4
      ? {data:[{id:'attempt'}],error:null}
      : {data:null,error:{message:'database unavailable'}})
   }),
  }
  mocks.from.mockReturnValue(query)
  await expect(createAwardPaymentCheckout(member,'NGN')).rejects.toMatchObject({statusCode:503})
  expect(query.update).toHaveBeenLastCalledWith(expect.objectContaining({status:'exception',provider_checkout_id:'checkout',provider_response:expect.objectContaining({checkout_url:'https://checkout.bachs.io/c/checkout'})}))
  expect(persistCalls).toBe(4)
 })
 it('rejects a member without email before creating any payment record',async()=>{
  await expect(createAwardPaymentCheckout({id:member.id},'NGN')).rejects.toMatchObject({statusCode:400})
  expect(mocks.rpc).not.toHaveBeenCalled()
 })
})

describe('payment state read privacy', () => {
 function setupRead(checkoutUrl: string) {
  const orderQuery:any = {select:vi.fn(()=>orderQuery),eq:vi.fn(()=>orderQuery),neq:vi.fn(()=>orderQuery),maybeSingle:vi.fn().mockResolvedValue({data:{id:'order',status:'draft',award_payment_status:'pending'},error:null})}
  const attemptsQuery:any = {select:vi.fn(()=>attemptsQuery),eq:vi.fn(()=>attemptsQuery),order:vi.fn().mockResolvedValue({data:[{id:'attempt',status:'open',currency:'NGN',requested_amount_minor:2500000,checkout_expires_at:new Date(Date.now()+60000).toISOString(),provider_response:{checkout_url:checkoutUrl,private_payload:'hidden'}}],error:null})}
  mocks.from.mockImplementation(table=>table==='award_orders'?orderQuery:attemptsQuery)
  return {orderQuery,attemptsQuery}
 }
 it('scopes reads to the authenticated member and returns only a safe projection', async()=>{
  const {orderQuery,attemptsQuery}=setupRead('https://checkout.bachs.io/c/a')
  const view=await getAwardPaymentView(member.id)
  expect(orderQuery.eq).toHaveBeenCalledWith('profile_id',member.id)
  expect(attemptsQuery.eq).toHaveBeenCalledWith('order_id','order')
  expect(view.currentAttempt?.checkoutUrl).toBe('https://checkout.bachs.io/c/a')
  expect(JSON.stringify(view)).not.toContain('private_payload')
 })
 it.each(['https://evil.example/c/a','https://checkout.bachs.io:8443/c/a','http://checkout.bachs.io/c/a'])('does not expose untrusted persisted resume URL %s',async url=>{
  setupRead(url)
  expect((await getAwardPaymentView(member.id)).currentAttempt?.checkoutUrl).toBeUndefined()
 })
})
