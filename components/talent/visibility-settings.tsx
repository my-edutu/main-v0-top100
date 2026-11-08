'use client'
import { useState } from 'react'
import { ShieldCheck, EyeOff } from 'lucide-react'
import { TALENT_POLICY_VERSION } from '@/lib/talent/contracts'
import type { TalentRecord } from '@/lib/talent/types'
import { talentFetch, useTalentMember } from './use-talent'
import { primaryClass, secondaryClass, TalentNotice } from './ui'

export function TalentVisibilitySettings() {
  const { data, setData, loading, disabled, error, reload } = useTalentMember()
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [saveError, setSaveError] = useState('')
  if (disabled) return null
  if (loading) return <p role="status" className="rounded-2xl border border-orange-100 p-5 text-sm text-stone-600">Loading talent visibility choices…</p>
  if (error || !data) return <div className="space-y-3"><TalentNotice error>{error || 'Could not load privacy choices.'}</TalentNotice><button type="button" className={secondaryClass} onClick={() => void reload()}>Try again</button></div>
  const profile = data.talent
  const options = [
    { key: 'discovery_enabled' as const, title: 'Appear in Talent Discovery', description: 'Allow your reviewed talent profile to appear publicly, including in search engines. Your private documents and contact details are not included.' },
    { key: 'introductions_enabled' as const, title: 'Receive organisation introductions', description: 'Top100 may propose relevant introductions. You review each organisation and opportunity before approving contact sharing.' },
    { key: 'promotion_enabled' as const, title: 'Allow Top100 to feature my talent profile', description: 'Allow approved public profile information to be considered for Top100 collections and promotional stories. This does not guarantee a feature.' },
    { key: 'outreach_email_opt_out' as const, title: 'Opt out of talent-update emails', description: 'Stop talent-discovery update emails. Essential account and security messages remain separate.' },
  ]
  async function save(allOff = false) {
    if (!data) return
    setSaving(true); setFeedback(''); setSaveError('')
    const p = data.talent
    try {
      const result = await talentFetch<{ talent: TalentRecord }>('/api/member/talent', { method: 'PATCH', body: JSON.stringify({ action: 'visibility', visibility: { discoveryEnabled: allOff ? false : p.discovery_enabled, introductionsEnabled: allOff ? false : p.introductions_enabled, promotionEnabled: allOff ? false : p.promotion_enabled, outreachEmailOptOut: p.outreach_email_opt_out, policyVersion: TALENT_POLICY_VERSION } }) })
      setData({ ...data, talent: result.talent })
      setFeedback(allOff ? 'Talent discovery, introductions and promotion are now off. Your existing awardee account has not been removed.' : 'Your talent privacy choices have been saved.')
    } catch (e) { setSaveError(e instanceof Error ? e.message : 'Your choices were not saved.') }
    finally { setSaving(false) }
  }
  return <section aria-labelledby="talent-privacy-title" id="talent-privacy" className="rounded-[24px] border border-orange-200 bg-white p-5 sm:p-7">
    <div className="mb-6 flex gap-3"><ShieldCheck className="mt-1 size-6 shrink-0 text-orange-700" aria-hidden="true" /><div><h2 id="talent-privacy-title" className="text-xl font-semibold text-stone-900">Talent discovery & privacy</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">You choose how your new talent profile is used. These controls are separate from your existing awardee recognition and account.</p></div></div>
    <div className="divide-y divide-stone-100">{options.map(option => <label key={option.key} className="flex cursor-pointer items-start gap-3 py-4"><input type="checkbox" checked={profile[option.key]} disabled={saving} onChange={event => { setFeedback(''); setData({ ...data, talent: { ...profile, [option.key]: event.target.checked } }) }} className="mt-1 size-5 shrink-0 accent-orange-700 focus-visible:outline-orange-700" /><span><span className="block text-sm font-semibold text-stone-900">{option.title}</span><span className="mt-1 block text-sm leading-6 text-stone-600">{option.description}</span></span></label>)}</div>
    <p className="my-4 text-xs leading-5 text-stone-600">Turning discovery off removes new access to your talent profile and withdraws pending introductions. Previously delivered emails, documents and third-party search caches cannot be recalled instantly.</p>
    {feedback && <TalentNotice>{feedback}</TalentNotice>}{saveError && <TalentNotice error>{saveError}</TalentNotice>}
    <div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={saving} className={primaryClass} onClick={() => void save()}>{saving ? 'Saving…' : 'Save privacy choices'}</button><button type="button" disabled={saving} className={secondaryClass} onClick={() => void save(true)}><EyeOff className="size-4" aria-hidden="true" />Turn off talent discovery</button></div>
  </section>
}
