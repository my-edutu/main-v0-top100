'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Loader2, UserRound } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { updateMemberProfile, type MemberProfile } from '@/lib/member-hub'
import { persistThenRefresh } from '../_lib/persistence-workflows'
import { buildProfileUpdatePatch, getProfileWizardSteps, type ProfileEditStep } from '../_lib/profile-wizard'
import { useDashboardMember } from '../_providers/dashboard-member'
import { MemberAvatar } from '../_components/member-avatar'

type ProfileDraft = Pick<
  MemberProfile,
  'headline' | 'field' | 'location' | 'organization' | 'bio' | 'emailVisible' | 'recruiterVisible'
>

function draftFromMember(member: MemberProfile): ProfileDraft {
  return {
    headline: member.headline,
    field: member.field,
    location: member.location,
    organization: member.organization,
    bio: member.bio,
    emailVisible: member.emailVisible,
    recruiterVisible: member.recruiterVisible,
  }
}

async function uploadProfilePhoto(file: File): Promise<string> {
  const form = new FormData()
  form.set('file', file)
  const response = await fetch('/api/member/avatar', { method: 'POST', body: form })
  const data = await response.json()
  if (!response.ok || typeof data.url !== 'string') {
    throw new Error(data.error || 'Could not upload your photo.')
  }
  return data.url
}

const stepCopy: Record<Exclude<ProfileEditStep, 'photo' | 'visibility'>, { title: string; detail: string }> = {
  headline: { title: 'What should people know you for?', detail: 'A short line that introduces your work.' },
  field: { title: 'What field do you work in?', detail: 'For example, education, climate, health, or technology.' },
  location: { title: 'Where are you based?', detail: 'Add your city and country, if you would like to share them.' },
  organization: { title: 'Where do you work or study?', detail: 'Add an organization, institution, or leave this blank.' },
  bio: { title: 'Tell your story.', detail: 'Write a brief BIO for your public awardee profile.' },
}

export function ProfileSection() {
  const { member, refreshMember, replaceMember } = useDashboardMember()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromMember(member))
  const [stepIndex, setStepIndex] = useState(0)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const updatesRemaining = Math.max(0, member.bioUpdateLimit - member.bioUpdateCount)
  const steps = getProfileWizardSteps(updatesRemaining > 0)
  const currentStep = steps[stepIndex] ?? steps[0]

  function startEditing() {
    setDraft(draftFromMember(member))
    setPhotoFile(null)
    setStepIndex(0)
    setError('')
    setWarning('')
    setEditing(true)
  }

  function updateDraft<Key extends keyof ProfileDraft>(key: Key, value: ProfileDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function selectPhoto(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setPhotoFile(null)
      setError('Choose a JPG, PNG or WebP image under 5 MB.')
      return
    }
    setError('')
    setPhotoFile(file)
  }

  async function saveProfile() {
    if (saving) return
    setSaving(true)
    setError('')
    setWarning('')
    let uploadedAvatarUrl: string | null = null

    try {
      if (photoFile) {
        uploadedAvatarUrl = await uploadProfilePhoto(photoFile)
        setPhotoFile(null)
      }

      const result = await persistThenRefresh({
        persist: () => updateMemberProfile(member.id, buildProfileUpdatePatch(draft, updatesRemaining > 0)),
        applyPersisted: (persisted) => replaceMember({
          ...persisted,
          ...(uploadedAvatarUrl ? { avatarUrl: uploadedAvatarUrl } : {}),
        }),
        refresh: refreshMember,
        refreshWarning: 'Your profile was saved, but we could not refresh the latest account view.',
      })

      setWarning(result.warning)
      setEditing(false)
      toast.success('Your profile has been updated.')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not save your profile.'
      if (uploadedAvatarUrl) {
        replaceMember({ ...member, avatarUrl: uploadedAvatarUrl })
        setError(`Your photo was updated, but the rest of your profile was not saved. ${message}`)
      } else {
        setError(message)
      }
      toast.error(uploadedAvatarUrl ? 'Your photo was updated; other profile changes need another try.' : message)
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <ProfileOverview member={member} onEdit={startEditing} />
    )
  }

  const isLastStep = stepIndex === steps.length - 1

  return (
    <section className="hub-profile-editor mx-auto w-full max-w-2xl space-y-5" aria-label="Update your profile">
      <div className="space-y-2" aria-live="polite">
        <div className="flex items-center justify-between gap-3 text-sm text-neutral-600">
          <span>Question {stepIndex + 1} of {steps.length}</span>
          <span>{Math.round(((stepIndex + 1) / steps.length) * 100)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={stepIndex + 1} aria-label="Profile update progress">
          <div className="h-full rounded-full bg-orange-600 transition-[width]" style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      {updatesRemaining === 0 ? (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
          Your profile text update allowance is used up. You can still update your photo and visibility settings; ask the admin team to reset text edits.
        </p>
      ) : null}

      <div className="min-h-64 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6">
        {currentStep === 'photo' ? (
          <section aria-labelledby="profile-question-photo" className="space-y-5">
            <div>
              <h3 id="profile-question-photo" className="text-lg font-semibold text-neutral-950">Would you like to update your photo?</h3>
              <p className="mt-1 text-sm leading-5 text-neutral-600">Choose a clear JPG, PNG, or WebP image up to 5 MB. Your award cover stays separate.</p>
            </div>
            <div className="flex items-center gap-4">
              <MemberAvatar src={member.avatarUrl} initials={member.avatarInitials} size={64} />
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="profile-photo">Profile photo</Label>
                <Input ref={photoInputRef} id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={saving} onChange={(event) => { selectPhoto(event.currentTarget.files?.[0]); event.currentTarget.value = '' }} className="sr-only" tabIndex={-1} />
                <div className="flex min-h-11 items-center gap-3 rounded-md border border-neutral-200 pr-3">
                  <Button type="button" variant="outline" disabled={saving} onClick={() => photoInputRef.current?.click()} className="min-h-11 shrink-0 rounded-r-none border-0 border-r bg-orange-50 text-orange-900">
                    Choose photo
                  </Button>
                  <span className="min-w-0 break-all text-sm text-neutral-600" aria-live="polite">{photoFile ? photoFile.name : 'No photo selected'}</span>
                </div>
              </div>
            </div>
          </section>
        ) : currentStep === 'visibility' ? (
          <section aria-labelledby="profile-question-visibility" className="space-y-5">
            <div>
              <h3 id="profile-question-visibility" className="text-lg font-semibold text-neutral-950">Who can find you?</h3>
              <p className="mt-1 text-sm leading-5 text-neutral-600">Choose how your public profile can be discovered and whether your email is shown.</p>
            </div>
            <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 px-4">
              <VisibilityOption label="Recruiters can find my profile" checked={draft.recruiterVisible} onChange={(checked) => updateDraft('recruiterVisible', checked)} />
              <VisibilityOption label="Show my email on my public profile" checked={draft.emailVisible} onChange={(checked) => updateDraft('emailVisible', checked)} />
            </div>
            <p className="break-all text-xs text-neutral-500">Account email: {member.email}</p>
          </section>
        ) : (
          <ProfileQuestion
            step={currentStep}
            value={draft[currentStep]}
            onChange={(value) => updateDraft(currentStep, value)}
          />
        )}
      </div>

      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-800">{error}</p> : null}
      {warning ? <p role="status" className="text-sm leading-5 text-amber-800">{warning}</p> : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="outline" onClick={() => { setError(''); if (stepIndex === 0) setEditing(false); else setStepIndex((index) => index - 1) }} disabled={saving} className="min-h-11 w-full gap-2 border-neutral-300 sm:w-auto">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {stepIndex === 0 ? 'Cancel update' : 'Previous'}
        </Button>
        {isLastStep ? (
          <Button type="button" onClick={() => void saveProfile()} disabled={saving} className="min-h-11 w-full bg-orange-600 font-semibold text-white hover:bg-orange-700 sm:w-auto sm:min-w-44">
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : null}
            {saving ? 'Saving profile…' : 'Save profile'}
          </Button>
        ) : (
          <Button type="button" onClick={() => { setError(''); setStepIndex((index) => Math.min(index + 1, steps.length - 1)) }} disabled={saving} className="min-h-11 w-full gap-2 bg-orange-600 font-semibold text-white hover:bg-orange-700 sm:w-auto sm:min-w-44">
            Next question <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </section>
  )
}

function ProfileOverview({ member, onEdit }: { member: MemberProfile; onEdit: () => void }) {
  return (
    <section className="mx-auto w-full max-w-3xl space-y-6" aria-labelledby="profile-overview-title">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div className="flex min-w-0 items-center gap-4">
          <MemberAvatar src={member.avatarUrl} initials={member.avatarInitials} size={60} />
          <div className="min-w-0">
            <h2 id="profile-overview-title" className="truncate text-xl font-semibold tracking-tight text-neutral-950">{member.name}</h2>
            <p className="mt-1 break-words text-sm text-neutral-600">{member.headline || 'Add a headline to introduce yourself.'}</p>
          </div>
        </div>
        <Button type="button" onClick={onEdit} className="min-h-11 w-full bg-orange-600 font-semibold text-white hover:bg-orange-700 sm:w-auto">
          Update profile
        </Button>
      </header>

      {member.portfolioCoverUrl ? (
        <figure className="flex items-start gap-4">
          <Image src={member.portfolioCoverUrl} alt={`${member.name}'s Africa Future Leaders award cover`} width={180} height={225} sizes="(max-width: 640px) 96px, 120px" unoptimized className="aspect-[4/5] w-24 rounded-lg border border-neutral-200 object-cover sm:w-28" />
          <figcaption className="pt-1">
            <p className="text-sm font-medium text-neutral-900">Award cover</p>
            <p className="mt-1 text-sm leading-5 text-neutral-600">Your generated cover appears on your public awardee profile.</p>
            <Link href="/dashboard/me/portfolio-cover" className="mt-3 inline-flex min-h-10 items-center text-sm font-medium text-orange-800 underline-offset-4 hover:underline">View or update cover</Link>
          </figcaption>
        </figure>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-neutral-300 px-4 py-3">
          <UserRound className="size-5 shrink-0 text-neutral-500" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm leading-5 text-neutral-600">You haven’t created your award cover yet.</p>
          <Link href="/dashboard/me/portfolio-cover" className="shrink-0 text-sm font-medium text-orange-800 underline-offset-4 hover:underline">Create cover</Link>
        </div>
      )}

      <section className="space-y-3" aria-labelledby="profile-details-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="profile-details-title" className="text-base font-semibold text-neutral-950">Public profile details</h3>
          {member.publicSlug ? <Link href={`/bio/${member.publicSlug}`} className="min-h-10 inline-flex items-center text-sm font-medium text-orange-800 underline-offset-4 hover:underline">View public profile</Link> : null}
        </div>
        <dl className="grid min-w-0 grid-cols-1 divide-y divide-neutral-100 border-y border-neutral-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <ProfileValue label="Field" value={member.field} />
          <ProfileValue label="Location" value={member.location} />
          <ProfileValue label="Organization" value={member.organization} />
          <ProfileValue label="Recruiter visibility" value={member.recruiterVisible ? 'Visible to recruiters' : 'Hidden from recruiters'} />
          <ProfileValue label="Email visibility" value={member.emailVisible ? 'Shown on public profile' : 'Not shown publicly'} />
          <ProfileValue label="Account email" value={member.email} />
        </dl>
        <div className="space-y-1 py-2">
          <h4 className="text-sm font-medium text-neutral-800">BIO</h4>
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-neutral-600">{member.bio || 'Add a short BIO to tell people about your work.'}</p>
        </div>
      </section>
    </section>
  )
}

function ProfileValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 py-3 sm:px-4 first:sm:pl-0">
      <dt className="text-xs font-medium text-neutral-500">{label}</dt>
      <dd className="mt-1 break-words text-sm leading-5 text-neutral-900">{value || 'Not added yet'}</dd>
    </div>
  )
}

function ProfileQuestion({ step, value, onChange }: {
  step: Exclude<ProfileEditStep, 'photo' | 'visibility'>
  value: string
  onChange: (value: string) => void
}) {
  const copy = stepCopy[step]
  const multiline = step === 'bio'
  return (
    <section className="space-y-5" aria-labelledby={`profile-question-${step}`}>
      <div>
        <h3 id={`profile-question-${step}`} className="text-lg font-semibold text-neutral-950">{copy.title}</h3>
        <p className="mt-1 text-sm leading-5 text-neutral-600">{copy.detail}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`profile-answer-${step}`}>{step === 'bio' ? 'Your BIO' : step === 'field' ? 'Field' : step === 'organization' ? 'Organization' : step === 'location' ? 'Location' : 'Headline'}</Label>
        {multiline ? (
          <Textarea id={`profile-answer-${step}`} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Share the work you do, who it helps, and what motivates you." className="min-h-48 resize-y text-base leading-6" />
        ) : (
          <Input id={`profile-answer-${step}`} value={value} onChange={(event) => onChange(event.target.value)} placeholder={step === 'headline' ? 'Founder, researcher, changemaker' : step === 'field' ? 'Education, climate, health' : step === 'organization' ? 'Company or institution' : 'City, country'} className="min-h-12 text-base" />
        )}
      </div>
    </section>
  )
}

function VisibilityOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-14 items-center justify-between gap-4 py-3 text-sm leading-5 text-neutral-800">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} className="data-[state=checked]:bg-orange-600" />
    </label>
  )
}
