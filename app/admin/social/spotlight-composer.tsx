'use client'

import { useEffect, useState } from 'react'
import { Copy, Download, LoaderCircle, Share2, Sparkles } from 'lucide-react'
import Image from '@/components/safe-image'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { PublicAwardee } from '@/lib/admin-social/types'
import { prepareSocialImage, shareSocialDraft } from '@/lib/admin-social/share'
import { SPOTLIGHT_PLATFORMS, SPOTLIGHT_LABELS, CAPTION_LIMITS, spotlightImageUrl, captionLength, validateSpotlightCaption, type SpotlightPlatform } from '@/lib/admin-social/spotlight'

type Preview = { captions: Record<SpotlightPlatform, string>; profile: PublicAwardee; signature: string }

export default function SpotlightComposer({ profile }: { profile: PublicAwardee }) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const imageUrl = preview?.profile.imageUrl ? spotlightImageUrl(preview.profile.profileUrl, preview.profile.awardeeId, preview.signature) : null

  // Prepare media before the click so the device retains user activation when
  // navigator.share opens. A missing image never blocks sharing the text.
  useEffect(() => {
    let active = true
    if (imageUrl) void prepareSocialImage(imageUrl).then(file => { if (active) setImageFile(file) })
    return () => { active = false }
  }, [imageUrl])

  const generate = async () => {
    setBusy('generate'); setMessage('')
    try {
      const response = await fetch('/api/admin/social/spotlight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ awardeeId: profile.awardeeId }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Could not generate the feature.')
      if (preview?.signature !== data.signature) setImageFile(null)
      setPreview(data)
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Generation failed.') }
    finally { setBusy(null) }
  }
  const share = async (platform: SpotlightPlatform) => {
    if (!preview || busy) return
    setBusy(platform); setMessage('')
    const outcome = await shareSocialDraft({ caption: preview.captions[platform], profileUrl: preview.profile.profileUrl, imageUrl }, navigator, fetch, imageFile)
    if (outcome === 'shared_with_image') setMessage('Share sheet completed. Check the caption, link and image in your chosen app, then finish posting there.')
    else if (outcome === 'shared') setMessage('Share sheet completed with text and link. Download the image separately if your chosen app needs it.')
    else if (outcome !== 'cancelled') setMessage('Device sharing is unavailable here. Copy the caption and download the image, then post in your chosen app.')
    setBusy(null)
  }
  const copy = async (platform: SpotlightPlatform) => {
    try { await navigator.clipboard.writeText(preview!.captions[platform]); setMessage('Caption and profile link copied.') }
    catch { setMessage('Could not copy automatically. Select and copy the caption text.') }
  }
  const download = () => {
    if (!imageFile) return
    const url = URL.createObjectURL(imageFile)
    const link = document.createElement('a'); link.href = url; link.download = imageFile.name; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
  return <section className="rounded-2xl border border-orange-200 bg-white p-4 sm:p-6" aria-label="Feature this leader">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold text-zinc-900">Feature this leader</h2><p className="mt-1 max-w-xl text-sm text-zinc-600">Turn {profile.name}’s public bio into a third-person feature. Preview and edit each caption, then choose an app from your device’s share sheet.</p></div>
      <Button type="button" onClick={generate} disabled={!!busy || !profile.bio} variant="outline">{busy === 'generate' ? <LoaderCircle className="animate-spin" /> : <Sparkles />}{preview ? 'Regenerate all previews' : 'Generate feature'}</Button>
    </div>
    <p className="mt-3 text-xs text-zinc-500">No social account connection needed. Share to one app at a time and finish publishing in that app.</p>
    {message && <p role="status" className="mt-4 rounded-lg bg-orange-50 p-3 text-sm text-zinc-800">{message}</p>}
    {preview && <>
      <div className="mt-5 flex items-center gap-4 rounded-xl bg-zinc-50 p-3">
        {imageUrl && <div className="relative h-24 w-24 shrink-0"><Image src={imageUrl} alt={`${preview.profile.name} feature image`} fill sizes="96px" unoptimized className="rounded-lg object-contain" /></div>}
        <div className="min-w-0 text-sm"><p className="font-medium">{preview.profile.name}</p><a href={preview.profile.profileUrl} target="_blank" rel="noreferrer" className="break-all text-orange-800 underline">View public profile</a><p className="mt-1 text-xs text-zinc-500">Image sharing depends on your device and destination app. Instagram caption links are not clickable.</p><Button type="button" variant="ghost" size="sm" onClick={download} disabled={!imageFile}><Download className="size-4" />Download image</Button></div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {SPOTLIGHT_PLATFORMS.map(platform => {
          const issue = validateSpotlightCaption(platform, preview.captions[platform], preview.profile.profileUrl)
          return <div key={platform} className="rounded-xl border border-zinc-200 p-3">
            <label htmlFor={`spotlight-${platform}`} className="text-sm font-semibold">{SPOTLIGHT_LABELS[platform]}</label>
            <Textarea id={`spotlight-${platform}`} value={preview.captions[platform]} disabled={!!busy} onChange={event => setPreview({ ...preview, captions: { ...preview.captions, [platform]: event.target.value } })} className="mt-2 min-h-60 resize-y text-sm leading-6" aria-describedby={`spotlight-count-${platform}`} />
            <p id={`spotlight-count-${platform}`} className={`mt-2 text-xs ${issue ? 'text-red-700' : 'text-zinc-500'}`}>{captionLength(platform, preview.captions[platform])} / {CAPTION_LIMITS[platform]}{issue ? ` · ${issue}` : ''}</p>
            <div className="mt-3 flex flex-wrap gap-2"><Button type="button" onClick={() => void share(platform)} disabled={!!busy || !!issue} className="bg-orange-600 text-white hover:bg-orange-700">{busy === platform ? <LoaderCircle className="size-4 animate-spin" /> : <Share2 className="size-4" />}Share from device</Button><Button type="button" variant="outline" onClick={() => void copy(platform)}><Copy className="size-4" />Copy caption</Button></div>
          </div>
        })}
      </div>
    </>}
  </section>
}
