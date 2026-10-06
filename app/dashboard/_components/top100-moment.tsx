'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Image from '@/components/safe-image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, ChevronRight, ImagePlus, LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import { DEFAULT_AWARDEE_JOURNEY_SETTINGS, type AwardeeJourneySettings } from '@/lib/dashboard/awardee-journey-settings'
import { setPendingPortfolioCoverPhoto } from '@/lib/portfolio-cover/draft-photo'
import { Top100ApplicantCountryDetails } from './top100-moment-country-details'
import type { MemberProfile } from '@/lib/member-hub'
import { cn } from '@/lib/utils'

type JourneyPayload = {
  settings: AwardeeJourneySettings
  moment: { completedAt: string | null }
}

const journeyCache = new Map<string, JourneyPayload | null>()
const journeyRequests = new Map<string, Promise<JourneyPayload | null>>()

const sceneCount = 4
const splashColors = ['#ffffff', '#10151f', '#f97316', '#ffe58a']
const splashConfetti = Array.from({ length: 28 }, (_, index) => ({
  color: splashColors[index % splashColors.length],
  x: `${((index * 47 + 13) % 100) - 50}vw`,
  y: `${((index * 31 + 9) % 70) - 35}vh`,
  delay: `${(index % 7) * 0.025}s`,
  shape: index % 4 === 0 ? 'circle' : 'strip',
}))
const splashBalloons = [
  { color: '#f97316', x: '-28vw', y: '-5vh', delay: '0s' },
  { color: '#fff', x: '0vw', y: '3vh', delay: '.08s' },
  { color: '#10151f', x: '27vw', y: '-3vh', delay: '.16s' },
]

function Top100MomentSplash() {
  const reducedMotion = useReducedMotion()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (reducedMotion) return
    const timeout = window.setTimeout(() => setVisible(false), 2_200)
    return () => window.clearTimeout(timeout)
  }, [reducedMotion])

  if (!visible || reducedMotion) return null

  return (
    <div className="top100-moment-splash" aria-hidden="true">
      {splashBalloons.map((balloon, index) => (
        <span
          key={`balloon-${index}`}
          className="top100-moment-splash-balloon"
          style={{
            '--splash-x': balloon.x,
            '--splash-y': balloon.y,
            '--splash-delay': balloon.delay,
            '--splash-color': balloon.color,
          } as CSSProperties}
        />
      ))}
      {splashConfetti.map((piece, index) => (
        <span
          key={`confetti-${index}`}
          className={`top100-moment-splash-confetti is-${piece.shape}`}
          style={{
            '--splash-x': piece.x,
            '--splash-y': piece.y,
            '--splash-delay': piece.delay,
            '--splash-color': piece.color,
          } as CSSProperties}
        />
      ))}
    </div>
  )
}

function loadMemberJourney(memberId: string): Promise<JourneyPayload | null> {
  if (journeyCache.has(memberId)) return Promise.resolve(journeyCache.get(memberId) ?? null)

  const pending = journeyRequests.get(memberId)
  if (pending) return pending

  const request = fetch('/api/member/onboarding-journey', { cache: 'no-store' })
    .then(async (response) => {
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not load your welcome.')
      const journey = result.journey as Partial<JourneyPayload>
      return {
        settings: { ...DEFAULT_AWARDEE_JOURNEY_SETTINGS, ...journey.settings },
        moment: journey.moment ?? { completedAt: null },
      }
    })
    .then((journey) => {
      journeyCache.set(memberId, journey)
      return journey
    })
    .catch(() => null)
    .finally(() => journeyRequests.delete(memberId))

  journeyRequests.set(memberId, request)
  return request
}

function AnimatedApplicantCount({ value }: { value: number }) {
  const reducedMotion = useReducedMotion()
  const [count, setCount] = useState(reducedMotion ? value : 0)

  useEffect(() => {
    if (reducedMotion) return
    let startTime: number | undefined
    let frame = 0
    const duration = 1300
    const animate = (now: number) => {
      startTime ??= now
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(value * eased))
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [reducedMotion, value])

  const displayedCount = reducedMotion ? value : count
  return <span aria-label={`${value.toLocaleString('en-US')}+`} className="font-extrabold tabular-nums">{displayedCount.toLocaleString('en-US')}+</span>
}

export function Top100MomentGate({ member, children }: { member: MemberProfile; children: ReactNode }) {
  const [initialJourney] = useState(() => ({
    payload: journeyCache.get(member.id) ?? null,
    loading: !journeyCache.has(member.id),
    dismissed: journeyCache.has(member.id) && journeyCache.get(member.id) === null,
  }))
  const [payload, setPayload] = useState<JourneyPayload | null>(initialJourney.payload)
  const [loading, setLoading] = useState(initialJourney.loading)
  const [dismissed, setDismissed] = useState(initialJourney.dismissed)

  useEffect(() => {
    let active = true
    void loadMemberJourney(member.id)
      .then((journey) => {
        if (!active) return
        if (journey) setPayload(journey)
        else setDismissed(true)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [member.id])

  if (dismissed || payload?.moment?.completedAt) return children
  if (loading || !payload) {
    return <div className="grid min-h-dvh place-items-center bg-white" role="status" aria-label="Loading your dashboard"><LoaderCircle className="h-8 w-8 animate-spin text-orange-600 motion-reduce:animate-none" aria-hidden="true" /></div>
  }
  return <Top100Moment member={member} payload={payload} onComplete={() => setDismissed(true)} />
}

function Top100Moment({ member, payload, onComplete }: { member: MemberProfile; payload: JourneyPayload; onComplete: () => void }) {
  const reducedMotion = useReducedMotion()
  const router = useRouter()
  const [scene, setScene] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showCountryDetails, setShowCountryDetails] = useState(false)
  const [portrait, setPortrait] = useState<File | null>(null)
  const [portraitPreviewUrl, setPortraitPreviewUrl] = useState<string | null>(null)
  const portraitInputRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const { settings } = payload

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0
    titleRef.current?.focus({ preventScroll: true })
  }, [scene])

  useEffect(() => {
    if (!portrait) return
    const url = URL.createObjectURL(portrait)
    const frame = window.requestAnimationFrame(() => setPortraitPreviewUrl(url))
    return () => {
      window.cancelAnimationFrame(frame)
      URL.revokeObjectURL(url)
    }
  }, [portrait])

  async function finish(destination?: string, destinationPhoto?: File) {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/member/onboarding-journey', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ top100MomentComplete: true }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not open your dashboard yet.')
      journeyCache.set(member.id, {
        ...payload,
        moment: { completedAt: new Date().toISOString() },
      })
      if (destination) {
        if (destinationPhoto) setPendingPortfolioCoverPhoto(destinationPhoto)
        router.push(destination)
      }
      else onComplete()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open your dashboard yet.')
    } finally { setSaving(false) }
  }

  function selectPortrait(photo?: File) {
    if (!photo) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || photo.size > 8 * 1024 * 1024) {
      setPortrait(null)
      setPortraitPreviewUrl(null)
      setError('Choose a JPG, PNG or WebP photo under 8 MB.')
      return
    }
    setError('')
    setPortraitPreviewUrl(null)
    setPortrait(photo)
  }

  function goBack() {
    if (scene === 2 && showCountryDetails) {
      setShowCountryDetails(false)
      return
    }
    setScene((value) => Math.max(0, value - 1))
  }

  function goNext() {
    setError('')
    if (scene === 2 && showCountryDetails) setShowCountryDetails(false)
    setScene((value) => Math.min(sceneCount - 1, value + 1))
  }

  const transition = reducedMotion ? { duration: 0 } : { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const }
  const visualPaths = [
    '/onboarding/top100-moment/arrival.svg',
    '/onboarding/top100-moment/selection.svg',
    '/onboarding/top100-moment/countries.svg',
  ]

  return (
    <main ref={mainRef} className="top100-moment fixed inset-0 z-[100] isolate overflow-hidden bg-[linear-gradient(135deg,#fbbf24_0%,#f59e0b_52%,#d97706_100%)] text-[#10151f]" aria-label="Your Top100 Africa Future Leaders welcome">
      <div aria-hidden="true" className="absolute -right-48 -top-48 h-[34rem] w-[34rem] rounded-full border border-white/20 motion-safe:animate-[moment-breathe_7s_ease-in-out_infinite]" />
      <div aria-hidden="true" className="absolute -bottom-72 -left-56 h-[38rem] w-[38rem] rounded-full border border-white/15" />
      <Top100MomentSplash />
      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col px-5 pb-[max(18px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))] sm:px-9 lg:px-12">
        <header className="flex shrink-0 items-center justify-between gap-4">
          <Image src="/Top100%20Africa%20Future%20leaders%20Logo%20.png" alt="Top100 Africa Future Leaders" width={180} height={42} priority className="h-auto w-[138px] sm:w-[168px]" />
          <button type="button" onClick={() => void finish()} disabled={saving} className="min-h-11 rounded-full px-4 text-sm font-medium text-[#10151f]/80 transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10151f] disabled:opacity-50">Skip</button>
        </header>

        <div className="mt-4 flex items-center gap-3" aria-label={`Page ${scene + 1} of ${sceneCount}`}>
          <span className="w-10 text-xs tabular-nums text-[#10151f]/75">0{scene + 1}/0{sceneCount}</span>
          <div className="flex flex-1 gap-1.5">{Array.from({ length: sceneCount }, (_, index) => <span key={index} className={cn('h-1 flex-1 rounded-full transition-colors duration-300', index <= scene ? 'bg-[#10151f]' : 'bg-[#10151f]/25')} />)}</div>
        </div>

        <div className="relative min-h-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.section key={scene === 2 && showCountryDetails ? 'country-details' : scene} initial={reducedMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }} transition={transition} className="absolute inset-0 grid min-h-0 overflow-y-auto py-4 sm:py-8">
              {scene === 0 ? (
                <div className="mx-auto my-0 grid w-full max-w-6xl items-center gap-5 sm:gap-8 lg:grid-cols-[1fr_.92fr]">
                  <div className="order-2 text-center lg:order-1 lg:text-left">
                    <p className="text-sm font-semibold uppercase tracking-[.2em] text-[#10151f]">The class of {settings.cohortYear}</p>
                    <h1 ref={titleRef} tabIndex={-1} className="mx-auto mt-3 max-w-3xl text-balance text-[clamp(2.6rem,7.2vw,5.7rem)] font-semibold leading-[.94] tracking-[-.055em] outline-none lg:mx-0">You made it, {member.name.trim().split(/\s+/)[0] || 'Leader'}.</h1>
                    <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#10151f] sm:text-lg lg:mx-0">You have been selected as a Top100 Africa Future Leader.</p>
                  </div>
                  <div className="order-1 mx-auto w-full max-w-[300px] sm:max-w-[390px] lg:order-2 lg:max-w-[460px]">
                    <Image src={visualPaths[0]} alt="" width={480} height={320} priority className="w-full motion-safe:animate-[moment-float_6s_ease-in-out_infinite]" />
                  </div>
                </div>
              ) : null}

              {scene === 1 ? (
                <div className="mx-auto my-0 grid w-full max-w-6xl items-center gap-3 sm:gap-8 md:grid-cols-[1fr_.8fr]">
                  <div className="text-center md:text-left">
                    <p className="text-sm font-medium uppercase tracking-[.2em] text-[#10151f]">Out of</p>
                    <h1 ref={titleRef} tabIndex={-1} className="mt-3 text-balance text-[clamp(4.25rem,16vw,8.5rem)] font-bold leading-[.86] tracking-[-.07em] outline-none"><AnimatedApplicantCount value={settings.applicantCount} /></h1>
                    <p className="mt-3 text-xl font-medium leading-tight text-[#10151f] sm:text-2xl">applicants, you were selected.</p>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-[#10151f]/85 sm:text-base md:mx-0">For the {settings.cohortYear} cohort.</p>
                  </div>
                  <Image src={visualPaths[1]} alt="" width={480} height={320} className="mx-auto w-full max-w-[280px] sm:max-w-[400px]" />
                </div>
              ) : null}

              {scene === 2 && !showCountryDetails ? (
                <div className="mx-auto my-0 grid w-full max-w-6xl items-center gap-5 sm:gap-8 md:grid-cols-[1fr_.8fr]">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[.2em] text-[#10151f]">A continent connected</p>
                    <h1 ref={titleRef} tabIndex={-1} className="mt-4 text-balance text-[clamp(2.45rem,5.6vw,5rem)] font-semibold leading-[.96] tracking-[-.055em] outline-none">{settings.applicantCountryCount} countries. One community.</h1>
                    <p className="mt-4 max-w-xl text-base leading-7 text-[#10151f]">46 African and 15 non-African countries.</p>
                    <button type="button" onClick={() => setShowCountryDetails(true)} className="mt-4 inline-flex min-h-11 items-center gap-1 rounded-full border border-[#10151f]/30 bg-white/35 px-4 text-sm font-bold text-[#10151f] transition hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10151f]">See countries <ChevronRight className="h-4 w-4" /></button>
                  </div>
                  <Image src={visualPaths[2]} alt="" width={480} height={320} className="mx-auto w-full max-w-[340px] sm:max-w-[440px]" />
                </div>
              ) : null}

              {scene === 2 && showCountryDetails ? <Top100ApplicantCountryDetails reducedMotion={Boolean(reducedMotion)} /> : null}

              {scene === 3 ? (
                <div className="mx-auto my-0 grid w-full max-w-6xl items-center gap-4">
                  <div className="max-w-3xl">
                    <p className="text-sm font-medium uppercase tracking-[.2em] text-[#10151f]">Your announcement</p>
                    <h1 ref={titleRef} tabIndex={-1} className="mt-3 text-balance text-[clamp(2.4rem,6vw,4.8rem)] font-semibold leading-[.94] tracking-[-.05em] outline-none">Add your photo. Share the moment.</h1>
                    <p className="mt-4 max-w-lg text-sm leading-6 text-[#10151f]">Choose a portrait to use on your official Top100 cover. You can continue to your dashboard without a photo.</p>
                    <input
                      ref={portraitInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      aria-label="Choose a portrait photo"
                      onChange={(event) => {
                        selectPortrait(event.currentTarget.files?.[0])
                        event.currentTarget.value = ''
                      }}
                    />
                    <div className="mt-5 flex flex-wrap items-center gap-4">
                      <button type="button" onClick={() => portraitInputRef.current?.click()} disabled={saving} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#10151f] px-5 text-sm font-semibold text-white transition hover:bg-[#252b38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10151f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f59e0b] disabled:cursor-wait disabled:opacity-65">
                        <ImagePlus className="h-4 w-4" aria-hidden="true" />
                        {portrait ? 'Change my photo' : 'Choose my photo'}
                      </button>
                      {portrait && portraitPreviewUrl ? (
                        <div className="flex min-w-0 items-center gap-3" aria-live="polite">
                          <Image src={portraitPreviewUrl} alt="Preview of your selected portrait" width={52} height={64} unoptimized className="h-16 w-[52px] rounded-lg border border-[#10151f]/20 object-cover" />
                          <span className="max-w-48 truncate text-sm font-medium text-[#10151f]">{portrait.name}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </motion.section>
          </AnimatePresence>
        </div>

        {error ? <p role="alert" className="mb-1 shrink-0 rounded-xl border border-[#10151f]/25 bg-white/55 px-3 py-2 text-center text-xs font-medium text-[#10151f]">{error}</p> : null}
        <footer className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 pt-2 sm:grid-cols-[1fr_auto]">
          <button type="button" aria-label="Back" onClick={goBack} disabled={scene === 0 && !showCountryDetails} className="inline-flex h-12 w-12 shrink-0 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium text-[#10151f]/85 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10151f] disabled:invisible sm:w-auto"><ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Back</span></button>
          {scene < sceneCount - 1 ? <button type="button" onClick={goNext} className="inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#10151f] px-4 text-sm font-extrabold text-white hover:bg-[#252b38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10151f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f59e0b] sm:w-auto sm:min-w-[200px] sm:px-6 sm:text-base">Continue <ArrowRight className="h-4 w-4 shrink-0" /></button> : <button type="button" onClick={() => portrait ? void finish('/dashboard/me/portfolio-cover', portrait) : void finish()} disabled={saving} className="inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#10151f] px-3 text-sm font-extrabold text-white hover:bg-[#252b38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10151f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f59e0b] disabled:cursor-wait disabled:opacity-65 sm:w-auto sm:min-w-[240px] sm:px-5 sm:text-base">{saving ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" /> : portrait ? <ArrowRight className="h-4 w-4 shrink-0" /> : <Check className="h-4 w-4 shrink-0" />}{saving ? 'Opening…' : portrait ? 'Continue to my cover' : 'Enter my dashboard'}</button>}
        </footer>
      </div>
    </main>
  )
}
