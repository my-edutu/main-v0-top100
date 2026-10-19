'use client'

import { useEffect, useState } from 'react'
import Image from '@/components/safe-image'
import Link from 'next/link'
import { Loader2, Share2, UserRound, Mail, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProfileSocialIcon } from '@/components/profile-social-icon'
import { SOCIAL_PLATFORMS, validateSocialLinks, type SocialLink } from '@/lib/profile-contact'
import { publicBioUrl } from '@/lib/dashboard/bio-routing'
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
  'headline' | 'field' | 'location' | 'organization' | 'bio' | 'socialLinks' | 'socialLinksConsent' | 'contactEmailConsent' | 'emailVisible' | 'recruiterVisible'
>

function draftFromMember(member: MemberProfile): ProfileDraft {
  return {
    socialLinks: member.socialLinks ?? [],
    socialLinksConsent: member.socialLinksConsent ?? false,
    contactEmailConsent: member.contactEmailConsent ?? false,
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
  const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0)
  useEffect(() => {
    if (!['#social-links', '#social-media'].includes(window.location.hash)) return
    const openSocialLinksEditor = window.setTimeout(() => { setActiveStep(1); setEditing(true) }, 0)
    return () => window.clearTimeout(openSocialLinksEditor)
  }, [])
  useEffect(() => {
    if (!editing || activeStep !== 1 || !['#social-links', '#social-media'].includes(window.location.hash)) return
    const scrollToSocialLinks = window.setTimeout(() => {
      document.getElementById('profile-social-links')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
    return () => window.clearTimeout(scrollToSocialLinks)
  }, [editing, activeStep])
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromMember(member))
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  useEffect(() => {
    if (!photoFile) return
    const url = URL.createObjectURL(photoFile)
    const initialize = window.setTimeout(() => setPhotoPreview(url), 0)
    return () => { window.clearTimeout(initialize); URL.revokeObjectURL(url) }
  }, [photoFile])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  function startEditing(section?: 'social-links') {
    setDraft(draftFromMember(member))
    setPhotoFile(null)
    setError('')
    setWarning('')
    setActiveStep(section === 'social-links' ? 1 : 0)
    if (section === 'social-links') window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#social-links`)
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
    const socialLinks = (draft.socialLinks ?? []).filter(link => link.url.trim())
    const profileValidation = validateProfileDraft(draft)
    if (profileValidation) { setError(profileValidation); setActiveStep(0); return }
    const socialValidation = validateSocialLinks(socialLinks)
    if (socialValidation) { setError(socialValidation); setActiveStep(1); return }
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
        persist: () => updateMemberProfile(member.id, { ...buildProfileUpdatePatch(draft, true), socialLinks, socialLinksConsent: draft.socialLinksConsent, contactEmailConsent: draft.contactEmailConsent }),
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
      <ProfileOverview member={member} onEdit={() => startEditing()} onEditSocials={() => startEditing('social-links')} />
    )
  }

  return (
    <section className="hub-profile-editor mx-auto w-full max-w-3xl space-y-5" aria-label="Update your profile">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-semibold text-neutral-950">Update your profile</h2><p className="mt-1 text-sm text-neutral-600">Work through each section, then save your changes.</p></div>
        <Button type="button" variant="ghost" disabled={saving} className="min-h-11" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
      <nav aria-label="Profile editing steps" className="grid grid-cols-3 gap-2">
        {(['About you', 'Social links', 'Visibility'] as const).map((label, index) => (
          <button key={label} type="button" aria-current={activeStep === index ? 'step' : undefined} onClick={() => { setActiveStep(index as 0 | 1 | 2); setError('') }} className={`min-h-12 rounded-lg border px-2 text-sm font-medium transition-colors ${activeStep === index ? 'border-orange-500 bg-orange-50 text-orange-900' : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'}`}>
            <span className="mr-1.5 text-xs text-neutral-500">{index + 1}</span>{label}
          </button>
        ))}
      </nav>
      <div className="min-w-0 rounded-xl border border-neutral-200 bg-white p-4 sm:p-6">
        <fieldset disabled={saving} className="space-y-8 disabled:opacity-70">
          {activeStep === 0 ? <>
          <section className="space-y-3" aria-labelledby="profile-photo-heading">
            <div><h3 id="profile-photo-heading" className="text-base font-semibold">Profile photo</h3><p className="mt-1 text-sm text-neutral-600">Use a clear JPG, PNG or WebP image up to 5 MB.</p></div>
            <div className="flex flex-wrap items-center gap-4"><MemberAvatar src={photoFile && photoPreview ? photoPreview : member.avatarUrl} initials={member.avatarInitials} size={64} /><div className="min-w-0 flex-1"><Label htmlFor="profile-photo" className="sr-only">Choose profile photo</Label><Input id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => selectPhoto(event.target.files?.[0])} className="min-h-11 max-w-full" /></div></div>
          </section>
          <section className="space-y-4 border-t border-neutral-100 pt-6" aria-labelledby="profile-details-heading">
            <div><h3 id="profile-details-heading" className="text-base font-semibold">About you</h3><p className="mt-1 text-sm text-neutral-600">These details appear on your awardee profile.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              {(['headline', 'field', 'location', 'organization'] as const).map(step => <ProfileQuestion key={step} step={step} value={draft[step]} onChange={value => updateDraft(step, value)} />)}
            </div>
            <ProfileQuestion step="bio" value={draft.bio} onChange={value => updateDraft('bio', value)} />
          </section>
          </> : null}
          {activeStep === 1 ? <>
          <section id="profile-social-links" className="scroll-mt-6 space-y-4 border-t border-neutral-100 pt-6" aria-labelledby="profile-social-heading">
            <div><h3 id="profile-social-heading" className="text-base font-semibold">Social links</h3><p className="mt-1 text-sm text-neutral-600">Add up to three links. Use a full https:// address.</p></div>
            {(draft.socialLinks ?? []).map((link, index) => <div key={`${link.platform}-${index}`} className="grid gap-3 rounded-lg border border-neutral-200 p-3 sm:grid-cols-[minmax(150px,0.7fr)_minmax(0,1.3fr)_auto] sm:items-end">
              <div className="space-y-2"><Label htmlFor={`social-platform-${index}`}>Platform</Label><Select value={link.platform} onValueChange={value => updateDraft('socialLinks', draft.socialLinks!.map((item, i) => i === index ? { ...item, platform: value as SocialLink['platform'] } : item))}><SelectTrigger id={`social-platform-${index}`} aria-label={`Social platform ${index + 1}`} className="min-h-11"><SelectValue /></SelectTrigger><SelectContent>{SOCIAL_PLATFORMS.map(platform => <SelectItem key={platform} value={platform} disabled={draft.socialLinks?.some((item, i) => i !== index && item.platform === platform)}><span className="flex items-center gap-2"><ProfileSocialIcon platform={platform} /><span className="capitalize">{platform === 'twitter' ? 'X / Twitter' : platform}</span></span></SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor={`social-url-${index}`}>Profile link</Label><Input id={`social-url-${index}`} type="url" inputMode="url" autoComplete="url" maxLength={500} placeholder="https://" value={link.url} onChange={event => updateDraft('socialLinks', draft.socialLinks!.map((item, i) => i === index ? { ...item, url: event.target.value } : item))} className="min-h-11" /></div>
              <Button type="button" variant="ghost" className="min-h-11 justify-self-start text-neutral-600 hover:text-red-700" aria-label={`Remove ${link.platform} link`} onClick={() => updateDraft('socialLinks', draft.socialLinks!.filter((_, i) => i !== index))}><Trash2 className="mr-2 size-4" />Remove</Button>
            </div>)}
            {(draft.socialLinks ?? []).length < 3 ? <Button type="button" variant="outline" className="min-h-11" onClick={() => updateDraft('socialLinks', [...(draft.socialLinks ?? []), { platform: SOCIAL_PLATFORMS.find(platform => !draft.socialLinks?.some(link => link.platform === platform)) ?? 'website', url: '' }])}><Plus className="mr-2 size-4" />Add a social link</Button> : <p className="text-sm text-neutral-500">You can add up to three social links.</p>}
            <label className="flex min-h-11 items-start gap-3 rounded-lg bg-neutral-50 p-3 text-sm leading-5"><input type="checkbox" checked={draft.socialLinksConsent ?? false} onChange={event => updateDraft('socialLinksConsent', event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-orange-600" /><span>Show these links on my public profile</span></label>
          </section>
          </> : null}
          {activeStep === 2 ? <>
          <section className="space-y-3 border-t border-neutral-100 pt-6" aria-labelledby="profile-visibility-heading">
            <div><h3 id="profile-visibility-heading" className="text-base font-semibold">Visibility</h3><p className="mt-1 text-sm text-neutral-600">Choose what appears publicly and who can find you.</p></div>
            <VisibilityOption label="Recruiters can find my profile" checked={draft.recruiterVisible} onChange={checked => updateDraft('recruiterVisible', checked)} />
            <label className="flex min-h-11 items-start gap-3 py-2 text-sm leading-5"><input type="checkbox" checked={draft.emailVisible && draft.contactEmailConsent} onChange={event => { updateDraft('emailVisible', event.target.checked); updateDraft('contactEmailConsent', event.target.checked) }} className="mt-0.5 size-4 shrink-0 accent-orange-600" /><span>Show my email contact button on my public profile</span></label>
          </section>
          </> : null}
        </fieldset>
      </div>
      {error ? <p role="alert" className="text-sm text-red-800">{error}</p> : null}
      {warning ? <p role="status" className="text-sm text-amber-800">{warning}</p> : null}
      <footer className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white/95 p-3 backdrop-blur lg:bottom-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {activeStep > 0 ? <Button type="button" variant="outline" disabled={saving} className="min-h-11" onClick={() => { setActiveStep((activeStep - 1) as 0 | 1 | 2); setError('') }}>Back</Button> : null}
          <p className="text-sm text-neutral-600">Step {activeStep + 1} of 3 · Your changes save together.</p>
        </div>
        {activeStep < 2 ? <Button type="button" disabled={saving} className="min-h-11 rounded-lg bg-orange-600 text-white hover:bg-orange-700" onClick={() => { setError(''); setActiveStep((activeStep + 1) as 0 | 1 | 2) }}>Continue</Button> : <Button type="button" disabled={saving} className="min-h-11 rounded-lg bg-orange-600 text-white hover:bg-orange-700" onClick={() => void saveProfile()}>{saving ? <Loader2 className="mr-2 size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}{saving ? 'Saving…' : 'Save changes'}</Button>}
      </footer>
    </section>
  )
}

function ProfileOverview({ member, onEdit, onEditSocials }: { member: MemberProfile; onEdit: () => void; onEditSocials: () => void }) {
  const [sharing, setSharing] = useState(false)
  async function shareProfile() {
    if (!member.publicSlug || sharing) return
    setSharing(true)
    try {
      const url = publicBioUrl(member.publicSlug)
      if (!url) return
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
        <Button type="button" onClick={onEdit} className="min-h-11 w-full bg-orange-600 font-semibold text-white hover:bg-orange-700 sm:w-auto">Update profile</Button>
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

      <section className="space-y-2" aria-labelledby="profile-contact-title">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 id="profile-contact-title" className="text-base font-semibold text-neutral-950">Social links & contact</h3><button type="button" onClick={onEditSocials} className="min-h-11 text-sm font-medium text-orange-800 underline-offset-4 hover:underline">Edit social links</button></div>
        <ProfileContact links={member.socialLinksConsent ? member.socialLinks : []} email={member.emailVisible && member.contactEmailConsent ? member.email : undefined} />
        {!member.socialLinksConsent && member.socialLinks?.length ? <p className="text-sm text-neutral-500">Your social links are saved but hidden from your public profile.</p> : null}
      </section>
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
          <ProfileValue label="Email visibility" value={member.emailVisible && member.contactEmailConsent ? 'Shown on public profile' : 'Not shown publicly'} />
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

export function ProfileContact({ links = [], email }: { links?: SocialLink[]; email?: string }) {
  return <div className="mt-4 flex flex-wrap gap-2">{links.filter(link => !validateSocialLinks([link])).slice(0, 3).map(link => { return <a key={link.platform} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={link.platform} title={link.platform} className="flex size-11 items-center justify-center rounded-full border hover:bg-orange-50"><ProfileSocialIcon platform={link.platform} /></a> })}{email ? <a href={`mailto:${email}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4"><Mail className="size-5" />Email me</a> : null}</div>
}
