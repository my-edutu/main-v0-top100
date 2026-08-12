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
import { useDashboardMember } from '../_providers/dashboard-member'

export function ProfileSection() {
  const { member, refreshMember } = useDashboardMember()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const updatesRemaining = Math.max(0, member.bioUpdateLimit - member.bioUpdateCount)
  const quotaExhausted = updatesRemaining === 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (quotaExhausted) return

    try {
      setSaving(true)
      setSaved(false)
      setError('')
      await updateMemberProfile(member.id, buildBioPatch(new FormData(event.currentTarget)))
      await refreshMember()
      setSaved(true)
      toast.success('BIO saved for review.')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not save your BIO.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-[24px] border border-[#E7DDCF] bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-orange-200 bg-[#FFF3E8] px-4 py-3">
        <div>
          <p className="text-sm font-extrabold text-[#171412]">Public profile sync</p>
          <p className="mt-1 text-xs font-semibold text-[#625B52]">BIO edits update your awardee profile record.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {member.publicSlug ? (
            <Button asChild variant="outline" className="rounded-full border-orange-200 bg-white text-[#171412] hover:bg-white">
              <Link href={`/awardees/${member.publicSlug}`}>View public profile</Link>
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
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={quotaExhausted || saving} className="min-h-12 rounded-full bg-[#171412] px-7 font-extrabold text-white hover:bg-[#312B27]">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
          {saving ? 'Saving...' : 'Submit BIO'}
        </Button>
        {saved ? <span role="status" className="text-sm font-bold text-emerald-700">Saved for review.</span> : null}
        {error ? <span role="alert" className="text-sm font-bold text-rose-700">{error}</span> : null}
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
