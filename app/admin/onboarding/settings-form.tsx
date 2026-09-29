'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  DEFAULT_AWARDEE_JOURNEY_SETTINGS,
  type AwardeeJourneySettings,
} from '@/lib/dashboard/awardee-journey-settings'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-neutral-900">{label}</Label>
      {children}
      {hint ? <p className="text-xs leading-5 text-neutral-500">{hint}</p> : null}
    </div>
  )
}

export function OnboardingSettingsForm() {
  const [settings, setSettings] = useState<AwardeeJourneySettings>(DEFAULT_AWARDEE_JOURNEY_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/admin/onboarding-journey', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.message || 'Could not load settings.')
        if (active) setSettings(payload.settings as AwardeeJourneySettings)
      })
      .catch((error) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Could not load settings.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  function update<K extends keyof AwardeeJourneySettings>(key: K, value: AwardeeJourneySettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  async function save() {
    setSaving(true)
    setLoadError('')
    try {
      const response = await fetch('/api/admin/onboarding-journey', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Could not save settings.')
      setSettings(payload.settings as AwardeeJourneySettings)
      toast.success('Awardee onboarding settings saved.')
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div role="status" className="rounded-2xl border bg-white p-6 text-sm text-neutral-600"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading onboarding settings…</div>
  }

  const inputClass = 'min-h-11 rounded-lg border-neutral-300 bg-white focus-visible:ring-orange-600'

  return (
    <div className="space-y-5">
      {loadError ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{loadError}</p> : null}

      <section className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6" aria-labelledby="welcome-settings-title">
        <div className="border-b border-neutral-100 pb-4">
          <h2 id="welcome-settings-title" className="text-lg font-semibold text-neutral-950">Founder welcome</h2>
          <p className="mt-1 text-sm leading-6 text-neutral-600">This note is shown to awardees in their onboarding journey. The founder’s profile link opens in a new tab.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Founder name"><Input className={inputClass} value={settings.founderName} onChange={(event) => update('founderName', event.target.value)} /></Field>
          <Field label="Founder title"><Input className={inputClass} value={settings.founderTitle} onChange={(event) => update('founderTitle', event.target.value)} /></Field>
          <Field label="Welcome heading"><Input className={inputClass} value={settings.welcomeTitle} onChange={(event) => update('welcomeTitle', event.target.value)} /></Field>
          <Field label="Signature text"><Input className={inputClass} value={settings.signatureText} onChange={(event) => update('signatureText', event.target.value)} /></Field>
          <Field label="Founder LinkedIn URL"><Input className={inputClass} type="url" value={settings.founderLinkedinUrl} onChange={(event) => update('founderLinkedinUrl', event.target.value)} /></Field>
          <Field label="AFL LinkedIn URL"><Input className={inputClass} type="url" value={settings.organizationLinkedinUrl} onChange={(event) => update('organizationLinkedinUrl', event.target.value)} /></Field>
        </div>
        <Field label="Welcome note" hint="Write a warm, complete note. Line breaks are preserved. Maximum 6,000 characters.">
          <Textarea className="min-h-64 resize-y rounded-lg border-neutral-300 bg-white leading-6 focus-visible:ring-orange-600" maxLength={6000} value={settings.welcomeBody} onChange={(event) => update('welcomeBody', event.target.value)} />
        </Field>
      </section>

      <section className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6" aria-labelledby="share-settings-title">
        <div className="border-b border-neutral-100 pb-4">
          <h2 id="share-settings-title" className="text-lg font-semibold text-neutral-950">Introduction sharing</h2>
          <p className="mt-1 text-sm leading-6 text-neutral-600">Only confirmed account URLs are displayed to members. Keep unverified destinations blank.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Facebook page URL"><Input className={inputClass} type="url" placeholder="Leave blank until confirmed" value={settings.facebookUrl ?? ''} onChange={(event) => update('facebookUrl', event.target.value || null)} /></Field>
          <Field label="Instagram page URL"><Input className={inputClass} type="url" placeholder="Leave blank until confirmed" value={settings.instagramUrl ?? ''} onChange={(event) => update('instagramUrl', event.target.value || null)} /></Field>
          <div className="sm:col-span-2">
            <Field label="Canva cutout flyer template URL" hint="Optional until the approved Canva artwork is ready. HTTPS required.">
              <Input className={inputClass} type="url" placeholder="Leave blank to use the AFL branded fallback" value={settings.flyerTemplateUrl ?? ''} onChange={(event) => update('flyerTemplateUrl', event.target.value || null)} />
            </Field>
          </div>
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6" aria-labelledby="magazine-settings-title">
        <div className="border-b border-neutral-100 pb-4">
          <h2 id="magazine-settings-title" className="text-lg font-semibold text-neutral-950">Magazine feature campaign</h2>
          <p className="mt-1 text-sm leading-6 text-neutral-600">This is a separate fee from an award order. Payment enables an application for editorial consideration; it does not guarantee selection.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Campaign title"><Input className={inputClass} value={settings.magazineCampaign.title} onChange={(event) => update('magazineCampaign', { ...settings.magazineCampaign, title: event.target.value })} /></Field>
          <Field label="Campaign ID" hint="Use a stable lowercase ID; do not change after members have paid."><Input className={inputClass} value={settings.magazineCampaign.id} onChange={(event) => update('magazineCampaign', { ...settings.magazineCampaign, id: event.target.value })} /></Field>
          <Field label="Price in Naira (₦)"><Input className={inputClass} type="number" min="1" step="1" value={settings.magazineCampaign.ngnAmountMinor / 100} onChange={(event) => update('magazineCampaign', { ...settings.magazineCampaign, ngnAmountMinor: Math.round(Number(event.target.value) * 100) })} /></Field>
          <Field label="Price in US dollars ($)"><Input className={inputClass} type="number" min="1" step="1" value={settings.magazineCampaign.usdAmountMinor / 100} onChange={(event) => update('magazineCampaign', { ...settings.magazineCampaign, usdAmountMinor: Math.round(Number(event.target.value) * 100) })} /></Field>
          <div className="sm:col-span-2">
            <Field label="Campaign description"><Textarea className="min-h-24 rounded-lg border-neutral-300 leading-6 focus-visible:ring-orange-600" value={settings.magazineCampaign.description} onChange={(event) => update('magazineCampaign', { ...settings.magazineCampaign, description: event.target.value })} /></Field>
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-neutral-800 sm:col-span-2">
            <input type="checkbox" className="h-4 w-4 accent-orange-600" checked={settings.magazineCampaign.applicationOpen} onChange={(event) => update('magazineCampaign', { ...settings.magazineCampaign, applicationOpen: event.target.checked })} />
            Accept new applications for this campaign
          </label>
        </div>
      </section>

      <div className="sticky bottom-3 flex justify-end rounded-xl border border-neutral-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <Button type="button" onClick={() => void save()} disabled={saving} className="min-h-11 rounded-lg bg-neutral-950 px-5 text-white hover:bg-neutral-800">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {saving ? 'Saving…' : 'Save onboarding settings'}
          {!saving ? <Check className="ml-2 h-4 w-4 text-amber-300" /> : null}
        </Button>
      </div>
    </div>
  )
}
