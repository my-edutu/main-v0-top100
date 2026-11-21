import { describe, expect, it } from 'vitest'
import { interestSchema } from '@/lib/programme-manager/interest'
describe('member interest consent', () => {
 it('requires consent and an activity only for programme interest', () => {
  expect(interestSchema.safeParse({ kind:'mentor', activity_id:null, consent:false }).success).toBe(false)
  expect(interestSchema.safeParse({ kind:'programme', activity_id:null, consent:true }).success).toBe(false)
  expect(interestSchema.safeParse({ kind:'volunteer', activity_id:null, consent:true }).success).toBe(true)
 })
})

describe('Community Impact Network signup', () => {
 const payload = {
  kind: 'community', activity_id: null, consent: true,
  community_details: {
   roles: ['volunteer', 'connector', 'mentor', 'speaker'], categories: ['education', 'climate'],
   full_name: 'Demo Member', email: 'member@example.com', country_code: 'NG',
   location: 'Lagos, Nigeria', availability: 'weekends', contribution: 'Help coordinate local activities.',
  },
 }
 it('accepts multiple roles and impact categories', () => {
  expect(interestSchema.safeParse(payload).success).toBe(true)
 })
 it('requires contact details and a country code', () => {
  for (const details of [{ full_name: '' }, { email: 'invalid' }, { country_code: '' }]) {
   expect(interestSchema.safeParse({ ...payload, community_details: { ...payload.community_details, ...details } }).success).toBe(false)
  }
 })
 it('requires both a category and role, rejects duplicates and does not accept missing consent', () => {
  for (const details of [{ roles: [] }, { categories: [] }, { roles: ['mentor', 'mentor'] }]) {
   expect(interestSchema.safeParse({ ...payload, community_details: { ...payload.community_details, ...details } }).success).toBe(false)
  }
  expect(interestSchema.safeParse({ ...payload, consent: false }).success).toBe(false)
 })
})
