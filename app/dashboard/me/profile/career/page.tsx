'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, BriefcaseBusiness, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateMemberProfile } from '@/lib/member-hub'
import { profileCareerSchema, type ProfileCareer } from '@/lib/profile-career'
import { FOUNDERS_NETWORK_PATH } from '@/lib/founders-network'
import { useDashboardMember } from '../../../_providers/dashboard-member'
import { RouteSection } from '../../../_components/route-section'

const profilePath = '/dashboard/me/profile'
type Step = 'choice' | 'details' | 'sharing' | 'saved'
const choices = [
  { type: 'employer', title: 'I work for an organization', icon: BriefcaseBusiness },
  { type: 'startup', title: 'I own or am building a startup', icon: Rocket },
] as const

export default function CareerProfilePage() {
  const { member, replaceMember } = useDashboardMember()
  const [step, setStep] = useState<Step>('choice')
  const [draft, setDraft] = useState<ProfileCareer | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmRemoval, setConfirmRemoval] = useState(false)
  const startup = draft?.type === 'startup'

  function selectType(type: ProfileCareer['type']) {
    setDraft(current => current?.type === type ? current : member.career?.type === type ? member.career : {
      type, name: member.career === undefined && type === 'employer' ? member.organization : '', role: '', linkedinUrl: '', isPublic: false,
    })
    setError('')
    setStep('details')
  }

  function continueToSharing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft?.name.trim()) { setError('Enter a name to continue.'); return }
    setError('')
    setStep('sharing')
  }

  async function save(value: ProfileCareer | null) {
    if (saving) return
    const result = profileCareerSchema.safeParse(value)
    if (!result.success) {
      setError(result.error.issues[0]?.message || 'Check your career details.')
      return
    }
    setSaving(true)
    setError('')
    try {
      replaceMember(await updateMemberProfile(member.id, { career: result.data }))
      setDraft(result.data)
      setConfirmRemoval(false)
      setStep('saved')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your career details.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <RouteSection title="Career & organization" description="Share what you’re working on when you’re ready.">
      <Link href={profilePath} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-neutral-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> My profile
      </Link>
      <section className="max-w-xl space-y-5 rounded-xl border border-neutral-200 bg-white p-4 sm:p-6">
        {step === 'choice' && <>
          <h2 className="text-xl font-semibold">Which best describes your work?</h2>
          <div className="grid gap-2">
            {choices.map(({ type, title, icon: Icon }) => (
              <Button key={type} type="button" variant="outline" disabled={saving} onClick={() => selectType(type)}
                className="min-h-12 justify-start whitespace-normal text-left">
                <Icon className="mr-2 size-5 shrink-0" aria-hidden="true" /> {title}
              </Button>
            ))}
            <Link href={profilePath} className="inline-flex min-h-11 items-center text-sm font-medium text-neutral-600 hover:underline">Skip for now</Link>
          </div>
          {member.career && (
            <div className="border-t border-neutral-200 pt-3">
              {confirmRemoval && <p className="mb-2 text-sm text-neutral-700">Remove the career details you previously saved?</p>}
              <Button type="button" variant="ghost" disabled={saving} className="min-h-11 text-red-800"
                onClick={() => confirmRemoval ? void save(null) : setConfirmRemoval(true)}>
                {saving ? 'Removing…' : confirmRemoval ? 'Confirm removal' : 'Remove saved details'}
              </Button>
            </div>
          )}
        </>}
        {step === 'details' && draft && (
          <form onSubmit={continueToSharing} className="space-y-4">
            <h2 className="text-xl font-semibold">{startup ? 'Tell us about your startup' : 'Tell us where you work'}</h2>
            <div className="space-y-2">
              <Label htmlFor="career-name">{startup ? 'Startup name' : 'Employer or organization name'}</Label>
              <Input id="career-name" required maxLength={160} value={draft.name}
                onChange={event => setDraft({ ...draft, name: event.target.value })} className="min-h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="career-role">Your role (optional)</Label>
              <Input id="career-role" maxLength={160} value={draft.role}
                placeholder={startup ? 'Co-founder' : 'Product designer'}
                onChange={event => setDraft({ ...draft, role: event.target.value })} className="min-h-11" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="min-h-11">Continue</Button>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => { setError(''); setStep('choice') }}>Back</Button>
            </div>
          </form>
        )}
        {step === 'sharing' && draft && (
          <form onSubmit={event => { event.preventDefault(); void save(draft) }} className="space-y-4">
            <h2 className="text-xl font-semibold">Choose what to show</h2>
            <div className="space-y-2">
              <Label htmlFor="career-linkedin">{startup ? 'Startup’s LinkedIn page (optional)' : 'Employer’s LinkedIn page (optional)'}</Label>
              <Input id="career-linkedin" type="url" maxLength={500} value={draft.linkedinUrl} disabled={saving}
                placeholder="https://www.linkedin.com/company/…" onChange={event => setDraft({ ...draft, linkedinUrl: event.target.value })} className="min-h-11" />
            </div>
            <label className="flex min-h-11 items-start gap-3 rounded-lg bg-neutral-50 p-3 text-sm leading-5">
              <input type="checkbox" checked={draft.isPublic} disabled={saving} className="mt-0.5 size-4"
                onChange={event => setDraft({ ...draft, isPublic: event.target.checked })} />
              <span>Show these details on my public awardee profile</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving} className="min-h-11">{saving ? 'Saving…' : 'Save career details'}</Button>
              <Button type="button" variant="outline" disabled={saving} className="min-h-11" onClick={() => { setError(''); setStep('details') }}>Back</Button>
            </div>
          </form>
        )}
        {step === 'saved' && <>
          <h2 aria-live="polite" className="text-xl font-semibold">{draft ? 'Career details saved' : 'Career details removed'}</h2>
          {startup && <p className="text-sm text-neutral-600">You can also share your startup with fellow awardees in the Founders Network.</p>}
          <div className="flex flex-wrap gap-2">
            {startup && <Button asChild className="min-h-11"><Link href={FOUNDERS_NETWORK_PATH}>Explore Founders Network</Link></Button>}
            <Button asChild variant="outline" className="min-h-11"><Link href={profilePath}>Back to my profile</Link></Button>
          </div>
        </>}
        {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      </section>
    </RouteSection>
  )
}
