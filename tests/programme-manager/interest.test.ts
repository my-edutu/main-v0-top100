import { describe, expect, it } from 'vitest'
import { interestSchema } from '@/lib/programme-manager/interest'
describe('member interest consent', () => {
 it('requires consent and an activity only for programme interest', () => {
  expect(interestSchema.safeParse({ kind:'mentor', activity_id:null, consent:false }).success).toBe(false)
  expect(interestSchema.safeParse({ kind:'programme', activity_id:null, consent:true }).success).toBe(false)
  expect(interestSchema.safeParse({ kind:'volunteer', activity_id:null, consent:true }).success).toBe(true)
 })
})
