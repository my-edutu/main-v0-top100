'use client'

import { type FormEvent, type ReactNode, useState } from 'react'
import { Bell, Eye, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { updateMemberProfile, type MemberProfile } from '@/lib/member-hub'
import { DashboardCard } from '../_components/dashboard-card'
import {
  buildNotificationPatch,
  buildPrivacyPatch,
  buildVisibilityPatch,
} from '../_lib/profile-patches'
import { persistThenRefresh } from '../_lib/persistence-workflows'
import { useDashboardMember } from '../_providers/dashboard-member'

export function SettingsOverview({ member }: { member: MemberProfile }) {
  const updatesRemaining = Math.max(0, member.bioUpdateLimit - member.bioUpdateCount)

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <DashboardCard href="/dashboard/me/settings/visibility" title="Visibility" description="Profile and contact access" icon={Eye} color="forest" />
        <DashboardCard href="/dashboard/me/settings/notifications" title="Notifications" description="Choose member alerts" icon={Bell} color="saffron" />
        <DashboardCard href="/dashboard/me/settings/privacy" title="Privacy" description="Security preferences" icon={LockKeyhole} color="cobalt" />
      </div>

      <section className="rounded-[24px] border border-orange-200 bg-[#FFE7D5] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#171412] text-white"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6C2600]">Account status</p>
            <h2 className="mt-1 text-xl font-extrabold text-[#171412]">Your AFL membership</h2>
          </div>
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatusItem label="Membership" value={member.status} />
          <StatusItem label="BIO review" value={member.profileStatus} />
          <StatusItem label="Invite code" value={member.inviteCode} />
          <StatusItem label="BIO updates left" value={`${updatesRemaining} of ${member.bioUpdateLimit}`} />
        </dl>
      </section>
    </div>
  )
}

export function VisibilitySettingsSection() {
  const { member } = useDashboardMember()
  return (
    <PreferenceForm
      member={member}
      successMessage="Visibility settings saved."
      buildPatch={buildVisibilityPatch}
    >
      <PreferenceToggle name="showInDirectory" label="Show profile in awardee directory" description="Keep your public profile discoverable by fellow Africa Future Leaders." defaultChecked={member.showInDirectory} />
      <PreferenceToggle name="allowDirectMessages" label="Allow direct message requests" description="Let approved awardees start a conversation from your profile." defaultChecked={member.allowDirectMessages} />
    </PreferenceForm>
  )
}

export function NotificationSettingsSection() {
  const { member } = useDashboardMember()
  return (
    <PreferenceForm
      member={member}
      successMessage="Notification preferences saved."
      buildPatch={buildNotificationPatch}
    >
      <PreferenceToggle name="opportunityAlerts" label="Opportunity alerts" description="Scholarships, fellowships, grants, and member-only calls." defaultChecked={member.opportunityAlerts} />
      <PreferenceToggle name="magazineAlerts" label="Magazine team updates" description="Submission status, feature requests, and new edition notices." defaultChecked={member.magazineAlerts} />
      <PreferenceToggle name="messageAlerts" label="Message notifications" description="Inbox updates from fellow awardees and the AFL team." defaultChecked={member.messageAlerts} />
      <PreferenceToggle name="eventReminders" label="Event reminders" description="Summits, live sessions, and partner events." defaultChecked={member.eventReminders} />
    </PreferenceForm>
  )
}

export function PrivacySettingsSection() {
  const { member } = useDashboardMember()
  return (
    <PreferenceForm
      member={member}
      successMessage="Privacy settings saved."
      buildPatch={buildPrivacyPatch}
    >
      <PreferenceToggle name="hideEmailFromRecruiters" label="Hide email from recruiters" description="Recruiters can still request contact through the AFL team." defaultChecked={member.hideEmailFromRecruiters} />
      <PreferenceToggle name="requireProfileApproval" label="Require profile approval before publishing" description="Keep admin review on for BIO and major profile changes." defaultChecked={member.requireProfileApproval} />
      <PreferenceToggle name="securityEmails" label="Receive security emails" description="Get alerts for account access and important profile changes." defaultChecked={member.securityEmails} />
    </PreferenceForm>
  )
}

function PreferenceForm({
  buildPatch,
  children,
  member,
  successMessage,
}: {
  buildPatch: (form: FormData) => Partial<MemberProfile>
  children: ReactNode
  member: MemberProfile
  successMessage: string
}) {
  const { refreshMember, replaceMember } = useDashboardMember()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      setSaving(true)
      setSaved(false)
      setError('')
      setWarning('')
      const result = await persistThenRefresh({
        persist: () => updateMemberProfile(member.id, buildPatch(new FormData(event.currentTarget))),
        applyPersisted: replaceMember,
        refresh: refreshMember,
        refreshWarning: 'Your settings were saved, but we could not refresh the latest account view.',
      })
      setSaved(true)
      setWarning(result.warning)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save these settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset disabled={saving} className="grid gap-3 rounded-[24px] border border-[#E7DDCF] bg-white p-4 disabled:opacity-70 sm:p-6">
        {children}
      </fieldset>

      <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 rounded-[18px] border border-[#E7DDCF] bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-h-5">
            {saved ? <p role="status" className="text-sm font-bold text-emerald-700">{successMessage}</p> : null}
            {error ? <p role="alert" className="text-sm font-bold text-rose-700">{error}</p> : null}
            {warning ? <p role="status" className="text-sm font-bold text-amber-700">{warning}</p> : null}
          </div>
          <Button type="submit" disabled={saving} className="min-h-12 rounded-full bg-[#171412] px-8 font-extrabold text-white hover:bg-[#312B27]">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </form>
  )
}

function PreferenceToggle({ defaultChecked, description, label, name }: { defaultChecked: boolean; description: string; label: string; name: string }) {
  return (
    <label className="flex min-h-[84px] items-center justify-between gap-4 rounded-[16px] border border-[#E7DDCF] bg-[#FBF7EF] p-4">
      <span>
        <span className="block text-sm font-extrabold text-[#171412]">{label}</span>
        <span className="mt-1 block text-xs font-semibold leading-5 text-[#625B52]">{description}</span>
      </span>
      <Switch name={name} defaultChecked={defaultChecked} className="shrink-0 data-[state=checked]:bg-orange-600" />
    </label>
  )
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-orange-200 bg-white/70 px-4 py-3">
      <dt className="text-xs font-bold text-[#625B52]">{label}</dt>
      <dd className="mt-1 text-sm font-extrabold capitalize text-[#171412]">{value}</dd>
    </div>
  )
}
