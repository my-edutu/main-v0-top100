'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { Check, Copy, Download, Facebook, Instagram, Linkedin, Loader2, RefreshCw, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { prepareAwardeeSpotlight } from '@/lib/admin-social/prepare-spotlight'
import { prepareSocialImage, shareSocialDraft, type ShareOutcome } from '@/lib/admin-social/share'
import { SOCIAL_PLATFORM_LABELS, type PublicAwardee, type SocialPlatform } from '@/lib/admin-social/types'

const platforms: { id: SocialPlatform; icon: typeof Linkedin }[] = [
  { id: 'linkedin', icon: Linkedin },
  { id: 'facebook', icon: Facebook },
  { id: 'instagram', icon: Instagram },
]

type Props = {
  awardeeId: string
  onClose: () => void
}

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copied.`)
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}.`)
  }
}

function announceOutcome(outcome: ShareOutcome, hasImage: boolean) {
  if (outcome === 'shared_with_image') toast.success('The share sheet opened with the caption, profile link, and image. Check the attachment before posting.')
  else if (outcome === 'shared') toast.success(hasImage ? 'The share sheet opened with the caption and profile link. Add the downloaded image before posting.' : 'The share sheet opened with the caption and profile link.')
  else if (outcome === 'cancelled') toast('Share cancelled. Your caption is still here.')
  else if (outcome === 'unavailable') toast('This browser has no share sheet. Copy the caption and download the image to share manually.')
  else toast.error('Sharing did not complete. Your caption is still here.')
}

export default function AwardeeShareReviewDialog({ awardeeId, onClose }: Props) {
  const [platform, setPlatform] = useState<SocialPlatform>('linkedin')
  const [profile, setProfile] = useState<PublicAwardee | null>(null)
  const [caption, setCaption] = useState('')
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState('')
  const [preparedImage, setPreparedImage] = useState<{ url: string; file: File | null } | null>(null)

  const generate = useCallback(async (id: string, selectedPlatform: SocialPlatform) => {
    setLoading(true)
    setError('')
    try {
      const result = await prepareAwardeeSpotlight(id, selectedPlatform)
      setProfile(result.profile)
      setCaption(result.caption)
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Could not prepare this spotlight.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let current = true
    void Promise.resolve().then(() => {
      if (current) return generate(awardeeId, 'linkedin')
      return undefined
    })
    return () => { current = false }
  }, [awardeeId, generate])

  useEffect(() => {
    let current = true
    if (profile?.imageUrl) {
      void prepareSocialImage(profile.imageUrl).then((file) => {
        if (current) setPreparedImage({ url: profile.imageUrl!, file })
      })
    }
    return () => { current = false }
  }, [profile?.imageUrl])

  const imageFile = profile?.imageUrl && preparedImage?.url === profile.imageUrl ? preparedImage.file : null
  const imageReady = !profile?.imageUrl || preparedImage?.url === profile.imageUrl

  const share = async () => {
    if (!profile || !caption.trim()) return
    setSharing(true)
    const outcome = await shareSocialDraft({ caption: caption.trim(), profileUrl: profile.profileUrl, imageUrl: profile.imageUrl }, navigator, fetch, imageFile)
    setSharing(false)
    announceOutcome(outcome, Boolean(profile.imageUrl))
  }

  const downloadImage = async () => {
    if (!profile?.imageUrl) return
    try {
      const file = imageFile ?? await prepareSocialImage(profile.imageUrl)
      if (!file) throw new Error('Image download unavailable')
      const url = URL.createObjectURL(file)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${profile.slug}-afl-feature.${file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]}`
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success('Image download started.')
    } catch {
      toast.error('The image could not be downloaded. Try opening the public profile and saving it there.')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[92svh] max-w-2xl gap-0 overflow-y-auto rounded-2xl p-0">
        <DialogHeader className="border-b border-zinc-100 px-5 py-4 pr-14 text-left sm:px-6">
          <DialogTitle>Review awardee spotlight</DialogTitle>
          <DialogDescription>Check the image and edit the caption. Choose a destination in the share sheet after you approve it.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 p-5 sm:p-6">
          {loading && !profile && <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-zinc-600" role="status"><Loader2 className="size-5 animate-spin" />Preparing the latest public profile and AI caption…</div>}
          {profile && <>
            <div className="grid gap-4 sm:grid-cols-[minmax(180px,0.85fr)_minmax(0,1.15fr)]">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                {profile.imageUrl ? <Image src={profile.imageUrl} alt={`${profile.name} spotlight image`} fill sizes="(max-width: 640px) 100vw, 280px" unoptimized className="object-cover" /> : <div className="grid size-full place-items-center p-5 text-center text-sm text-zinc-500">No public profile image is available.</div>}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-zinc-950">{profile.name}</h3>
                <p className="mt-1 text-xs leading-5 text-zinc-500">{[profile.headline, profile.fieldOfStudy, profile.country, profile.cohort, profile.year].filter(Boolean).join(' · ')}</p>
                <p className="mt-3 line-clamp-5 text-sm leading-6 text-zinc-700">{profile.bio || 'No public BIO available.'}</p>
                <p className="mt-3 text-xs text-zinc-500">{profile.imageUrl ? imageReady ? imageFile ? 'Image ready to attach where supported.' : 'Image shown above; this browser may require a manual download.' : 'Preparing image…' : 'Sharing will include the caption and profile link.'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Caption style">
              {platforms.map(({ id, icon: Icon }) => <button key={id} type="button" aria-pressed={platform === id} onClick={() => { setPlatform(id); void generate(awardeeId, id) }} className={`flex min-h-10 items-center justify-center gap-2 rounded-lg border px-2 text-sm font-medium ${platform === id ? 'border-orange-500 bg-orange-50 text-orange-900' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}><Icon className="size-4" />{SOCIAL_PLATFORM_LABELS[id]}</button>)}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2"><label htmlFor="awardee-share-caption" className="text-sm font-medium text-zinc-800">Caption</label><Button type="button" variant="outline" size="sm" onClick={() => void generate(awardeeId, platform)} disabled={loading}><RefreshCw className={loading ? 'animate-spin' : ''} />Regenerate</Button></div>
              <Textarea id="awardee-share-caption" value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={5000} className="min-h-36 resize-y rounded-xl leading-6" aria-label="Edit spotlight caption" />
              <p className="mt-1 text-right text-xs text-zinc-500">{caption.length}/5000</p>
            </div>
          </>}
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
            <Button type="button" onClick={() => void share()} disabled={!profile || !caption.trim() || loading || sharing || !imageReady} className="min-h-11 bg-orange-600 text-white hover:bg-orange-700">{sharing ? <Loader2 className="animate-spin" /> : <Send />} {sharing ? 'Opening share sheet…' : 'Choose platform & share'}</Button>
            <Button type="button" variant="outline" onClick={() => void copyText(caption, 'Caption')} disabled={!caption.trim()} className="min-h-11"><Copy />Copy caption</Button>
            <Button type="button" variant="outline" onClick={() => void downloadImage()} disabled={!profile?.imageUrl} className="min-h-11"><Download />Download image</Button>
            <Button type="button" variant="outline" onClick={() => profile && void copyText(profile.profileUrl, 'Profile link')} disabled={!profile} className="min-h-11"><Check />Copy profile link</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
