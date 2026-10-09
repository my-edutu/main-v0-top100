'use client'

import Link from 'next/link'
import Image from '@/components/safe-image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, BookOpenText, Check, CheckCircle2, ChevronDown, Circle, Compass, Copy, ExternalLink, FileText, Linkedin, MessageCircle, RefreshCw, Smartphone, Share2, Trophy, UserRound, X } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

import { FounderWelcomeDialog } from './founder-welcome-dialog'
import { cn } from '@/lib/utils'
import { activateHomeScreenExploreTile, triggerHomeScreenAction } from '@/lib/install-prompt'
import { DEFAULT_AWARDEE_JOURNEY_SETTINGS, type AwardeeJourneySettings } from '@/lib/dashboard/awardee-journey-settings'
import type { AwardeeJourneyState } from '@/lib/dashboard/awardee-journey'
import { saveHandbookProgress } from '@/lib/dashboard/handbook-onboarding'
import { PARTICIPANT_HANDBOOK } from '@/lib/handbook/participant-handbook'
import { useDashboardMember } from '../_providers/dashboard-member'

type Payload = { state: AwardeeJourneyState; settings: AwardeeJourneySettings; whatsappChannelJoinedAt: string | null; homeScreenAddedAt: string | null; introPublishedConfirmedAt: string | null }
type Props = { name: string }
type ExploreTile = {
  id: string
  label: string
  detail: string
  action: 'welcome' | 'profile' | 'introduction' | 'cover' | 'post' | 'whatsapp' | 'handbook' | 'recommendation' | 'home-screen'
  href?: string
}

const coreDestinations = {
  welcome: null,
  profile: '/dashboard/me/profile',
  introduction: '/dashboard/me/posts',
} as const

const actionMeta: Record<string, { href: string; icon: typeof Compass }> = {
  opportunities: { href: '/dashboard/discover/opportunities', icon: Compass },
  magazine: { href: '/dashboard/me/feature', icon: FileText },
  award: { href: '/dashboard/me/award', icon: Trophy },
}

const whatsappChannelUrl = 'https://whatsapp.com/channel/0029Vb8lUNm96H4bB5keg402'

export function AwardeeOnboardingJourney({ name }: Props) {
  const { member } = useDashboardMember()
  const [homeScreenInstalled, setHomeScreenInstalled] = useState(false)
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)')
    const update = () => setHomeScreenInstalled(standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
    const initialize = window.setTimeout(update, 0)
    const installed = () => setHomeScreenInstalled(true)
    standalone.addEventListener('change', update)
    window.addEventListener('appinstalled', installed)
    return () => { window.clearTimeout(initialize); standalone.removeEventListener('change', update); window.removeEventListener('appinstalled', installed) }
  }, [])
  const [payload, setPayload] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [shareSaving, setShareSaving] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const [introOpen, setIntroOpen] = useState(false)
  const [introError, setIntroError] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [captionCopied, setCaptionCopied] = useState(false)
  const [preparedCover, setPreparedCover] = useState<{ url: string; file: File | null } | null>(null)
  const [sharing, setSharing] = useState(false)
  const [manualTaskSaving, setManualTaskSaving] = useState<'homeScreenAdded' | 'introPublished' | null>(null)
  const homeScreenSaveAttempted = useRef(false)
  const [joinedChannelSaving, setJoinedChannelSaving] = useState(false)
  const [joinedChannelFor, setJoinedChannelFor] = useState<string | null>(null)
  const [handbookOpen, setHandbookOpen] = useState(false)
  const [handbookSaving, setHandbookSaving] = useState(false)
  const [handbookError, setHandbookError] = useState('')
  const joinedChannel = joinedChannelFor === member.id || Boolean(payload?.whatsappChannelJoinedAt)
  async function confirmChannelJoined() {
    if (joinedChannelSaving || joinedChannel) return
    setJoinedChannelSaving(true)
    try {
      const response = await fetch('/api/member/onboarding-journey', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ whatsappChannelJoined: true }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not save your update.')
      setJoinedChannelFor(member.id)
      await load(false)
      toast.success('WhatsApp channel confirmation saved.')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not save your update.')
    } finally {
      setJoinedChannelSaving(false)
    }
  }

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
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your onboarding guide could not load.')
    } finally {
      setLoading(false)
    }
  }, [])

  const confirmManualTask = useCallback(async (field: 'homeScreenAdded' | 'introPublished') => {
    if (manualTaskSaving) return false
    setManualTaskSaving(field)
    if (field === 'introPublished') setIntroError('')
    try {
      const response = await fetch('/api/member/onboarding-journey', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ [field]: true }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not save your update.')
      if (field === 'homeScreenAdded') setHomeScreenInstalled(true)
      if (field === 'introPublished') setIntroOpen(false)
      await load(false)
      toast.success(field === 'homeScreenAdded' ? 'Home screen addition saved.' : 'Introduction marked as published.')
      return true
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not save your update.'
      if (field === 'introPublished') setIntroError(message)
      toast.error(message)
      return false
    } finally {
      setManualTaskSaving(null)
    }
  }, [load, manualTaskSaving])

  useEffect(() => {
    if (!homeScreenInstalled || !payload || payload.homeScreenAddedAt || homeScreenSaveAttempted.current) return
    homeScreenSaveAttempted.current = true
    void confirmManualTask('homeScreenAdded')
  }, [confirmManualTask, homeScreenInstalled, payload])

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
  const homeScreenComplete = homeScreenInstalled || Boolean(payload?.homeScreenAddedAt)
  const taskTotal = (state?.coreSteps.length ?? 3) + 4
  const taskCompleted = (state?.coreSteps.filter(step => step.complete).length ?? 0)
    + Number(Boolean(member.portfolioCoverUrl))
    + Number(Boolean(state?.shareConfirmation))
    + Number(joinedChannel)
    + Number(homeScreenComplete)
  const coverFile = preparedCover && preparedCover.url === member.portfolioCoverUrl ? preparedCover.file : null
  const coverPreparing = Boolean(shareOpen && member.portfolioCoverUrl && preparedCover?.url !== member.portfolioCoverUrl)
  const completedTiles: ExploreTile[] = [
    ...(state?.coreSteps.filter(step => step.complete && step.id !== 'handbook').map(step => ({
      id: step.id,
      label: step.label,
      detail: step.status,
      action: (step.id === 'welcome' ? 'welcome' : step.id === 'profile' ? 'profile' : 'introduction') as ExploreTile['action'],
      href: step.id === 'profile' ? '/dashboard/me/profile' : step.id === 'introduction' ? '/dashboard/me/posts' : undefined,
    })) ?? []),
    ...(homeScreenComplete ? [{ id: 'home-screen', label: 'Add Top100 to your home screen', detail: 'Added to your home screen', action: 'home-screen' as const }] : []),
    ...(member.portfolioCoverUrl ? [{ id: 'cover', label: 'Update your awardee cover', detail: 'Your cover is ready', action: 'cover' as const, href: '/dashboard/me/portfolio-cover' }] : []),
    ...(state?.shareConfirmation ? [
      { id: 'share-introduction', label: 'Share your introduction', detail: 'Shared by you', action: 'post' as const },
    ] : []),
    ...(joinedChannel ? [{ id: 'whatsapp', label: 'Africa Future Leaders WhatsApp channel', detail: 'Joined by you', action: 'whatsapp' as const, href: whatsappChannelUrl }] : []),
    ...(state?.recommendedActions.filter(action => action.complete).flatMap(action => {
      const meta = actionMeta[action.id]
      return meta ? [{ id: `completed-${action.id}`, label: action.label, detail: action.status, action: 'recommendation' as const, href: meta.href }] : []
    }) ?? []),
  ]
  const introCaption = `I’m proud to share that I’ve been selected as one of the Top100 Africa Future Leaders for ${settings.cohortYear}.\n\nThis cohort brings leaders together from ${settings.applicantCountryCount} countries. I’m honoured to be part of this community and grateful for the opportunity to contribute to a brighter future for our continent.\n\nI look forward to learning, collaborating, and building impact alongside fellow leaders across Africa. Thank you, @Africa Future Leaders, for this recognition.\n\n#Top100AfricaFutureLeaders #AfricaFutureLeaders #LeadershipInAfrica`

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

  async function acknowledgeHandbook() {
    if (handbookSaving) return
    setHandbookSaving(true)
    setHandbookError('')
    try {
      await saveHandbookProgress('handbookRead')
      await load(false)
      setHandbookOpen(false)
      toast.success('Handbook acknowledgement saved.')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not save that update.'
      setHandbookError(message)
      toast.error(message)
    } finally {
      setHandbookSaving(false)
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
      await confirmExternalShare()
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      toast.error('Could not open the share menu. Copy the caption and share your cover manually.')
    } finally {
      setSharing(false)
    }
  }

  async function confirmExternalShare() {
    setShareSaving(true)
    try {
      const response = await fetch('/api/member/onboarding-journey', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ externalShareConfirmed: true, externalSharePlatform: 'other' }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not save your update.')
      setShareOpen(false)
      await load(false)
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
      <section className="relative" aria-labelledby={taskCompleted < taskTotal ? 'journey-title' : undefined} aria-label={taskCompleted === taskTotal ? 'Explore more onboarding links' : undefined}>
        <div>
          {taskCompleted < taskTotal ? <>
            <div className="flex items-center justify-between gap-4">
              <h2 id="journey-title" className="text-xl font-medium leading-tight tracking-[-0.02em] text-[#171412] sm:text-2xl">Your next steps, {name.trim().split(/\s+/)[0]}</h2>
              <span className="shrink-0 text-sm tabular-nums text-[#625B52]">{taskCompleted}<span className="px-1 text-[#B5A99B]">/</span>{taskTotal}</span>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#E8E1D9]" role="progressbar" aria-valuenow={taskCompleted} aria-valuemin={0} aria-valuemax={taskTotal} aria-label={`${taskCompleted} of ${taskTotal} onboarding steps complete`}>
              <div className="h-full rounded-full bg-gradient-to-r from-[#F36D21] to-[#F5A313] transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${(taskCompleted / taskTotal) * 100}%` }} />
            </div>
          </> : null}

          {state.coreSteps.some(step => !step.complete) ? <ol className="mt-2 divide-y divide-[#EEE7DF] border-y border-[#EEE7DF]" aria-label="Awardee onboarding checklist">
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
                ) : step.id === 'handbook' ? (
                  <button type="button" onClick={() => { setHandbookError(''); setHandbookOpen(true) }} aria-haspopup="dialog" className="flex min-h-14 w-full items-center gap-2 py-3 text-left transition-colors hover:bg-[#FFFCF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] focus-visible:ring-inset">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center text-[#A94412]"><BookOpenText className="h-4 w-4" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-5 text-[#25211D]">{PARTICIPANT_HANDBOOK.checklistTitle}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-[#716B62]">{PARTICIPANT_HANDBOOK.checklistDescription}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#A94412]" aria-hidden="true" />
                  </button>
                ) : step.id === 'introduction' ? (
                  <button type="button" onClick={() => { setIntroError(''); setIntroOpen(true) }} aria-haspopup="dialog" className="flex min-h-14 w-full items-center gap-2 text-left transition-colors hover:bg-[#FFFCF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] focus-visible:ring-inset">{content}</button>
                ) : href ? (
                  <Link href={href} className="flex min-h-14 items-center gap-2 transition-colors hover:bg-[#FFFCF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] focus-visible:ring-inset">{content}</Link>
                ) : null}
              </li>
            })}
          </ol> : null}
          <div className="mt-2 divide-y divide-[#EEE7DF] border-b border-[#EEE7DF]">
            {!homeScreenComplete ? (
              <div className="flex min-h-14 items-center gap-2 py-2">
                <button type="button" onClick={() => triggerHomeScreenAction()} className="group flex min-h-12 min-w-0 flex-1 items-center gap-2 text-left transition-colors hover:bg-[#FFFCF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] focus-visible:ring-inset">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center text-[#A94412]"><Smartphone className="h-4 w-4" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-[#25211D]">Add Top100 to your home screen</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#A94412]" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => void confirmManualTask('homeScreenAdded')} disabled={manualTaskSaving !== null} aria-busy={manualTaskSaving === 'homeScreenAdded'} className="min-h-10 shrink-0 rounded-full border border-[#D8CBBE] px-3 text-xs font-medium text-[#514B45] hover:bg-[#FFF7EF] disabled:opacity-60">{manualTaskSaving === 'homeScreenAdded' ? 'Saving…' : 'I’ve added it'}</button>
              </div>
            ) : null}

            {!member.portfolioCoverUrl ? (
            <Link href="/dashboard/me/portfolio-cover" className="group flex min-h-14 items-center gap-2 py-2 transition-colors hover:bg-[#FFFCF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] focus-visible:ring-inset">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center text-[#A94412]"><UserRound className="h-4 w-4" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1 text-sm font-medium text-[#25211D]">Update your awardee cover{member.portfolioCoverUrl ? ' · Complete' : ''}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[#A94412] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            ) : null}
            {!joinedChannel ? (
              <>
            <a href={whatsappChannelUrl} target="_blank" rel="noopener noreferrer" className="group flex min-h-14 items-center gap-2 py-2 transition-colors hover:bg-[#FFFCF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] focus-visible:ring-inset">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center text-[#A94412]"><MessageCircle className="h-4 w-4" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium leading-5 text-[#25211D]">Join the Africa Future Leaders WhatsApp channel</span>
                <span className="mt-0.5 block text-xs text-[#716B62]">Get updates and announcements from the community</span>
              </span>
              <ExternalLink className="h-4 w-4 shrink-0 text-[#A94412]" aria-hidden="true" />
            </a>
            <button type="button" onClick={() => void confirmChannelJoined()} disabled={joinedChannelSaving || joinedChannel} aria-busy={joinedChannelSaving} className="flex min-h-10 items-center gap-2 px-2 text-xs text-[#625B52] disabled:opacity-70">
              <Circle className="h-4 w-4" aria-hidden="true" />
              {joinedChannelSaving ? 'Saving confirmation…' : 'I’ve joined the WhatsApp channel'}
            </button>
              </>
            ) : null}
            {!state.shareConfirmation ? (
            <div className="flex min-h-14 items-center gap-1">
              <button type="button" onClick={() => setShareOpen(true)} aria-haspopup="dialog" className="group flex min-h-14 min-w-0 flex-1 items-center gap-2 text-left transition-colors hover:bg-[#FFFCF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] focus-visible:ring-inset">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center text-[#A94412]"><FileText className="h-4 w-4" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[#25211D]">Share your introduction</span>
                  <span className="mt-0.5 block text-xs text-[#716B62]">Share your introduction and award cover</span>
                </span>
              </button>
              <button type="button" onClick={() => void confirmExternalShare()} disabled={shareSaving} aria-label="Mark share introduction step complete" title="Mark complete" aria-busy={shareSaving} className="inline-grid size-11 shrink-0 place-items-center rounded-full border border-[#E8DED3] bg-white text-[#716B62] transition-colors hover:border-[#E9A879] hover:bg-[#FFF7EF] hover:text-[#A94412] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
                {shareSaving ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            ) : null}
            <details className="journey-explore-more group overflow-hidden rounded-[18px] border border-[#E8E1D9] bg-[#FAF8F5]">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm text-[#625B52] transition-colors hover:bg-[#F5EFE8] marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
                Explore more
                <ChevronDown className="h-4 w-4 text-[#716B62] transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="journey-explore-grid grid grid-cols-2 gap-2 bg-[#FAF8F5] p-3" aria-label="Completed onboarding tasks and useful links">
                {state.recommendedActions.some(action => action.id === 'award' && !action.complete) ? <Link href={actionMeta.award.href} className="journey-explore-tile flex min-h-[64px] items-center rounded-[18px] border border-[#F97316] bg-gradient-to-br from-[#FF8A00] to-[#FFB21A] p-2.5 font-semibold text-[#171412] transition-colors hover:from-[#FF9A1F] hover:to-[#FFC247] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] focus-visible:ring-offset-2">
                  <span className="flex items-start justify-between gap-2"><span className="text-[13px] leading-4">Get your award</span><Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#171412]" aria-hidden="true" /></span>
                </Link> : null}
                {completedTiles.map(tile => {
                  const content = <span className="flex items-start justify-between gap-2"><span className="text-[13px] font-medium leading-4 text-[#25211D]">{tile.label}</span><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#39754A]" aria-label="Complete" /></span>
                  const className = 'journey-explore-tile flex min-h-[64px] w-full items-center rounded-[18px] border border-[#E8E1D9] bg-white p-2.5 text-left transition-colors hover:border-[#E9A879] hover:bg-[#FFFCF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412]'
                  if (tile.action === 'home-screen') return <button key={tile.id} type="button" onClick={() => activateHomeScreenExploreTile()} className={className}>{content}</button>
                  if (tile.action === 'welcome') return <button key={tile.id} type="button" onClick={() => setWelcomeOpen(true)} className={className}>{content}</button>
                  if (tile.action === 'post') return <button key={tile.id} type="button" onClick={() => setShareOpen(true)} className={className}>{content}</button>
                  if (tile.action === 'whatsapp') return <a key={tile.id} href={tile.href} target="_blank" rel="noopener noreferrer" className={className}>{content}</a>
                  return <Link key={tile.id} href={tile.href ?? '#'} className={className}>{content}</Link>
                })}
                <button type="button" onClick={() => { setHandbookError(''); setHandbookOpen(true) }} aria-haspopup="dialog" className="journey-explore-tile flex min-h-[64px] w-full items-center rounded-[18px] border border-[#F2C79F] bg-[#FFF7EF] p-2.5 text-left transition-colors hover:bg-[#FFF0E2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412]">
                  <span className="flex items-start justify-between gap-2"><span className="text-[13px] font-medium leading-4 text-[#25211D]">2026 participant handbook</span><BookOpenText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A94412]" aria-hidden="true" /></span>
                </button>
                {state.recommendedActions.filter(action => !action.complete && action.id !== 'award').map((action) => {
                  const meta = actionMeta[action.id]
                  if (!meta) return null
                  const Icon = meta.icon
                  return <Link key={action.id} href={meta.href} className="journey-explore-tile flex min-h-[64px] items-center rounded-[18px] border border-[#E8E1D9] bg-white p-2.5 transition-colors hover:border-[#E9A879] hover:bg-[#FFFCF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412]"><span className="flex items-start justify-between gap-2"><span className="text-[13px] font-medium leading-4 text-[#25211D]">{action.label}</span><Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A94412]" aria-hidden="true" /></span></Link>
                })}
              </div>
            </details>
          </div>
          {state.shareConfirmation && taskCompleted < taskTotal ? <p className="mt-4 inline-flex items-center gap-2 text-xs text-[#716B62]"><CheckCircle2 className="h-4 w-4 text-[#39754A]" aria-hidden="true" />External share · {state.shareConfirmation.label}</p> : null}
        </div>
      </section>
      <Dialog open={handbookOpen} onOpenChange={setHandbookOpen}>
        <DialogContent overlayClassName="handbook-guide-overlay" className="handbook-guide-dialog max-h-[85dvh] max-w-md overflow-y-auto border-[#E8DED3] bg-white p-6 sm:p-7">
          <Image src="/onboarding/participant-handbook.svg" alt="" width={280} height={160} className="mx-auto h-36 w-auto" />
          <DialogTitle className="text-xl font-medium leading-tight text-[#171412]">Your 2026 participant handbook</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-[#625B52]">Get familiar with your first steps, the programme timeline, and where to find help. Open the guide when you’re ready to begin.</DialogDescription>
          {handbookError ? <p role="alert" className="text-sm text-red-700">{handbookError}</p> : null}
          <a href={PARTICIPANT_HANDBOOK.path} target="_blank" rel="noopener noreferrer" onClick={() => void acknowledgeHandbook()} className="handbook-open-button mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#F97316] px-5 text-base font-semibold text-[#171412] hover:bg-[#FB923C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] focus-visible:ring-offset-2">{handbookSaving ? 'Opening handbook…' : 'Open handbook'}<ExternalLink className="h-4 w-4" aria-hidden="true" /></a>
        </DialogContent>
      </Dialog>
      <Dialog open={introOpen} onOpenChange={setIntroOpen}>
        <DialogContent className="max-w-md rounded-[22px] border-[#E8DED3] bg-white p-5 text-[#171412] sm:p-7">
          <DialogTitle className="text-xl font-medium">Publish your awardee introduction</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-[#625B52]">Create your introduction on Top100, or confirm here if you’ve already published it. Your progress will be saved to your account.</DialogDescription>
          {introError ? <p role="alert" className="text-sm text-red-700">{introError}</p> : null}
          <Link href="/dashboard/me/posts/new?onboarding=introduction" onClick={() => setIntroOpen(false)} className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#F36D21] to-[#F5A313] px-5 text-sm font-semibold text-[#171412] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] focus-visible:ring-offset-2">Write my introduction</Link>
          <Button type="button" variant="outline" onClick={() => void confirmManualTask('introPublished')} disabled={manualTaskSaving !== null} aria-busy={manualTaskSaving === 'introPublished'} className="min-h-12 w-full rounded-full border-[#D8CBBE] text-sm font-medium text-[#514B45]">{manualTaskSaving === 'introPublished' ? 'Saving…' : 'I’ve already published it'}</Button>
        </DialogContent>
      </Dialog>
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
              <Link href="/dashboard/me/portfolio-cover" className="relative z-10 flex min-h-28 items-center justify-center rounded-xl border border-dashed border-[#D8CBBE] bg-[#FAF8F5] px-4 text-center text-sm font-medium text-[#514B45] hover:bg-[#FFF7EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412]">
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
          <div className="sticky bottom-0 z-10 -mx-5 mt-5 border-t border-[#EEE7DF] bg-white/95 px-5 pb-1 pt-3 backdrop-blur sm:-mx-7 sm:px-7">
            <Button type="button" onClick={() => void shareIntroduction()} disabled={sharing || coverPreparing} className="min-h-12 w-full rounded-full bg-gradient-to-r from-[#F36D21] to-[#F5A313] px-5 font-semibold text-[#171412] hover:brightness-95 disabled:cursor-wait disabled:opacity-70">
              <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
              {sharing ? 'Opening share options…' : coverPreparing ? 'Preparing your cover…' : 'Share introduction'}
            </Button>
            {!state.shareConfirmation ? <button type="button" onClick={() => void confirmExternalShare()} disabled={shareSaving} aria-busy={shareSaving} className="mx-auto mt-3 block min-h-8 text-sm text-[#716B62] underline decoration-[#BEB2A5] underline-offset-4 transition-colors hover:text-[#A94412] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] focus-visible:ring-offset-2 disabled:opacity-60">{shareSaving ? 'Saving…' : 'I’ve done it'}</button> : null}
          </div>
        </DialogContent>
      </Dialog>
      <FounderWelcomeDialog open={welcomeOpen} settings={settings} saving={saving} onOpenChange={setWelcomeOpen} onAcknowledge={() => void acknowledgeWelcome()} />
    </>
  )
}
