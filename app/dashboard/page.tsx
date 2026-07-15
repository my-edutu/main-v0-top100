'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Bell,
  BellRing,
  BriefcaseBusiness,
  BookOpen,
  CalendarDays,
  CalendarCheck,
  Download,
  Eye,
  FilePenLine,
  Handshake,
  HeartHandshake,
  Home,
  Loader2,
  LockKeyhole,
  MapPin,
  Menu,
  Megaphone,
  MessageCircle,
  Newspaper,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { SparklesIcon } from 'hugeicons-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  fetchMemberHubState,
  createFeatureSubmission,
  markNotificationRead,
  HubOpportunity,
  MemberHubState,
  MemberProfile,
  updateMemberProfile,
} from '@/lib/member-hub'
import { magazineEditions } from '@/lib/magazines'
import type { Awardee } from '@/lib/awardees-shared'
import { cn } from '@/lib/utils'

type DashboardSection = 'home' | 'profile' | 'directory' | 'messages' | 'opportunities' | 'featured' | 'events' | 'partnerships' | 'magazine' | 'notifications' | 'settings'
type DirectoryFocus = 'awardees' | 'messages'

type NavItem = {
  id: DashboardSection
  title: string
  label: string
  icon: LucideIcon
  tone: 'orange' | 'paper'
  span?: string
}

const dashboardNav: NavItem[] = [
  { id: 'home', title: 'Home', label: 'Overview', icon: Home, tone: 'orange' },
  { id: 'profile', title: 'BIO', label: 'Update profile', icon: FilePenLine, tone: 'orange', span: 'md:col-span-2' },
  { id: 'directory', title: 'Directory', label: 'Find awardees', icon: Users, tone: 'paper' },
  { id: 'messages', title: 'Messages', label: 'Direct contact', icon: MessageCircle, tone: 'paper' },
  { id: 'opportunities', title: 'Opportunities', label: 'Member hub', icon: Trophy, tone: 'paper', span: 'md:col-span-2 xl:col-span-1' },
  { id: 'featured', title: 'Get featured', label: 'Submit story', icon: Sparkles, tone: 'orange' },
  { id: 'events', title: 'Events', label: 'Programs', icon: CalendarCheck, tone: 'paper' },
  { id: 'partnerships', title: 'Partnerships', label: 'Join or view', icon: HeartHandshake, tone: 'paper' },
  { id: 'magazine', title: 'Magazine', label: 'Stories and submissions', icon: BookOpen, tone: 'paper' },
  { id: 'notifications', title: 'Notifications', label: 'Admin updates', icon: BellRing, tone: 'orange' },
  { id: 'settings', title: 'Settings', label: 'Visibility', icon: Settings, tone: 'orange', span: 'md:col-span-2 xl:col-span-2' },
]

const directoryCohorts = [
  {
    year: '2024',
    title: '2024 Awardees',
    surface: 'bg-[#fffaf2]',
  },
  {
    year: '2025',
    title: '2025 Awardees',
    surface: 'bg-[#f7f7f5]',
  },
  {
    year: '2026',
    title: '2026 Awardees',
    surface: 'bg-[#fcfbf7]',
  },
]

const dashboardCardStyles: Record<DashboardSection, {
  card: string
  icon: string
  arrow: string
  detail: string
}> = {
  home: {
    card: 'bg-[#fff3ea] text-black border border-orange-100',
    icon: 'text-orange-500',
    arrow: 'text-orange-500',
    detail: 'text-black/52',
  },
  profile: {
    card: 'bg-[#eef5ff] text-black border border-sky-100',
    icon: 'text-sky-500',
    arrow: 'text-sky-500',
    detail: 'text-black/50',
  },
  directory: {
    card: 'bg-[#f2efff] text-black border border-violet-100',
    icon: 'text-violet-500',
    arrow: 'text-violet-500',
    detail: 'text-black/50',
  },
  messages: {
    card: 'bg-[#edf9f2] text-black border border-emerald-100',
    icon: 'text-emerald-500',
    arrow: 'text-emerald-500',
    detail: 'text-black/52',
  },
  opportunities: {
    card: 'bg-[#fff5df] text-black border border-amber-100',
    icon: 'text-amber-500',
    arrow: 'text-amber-500',
    detail: 'text-black/52',
  },
  featured: {
    card: 'bg-[#fdf0f5] text-black border border-pink-100',
    icon: 'text-pink-500',
    arrow: 'text-pink-500',
    detail: 'text-black/50',
  },
  events: {
    card: 'bg-[#ecfbfc] text-black border border-cyan-100',
    icon: 'text-cyan-500',
    arrow: 'text-cyan-500',
    detail: 'text-black/50',
  },
  partnerships: {
    card: 'bg-[#f7f4e8] text-black border border-lime-100',
    icon: 'text-lime-600',
    arrow: 'text-lime-600',
    detail: 'text-black/50',
  },
  magazine: {
    card: 'bg-[#f7f0ea] text-black border border-rose-100',
    icon: 'text-rose-500',
    arrow: 'text-rose-500',
    detail: 'text-black/50',
  },
  notifications: {
    card: 'bg-[#f7edfb] text-black border border-fuchsia-100',
    icon: 'text-fuchsia-500',
    arrow: 'text-fuchsia-500',
    detail: 'text-black/52',
  },
  settings: {
    card: 'bg-[#eef1f7] text-black border border-slate-100',
    icon: 'text-slate-600',
    arrow: 'text-slate-600',
    detail: 'text-black/50',
  },
}

export default function MemberDashboardPage() {
  const [state, setState] = useState<MemberHubState | null>(null)
  const [activeSection, setActiveSection] = useState<DashboardSection>('home')
  const [directoryFocus, setDirectoryFocus] = useState<DirectoryFocus>('awardees')
  const [sectionPreview, setSectionPreview] = useState<DashboardSection | null>(null)
  const [saved, setSaved] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [featureSaved, setFeatureSaved] = useState(false)
  const [featureError, setFeatureError] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const next = await fetchMemberHubState()
      setState(next)
      setLoadError('')
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load your workspace.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const member = useMemo(() => {
    if (!state) return null
    return state.members.find((item) => item.id === state.currentMemberId) || state.members[0] || null
  }, [state])

  function openSection(section: DashboardSection) {
    setMobileOpen(false)

    if (section === 'featured') {
      setSectionPreview('featured')
      return
    }

    setSectionPreview(null)

    if (section === 'messages') {
      setActiveSection('messages')
      setDirectoryFocus('messages')
      return
    }

    setDirectoryFocus('awardees')
    setActiveSection(section)
  }

  async function syncPublicAwardeeProfile(member: MemberProfile, patch: Partial<MemberProfile>) {
    if (!member.awardeeId) return

    const response = await fetch('/api/awardees/self-update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: member.awardeeId,
        headline: patch.headline,
        tagline: patch.field,
        bio: patch.bio,
      }),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(result?.message || 'Could not update the public awardee BIO.')
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!member) return

    const form = new FormData(event.currentTarget)
    const patch = {
      headline: String(form.get('headline') || ''),
      bio: String(form.get('bio') || ''),
      location: String(form.get('location') || ''),
      organization: String(form.get('organization') || ''),
      field: String(form.get('field') || ''),
      emailVisible: form.get('emailVisible') === 'on',
      recruiterVisible: form.get('recruiterVisible') === 'on',
      showInDirectory: form.get('showInDirectory') === 'on',
      allowDirectMessages: form.get('allowDirectMessages') === 'on',
      opportunityAlerts: form.get('opportunityAlerts') === 'on',
      magazineAlerts: form.get('magazineAlerts') === 'on',
      messageAlerts: form.get('messageAlerts') === 'on',
      eventReminders: form.get('eventReminders') === 'on',
      hideEmailFromRecruiters: form.get('hideEmailFromRecruiters') === 'on',
      requireProfileApproval: form.get('requireProfileApproval') === 'on',
      securityEmails: form.get('securityEmails') === 'on',
    }

    try {
      setProfileError('')
      setSavingProfile(true)
      await updateMemberProfile(member.id, patch)
      await syncPublicAwardeeProfile(member, patch)

      setSaved(true)
      await refresh()
      toast.success('Saved. Your BIO update is queued for review.')
      window.setTimeout(() => setSaved(false), 2200)
    } catch (error) {
      setSaved(false)
      const message = error instanceof Error ? error.message : 'Could not save this BIO update.'
      setProfileError(message)
      toast.error(message)
      await refresh()
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleFeatureSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!member) return

    const formEl = event.currentTarget
    const form = new FormData(formEl)
    const title = String(form.get('title') || '').trim()
    const summary = String(form.get('summary') || '').trim()
    const category = String(form.get('category') || 'bio') as 'bio' | 'story' | 'product' | 'project'

    if (!title || !summary) {
      setFeatureSaved(false)
      setFeatureError('Add a title and short summary before submitting.')
      toast.error('Add a title and short summary before submitting.')
      return
    }

    try {
      setFeatureError('')
      await createFeatureSubmission({
        memberId: member.id,
        memberName: member.name,
        title,
        category,
        summary,
        contactEmail: member.email,
      })

      setFeatureSaved(true)
      await refresh()
      formEl.reset()
      toast.success('Sent to the admin team for review.')
      window.setTimeout(() => setFeatureSaved(false), 2400)
    } catch (error) {
      setFeatureSaved(false)
      const message = error instanceof Error ? error.message : 'Could not submit this feature request.'
      setFeatureError(message)
      toast.error(message)
    }
  }

  async function handleReadNotification(notificationId: string) {
    if (!member) return
    await markNotificationRead(notificationId, member.id)
    await refresh()
    toast.success('Marked as read.')
  }

  if (loading) {
    return (
      <section className="grid min-h-[100dvh] place-items-center bg-[#fffaf4] px-4">
        <div className="text-center">
          <div className="mx-auto mb-3 inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-orange-500" />
          <p className="text-sm font-semibold text-black/60">Loading your workspace...</p>
        </div>
      </section>
    )
  }

  if (!state || !member) {
    return (
      <section className="grid min-h-[100dvh] place-items-center bg-[#fffaf4] px-4">
        <Card className="w-full max-w-xl rounded-[28px] border-orange-100 bg-white text-center shadow-none">
          <CardContent className="space-y-5 p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 text-xl font-bold text-[#fffaf0]">
              AF
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-black">Awardee workspace</h1>
            <p className="text-sm font-semibold text-black/60">
              {loadError || 'Create an invite-only account to continue.'}
            </p>
            <Button asChild className="rounded-full bg-orange-500 px-7 text-[#fffaf0] hover:bg-orange-600">
              <Link href="/auth/signup">Create account</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="min-h-[100dvh] bg-[#fffaf4] text-black">
      <div className="grid min-h-[100dvh] lg:grid-cols-[264px_1fr]">
        <aside className="hidden border-r border-orange-100 bg-white lg:block">
          <DashboardSidebar activeSection={activeSection} member={member} onNavigate={openSection} />
        </aside>

        <div className="flex min-w-0 flex-col">
          <MobileDashboardBar
            activeSection={activeSection}
            member={member}
            onNavigate={openSection}
            onOpenChange={setMobileOpen}
            open={mobileOpen}
          />

          <main className="flex-1 bg-[linear-gradient(180deg,#fffaf4_0%,#ffffff_36%,#fffaf4_100%)] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <div className="mx-auto max-w-6xl">
              {activeSection === 'home' && <HomeSection member={member} onNavigate={openSection} state={state} />}
              {activeSection === 'profile' && <ProfileSection error={profileError} member={member} onSubmit={handleProfileSubmit} saved={saved} saving={savingProfile} />}
              {activeSection === 'directory' && <DirectorySection focus={directoryFocus} />}
              {activeSection === 'messages' && <DirectorySection focus="messages" />}
              {activeSection === 'opportunities' && <OpportunitiesSection state={state} />}
              {activeSection === 'featured' && <FeaturedSection error={featureError} onSubmit={handleFeatureSubmit} saved={featureSaved} />}
              {activeSection === 'events' && <EventsSection />}
              {activeSection === 'partnerships' && <PartnershipsSection />}
              {activeSection === 'magazine' && <MagazineSection />}
              {activeSection === 'notifications' && <NotificationsSection member={member} onRead={handleReadNotification} state={state} />}
              {activeSection === 'settings' && <SettingsSection error={profileError} member={member} onSubmit={handleProfileSubmit} saved={saved} saving={savingProfile} />}
            </div>
          </main>
        </div>
      </div>
      <FeaturedPreviewModal
        open={sectionPreview === 'featured'}
        onContinue={() => {
          setSectionPreview(null)
          setActiveSection('featured')
        }}
      />
    </section>
  )
}

function DashboardSidebar({
  activeSection,
  member,
  onNavigate,
}: {
  activeSection: DashboardSection
  member: MemberProfile
  onNavigate: (section: DashboardSection) => void
}) {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="rounded-[24px] border border-orange-100 bg-white p-3">
        <Image
          src="/Top100 Africa Future leaders Logo .png"
          alt="Top100 Africa Future Leaders"
          width={136}
          height={44}
          className="h-11 w-auto object-contain"
          priority
        />
      </div>

      <div className="mt-4 rounded-[24px] bg-orange-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-base font-bold text-[#fffaf0]">
            {member.avatarInitials}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-black">{member.name}</h2>
            <p className="truncate text-xs font-medium text-black/50">{member.status}</p>
          </div>
        </div>
      </div>

      <nav className="mt-5 space-y-1.5">
        {dashboardNav.map((item) => (
          <SideNavButton key={item.id} active={activeSection === item.id} item={item} onClick={() => onNavigate(item.id)} />
        ))}
      </nav>
    </div>
  )
}

function MobileDashboardBar({
  activeSection,
  member,
  onNavigate,
  onOpenChange,
  open,
}: {
  activeSection: DashboardSection
  member: MemberProfile
  onNavigate: (section: DashboardSection) => void
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const active = dashboardNav.find((item) => item.id === activeSection)

  return (
    <header className="flex h-[74px] items-center justify-between border-b border-orange-100 bg-white px-4 lg:hidden">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">Dashboard</p>
        <h1 className="text-xl font-bold text-black">{active?.title || 'Home'}</h1>
      </div>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button aria-label="Open dashboard navigation" className="h-12 w-12 rounded-2xl bg-[#050505] p-0 text-[#fffaf0] hover:bg-[#171717]">
            <Menu className="h-6 w-6" strokeWidth={2.8} />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[86vw] max-w-sm border-r border-orange-100 bg-white p-0 text-black">
          <h2 className="sr-only">Dashboard navigation</h2>
          <DashboardSidebar activeSection={activeSection} member={member} onNavigate={onNavigate} />
        </SheetContent>
      </Sheet>
    </header>
  )
}

function HomeSection({
  member,
  onNavigate,
  state,
}: {
  member: MemberProfile
  onNavigate: (section: DashboardSection) => void
  state: MemberHubState
}) {
  const visibleCards = dashboardNav.filter((item) => !['home', 'profile', 'settings'].includes(item.id))
  const latestNotifications = state.notifications
    .filter((notification) => notification.status === 'sent' && (notification.audience === 'all' || member.status === 'approved'))
    .slice(0, 3)

  return (
    <div className="space-y-5">
      <section className="rounded-[30px] border border-orange-100 bg-white p-6 text-black sm:p-8">
        <div className="flex min-h-[180px] flex-col justify-between gap-8">
          <div className="w-fit rounded-full bg-orange-50 px-4 py-2 text-xs font-semibold tracking-[0.18em] text-orange-600">
            MEMBER WORKSPACE
          </div>
          <div>
            <h2 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">Welcome, {member.name.split(' ')[0]}.</h2>
            <p className="mt-3 max-w-xl text-base font-semibold leading-7 text-black/60">
              Complete your BIO, review opportunities, and stay visible in the awardee network.
            </p>
          </div>
        </div>
      </section>

      <section className="grid auto-rows-[190px] gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visibleCards.map((item) => (
          <DashboardActionCard key={item.id} item={item} onClick={() => onNavigate(item.id)} />
        ))}
      </section>

      <section className="rounded-[30px] border border-orange-100 bg-white p-5 text-black sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Notifications</p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight">Latest admin updates</h3>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-orange-200 bg-white text-black hover:bg-orange-50"
            onClick={() => onNavigate('notifications')}
          >
            View all
            <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.8} />
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {latestNotifications.length > 0 ? latestNotifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              className="rounded-2xl border border-orange-100 bg-[#fffaf4] p-4 text-left transition hover:border-orange-300"
              onClick={() => onNavigate('notifications')}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">{formatDashboardDate(notification.createdAt)}</p>
              <h4 className="mt-2 text-base font-bold text-black">{notification.title}</h4>
              <p className="mt-1 line-clamp-2 text-sm font-medium leading-6 text-black/55">{notification.message}</p>
            </button>
          )) : (
            <div className="rounded-2xl border border-dashed border-orange-200 bg-[#fffaf4] p-4 text-sm font-semibold text-black/50">
              No admin updates yet.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function ProfileSection({
  error,
  member,
  onSubmit,
  saved,
  saving,
}: {
  error: string
  member: MemberProfile
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
  saved: boolean
  saving: boolean
}) {
  const updatesRemaining = Math.max(0, member.bioUpdateLimit - member.bioUpdateCount)

  return (
    <SectionShell icon={FilePenLine} title="BIO and profile">
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-black">Public profile sync</p>
            <p className="text-xs font-medium text-black/55">BIO edits update your awardee profile record.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {member.publicSlug ? (
              <Button asChild variant="outline" className="h-9 rounded-full border-orange-200 bg-white text-sm text-black hover:bg-white">
                <Link href={`/awardees/${member.publicSlug}`}>View profile</Link>
              </Button>
            ) : null}
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-orange-700">
              {updatesRemaining} of {member.bioUpdateLimit} updates left
            </span>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Headline" name="headline" defaultValue={member.headline} placeholder="Founder, researcher, changemaker" />
          <Field label="Field" name="field" defaultValue={member.field} placeholder="Education, climate, health" />
          <Field label="Location" name="location" defaultValue={member.location} placeholder="City, country" />
          <Field label="Organization" name="organization" defaultValue={member.organization} placeholder="Company or institution" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio" className="font-semibold text-black">BIO</Label>
          <Textarea id="bio" name="bio" defaultValue={member.bio} placeholder="Write a concise awardee BIO for review." className="min-h-44 rounded-3xl border-orange-100 text-base text-black placeholder:text-black/40" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <VisibilitySwitch name="recruiterVisible" label="Recruiter visibility" defaultChecked={member.recruiterVisible} />
          <VisibilitySwitch name="emailVisible" label="Show email on profile" defaultChecked={member.emailVisible} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={updatesRemaining === 0 || saving} className="rounded-full bg-orange-500 px-8 py-6 text-[#fffaf0] hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-200 disabled:text-black/45">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Submit BIO'
            )}
          </Button>
          {saved ? <span className="text-sm font-semibold text-black" role="status">Saved for review.</span> : null}
          {error ? <span className="text-sm font-semibold text-orange-700" role="alert">{error}</span> : null}
        </div>
      </form>
    </SectionShell>
  )
}

function DirectorySection({ focus = 'awardees' }: { focus?: DirectoryFocus }) {
  const [awardees, setAwardees] = useState<Awardee[]>([])
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const inboxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadAwardees() {
      try {
        const response = await fetch('/api/awardees', { cache: 'no-store' })
        const payload = response.ok ? await response.json() : []
        if (!cancelled) {
          setAwardees(Array.isArray(payload) ? payload : [])
        }
      } catch {
        if (!cancelled) setAwardees([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadAwardees()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (focus === 'messages') {
      window.requestAnimationFrame(() => {
        inboxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [focus])

  const filteredAwardees = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return awardees.filter((awardee) => {
      const matchesYear = selectedYear === 'all' || Number(awardee.year) === selectedYear
      const haystack = [
        awardee.name,
        awardee.country || '',
        awardee.headline || '',
        awardee.tagline || '',
        awardee.bio || '',
        awardee.course || '',
        awardee.field_of_study || '',
      ].join(' ').toLowerCase()

      return matchesYear && (!term || haystack.includes(term))
    })
  }, [awardees, searchTerm, selectedYear])

  const visibleAwardees = filteredAwardees.slice(0, 36)

  return (
    <SectionShell hideIcon icon={Search} title="Awardee directory">
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-3xl font-bold">Fellow Africa Future Leaders.</h3>
            <p className="mt-2 max-w-xl text-base font-medium text-black/60">
              Browse the awardee list by cohort without leaving your dashboard.
            </p>
          </div>
          <div className="rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
            {loading ? 'Loading leaders' : `${filteredAwardees.length} leaders shown`}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {directoryCohorts.map((cohort) => (
            <button
              key={cohort.year}
              type="button"
              onClick={() => setSelectedYear(Number(cohort.year))}
              aria-pressed={selectedYear === Number(cohort.year)}
              className={cn(
                'group flex min-h-[122px] flex-col justify-between rounded-[22px] border p-4 text-left text-black transition hover:-translate-y-0.5',
                cohort.surface,
                selectedYear === Number(cohort.year) ? 'border-black/15 ring-1 ring-black/10' : 'border-black/5',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="w-fit rounded-full border border-black/10 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-black/45">
                  Cohort
                </span>
                <ArrowRight className="mt-0.5 h-4 w-4 text-black/30 transition group-hover:translate-x-1" strokeWidth={2.4} />
              </div>
              <div>
                <h4 className="text-2xl font-semibold tracking-tight">{cohort.title}</h4>
                <p className="mt-2 text-base font-medium text-black/50">Filter list</p>
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-[28px] border border-orange-100 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedYear('all')}
                aria-pressed={selectedYear === 'all'}
                className={cn(
                  'rounded-full px-4 py-2.5 text-sm font-semibold transition',
                  selectedYear === 'all' ? 'bg-[#050505] text-[#fffaf0]' : 'bg-orange-50 text-black hover:bg-orange-100',
                )}
              >
                All cohorts
              </button>
            </div>
            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" strokeWidth={2.8} />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search name, country, field..."
                aria-label="Search awardees by name, country, or field"
                className="h-12 rounded-full border-black/10 pl-11 text-base text-black placeholder:text-black/35"
              />
            </div>
          </div>

        <div id="top-awardee-list" className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleAwardees.map((awardee) => (
              <article key={awardee.awardee_id || awardee.slug} className="rounded-[22px] border border-black/5 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#050505] text-sm font-bold text-[#fffaf0]">
                    {getInitials(awardee.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-[17px] font-bold text-black">{awardee.name}</h4>
                    <p className="mt-1 line-clamp-2 text-[15px] font-medium leading-6 text-black/55">
                      {awardee.headline || awardee.tagline || awardee.bio || 'Africa Future Leader'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {awardee.country ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black/65">
                      <MapPin className="h-3.5 w-3.5" strokeWidth={2.8} />
                      {awardee.country}
                    </span>
                  ) : null}
                  {awardee.year ? (
                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-orange-700">
                      {awardee.year}
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button asChild className="h-10 rounded-full border border-black/10 bg-[#f5f5f2] px-4 text-sm font-semibold text-black/80 shadow-none hover:bg-white">
                    <Link href={`/awardees/${awardee.slug}`} prefetch>
                      View BIO
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-10 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-black/75 shadow-none hover:bg-[#fafafa]">
                    <Link href="/dashboard#directory-mail" prefetch={false}>
                      Message
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>

          {!loading && visibleAwardees.length === 0 ? (
            <div className="mt-4 rounded-[22px] border border-dashed border-black/10 bg-white p-8 text-center text-sm font-semibold text-black/50">
              No awardees match this filter yet.
            </div>
          ) : null}

          {filteredAwardees.length > visibleAwardees.length ? (
            <p className="mt-4 text-center text-sm font-semibold text-black/45">
              Showing first {visibleAwardees.length} of {filteredAwardees.length}. Search to narrow the list.
            </p>
          ) : null}
        </div>

        <div ref={inboxRef} id="directory-mail" className="rounded-[28px] border border-orange-100 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Direct contact</p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight text-black">Recent conversations</h3>
              <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-black/60">
                Messages now live inside the directory so you can browse awardees and open conversations in the same place.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-full border-orange-200 bg-white text-black hover:bg-orange-50">
              <Link href="/dashboard#directory-mail">Open inbox</Link>
            </Button>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-3">
              {[
                { name: 'Samuel Adebayo', note: 'Direct member thread', initials: 'SA' },
                { name: 'Zainab Bello', note: 'Direct member thread', initials: 'ZB' },
                { name: 'Africa Future Leaders Team', note: 'Network updates and admin notices', initials: 'AF' },
              ].map((thread) => (
                <div key={thread.name} className="flex items-center gap-3 rounded-2xl border border-black/5 bg-[#fffaf4] p-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#050505] text-sm font-semibold text-[#fffaf0]">
                    {thread.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-black">{thread.name}</span>
                    <span className="block truncate text-xs font-medium text-black/50">{thread.note}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-black/35" strokeWidth={2.4} />
                </div>
              ))}
            </div>

            <div className="rounded-[24px] border border-orange-100 bg-[#fffaf4] p-4">
              <div className="rounded-[20px] border border-dashed border-orange-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">Quick route</p>
                <h4 className="mt-2 text-lg font-bold tracking-tight text-black">Browse, then message.</h4>
                <p className="mt-2 text-sm font-medium leading-6 text-black/55">
                  Open a profile from the awardee list and jump back here to continue the conversation.
                </p>
              </div>
              <Button asChild className="mt-4 w-full rounded-full bg-[#050505] px-7 py-5 text-[#fffaf0] hover:bg-[#171717]">
                <Link href="/dashboard#top-awardee-list">
                  Back to awardees
                  <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.8} />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  )
}

type OpportunitiesApiResponse = {
  opportunities?: HubOpportunity[]
  source?: string
  mode?: 'live' | 'fallback'
  message?: string
}

function OpportunitiesSection({ state }: { state: MemberHubState }) {
  const [opportunities, setOpportunities] = useState<HubOpportunity[]>(state.opportunities)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadOpportunities() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/opportunities', { cache: 'no-store' })
      const result = await response.json().catch(() => null) as OpportunitiesApiResponse | null

      if (!response.ok) {
        throw new Error(result?.message || 'Could not load opportunities.')
      }

      setOpportunities(result?.opportunities?.length && result.opportunities.length >= 4 ? result.opportunities : state.opportunities)
    } catch (opportunityError) {
      setOpportunities(state.opportunities)
      setError(opportunityError instanceof Error ? opportunityError.message : 'Could not load opportunities.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOpportunities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <SectionShell icon={BriefcaseBusiness} title="Opportunities">
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Member hub</p>
            <h3 className="mt-2 text-3xl font-bold tracking-tight text-black">Live opportunities and programs.</h3>
            <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-black/60">
              Keep the feed moving while new listings load in from the opportunity hub.
            </p>
          </div>
          <Button
            variant="outline"
            className="h-11 rounded-full border-orange-200 bg-white text-black hover:bg-orange-50"
            onClick={loadOpportunities}
            disabled={loading}
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            {loading ? 'Refreshing' : 'Refresh'}
          </Button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm font-semibold text-orange-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {opportunities.map((opportunity, index) => (
            <div key={opportunity.id} className={cn('rounded-[28px] p-6 text-black', index % 3 === 0 ? 'bg-orange-500' : index % 3 === 1 ? 'bg-[#f5f4f0]' : 'bg-[#fff2e2] border border-orange-100')}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold tracking-[0.18em] text-black/55">{opportunity.type.toUpperCase()}</p>
                <span className="rounded-full bg-[#fffaf0] px-3 py-1 text-xs font-semibold text-black">
                  {loading ? 'Loading' : 'Available'}
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-bold">{opportunity.title}</h3>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#fffaf0] px-4 py-2 text-sm font-semibold text-black">{opportunity.location}</span>
                <span className="rounded-full bg-[#fffaf0] px-4 py-2 text-sm font-semibold text-black">{opportunity.deadline}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  )
}

function FeaturedSection({
  error,
  onSubmit,
  saved,
}: {
  error: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  saved: boolean
}) {
  return (
    <SectionShell icon={Sparkles} title="Get featured">
      <div className="max-w-3xl">
        <form onSubmit={onSubmit} className="rounded-[28px] border border-orange-100 bg-white p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Magazine and homepage</p>
          <h3 className="mt-3 text-3xl font-bold tracking-tight text-black">Submit a story for admin review.</h3>
          <p className="mt-2 text-sm font-medium leading-6 text-black/60">
            Share a BIO update, awardee story, product, or project. Admin reviews and moves approved stories into editorial.
          </p>

          <div className="mt-6 grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="feature-title" className="font-semibold text-black">Feature title</Label>
              <Input id="feature-title" name="title" placeholder="e.g. My climate project for rural schools" className="h-14 rounded-2xl border-orange-100 text-black" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feature-category" className="font-semibold text-black">Category</Label>
              <select
                id="feature-category"
                name="category"
                defaultValue="bio"
                className="h-14 w-full rounded-2xl border border-orange-100 bg-white px-4 text-sm font-semibold text-black outline-none"
              >
                <option value="bio">BIO/profile spotlight</option>
                <option value="story">Awardee story</option>
                <option value="product">Product/startup</option>
                <option value="project">Impact project</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feature-summary" className="font-semibold text-black">Summary</Label>
              <Textarea id="feature-summary" name="summary" placeholder="Tell the magazine team what should be featured." className="min-h-36 rounded-3xl border-orange-100 text-black" />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button className="rounded-full bg-orange-500 px-8 py-6 text-[#fffaf0] hover:bg-orange-600">
              Submit to admin
              <Send className="ml-2 h-4 w-4" strokeWidth={2.8} />
            </Button>
            {saved ? <span className="text-sm font-semibold text-black" role="status">Sent to admin.</span> : null}
            {error ? <span className="text-sm font-semibold text-orange-700" role="alert">{error}</span> : null}
          </div>
        </form>
      </div>
    </SectionShell>
  )
}

function FeaturedPreviewModal({
  open,
  onContinue,
}: {
  open: boolean
  onContinue: () => void
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-xl rounded-[32px] border border-white/20 bg-[#fffaf4] p-6 text-black shadow-[0_30px_120px_rgba(0,0,0,0.28)]"
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <div className="flex items-start gap-4">
              <motion.div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-orange-500 text-[#fffaf0]"
                animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.04, 1] }}
                transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
              >
                <SparklesIcon className="h-8 w-8" strokeWidth={1.9} />
              </motion.div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Magazine and homepage</p>
                <h3 className="mt-2 text-3xl font-bold tracking-tight text-black">Submit a story for admin review.</h3>
                <p className="mt-3 text-sm font-medium leading-7 text-black/62">
                  Share a BIO update, awardee story, product, or project. Admin reviews every request before it is featured on the homepage or magazine.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button onClick={onContinue} className="rounded-full bg-orange-500 px-7 py-6 text-[#fffaf0] hover:bg-orange-600">
                Continue
                <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.8} />
              </Button>
              <p className="text-sm font-semibold text-black/50">You’ll enter the feature submission form after continue.</p>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

type DashboardEvent = {
  id: string
  title: string
  summary?: string
  start_at?: string
  registration_url?: string
  registration_label?: string
  cover?: string
}

function EventsSection() {
  const [events, setEvents] = useState<DashboardEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadEvents() {
      try {
        const response = await fetch('/api/events', { cache: 'no-store' })
        const payload = response.ok ? await response.json() : []
        if (!cancelled) setEvents(Array.isArray(payload) ? payload.slice(0, 6) : [])
      } catch {
        if (!cancelled) setEvents([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadEvents()
    return () => {
      cancelled = true
    }
  }, [])

  const fallbackEvents: DashboardEvent[] = [
    {
      id: 'event-fallback-1',
      title: 'Talk100 Live',
      summary: 'Monthly conversations with African future leaders and partners.',
      start_at: '2026-07-12T18:00:00.000Z',
      registration_url: '/events',
      registration_label: 'Join program',
      cover: '/top100-africa-future-leaders-2024-magazine-cover-w.jpg',
    },
    {
      id: 'event-fallback-2',
      title: 'Future Leaders Summit',
      summary: 'Leadership, capital, media, and collaboration sessions for awardees.',
      start_at: '2026-09-20T10:00:00.000Z',
      registration_url: '/events',
      registration_label: 'View details',
      cover: '/magazine-cover-2025.jpg',
    },
  ]
  const visibleEvents = events.length > 0 ? events : fallbackEvents
  const fallbackCovers = ['/top100-africa-future-leaders-2024-magazine-cover-w.jpg', '/magazine-cover-2025.jpg', '/young-african-man-business-leader.jpg']

  return (
    <SectionShell icon={CalendarDays} title="Events">
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-3xl font-bold tracking-tight text-black">Latest events and programs.</h3>
            <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-black/60">
              Browse upcoming summits, live sessions, and community programs from the main events hub.
            </p>
          </div>
          <Button asChild className="rounded-full bg-[#050505] px-7 py-6 text-[#fffaf0] hover:bg-[#171717]">
            <Link href="/events">
              Open events hub
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.8} />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {visibleEvents.map((event, index) => (
            <article key={event.id} className="relative min-h-[250px] overflow-hidden rounded-[28px] border border-orange-100 bg-black p-6 text-white">
              <Image
                src={event.cover || fallbackCovers[index % fallbackCovers.length]}
                alt={event.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority={index === 0}
              />
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,0,0,0.84)_0%,rgba(0,0,0,0.58)_46%,rgba(0,0,0,0.82)_100%)]" />
              <div className="relative z-10 flex h-full min-h-[250px] flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">{formatDashboardDate(event.start_at)}</p>
                  <h4 className="mt-4 text-2xl font-bold tracking-tight">{event.title}</h4>
                  <p className="mt-2 max-w-md text-sm font-medium leading-6 text-white/72">
                    {event.summary || 'Program details from the Africa Future Leaders events hub.'}
                  </p>
                </div>
                <div className="mt-6">
                  <Button asChild className="rounded-full bg-white px-6 py-5 text-black hover:bg-white/90">
                    <Link href={event.registration_url || '/events'}>
                      {event.registration_label || 'Join event'}
                      <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.8} />
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {loading ? <p className="text-sm font-semibold text-black/50">Loading live events...</p> : null}
      </div>
    </SectionShell>
  )
}

function PartnershipsSection() {
  const partnerRoutes = [
    { title: 'Become a partner', href: '/partnership', text: 'Sponsor, support, or co-create programs.' },
    { title: 'View current partners', href: '/', text: 'See the organizations supporting the mission.' },
    { title: 'Volunteer with us', href: '/apply/volunteer', text: 'Join activations, research, and community work.' },
  ]

  return (
    <SectionShell icon={Handshake} title="Partnerships">
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[28px] bg-orange-500 p-6 text-black">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/60">Partner pathway</p>
          <h3 className="mt-3 text-3xl font-bold tracking-tight">Join the ecosystem.</h3>
          <p className="mt-2 text-sm font-medium leading-6 text-black/65">
            Awardees can introduce partners, apply as collaborators, or explore current Africa Future Leaders partnerships.
          </p>
        </div>
        <div className="grid gap-3">
          {partnerRoutes.map((route) => (
            <Link key={route.title} href={route.href} className="group rounded-[24px] border border-orange-100 bg-white p-5 transition hover:border-orange-300">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xl font-bold tracking-tight text-black">{route.title}</h4>
                  <p className="mt-1 text-sm font-medium text-black/55">{route.text}</p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 transition group-hover:translate-x-1" strokeWidth={2.8} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </SectionShell>
  )
}

function NotificationsSection({
  member,
  onRead,
  state,
}: {
  member: MemberProfile
  onRead: (notificationId: string) => void
  state: MemberHubState
}) {
  const notifications = state.notifications.filter((notification) =>
    notification.status === 'sent' && (notification.audience === 'all' || member.status === 'approved'),
  )

  return (
    <SectionShell icon={Megaphone} title="Notifications">
      <div className="space-y-4">
        <div className="rounded-[28px] bg-orange-500 p-6 text-black">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/60">Admin broadcast</p>
          <h3 className="mt-3 text-3xl font-bold tracking-tight">Updates from the AFL team.</h3>
          <p className="mt-2 text-sm font-medium leading-6 text-black/65">
            Admin can send announcements, deadlines, event reminders, and magazine calls directly to awardees.
          </p>
        </div>

        <div className="grid gap-3">
          {notifications.length > 0 ? notifications.map((notification) => {
            const read = notification.readBy.includes(member.id)
            return (
              <div key={notification.id} className="rounded-[24px] border border-orange-100 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">{formatDashboardDate(notification.createdAt)}</p>
                    <h4 className="mt-2 text-xl font-bold tracking-tight text-black">{notification.title}</h4>
                    <p className="mt-2 text-sm font-medium leading-6 text-black/60">{notification.message}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-orange-200 bg-white text-black hover:bg-orange-50"
                    onClick={() => onRead(notification.id)}
                    disabled={read}
                  >
                    {read ? 'Read' : 'Mark read'}
                  </Button>
                </div>
              </div>
            )
          }) : (
            <div className="rounded-[24px] border border-orange-100 bg-white p-5 text-sm font-semibold text-black/55">
              No admin notifications yet.
            </div>
          )}
        </div>
      </div>
    </SectionShell>
  )
}

function MagazineSection() {
  return (
    <SectionShell icon={Newspaper} title="Magazine">
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-3xl font-bold tracking-tight text-black">Magazine library.</h3>
            <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-black/60">
              Read or download any edition, then apply to feature your story, startup, project, or product.
            </p>
          </div>
          <Button asChild className="rounded-full bg-[#050505] px-7 py-6 text-[#fffaf0] hover:bg-[#171717]">
            <Link href="/magazine">
              Open public library
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.8} />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            {magazineEditions.map((magazine) => (
              <article key={magazine.year} className="overflow-hidden rounded-[28px] border border-orange-100 bg-white">
                <div className="relative min-h-[260px] overflow-hidden bg-black">
                  <Image
                    src={magazine.cover}
                    alt={magazine.title}
                    fill
                    sizes="(min-width: 1024px) 30vw, 100vw"
                    className="object-cover transition duration-500 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.7)_100%)]" />
                  <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">{magazine.year}</span>
                    {magazine.isLatest ? (
                      <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-[#fffaf0]">Latest</span>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-4 p-5">
                  <div>
                    <h4 className="text-xl font-bold tracking-tight text-black">{magazine.title}</h4>
                    <p className="mt-1 text-sm font-medium text-black/55">{magazine.subtitle}</p>
                    <p className="mt-2 text-sm font-medium leading-6 text-black/60">{magazine.description}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button asChild className="rounded-full bg-[#050505] text-[#fffaf0] hover:bg-[#171717]">
                      <Link href={magazine.readHref}>
                        Read
                        <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.8} />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-full border-orange-200 text-black hover:bg-orange-50">
                      <Link href={magazine.downloadLink} target="_blank" rel="noopener noreferrer">
                        Download
                        <Download className="ml-2 h-4 w-4" strokeWidth={2.8} />
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="rounded-[28px] bg-orange-500 p-6 text-black">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/60">Feature request</p>
            <h3 className="mt-3 text-3xl font-bold tracking-tight">Apply to feature in the magazine.</h3>
            <p className="mt-2 text-sm font-medium leading-6 text-black/65">
              Submit your BIO, founder story, product, research, impact project, or startup for magazine team review.
            </p>
            <div className="mt-6 grid gap-3">
              {['Awardee story', 'Product or startup', 'Impact project', 'Research or article'].map((item) => (
                <div key={item} className="rounded-2xl bg-[#fffaf0] px-4 py-3 text-sm font-semibold text-black">
                  {item}
                </div>
              ))}
            </div>
            <Button asChild className="mt-7 rounded-full bg-[#050505] px-7 py-6 text-[#fffaf0] hover:bg-[#171717]">
              <Link href="/partnership">
                Apply to feature
                <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.8} />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </SectionShell>
  )
}

function SettingsSection({
  error,
  member,
  onSubmit,
  saved,
  saving,
}: {
  error: string
  member: MemberProfile
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
  saved: boolean
  saving: boolean
}) {
  const updatesRemaining = Math.max(0, member.bioUpdateLimit - member.bioUpdateCount)

  return (
    <SectionShell icon={Settings} title="Settings">
      <form onSubmit={onSubmit} className="space-y-5">
        <input type="hidden" name="headline" value={member.headline} />
        <input type="hidden" name="field" value={member.field} />
        <input type="hidden" name="location" value={member.location} />
        <input type="hidden" name="organization" value={member.organization} />
        <input type="hidden" name="bio" value={member.bio} />

        <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
          <div className="rounded-[28px] border border-orange-100 bg-white p-5">
            <SettingsGroupHeader
              icon={Eye}
              eyebrow="Visibility"
              title="Control how other members and recruiters see you."
            />
            <div className="mt-4 grid gap-3">
              <VisibilitySwitch name="recruiterVisible" label="Recruiter visibility" defaultChecked={member.recruiterVisible} />
              <VisibilitySwitch name="emailVisible" label="Show email on profile" defaultChecked={member.emailVisible} />
              <SettingsToggle
                name="showInDirectory"
                label="Show profile in awardee directory"
                description="Keep your public profile discoverable by fellow Africa Future Leaders."
                defaultChecked={member.showInDirectory}
              />
              <SettingsToggle
                name="allowDirectMessages"
                label="Allow direct message requests"
                description="Let approved awardees start a conversation from your profile."
                defaultChecked={member.allowDirectMessages}
              />
            </div>
          </div>

          <div className="rounded-[28px] bg-orange-500 p-5 text-black">
            <SettingsGroupHeader
              icon={ShieldCheck}
              eyebrow="Account"
              title="Awardee account status"
              inverted
            />
            <div className="mt-5 grid gap-3">
              <SettingsInfoCard label="Account status" value={member.status} />
              <SettingsInfoCard label="BIO review" value={member.profileStatus} />
              <SettingsInfoCard label="Invite code" value={member.inviteCode} />
              <SettingsInfoCard label="BIO updates left" value={`${updatesRemaining} of ${member.bioUpdateLimit}`} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[28px] border border-orange-100 bg-white p-5">
            <SettingsGroupHeader
              icon={Bell}
              eyebrow="Notifications"
              title="Choose the alerts you want from the member hub."
            />
            <div className="mt-4 grid gap-3">
              <SettingsToggle name="opportunityAlerts" label="Opportunity alerts" description="Scholarships, fellowships, grants, and member-only calls." defaultChecked={member.opportunityAlerts} />
              <SettingsToggle name="magazineAlerts" label="Magazine team updates" description="Submission status, feature requests, and new edition notices." defaultChecked={member.magazineAlerts} />
              <SettingsToggle name="messageAlerts" label="Message notifications" description="Inbox updates from fellow awardees and admin." defaultChecked={member.messageAlerts} />
              <SettingsToggle name="eventReminders" label="Event reminders" description="Summits, live sessions, and partner events." defaultChecked={member.eventReminders} />
            </div>
          </div>

          <div className="rounded-[28px] border border-orange-100 bg-white p-5">
            <SettingsGroupHeader
              icon={LockKeyhole}
              eyebrow="Privacy and security"
              title="Keep contact and account access intentional."
            />
            <div className="mt-4 grid gap-3">
              <SettingsToggle name="hideEmailFromRecruiters" label="Hide email from recruiters" description="Recruiters can still request contact through admin." defaultChecked={member.hideEmailFromRecruiters} />
              <SettingsToggle name="requireProfileApproval" label="Require profile approval before publishing" description="Admin review stays on for BIO and major profile changes." defaultChecked={member.requireProfileApproval} />
              <SettingsToggle name="securityEmails" label="Receive security emails" description="Get alerts for account access and important profile changes." defaultChecked={member.securityEmails} />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-orange-100 bg-orange-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-black">BIO/profile updates remaining: {updatesRemaining} of {member.bioUpdateLimit}</p>
              <p className="mt-1 text-sm font-medium text-black/55">Admin can reset this when a member needs more edits.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild variant="outline" className="rounded-full border-orange-200 bg-white px-6 py-6 text-black hover:bg-white">
                <Link href="/auth/signin?from=/dashboard">Change password</Link>
              </Button>
              <Button disabled={updatesRemaining === 0 || saving} className="rounded-full bg-orange-500 px-8 py-6 text-[#fffaf0] hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-200 disabled:text-black/45">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save settings'
                )}
              </Button>
            </div>
          </div>
          {saved ? <p className="mt-3 text-sm font-semibold text-black" role="status">Settings saved.</p> : null}
          {error ? <p className="mt-3 text-sm font-semibold text-orange-700" role="alert">{error}</p> : null}
        </div>
      </form>
    </SectionShell>
  )
}

function SideNavButton({
  active,
  item,
  onClick,
}: {
  active: boolean
  item: NavItem
  onClick: () => void
}) {
  const Icon = item.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition active:scale-[0.98]',
        active ? 'bg-orange-500 text-black' : 'text-black/70 hover:bg-orange-50 hover:text-black',
      )}
    >
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', active ? 'bg-[#050505] text-[#fffaf0]' : 'bg-orange-50 text-black')}>
        <Icon className="h-5 w-5" strokeWidth={2.8} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{item.title}</span>
        <span className={cn('block truncate text-xs font-medium', active ? 'text-black/70' : 'text-black/45')}>{item.label}</span>
      </span>
    </button>
  )
}

function DashboardActionCard({ item, onClick }: { item: NavItem; onClick: () => void }) {
  const Icon = item.icon
  const style = dashboardCardStyles[item.id]

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-[24px] p-5 text-left transition hover:-translate-y-0.5 active:scale-[0.99]',
        item.span,
        style.card,
      )}
    >
      <ArrowRight className={cn('absolute right-5 top-5 h-4 w-4 transition group-hover:translate-x-1', style.arrow)} strokeWidth={2.4} />
      <Icon className={cn('h-7 w-7', style.icon)} strokeWidth={2.1} />
      <h3 className="mt-auto text-xl font-bold tracking-tight">{item.title}</h3>
      <p className={cn('mt-1 text-sm font-medium', style.detail)}>{item.label}</p>
    </button>
  )
}

function SectionShell({
  children,
  hideIcon = false,
  icon: Icon,
  title,
}: {
  children: React.ReactNode
  hideIcon?: boolean
  icon: LucideIcon
  title: string
}) {
  void hideIcon
  void Icon

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-black sm:text-5xl">{title}</h2>
        </div>
      </div>
      <Card className="rounded-[30px] border-orange-100 bg-white shadow-none">
        <CardContent className="p-5 sm:p-7">{children}</CardContent>
      </Card>
    </section>
  )
}

function Field({ defaultValue, label, name, placeholder }: { defaultValue: string; label: string; name: string; placeholder: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="font-semibold text-black">{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} placeholder={placeholder} className="h-14 rounded-2xl border-orange-100 text-base text-black placeholder:text-black/40" />
    </div>
  )
}

function VisibilitySwitch({ defaultChecked, label, name }: { defaultChecked: boolean; label: string; name: string }) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-orange-100 bg-white p-4">
      <span className="text-sm font-semibold text-black">{label}</span>
      <Switch name={name} defaultChecked={defaultChecked} className="data-[state=checked]:bg-orange-500" />
    </label>
  )
}

function SettingsGroupHeader({
  eyebrow,
  icon: Icon,
  inverted = false,
  title,
}: {
  eyebrow: string
  icon: LucideIcon
  inverted?: boolean
  title: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', inverted ? 'bg-[#050505] text-[#fffaf0]' : 'bg-orange-50 text-black')}>
        <Icon className="h-5 w-5" strokeWidth={2.8} />
      </span>
      <span>
        <span className={cn('block text-xs font-semibold uppercase tracking-[0.18em]', inverted ? 'text-black/55' : 'text-orange-600')}>
          {eyebrow}
        </span>
        <span className="mt-1 block text-lg font-bold leading-6 text-black">{title}</span>
      </span>
    </div>
  )
}

function SettingsToggle({
  defaultChecked = false,
  description,
  label,
  name,
}: {
  defaultChecked?: boolean
  description: string
  label: string
  name: string
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-orange-100 bg-[#fffaf4] p-4">
      <span>
        <span className="block text-sm font-semibold text-black">{label}</span>
        <span className="mt-1 block text-xs font-medium leading-5 text-black/50">{description}</span>
      </span>
      <Switch name={name} defaultChecked={defaultChecked} className="shrink-0 data-[state=checked]:bg-orange-500" />
    </label>
  )
}

function SettingsInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#fffaf0] px-4 py-3">
      <p className="text-xs font-medium text-black/50">{label}</p>
      <p className="mt-1 text-sm font-bold capitalize text-black">{value}</p>
    </div>
  )
}

function formatDashboardDate(value?: string) {
  if (!value) return 'Upcoming'

  try {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return 'Upcoming'
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'AF'
}
