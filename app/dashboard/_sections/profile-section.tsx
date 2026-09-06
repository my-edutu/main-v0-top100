'use client'

import { type FormEvent, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { updateMemberProfile } from '@/lib/member-hub'
import { buildBioPatch } from '../_lib/profile-patches'
import { persistThenRefresh } from '../_lib/persistence-workflows'
import { useDashboardMember } from '../_providers/dashboard-member'
import { MemberAvatar } from '../_components/member-avatar'

export function ProfileSection() {
  const { member, refreshMember, replaceMember } = useDashboardMember()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [uploading, setUploading] = useState(false)
  async function uploadPhoto(file?: File) {
    if (!file) return
    setUploading(true); setError('')
    try {
      const form = new FormData(); form.set('file', file)
      const response = await fetch('/api/member/avatar', { method: 'POST', body: form })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not upload your photo.')
      replaceMember({ ...member, avatarUrl: data.url })
      await refreshMember()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save your photo.') }
    finally { setUploading(false) }
  }
  const updatesRemaining = Math.max(0, member.bioUpdateLimit - member.bioUpdateCount)
  const quotaExhausted = updatesRemaining === 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (quotaExhausted) return

    try {
      setSaving(true)
      setSaved(false)
      setError('')
      setWarning('')
      const result = await persistThenRefresh({
        persist: () => updateMemberProfile(member.id, buildBioPatch(new FormData(event.currentTarget))),
        applyPersisted: replaceMember,
        refresh: refreshMember,
        refreshWarning: 'Your BIO was saved, but we could not refresh the latest account view.',
      })
      setSaved(true)
      toast.success('BIO saved for review.')
      setWarning(result.warning)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not save your BIO.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="hub-profile-editor space-y-5 bg-white">
      <div className="flex items-center gap-4"><MemberAvatar src={member.avatarUrl} initials={member.avatarInitials} size={64} /><label className="min-w-0 text-sm font-medium">{uploading ? 'Saving photo…' : 'Your profile photo'}<input disabled={uploading || member.id === 'demo-member-1'} type="file" accept="image/*" onChange={event => void uploadPhoto(event.target.files?.[0])} className="mt-2 block w-full text-xs" /><span className="mt-1 block text-xs font-normal text-neutral-500">JPG, PNG or WebP, up to 5 MB{member.id === 'demo-member-1' ? ' · uploads are unavailable in preview' : ''}</span></label></div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-orange-200 bg-[#FFF3E8] px-4 py-3">
        <div>
          <p className="text-sm font-extrabold text-[#171412]">Public profile sync</p>
          <p className="mt-1 text-xs font-normal leading-5 text-[#625B52]">These details update your public awardee profile. Public content may appear in search engines; search ranking is not guaranteed.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {member.publicSlug ? (
            <Button asChild variant="outline" className="rounded-full border-orange-200 bg-white text-[#171412] hover:bg-white">
              <Link href={`/bio/${member.publicSlug}`}>View public profile</Link>
            </Button>
          ) : null}
          <span className="rounded-full bg-white px-3 py-2 text-xs font-extrabold text-[#6C2600]">
            {updatesRemaining} of {member.bioUpdateLimit} updates left
          </span>
        </div>
      </div>

      {quotaExhausted ? (
        <div role="status" className="rounded-[16px] border border-amber-300 bg-[#FFF3C7] p-4 text-sm font-semibold leading-6 text-[#563700]">
          Your BIO update allowance is used up. Ask the admin team to reset it. Your settings pages remain available.
        </div>
      ) : null}

      <fieldset disabled={quotaExhausted || saving} className="space-y-5 disabled:opacity-65">
        <div className="grid gap-4 md:grid-cols-2">
          <ProfileField label="Headline" name="headline" defaultValue={member.headline} placeholder="Founder, researcher, changemaker" />
          <ProfileField label="Field" name="field" defaultValue={member.field} placeholder="Education, climate, health" />
          <ProfileField label="Location" name="location" defaultValue={member.location} placeholder="City, country" />
          <ProfileField label="Organization" name="organization" defaultValue={member.organization} placeholder="Company or institution" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio" className="font-bold text-[#171412]">BIO</Label>
          <Textarea id="bio" name="bio" defaultValue={member.bio} placeholder="Write a concise awardee BIO for review." className="min-h-44 rounded-[16px] border-[#E7DDCF] text-base text-[#171412] placeholder:text-[#625B52]/60" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ProfileToggle name="recruiterVisible" label="Recruiter visibility" defaultChecked={member.recruiterVisible} />
          <ProfileToggle name="emailVisible" label="Show email on profile" defaultChecked={member.emailVisible} />
        </div>
        <div className="space-y-2"><p className="text-sm font-medium">Account email</p><p className="break-all text-sm text-neutral-600">{member.email}</p><p className="text-xs leading-5 text-neutral-500">Keep “Show email on profile” off if you do not want your email displayed publicly.</p></div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={quotaExhausted || saving} className="hub-profile-save min-h-12 w-full rounded-xl px-7 font-medium sm:w-auto">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
          {saving ? 'Saving...' : 'Save profile for review'}
        </Button>
        {saved ? <span role="status" className="text-sm font-bold text-emerald-700">Saved for review.</span> : null}
        {error ? <span role="alert" className="text-sm font-bold text-rose-700">{error}</span> : null}
        {warning ? <span role="status" className="text-sm font-bold text-amber-700">{warning}</span> : null}
      </div>
    </form>
  )
}

function ProfileField({ defaultValue, label, name, placeholder }: { defaultValue: string; label: string; name: string; placeholder: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="font-bold text-[#171412]">{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} placeholder={placeholder} className="h-14 rounded-[14px] border-[#E7DDCF] text-base text-[#171412] placeholder:text-[#625B52]/60" />
    </div>
  )
}

function ProfileToggle({ defaultChecked, label, name }: { defaultChecked: boolean; label: string; name: string }) {
  return (
    <label className="flex min-h-14 items-center justify-between gap-3 rounded-[16px] border border-[#E7DDCF] bg-[#FBF7EF] p-4">
      <span className="text-sm font-bold text-[#171412]">{label}</span>
      <Switch name={name} defaultChecked={defaultChecked} className="data-[state=checked]:bg-orange-600" />
    </label>
  )
}
