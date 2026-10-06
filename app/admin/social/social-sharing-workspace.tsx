'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Check,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  Facebook,
  ImageOff,
  Instagram,
  Linkedin,
  LoaderCircle,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import Image from '@/components/safe-image'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { shareSocialDraft } from '@/lib/admin-social/share'
import { SOCIAL_PLATFORM_LABELS, type PublicAwardee, type SocialPlatform, type SocialShareDraft } from '@/lib/admin-social/types'

const platformIcons = { linkedin: Linkedin, facebook: Facebook, instagram: Instagram }
const platformTone: Record<SocialPlatform, string> = {
  linkedin: 'data-[active=true]:border-[#0a66c2] data-[active=true]:bg-[#0a66c2] data-[active=true]:text-white',
  facebook: 'data-[active=true]:border-[#1877f2] data-[active=true]:bg-[#1877f2] data-[active=true]:text-white',
  instagram: 'data-[active=true]:border-[#a83b73] data-[active=true]:bg-[#a83b73] data-[active=true]:text-white',
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Recently updated' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

async function responseJson(response: Response) {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'Something went wrong. Please try again.')
  return body
}

export default function SocialSharingWorkspace() {
  const [awardees, setAwardees] = useState<PublicAwardee[]>([])
  const [drafts, setDrafts] = useState<SocialShareDraft[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [platform, setPlatform] = useState<SocialPlatform>('linkedin')
  const [query, setQuery] = useState('')
  const [caption, setCaption] = useState('')
  const [postUrl, setPostUrl] = useState('')
  const [postedConfirmed, setPostedConfirmed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [marking, setMarking] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadWorkspace = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [awardeeResponse, draftResponse] = await Promise.all([
        fetch('/api/admin/social/awardees'),
        fetch('/api/admin/social/drafts'),
      ])
      const [awardeeData, draftData] = await Promise.all([responseJson(awardeeResponse), responseJson(draftResponse)])
      setAwardees((awardeeData.awardees ?? []) as PublicAwardee[])
      setDrafts((draftData.drafts ?? []) as SocialShareDraft[])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load Social Sharing.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let current = true
    Promise.all([fetch('/api/admin/social/awardees'), fetch('/api/admin/social/drafts')])
      .then(async ([awardeeResponse, draftResponse]) => Promise.all([responseJson(awardeeResponse), responseJson(draftResponse)]))
      .then(([awardeeData, draftData]) => {
        if (!current) return
        setAwardees((awardeeData.awardees ?? []) as PublicAwardee[])
        setDrafts((draftData.drafts ?? []) as SocialShareDraft[])
      })
      .catch((loadError: unknown) => {
        if (current) setError(loadError instanceof Error ? loadError.message : 'Could not load Social Sharing.')
      })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [])

  const selected = useMemo(() => awardees.find((awardee) => awardee.awardeeId === selectedId) ?? null, [awardees, selectedId])
  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return awardees.filter((awardee) => !needle || `${awardee.name} ${awardee.bio}`.toLocaleLowerCase().includes(needle)).slice(0, 12)
  }, [awardees, query])
  const activeDraft = useMemo(() => drafts.find((draft) => draft.awardeeId === selectedId && draft.platform === platform && draft.status === 'draft') ?? null, [drafts, selectedId, platform])
  const history = useMemo(() => drafts.filter((draft) => draft.status === 'marked_posted').slice(0, 12), [drafts])
  const currentDraft = activeDraft
  const imageUrl = selected ? selected.imageUrl : currentDraft?.publicSnapshot.imageUrl ?? null
  const imageSource = selected ? selected.imageSource : currentDraft?.publicSnapshot.imageSource ?? 'none'

  const selectAwardee = (awardee: PublicAwardee) => {
    setSelectedId(awardee.awardeeId)
    setQuery(awardee.name)
    setCaption(drafts.find((draft) => draft.awardeeId === awardee.awardeeId && draft.platform === platform && draft.status === 'draft')?.caption ?? '')
    setPostUrl('')
    setPostedConfirmed(false)
    setError('')
  }

  const generateCaption = async () => {
    if (!selected) return
    setGenerating(true)
    setError('')
    try {
      const data = await responseJson(await fetch('/api/admin/social/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awardeeId: selected.awardeeId, platform }),
      }))
      setCaption(data.caption)
      if (data.profile) setAwardees((items) => items.map((item) => item.awardeeId === data.profile.awardeeId ? data.profile as PublicAwardee : item))
      toast.success('Caption draft ready to review.')
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'Could not generate a caption.')
    } finally {
      setGenerating(false)
    }
  }

  const saveDraft = async (quiet = false): Promise<SocialShareDraft | null> => {
    if (!selected || !caption.trim()) return null
    setSaving(true)
    setError('')
    try {
      const data = await responseJson(await fetch('/api/admin/social/drafts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awardeeId: selected.awardeeId, platform, caption }),
      }))
      const next = data.draft as SocialShareDraft
      setDrafts((current) => [next, ...current.filter((draft) => draft.id !== next.id)])
      if (!quiet) toast.success('Draft saved with the latest public profile details.')
      return next
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save draft.')
      return null
    } finally {
      setSaving(false)
    }
  }

  const refreshSelectedProfile = async () => {
    if (!selected) return
    setRefreshing(true)
    setError('')
    try {
      const data = await responseJson(await fetch(`/api/admin/social/awardees?awardeeId=${encodeURIComponent(selected.awardeeId)}`))
      const latest = (data.awardees ?? [])[0] as PublicAwardee | undefined
      if (!latest) throw new Error('This awardee no longer has a public profile.')
      setAwardees((items) => items.map((item) => item.awardeeId === latest.awardeeId ? latest : item))
      toast.success('Latest public profile details loaded. Regenerate or edit the caption before sharing.')
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Could not refresh the profile.')
    } finally {
      setRefreshing(false)
    }
  }

  const markPosted = async (draft: SocialShareDraft) => {
    if (!postedConfirmed) return
    setMarking(true)
    setError('')
    try {
      const data = await responseJson(await fetch(`/api/admin/social/drafts/${draft.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicPostUrl: postUrl.trim() || null }),
      }))
      const updated = data.draft as SocialShareDraft
      setDrafts((current) => current.map((item) => item.id === updated.id ? updated : item))
      setPostedConfirmed(false)
      setPostUrl('')
      setCaption('')
      toast.success('Saved as marked posted by admin.')
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : 'Could not update share history.')
    } finally {
      setMarking(false)
    }
  }

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied.`)
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}.`)
    }
  }

  const downloadImage = async () => {
    if (!selected || !imageUrl) return
    try {
      const response = await fetch(imageUrl, { mode: 'cors' })
      if (!response.ok) throw new Error()
      const blob = await response.blob()
      const type = blob.type.split(';', 1)[0].trim().toLowerCase()
      const extension = type === 'image/jpeg' ? 'jpg' : type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : null
      if (!extension) throw new Error('Unsupported image type')
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `${selected.slug}-afl-feature.${extension}`
      link.click()
      URL.revokeObjectURL(objectUrl)
      toast.success('Image download started.')
    } catch {
      toast.error('Image could not be downloaded. Check the image storage CORS settings, or open the profile link and save its image.')
    }
  }

  const share = async () => {
    if (!selected || !caption.trim()) return
    setSharing(true)
    let outcome: Awaited<ReturnType<typeof shareSocialDraft>>
    try {
      const data = await responseJson(await fetch(`/api/admin/social/awardees?awardeeId=${encodeURIComponent(selected.awardeeId)}`))
      const latest = (data.awardees ?? [])[0] as PublicAwardee | undefined
      if (!latest) throw new Error('This awardee no longer has a public profile.')
      setAwardees((items) => items.map((item) => item.awardeeId === latest.awardeeId ? latest : item))
      if (currentDraft && currentDraft.snapshotProfileUpdatedAt !== latest.updatedAt) {
        throw new Error('The public profile changed since this draft was saved. Review the latest facts and save the draft before sharing it.')
      }
      outcome = await shareSocialDraft({ caption: caption.trim(), profileUrl: latest.profileUrl, imageUrl: latest.imageUrl })
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : 'Could not refresh this awardee before sharing.')
      setSharing(false)
      return
    } finally {
      setSharing(false)
    }
    if (outcome === 'shared_with_image') toast.success('Your device accepted the caption, profile link, and image. Check that all three are attached before posting.')
    else if (outcome === 'shared') toast.success(imageUrl ? 'Caption and profile link shared. Add the downloaded image before posting.' : 'Caption and profile link shared. Finish in your social app.')
    else if (outcome === 'cancelled') toast('Share cancelled. Your draft is unchanged.')
    else if (outcome === 'unavailable') toast('Use the copy and download options below to share manually.')
    else toast.error('Share did not complete. Your draft is unchanged; use the manual options below.')
  }

  const PlatformIcon = platformIcons[platform]
  const sourceLabel = imageSource === 'portfolio-cover' ? 'Portfolio cover' : imageSource === 'profile-photo' ? 'Profile photo' : 'No public image available'

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
      <section className="min-w-0 space-y-5" aria-label="Create a social profile feature">
        <div className="rounded-2xl border border-[#e7e3dc] bg-white p-4 sm:p-5">
          <label htmlFor="awardee-search" className="mb-2 block text-sm font-medium text-zinc-800">1. Choose a public awardee</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
            <input id="awardee-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setSelectedId('') }} placeholder="Search by name or BIO" className="h-11 w-full rounded-xl border border-[#ddd8cf] bg-white pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-orange-500" />
          </div>
          {!selectedId && query && (
            <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-[#e7e3dc]" role="listbox" aria-label="Awardee results">
              {matches.map((awardee) => (
                <button key={awardee.awardeeId} type="button" role="option" aria-selected="false" onClick={() => selectAwardee(awardee)} className="flex min-h-12 w-full items-center gap-3 border-b border-[#f0ede8] px-3 py-2 text-left last:border-0 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500">
                <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-orange-50 text-orange-800">{awardee.imageUrl ? <Image src={awardee.imageUrl} alt="" fill sizes="36px" unoptimized className="object-cover" /> : <UserRound className="size-4" />}</span>
                  <span className="min-w-0"><span className="block truncate text-sm font-medium text-zinc-900">{awardee.name}</span><span className="block truncate text-xs text-zinc-500">{awardee.bio || 'No public BIO added'}</span></span>
                </button>
              ))}
              {!loading && matches.length === 0 && <p className="p-3 text-sm text-zinc-500">No public awardees match that search.</p>}
            </div>
          )}
          {loading && <p className="mt-2 text-sm text-zinc-500">Loading public awardees…</p>}
          {!loading && !error && awardees.length === 0 && <p className="mt-3 text-sm text-zinc-500">No public awardee profiles are available to feature.</p>}
        </div>

        {selected && <>
      <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(180px,0.8fr)_minmax(0,1.2fr)]">
            <section className="overflow-hidden rounded-2xl border border-[#e7e3dc] bg-white" aria-label="Profile preview">
              <div className="relative aspect-[4/3] bg-[#f5f3ef]">
                {imageUrl ? <Image src={imageUrl} alt={`${selected.name} profile artwork`} fill sizes="(max-width: 768px) 100vw, 32vw" unoptimized className="object-cover" /> : <div className="grid size-full place-items-center text-center text-zinc-400"><div><ImageOff className="mx-auto size-7" /><p className="mt-2 text-xs">No public image</p></div></div>}
                <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-1 text-[11px] text-white">{sourceLabel}</span>
              </div>
              <div className="space-y-2 p-3">
                <p className="font-medium leading-snug text-zinc-900">{selected.name}</p>
                {(selected.headline || selected.fieldOfStudy || selected.country || selected.cohort || selected.year) && <p className="text-xs leading-5 text-zinc-500">{[selected.headline, selected.fieldOfStudy, selected.country, selected.cohort, selected.year].filter(Boolean).join(' · ')}</p>}
                <p className="line-clamp-3 text-sm leading-5 text-zinc-600">{selected.bio || 'This profile does not have a public BIO yet.'}</p>
                {selected.achievements.length > 0 && <div className="rounded-lg bg-orange-50 p-2.5"><p className="text-[11px] font-semibold uppercase tracking-wide text-orange-900">Public achievements used as source facts</p><ul className="mt-1 list-disc pl-4 text-xs leading-5 text-zinc-700">{selected.achievements.slice(0, 3).map((item, index) => <li key={`${item.title}-${index}`}>{item.title}{item.organization ? ` · ${item.organization}` : ''}</li>)}</ul></div>}
                <p className="text-[11px] text-zinc-400">Profile updated {selected.updatedAt ? formatDate(selected.updatedAt) : 'date unavailable'}</p>
                <Button type="button" variant="ghost" size="sm" onClick={refreshSelectedProfile} disabled={refreshing} className="-ml-2 min-h-9 text-xs">{refreshing ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} Refresh current profile</Button>
                <a href={selected.profileUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-[#a13c0b] underline-offset-4 hover:underline">View public profile <ExternalLink className="size-3.5" /></a>
              </div>
            </section>

            <section className="min-w-0 rounded-2xl border border-[#e7e3dc] bg-white p-4 sm:p-5" aria-label="Caption editor">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-sm font-medium text-zinc-800">2. Choose a channel</p><p className="mt-1 text-xs text-zinc-500">The AI creates a draft for you to review.</p></div>
                <Button type="button" variant="outline" size="sm" onClick={generateCaption} disabled={generating || !selected.bio} className="border-orange-200 text-[#8f370d] hover:bg-orange-50">
                  {generating ? <LoaderCircle className="animate-spin" /> : <Sparkles />} {generating ? 'Writing…' : caption ? 'Regenerate' : 'Generate caption'}
                </Button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Social platform">
                {(Object.keys(SOCIAL_PLATFORM_LABELS) as SocialPlatform[]).map((item) => {
                  const Icon = platformIcons[item]
                  return <button key={item} type="button" data-active={platform === item} aria-pressed={platform === item} onClick={() => { setPlatform(item); setCaption(drafts.find((draft) => draft.awardeeId === selectedId && draft.platform === item && draft.status === 'draft')?.caption ?? ''); setPostedConfirmed(false); setPostUrl('') }} className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-[#e7e3dc] px-2 text-xs font-medium text-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:text-sm ${platformTone[item]}`}><Icon className="size-4 shrink-0" /><span className="truncate">{SOCIAL_PLATFORM_LABELS[item]}</span></button>
                })}
              </div>
              <label htmlFor="social-caption" className="mb-2 mt-4 block text-sm font-medium text-zinc-800">3. Review and edit the caption</label>
              <Textarea id="social-caption" value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={5000} placeholder="Generate a caption or write one in your own words…" className="min-h-48 resize-y rounded-xl border-[#ddd8cf] bg-white text-sm leading-6 focus-visible:ring-orange-500" />
              <div className="mt-1 flex justify-between gap-2 text-xs text-zinc-500"><span>Confirm every detail before sharing.</span><span>{caption.length}/5000</span></div>
              {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={() => void saveDraft()} disabled={saving || !caption.trim()} className="min-h-11 bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600">{saving ? <LoaderCircle className="animate-spin" /> : <Check />} Save draft</Button>
                <Button type="button" variant="outline" onClick={share} disabled={sharing || !caption.trim()} className="min-h-11">{sharing ? <LoaderCircle className="animate-spin" /> : <Send />} Share from this device</Button>
              </div>
              <p className="mt-3 text-xs leading-5 text-zinc-500">{imageUrl ? 'The device share sheet can include the profile image when supported. Choose the destination in the share sheet.' : 'No public image is available. The share includes the caption and profile link.'}</p>
            </section>
          </div>

          <section className="rounded-2xl border border-[#e7e3dc] bg-white p-4 sm:p-5" aria-label="Manual sharing options">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-sm font-medium text-zinc-900">Manual options</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Use these if the share sheet or image transfer is unavailable.</p></div><PlatformIcon className="size-5 text-zinc-500" aria-hidden="true" /></div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void copyText(caption, 'Caption')} disabled={!caption.trim()}><Copy /> Copy caption</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void downloadImage()} disabled={!imageUrl}><Download /> Download image</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void copyText(selected.profileUrl, 'Profile link')}><ExternalLink /> Copy profile link</Button>
            </div>
          </section>

          {currentDraft && <section className="rounded-2xl border border-[#e7e3dc] bg-white p-4 sm:p-5" aria-label="Record external share">
            <h2 className="text-sm font-medium text-zinc-900">After you publish</h2>
            <p className="mt-1 text-sm leading-5 text-zinc-600">Record this only after the post is live on {SOCIAL_PLATFORM_LABELS[platform]}. This is an admin-reported note, not platform verification.</p>
            <label htmlFor="public-post-url" className="mb-1 mt-3 block text-xs font-medium text-zinc-700">Public post link <span className="font-normal text-zinc-500">(optional, HTTPS)</span></label>
            <input id="public-post-url" type="url" inputMode="url" value={postUrl} onChange={(event) => setPostUrl(event.target.value)} placeholder="https://…" className="h-11 w-full rounded-lg border border-[#ddd8cf] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:max-w-xl" />
            <label className="mt-3 flex min-h-11 items-center gap-2 text-sm text-zinc-700"><input type="checkbox" checked={postedConfirmed} onChange={(event) => setPostedConfirmed(event.target.checked)} className="size-4 accent-orange-600" /> I published this post outside AFL</label>
            <Button type="button" variant="outline" onClick={() => void markPosted(currentDraft)} disabled={!postedConfirmed || marking} className="mt-2 min-h-11 border-orange-200 text-[#8f370d] hover:bg-orange-50">{marking ? <LoaderCircle className="animate-spin" /> : <Check />} Mark posted by admin</Button>
          </section>}
        </>}
      </section>

      <aside className="min-w-0 space-y-5" aria-label="Saved drafts and sharing history">
        <section className="rounded-2xl border border-[#e7e3dc] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-medium text-zinc-900">Saved drafts</h2><p className="mt-1 text-xs text-zinc-500">Continue an unfinished platform caption.</p></div><span className="text-xs tabular-nums text-zinc-500">{drafts.filter((draft) => draft.status === 'draft').length}</span></div>
          <div className="mt-3 divide-y divide-[#eeeae4]">
            {drafts.filter((draft) => draft.status === 'draft').slice(0, 8).map((draft) => <button key={draft.id} type="button" onClick={() => { setSelectedId(draft.awardeeId); setQuery(draft.publicSnapshot.name); setPlatform(draft.platform); setCaption(draft.caption); setPostedConfirmed(false); setPostUrl('') }} className="flex min-h-14 w-full items-center justify-between gap-3 py-3 text-left hover:text-[#9f3c0d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><span className="min-w-0"><span className="block truncate text-sm font-medium">{draft.publicSnapshot.name}</span><span className="block text-xs text-zinc-500">{SOCIAL_PLATFORM_LABELS[draft.platform]} · {formatDate(draft.updatedAt)}</span></span><ExternalLink className="size-4 shrink-0" /></button>)}
            {!loading && drafts.every((draft) => draft.status !== 'draft') && <p className="py-4 text-sm text-zinc-500">Your saved drafts will appear here.</p>}
          </div>
        </section>
        <section className="rounded-2xl border border-[#e7e3dc] bg-white p-4 sm:p-5">
          <div><h2 className="text-base font-medium text-zinc-900">Share history</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Posts you marked as live outside AFL.</p></div>
          <div className="mt-3 divide-y divide-[#eeeae4]">
            {history.map((draft) => <div key={draft.id} className="flex min-w-0 items-start gap-3 py-3"><Clock3 className="mt-0.5 size-4 shrink-0 text-emerald-700" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-zinc-900">{draft.publicSnapshot.name}</p><p className="mt-0.5 text-xs text-zinc-500">{SOCIAL_PLATFORM_LABELS[draft.platform]} · Shared by admin · {formatDate(draft.markedPostedAt ?? draft.updatedAt)}</p>{draft.publicPostUrl && <a href={draft.publicPostUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-9 items-center gap-1 text-xs font-medium text-[#a13c0b] underline-offset-4 hover:underline">Open post reference <ExternalLink className="size-3" /></a>}</div></div>)}
            {!loading && history.length === 0 && <p className="py-4 text-sm text-zinc-500">No externally shared posts have been recorded yet.</p>}
          </div>
        </section>
      </aside>

      {error && !selected && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 xl:col-span-2">{error} <button type="button" onClick={() => void loadWorkspace()} className="ml-1 font-medium underline">Try again</button></p>}
    </div>
  )
}
