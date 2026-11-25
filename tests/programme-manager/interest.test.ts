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

describe('Community Impact Network expression of interest', () => {
 const answers = {
  full_name: 'Demo Applicant',
  email: 'member@example.com',
  phone: '+234 801 234 5678',
  country_code: 'NG',
  linkedin: 'linkedin.com/in/demo',
  bio: 'I mentor early-career engineers in my community.',
  expertise: ['Technology, AI and Innovation'],
  contributions: ['Mentor to Top100 Awardees and Community Members'],
  session_idea: 'Building a global career from Africa',
  participation: ['Virtual engagements'],
  motivation: 'I would like to share practical career advice.',
  confirmation: true,
 }
 const application = (fields: object) => ({
  kind: 'community', activity_id: null, consent: true,
  community_details: { version: 2, answers: fields },
 })

 it('accepts the new form without optional fields, including city, and retains answers', () => {
  const parsed = interestSchema.parse(application(answers))
  expect(parsed).toMatchObject({ community_details: { version: 2, answers: {
   ...answers, linkedin: 'https://linkedin.com/in/demo',
  } } })
 })

 it('retains the optional state or region and city as separate answers', () => {
  expect(interestSchema.parse(application({ ...answers, region: 'Rivers State', city: 'Port Harcourt' }))).toMatchObject({
   community_details: { answers: { region: 'Rivers State', city: 'Port Harcourt' } },
  })
 })

 it('validates all required answers and rejects invalid choices and unsafe profile URLs', () => {
  for (const change of [
   { full_name: ' ' }, { email: 'broken' }, { phone: '123' }, { country_code: '' },
   { bio: '' }, { session_idea: '' }, { motivation: '' }, { confirmation: false },
   { expertise: ['invented category'] }, { participation: ['Virtual engagements', 'Virtual engagements'] },
   { linkedin: 'javascript:alert(1)' },
  ]) {
   expect(interestSchema.safeParse(application({ ...answers, ...change })).success, JSON.stringify(change)).toBe(false)
  }
 })
})
