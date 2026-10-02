'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, BookOpenText, Check, CheckCircle2, ChevronDown, Compass, Copy, ExternalLink, FileText, Linkedin, RefreshCw, Share2, Trophy, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

import { FounderWelcomeDialog } from './founder-welcome-dialog'
import { cn } from '@/lib/utils'
import { DEFAULT_AWARDEE_JOURNEY_SETTINGS, type AwardeeJourneySettings } from '@/lib/dashboard/awardee-journey-settings'
import type { AwardeeJourneyState } from '@/lib/dashboard/awardee-journey'
import { useDashboardMember } from '../_providers/dashboard-member'

type Payload = { state: AwardeeJourneyState; settings: AwardeeJourneySettings }
type Props = { name: string }

const coreDestinations = {
  welcome: null,
  profile: '/dashboard/me/profile',
  introduction: '/dashboard/me/posts/new',
} as const

const actionMeta: Record<string, { href: string; icon: typeof Compass }> = {
  opportunities: { href: '/dashboard/discover/opportunities', icon: Compass },
  magazine: { href: '/dashboard/me/feature', icon: FileText },
  award: { href: '/dashboard/me/award', icon: Trophy },
}

export function AwardeeOnboardingJourney({ name }: Props) {
  const { member } = useDashboardMember()
  const [payload, setPayload] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [shareSaving, setShareSaving] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [captionCopied, setCaptionCopied] = useState(false)
  const [preparedCover, setPreparedCover] = useState<{ url: string; file: File | null } | null>(null)
  const [sharing, setSharing] = useState(false)

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
      setError('')
    }
    try {
      const response = await fetch('/api/member/onboarding-journey', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Your onboarding guide could not load.')
      setPayload(result.journey as Payload)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your onboarding guide could not load.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(false)
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void load(false)
    }
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [load])

  useEffect(() => {
    const coverUrl = member.portfolioCoverUrl
    if (!shareOpen || !coverUrl) return

    const controller = new AbortController()
    void fetch(coverUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not prepare the award cover.')
        const blob = await response.blob()
        if (!blob.type.startsWith('image/') || blob.size > 10 * 1024 * 1024) {
          throw new Error('The award cover is not available to attach.')
        }
        const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
        return new File([blob], `afl-award-cover.${extension}`, { type: blob.type })
      })
      .then((file) => setPreparedCover({ url: coverUrl, file }))
      .catch(() => {
        if (!controller.signal.aborted) setPreparedCover({ url: coverUrl, file: null })
      })

    return () => controller.abort()
  }, [member.portfolioCoverUrl, shareOpen])

  const state = payload?.state
  const settings = payload?.settings ?? DEFAULT_AWARDEE_JOURNEY_SETTINGS
  const coverFile = preparedCover && preparedCover.url === member.portfolioCoverUrl ? preparedCover.file : null
  const coverPreparing = Boolean(shareOpen && member.portfolioCoverUrl && preparedCover?.url !== member.portfolioCoverUrl)
  const introCaption = `I’m proud to share that I’ve been selected as one of the Top 100 Africa Future Leaders for 2026.\n\nThis recognition brings together emerging leaders from 61 countries across Africa and 707 institutions. I’m honoured to be part of this community and grateful for the opportunity to contribute to a brighter future for our continent.\n\nI look forward to learning, collaborating, and building impact alongside fellow leaders across Africa. Thank you, @Africa Future Leaders, for this recognition.\n\n#Top100AfricaFutureLeaders #AfricaFutureLeaders #LeadershipInAfrica`

  async function acknowledgeWelcome() {
    setSaving(true)
    try {
      const response = await fetch('/api/member/onboarding-journey', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ welcomeRead: true }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not save this yet.')
      setWelcomeOpen(false)
      await load()
      toast.success('Welcome saved to your journey.')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not save this yet.')
    } finally {
      setSaving(false)
    }
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(introCaption)
      setCaptionCopied(true)
      window.setTimeout(() => setCaptionCopied(false), 2500)
      toast.success('Introduction caption copied. Add it to your post and tag the AFL page.')
    } catch {
      toast.error('Copy is unavailable in this browser. Select and copy the caption manually.')
    }
  }

  async function shareIntroduction() {
    if (!navigator.share) {
      await copyCaption()
      toast.info('This browser cannot open the share menu. The caption is copied; use the cover preview when posting.')
      return
    }

    setSharing(true)
    try {
      const shareData: ShareData = {
        title: 'Top 100 Africa Future Leaders 2026',
        text: introCaption,
        ...(member.portfolioCoverUrl ? { url: member.portfolioCoverUrl } : {}),
      }
      if (coverFile && navigator.canShare?.({ files: [coverFile] })) {
        shareData.files = [coverFile]
        delete shareData.url
      }
      await navigator.share(shareData)
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      toast.error('Could not open the share menu. Copy the caption and share your cover manually.')
    } finally {
      setSharing(false)
    }
  }

  async function confirmExternalShare(platform: 'linkedin' | 'facebook' | 'instagram') {
    setShareSaving(true)
    try {
      const response = await fetch('/api/member/onboarding-journey', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ externalShareConfirmed: true, externalSharePlatform: platform }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not save your update.')
      await load()
      toast.success('Recorded as shared by you.')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not save your update.')
    } finally {
      setShareSaving(false)
    }
  }

  if (loading) {
    return <section role="status" aria-label="Loading onboarding journey" className="overflow-hidden rounded-[24px] border border-[#E7DDCF] bg-white p-5 sm:p-7"><div className="h-4 w-40 animate-pulse rounded bg-[#F3EEE8]" /><div className="mt-4 h-8 max-w-sm animate-pulse rounded bg-[#F3EEE8]" /><div className="mt-5 h-24 animate-pulse rounded-2xl bg-[#F8F5F1]" /><span className="sr-only">Loading your awardee onboarding guide…</span></section>
  }

  if (error || !state) {
    return <section role="alert" className="rounded-[22px] border border-[#E8DED3] bg-white p-5 sm:p-6"><h2 className="text-lg font-medium text-[#171412]">Your welcome journey</h2><p className="mt-2 text-sm leading-6 text-[#625B52]">{error || 'Your journey is temporarily unavailable.'}</p><button type="button" onClick={() => void load()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#171412] px-4 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2"><RefreshCw className="h-4 w-4" aria-hidden="true" />Try again</button></section>
  }

  return (
    <>
      <section className="relative" aria-labelledby="journey-title">
        <div>
          <div className="flex items-center justify-between gap-4">
            <h2 id="journey-title" className="text-xl font-medium leading-tight tracking-[-0.02em] text-[#171412] sm:text-2xl">Your next steps, {name.trim().split(/\s+/)[0]}</h2>
            <span className="shrink-0 text-sm tabular-nums text-[#625B52]">{state.progress.completed}<span className="px-1 text-[#B5A99B]">/</span>{state.progress.total}</span>
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#E8E1D9]" role="progressbar" aria-valuenow={state.progress.completed} aria-valuemin={0} aria-valuemax={state.progress.total} aria-label={`${state.progress.completed} of ${state.progress.total} onboarding steps complete`}>
            <div className="h-full rounded-full bg-gradient-to-r from-[#F36D21] to-[#F5A313] transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${state.progress.percent}%` }} />
          </div>

          {state.coreSteps.some((step) => !step.complete) ? <ol className="mt-2 divide-y divide-[#EEE7DF] border-y border-[#EEE7DF]" aria-label="Awardee onboarding checklist">
            {state.coreSteps.map((step, index) => ({ step, index })).filter(({ step }) => !step.complete).map(({ step, index }) => {
              const href = coreDestinations[step.id as keyof typeof coreDestinations]
              const content = <>
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center', step.complete ? 'text-[#276039]' : 'text-[#A94412]')}>
                  {step.complete ? <Check className="h-4 w-4" aria-hidden="true" /> : index === 0 ? <BookOpenText className="h-4 w-4" aria-hidden="true" /> : index === 1 ? <UserRound className="h-4 w-4" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium leading-5 text-[#25211D]">{step.label}</span>
                {step.complete ? <CheckCircle2 className="h-5 w-5 shrink-0 text-[#39754A]" aria-label="Complete" /> : <ArrowRight className="h-4 w-4 shrink-0 text-[#9A4619]" aria-hidden="true" />}
              </>
              return <li key={step.id}>
                {step.id === 'welcome' ? (
                  <button type="button" onClick={() => setWelcomeOpen(true)} className="flex min-h-14 w-full items-center gap-2 text-left transition-colors hover:bg-[#FFFCF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] focus-visible:ring-inset">{content}</button>
                ) : href ? (
                  <Link href={href} className="flex min-h-14 items-center gap-2 transition-colors hover:bg-[#FFFCF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] focus-visible:ring-inset">{content}</Link>
                ) : null}
              </li>
            })}
          </ol> : null}
          {state.progress.completed === state.progress.total ? <p className="mt-3 text-sm text-[#625B52]">Your first steps are complete.</p> : null}

          <div className="mt-2 divide-y divide-[#EEE7DF] border-b border-[#EEE7DF]">
            <button type="button" onClick={() => setShareOpen(true)} aria-haspopup="dialog" className="group flex min-h-14 w-full items-center gap-2 text-left transition-colors hover:bg-[#FFFCF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] focus-visible:ring-inset">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center text-[#A94412]"><FileText className="h-4 w-4" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1 text-sm font-medium text-[#25211D]">Share your introduction</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[#A94412] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
            <details className="group">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-sm text-[#625B52] marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
                Explore more
                <ChevronDown className="h-4 w-4 text-[#716B62] transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <ul className="divide-y divide-[#EEE7DF] border-t border-[#EEE7DF] pb-1">
                {state.recommendedActions.map((action) => {
                  const meta = actionMeta[action.id]
                  if (!meta) return null
                  const Icon = meta.icon
                  return <li key={action.id}><Link href={meta.href} className="flex min-h-12 items-center gap-2 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700"><Icon className="h-4 w-4 shrink-0 text-[#9A4619]" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block font-medium text-[#29241F]">{action.label}</span><span className="mt-0.5 block truncate text-xs text-[#716B62]">{action.status}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-[#716B62]" aria-hidden="true" /></Link></li>
                })}
              </ul>
            </details>
          </div>
          {state.shareConfirmation ? <p className="mt-4 inline-flex items-center gap-2 text-xs text-[#716B62]"><CheckCircle2 className="h-4 w-4 text-[#39754A]" aria-hidden="true" />External share · {state.shareConfirmation.label}</p> : null}
        </div>
      </section>
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-h-[min(88dvh,760px)] max-w-lg overflow-y-auto rounded-[22px] border-[#E8DED3] bg-white p-5 text-[#171412] sm:p-7">
          <DialogTitle className="text-xl font-medium">Share your introduction</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-[#625B52]">Publish your introduction on AFL first. Then share it on your social pages and tag @Africa Future Leaders.</DialogDescription>
          <div className="mt-2 grid gap-4 sm:grid-cols-[144px_minmax(0,1fr)] sm:items-stretch">
            {member.portfolioCoverUrl ? (
              <figure className="flex min-h-36 items-center justify-center overflow-hidden rounded-xl border border-[#E8DED3] bg-[#FAF8F5] p-2 sm:min-h-0">
                <Image src={member.portfolioCoverUrl} alt={`${member.name}'s Africa Future Leaders 2026 award cover`} width={400} height={500} sizes="(max-width: 639px) 160px, 144px" unoptimized className="max-h-40 w-auto max-w-full rounded-md object-contain sm:max-h-full" />
              </figure>
            ) : (
              <Link href="/dashboard/me/portfolio-cover" onClick={() => setShareOpen(false)} className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-[#D8CBBE] bg-[#FAF8F5] px-4 text-center text-sm font-medium text-[#514B45] hover:bg-[#FFF7EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412]">
                Create your award cover
              </Link>
            )}
            <blockquote className="relative min-w-0 rounded-xl border border-[#E8DED3] bg-[#FAF8F5] p-4 pr-14 text-sm leading-6 text-[#514B45]">
              {introCaption}
              <button type="button" onClick={() => void copyCaption()} aria-label={captionCopied ? 'Caption copied' : 'Copy caption'} title={captionCopied ? 'Copied' : 'Copy caption'} className="absolute right-2 top-2 inline-grid size-10 place-items-center rounded-full text-[#6B6258] transition hover:bg-white hover:text-[#A94412] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412]">
                {captionCopied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              </button>
            </blockquote>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {settings.organizationLinkedinUrl ? <a href={settings.organizationLinkedinUrl} target="_blank" rel="noopener noreferrer" className="awardee-linkedin-button inline-flex min-h-11 items-center gap-2 rounded-full border border-[#0A66C2] bg-[#0A66C2] px-4 text-sm font-semibold text-white hover:bg-[#004182] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] focus-visible:ring-offset-2"><Linkedin className="h-4 w-4" aria-hidden="true" />AFL LinkedIn <ExternalLink className="h-4 w-4" aria-hidden="true" /></a> : null}
            {settings.facebookUrl ? <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#D8CBBE] bg-white px-4 text-sm font-medium text-[#352A20] hover:bg-[#FFF7EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] focus-visible:ring-offset-2">Facebook <ExternalLink className="h-4 w-4" aria-hidden="true" /></a> : null}
            {settings.instagramUrl ? <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#D8CBBE] bg-white px-4 text-sm font-medium text-[#352A20] hover:bg-[#FFF7EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] focus-visible:ring-offset-2">Instagram <ExternalLink className="h-4 w-4" aria-hidden="true" /></a> : null}
          </div>
          {state.coreSteps[2]?.complete ? <div className="mt-4 border-t border-[#EEE7DF] pt-4"><p className="text-sm font-medium text-[#25211D]">Have you shared it?</p><div className="mt-2 flex flex-wrap gap-2">{(['linkedin', 'facebook', 'instagram'] as const).map((platform) => <button key={platform} type="button" disabled={shareSaving || state.shareConfirmation?.platform === platform} onClick={() => void confirmExternalShare(platform)} className={platform === 'linkedin' ? 'inline-flex min-h-10 items-center gap-2 rounded-full border border-[#0A66C2] bg-[#0A66C2] px-3.5 text-sm font-semibold capitalize text-white hover:bg-[#004182] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] disabled:opacity-60' : 'inline-flex min-h-10 items-center rounded-full border border-[#D8CBBE] bg-white px-3.5 text-sm font-medium capitalize text-[#514B45] hover:border-[#A94412] hover:bg-[#FFF7EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] disabled:opacity-60'}>{platform === 'linkedin' ? <Linkedin className="h-4 w-4" aria-hidden="true" /> : null}{state.shareConfirmation?.platform === platform ? `Shared on ${platform} · you` : `I shared on ${platform}`}</button>)}</div></div> : null}
          <div className="sticky bottom-0 z-10 -mx-5 mt-5 border-t border-[#EEE7DF] bg-white/95 px-5 pb-1 pt-3 backdrop-blur sm:-mx-7 sm:px-7">
            <Button type="button" onClick={() => void shareIntroduction()} disabled={sharing || coverPreparing} className="min-h-12 w-full rounded-full bg-gradient-to-r from-[#F36D21] to-[#F5A313] px-5 font-semibold text-[#171412] hover:brightness-95 disabled:cursor-wait disabled:opacity-70">
              <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
              {sharing ? 'Opening share options…' : coverPreparing ? 'Preparing your cover…' : 'Share introduction'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <FounderWelcomeDialog open={welcomeOpen} settings={settings} saving={saving} onOpenChange={setWelcomeOpen} onAcknowledge={() => void acknowledgeWelcome()} />
    </>
  )
}
