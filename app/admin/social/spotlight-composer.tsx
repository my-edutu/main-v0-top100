'use client'

import { useEffect, useState } from 'react'
import { LoaderCircle, Sparkles, Send, RefreshCw } from 'lucide-react'
import Image from '@/components/safe-image'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { PublicAwardee } from '@/lib/admin-social/types'
import { SPOTLIGHT_PLATFORMS, SPOTLIGHT_LABELS, CAPTION_LIMITS, spotlightImageUrl, captionLength, validateSpotlightCaption, type SpotlightPlatform, type PublicationResult } from '@/lib/admin-social/spotlight'

type Preview = { captions: Record<SpotlightPlatform, string>; profile: PublicAwardee; signature: string }
type Account = { platform: SpotlightPlatform; configured: boolean }
async function read(response: Response) {
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Could not complete the request.')
  return data
}

export default function SpotlightComposer({ profile }: { profile: PublicAwardee }) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [results, setResults] = useState<PublicationResult[]>([])
  const [storageReady, setStorageReady] = useState(false)
  const [busy, setBusy] = useState<'generate' | 'publish' | null>(null)
  const [error, setError] = useState('')
  const [statusLoading, setStatusLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)
  const [imageReady, setImageReady] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`/api/admin/social/spotlight?awardeeId=${encodeURIComponent(profile.awardeeId)}`)
      .then(read).then(data => {
        if (!active) return
        setAccounts(data.accounts)
        setStorageReady(data.storageReady)
        setResults(data.publications.map((item: { platform: SpotlightPlatform; state: PublicationResult['state']; caption: string; message: string; post_id: string; post_url: string }) => ({ platform: item.platform, state: item.state, caption: item.caption, message: item.message, postId: item.post_id, postUrl: item.post_url })))
      }).catch(() => { if (active) setError('Could not load account and publication status. Refresh before publishing.') })
      .finally(() => { if (active) setStatusLoading(false) })
    return () => { active = false }
  }, [profile.awardeeId, refresh])

  const generate = async () => {
    setBusy('generate'); setError('')
    try {
      const data = await read(await fetch('/api/admin/social/spotlight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ awardeeId: profile.awardeeId }) }))
      if (!preview || preview.signature !== data.signature) setImageReady(false)
      for (const result of results) {
        if (result.platform && result.caption && ['published', 'publishing', 'uncertain'].includes(result.state)) data.captions[result.platform] = result.caption
      }
      setPreview(data)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Generation failed.') }
    finally { setBusy(null) }
  }
  const publish = async () => {
    if (!preview || busy) return
    setBusy('publish'); setError('')
    try {
      const data = await read(await fetch('/api/admin/social/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ awardeeId: profile.awardeeId, captions: preview.captions, signature: preview.signature }) }))
      setResults(data.results)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Delivery could not be confirmed. Refresh status before retrying.')
      setStatusLoading(true); setRefresh(n => n + 1)
    } finally { setBusy(null) }
  }
  const configured = accounts.length === 4 && accounts.every(item => item.configured)
  const allPublished = results.length === 4 && results.every(item => item.state === 'published')
  const hasRetryable = results.length < 4 || results.some(item => item.state === 'failed')
  const valid = preview && SPOTLIGHT_PLATFORMS.every(platform => !validateSpotlightCaption(platform, preview.captions[platform], preview.profile.profileUrl))

  return <section className="rounded-2xl border border-orange-200 bg-white p-4 sm:p-6" aria-label="Feature this leader">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold text-zinc-900">Feature this leader</h2><p className="mt-1 max-w-xl text-sm text-zinc-600">Turn {profile.name}’s public bio into a third-person feature. Review each version, edit it, then publish to all four accounts.</p></div>
      <Button type="button" onClick={generate} disabled={!!busy || !profile.bio || allPublished} variant="outline">{busy === 'generate' ? <LoaderCircle className="animate-spin" /> : <Sparkles />}{preview ? 'Regenerate all previews' : 'Generate feature'}</Button>
    </div>
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Publishing account setup">
      {SPOTLIGHT_PLATFORMS.map(platform => <span key={platform} className="rounded-full border border-zinc-200 px-3 py-1 text-xs">{SPOTLIGHT_LABELS[platform]} · {statusLoading ? 'Checking…' : accounts.find(item => item.platform === platform)?.configured ? 'Configured' : 'Setup needed'}</span>)}
    </div>
    {!statusLoading && (!configured || !storageReady) && <p className="mt-3 text-sm text-amber-900">{!configured ? 'Account authorization needs to be configured before publishing. You can generate and edit previews now. ' : ''}{!storageReady ? 'Publishing history needs its database migration.' : ''}</p>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {preview && <>
      <div className="mt-5 flex items-center gap-4 rounded-xl bg-zinc-50 p-3">
        {preview.profile.imageUrl && <div className="relative h-24 w-24 shrink-0"><Image src={spotlightImageUrl(preview.profile.profileUrl, preview.profile.awardeeId, preview.signature)} onLoad={event => setImageReady(!event.currentTarget.currentSrc.includes('image-unavailable.svg'))} onError={() => { setImageReady(false); setError('The Instagram image could not be prepared. Use artwork hosted on Top100’s media or storage domain.') }} alt={`${preview.profile.name} Instagram image`} fill sizes="96px" unoptimized className="rounded-lg object-contain" /></div>}
        <div className="min-w-0 text-sm"><p className="font-medium">{preview.profile.name}</p><a href={preview.profile.profileUrl} target="_blank" rel="noreferrer" className="break-all text-orange-800 underline">View public profile</a><p className="mt-1 text-xs text-zinc-500">LinkedIn, Facebook and X: text + profile link. Instagram: this image + caption. Instagram caption URLs are not clickable.</p>{!preview.profile.imageUrl && <p className="mt-1 text-red-700">Add public profile artwork for Instagram.</p>}</div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {SPOTLIGHT_PLATFORMS.map(platform => {
          const result = results.find(item => item.platform === platform)
          const issue = validateSpotlightCaption(platform, preview.captions[platform], preview.profile.profileUrl)
          const locked = result && ['published', 'publishing', 'uncertain'].includes(result.state)
          return <div key={platform} className="rounded-xl border border-zinc-200 p-3">
            <label htmlFor={`spotlight-${platform}`} className="text-sm font-semibold">{SPOTLIGHT_LABELS[platform]}</label>
            <Textarea id={`spotlight-${platform}`} value={preview.captions[platform]} disabled={!!busy || !!locked} onChange={event => { setPreview({ ...preview, captions: { ...preview.captions, [platform]: event.target.value } }) }} className="mt-2 min-h-60 resize-y text-sm leading-6" aria-describedby={`spotlight-count-${platform}`} />
            <p id={`spotlight-count-${platform}`} className={`mt-2 text-xs ${issue ? 'text-red-700' : 'text-zinc-500'}`}>{captionLength(platform, preview.captions[platform])} / {CAPTION_LIMITS[platform]}{issue ? ` · ${issue}` : ''}</p>
          </div>
        })}
      </div>
      <Button type="button" className="mt-4 bg-orange-600 text-white hover:bg-orange-700" disabled={!!busy || statusLoading || !configured || !storageReady || !valid || !preview.profile.imageUrl || !imageReady || !hasRetryable || allPublished} onClick={publish}>{busy === 'publish' ? <LoaderCircle className="animate-spin" /> : <Send />}{busy === 'publish' ? 'Publishing…' : allPublished ? 'Published to all platforms' : results.length ? 'Publish remaining platforms' : 'Publish to all platforms'}</Button>
      <p className="mt-2 text-xs text-zinc-500">Keep this page open until results appear. Confirmed posts are never sent again when retrying.</p>
    </>}
    {results.length > 0 && <div className="mt-4 space-y-2" aria-live="polite"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Publication results</h3><Button variant="ghost" size="sm" disabled={!!busy || statusLoading} onClick={() => { setStatusLoading(true); setRefresh(n => n + 1) }}><RefreshCw className="size-4" />Refresh status</Button></div>{results.map(result => <div key={result.platform} className="rounded-lg bg-zinc-50 p-3 text-sm"><strong>{SPOTLIGHT_LABELS[result.platform!]}: </strong>{result.state === 'published' ? 'Published' : result.state === 'publishing' ? 'Delivery in progress or awaiting confirmation. Do not repost.' : result.state === 'uncertain' ? 'Check account — delivery unconfirmed' : result.state === 'failed' ? 'Rejected — retry available' : 'Ready'}{result.message && <p className="mt-1 text-xs text-zinc-600">{result.message}</p>}{result.postUrl && <a href={result.postUrl} target="_blank" rel="noreferrer" className="ml-2 text-orange-800 underline">View post</a>}</div>)}</div>}
  </section>
}
