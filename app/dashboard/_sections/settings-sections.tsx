'use client'

import { type FormEvent, type ReactNode, useState } from 'react'
import { Bell, Eye, Loader2, LockKeyhole, ShieldCheck, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { updateMemberProfile, type MemberProfile } from '@/lib/member-hub'
import {
  buildNotificationPatch,
  buildPrivacyPatch,
  buildVisibilityPatch,
} from '../_lib/profile-patches'
import { persistThenRefresh } from '../_lib/persistence-workflows'
import { useDashboardMember } from '../_providers/dashboard-member'

export function SettingsOverview({ member }: { member: MemberProfile }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const updatesRemaining = Math.max(0, member.bioUpdateLimit - member.bioUpdateCount)

  return (
    <div className="space-y-5">
      <nav aria-label="Settings categories" className="divide-y divide-neutral-200 rounded-xl border border-neutral-200">
        {[
          { path:'visibility', title:'Visibility', description:'Profile and contact access', icon:Eye },
          { path:'notifications', title:'Notifications', description:'Choose your alerts', icon:Bell },
          { path:'privacy', title:'Privacy', description:'Security preferences', icon:LockKeyhole },
        ].map(item => <Link key={item.path} href={`/dashboard/me/settings/${item.path}`} className="flex min-h-20 items-center gap-3 px-4 py-4 hover:bg-orange-50 focus-visible:outline-orange-600"><item.icon size={21} strokeWidth={1.6} className="shrink-0 text-orange-700" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block text-base font-medium">{item.title}</span><span className="mt-1 block text-sm text-neutral-500">{item.description}</span></span><ChevronRight size={18} className="shrink-0 text-neutral-400" aria-hidden="true" /></Link>)}
      </nav>
      <section className="border-t border-neutral-200 pt-5">
        <h2 className="text-base font-medium">Your data</h2>
        <button type="button" onClick={() => { setConfirmed(false); setDeleteOpen(true) }} className="mt-2 flex min-h-14 w-full items-center justify-between gap-3 text-left text-sm font-medium text-red-700">Delete my data <ChevronRight size={18} aria-hidden="true" /></button>
        <p className="text-xs leading-5 text-neutral-500">Request removal of your personal data through the privacy team.</p>
      </section>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-h-[85dvh] w-[calc(100%-32px)] max-w-md overflow-y-auto bg-white p-6">
          <DialogTitle>Request data deletion</DialogTitle>
          <DialogDescription className="text-sm leading-6">This opens an email to our privacy team. You must send the email to submit your request. Nothing is deleted automatically.</DialogDescription>
          <p className="text-sm leading-6 text-neutral-600">Ask the team to remove your account, public profile and associated personal data. They will verify your identity and explain any records that cannot be removed before processing your request.</p>
          <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} className="mt-1 h-5 w-5 shrink-0" />I understand that processed deletion may remove my profile and account access.</label>
          <button type="button" disabled={!confirmed} onClick={() => { window.location.href = `mailto:partnership@top100afl.com?subject=${encodeURIComponent('Personal data deletion request')}&body=${encodeURIComponent(`Hello Top100 privacy team,\n\nI request deletion of my account, public profile and associated personal data. Please confirm the scope, any retained records, and the identity verification required.\n\nAccount name: ${member.name}\nAccount email: ${member.email}\n\nThank you.`)}` }} className="min-h-12 rounded-xl bg-red-700 px-4 font-medium text-white disabled:opacity-40" style={{backgroundColor:'#b91c1c',color:'#fff'}}>Open deletion request email</button>
          <p className="text-xs leading-5 text-neutral-500">No email app? Write to partnership@top100afl.com from your account email. <Link href="/legal/privacy" className="underline">Read our privacy policy</Link>.</p>
        </DialogContent>
      </Dialog>

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
