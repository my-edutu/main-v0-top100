'use client'

import { useEffect, useRef, useState } from 'react'
import Image from '@/components/safe-image'
import Link from 'next/link'
import { ArrowLeft, Loader2, Share2, UserRound } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { updateMemberProfile, type MemberProfile } from '@/lib/member-hub'
import { persistThenRefresh } from '../_lib/persistence-workflows'
import { buildProfileUpdatePatch, type ProfileEditStep } from '../_lib/profile-wizard'
import { useDashboardMember } from '../_providers/dashboard-member'
import { PROFILE_TEXT_LIMITS, validateProfileDraft } from '../_lib/profile-editor'
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

async function prepareProfilePhoto(file: File): Promise<File> {
  if (file.size < 150 * 1024) return file
  const source = URL.createObjectURL(file)
  try {
    const image = new window.Image()
    image.src = source
    await image.decode()
    const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.82))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], 'profile-photo.webp', { type: blob.type })
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(source)
  }
}

async function uploadProfilePhoto(file: File): Promise<string> {
  const form = new FormData()
  form.set('file', await prepareProfilePhoto(file))
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
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  useEffect(() => {
    if (!photoFile) return
    const url = URL.createObjectURL(photoFile)
    const initialize = window.setTimeout(() => setPhotoPreview(url), 0)
    return () => { window.clearTimeout(initialize); URL.revokeObjectURL(url) }
  }, [photoFile])
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  function startEditing() {
    setDraft(draftFromMember(member))
    setPhotoFile(null)
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
    const validation = validateProfileDraft(draft)
    if (validation) { setError(validation); return }
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
        persist: () => updateMemberProfile(member.id, buildProfileUpdatePatch(draft, true)),
        applyPersisted: (persisted) => replaceMember({
          ...persisted,
          ...(uploadedAvatarUrl ? { avatarUrl: uploadedAvatarUrl } : {}),
        }),
        refresh: async () => {
          void refreshMember().catch(() => {
            setWarning('Your profile was saved, but we could not refresh the latest account view.')
          })
        },
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


  return (
    <section className="hub-profile-editor mx-auto w-full max-w-5xl space-y-5" aria-label="Update your profile">
      <div><h2 className="text-xl font-semibold">Update your profile</h2><p className="mt-1 text-sm text-neutral-600">Edit your details and preview them before saving.</p></div>
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-5">
          <fieldset disabled={saving} className="space-y-5">
            <div className="space-y-2"><Label htmlFor="profile-photo">Profile photo</Label><MemberAvatar src={photoFile && photoPreview ? photoPreview : member.avatarUrl} initials={member.avatarInitials} size={64} /><Input ref={photoInputRef} id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => selectPhoto(event.target.files?.[0])} /><p className="text-xs text-neutral-500">JPG, PNG or WebP, up to 5 MB.</p></div>
            <ProfileEditorFields draft={draft} onChange={updateDraft} />
            <VisibilityOption label="Recruiters can find my profile" checked={draft.recruiterVisible} onChange={checked => updateDraft('recruiterVisible', checked)} />
            <VisibilityOption label="Show my email on my public profile" checked={draft.emailVisible} onChange={checked => updateDraft('emailVisible', checked)} />
          </fieldset>
        </div>
        <aside className="min-w-0 self-start rounded-xl border border-neutral-200 bg-white p-5 lg:sticky lg:top-24" aria-label="Live profile preview">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Live preview · not saved yet</p>
          <div className="mt-4"><MemberAvatar src={photoFile && photoPreview ? photoPreview : member.avatarUrl} initials={member.avatarInitials} size={64} /></div>
          <h3 className="mt-4 text-xl font-semibold">{member.name}</h3>
          <p className="mt-1 break-words text-sm">{draft.headline}</p>
          <dl className="mt-4"><ProfileValue label="Field" value={draft.field} /><ProfileValue label="Location" value={draft.location} /><ProfileValue label="Organization" value={draft.organization} /></dl>
          <h4 className="mt-4 font-medium">BIO</h4><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{draft.bio || 'Your BIO will appear here.'}</p>
          {draft.emailVisible ? <p className="mt-4 break-all text-sm">{member.email}</p> : null}
        </aside>
      </div>
      {error ? <p role="alert" className="text-sm text-red-800">{error}</p> : null}
      {warning ? <p role="status" className="text-sm text-amber-800">{warning}</p> : null}
      <div className="flex flex-wrap gap-3"><Button type="button" disabled={saving} onClick={() => void saveProfile()} className="min-h-11 bg-orange-600 text-white hover:bg-orange-700">{saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}{saving ? 'Saving profile…' : 'Save profile'}</Button><Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(false)}><ArrowLeft className="mr-2 size-4" />Cancel update</Button></div>
    </section>
  )
}

export function ProfileEditorFields({ draft, onChange }: { draft: ProfileDraft; onChange: <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => void }) {
  return <>{(['headline', 'field', 'location', 'organization', 'bio'] as const).map(step => <ProfileQuestion key={step} step={step} value={draft[step]} onChange={value => onChange(step, value)} />)}</>
}

function ProfileOverview({ member, onEdit }: { member: MemberProfile; onEdit: () => void }) {
  const [sharing, setSharing] = useState(false)
  async function shareProfile() {
    if (!member.publicSlug || sharing) return
    setSharing(true)
    try {
      const url = `https://www.top100afl.com/bio/${encodeURIComponent(member.publicSlug)}`
      if (navigator.share) await navigator.share({ title: member.name, url })
      else { await navigator.clipboard.writeText(url); toast.success('Profile link copied.') }
    } catch (cause) { if (!(cause instanceof Error && cause.name === 'AbortError')) toast.error('Could not share your profile. Please try again.') }
    finally { setSharing(false) }
  }
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

      {member.publicSlug ? <Button variant="outline" disabled={sharing} onClick={() => void shareProfile()} className="min-h-11"><Share2 className="mr-2 size-4" />Share profile</Button> : <p className="text-sm text-neutral-500">Your public profile link will appear here when it is available.</p>}
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
          <div className="flex items-center justify-between"><h4 className="text-sm font-medium text-neutral-800">BIO</h4><button type="button" onClick={onEdit} className="min-h-11 text-sm font-medium text-orange-800">Edit BIO</button></div>
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
          <Textarea maxLength={PROFILE_TEXT_LIMITS.bio} id={`profile-answer-${step}`} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Share the work you do, who it helps, and what motivates you." className="min-h-48 resize-y text-base leading-6" />
        ) : (
          <Input maxLength={PROFILE_TEXT_LIMITS[step]} id={`profile-answer-${step}`} value={value} onChange={(event) => onChange(event.target.value)} placeholder={step === 'headline' ? 'Founder, researcher, changemaker' : step === 'field' ? 'Education, climate, health' : step === 'organization' ? 'Company or institution' : 'City, country'} className="min-h-12 text-base" />
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
