'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Download, ImagePlus, LoaderCircle, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCurrentPortfolioCover, startPortfolioCover } from '@/lib/portfolio-cover/client'
import { peekPendingPortfolioCoverPhoto, takePendingPortfolioCoverPhoto } from '@/lib/portfolio-cover/draft-photo'
import { useDashboardMember } from '@/app/dashboard/_providers/dashboard-member'
import { CoverStepIndicator } from './cover-step-indicator'

export function PortfolioCoverWizard() {
  const { member, replaceMember } = useDashboardMember()
  const [coverUrl, setCoverUrl] = useState<string | null>(member.portfolioCoverUrl ?? null)
  const [name, setName] = useState(member.name)
  const [file, setFile] = useState<File | null>(() => peekPendingPortfolioCoverPhoto())
  const [consent, setConsent] = useState(false)
  const [step, setStep] = useState<'name' | 'photo' | 'preview'>(() => file ? 'photo' : 'name')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (file) takePendingPortfolioCoverPhoto()
  }, [file])

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const frame = window.requestAnimationFrame(() => setPreviewUrl(url))
    return () => {
      window.cancelAnimationFrame(frame)
      URL.revokeObjectURL(url)
    }
  }, [file])

  useEffect(() => {
    let current = true
    getCurrentPortfolioCover()
      .then((result) => {
        if (!current) return
        setCoverUrl(result.coverUrl)
        if (result.coverUrl !== member.portfolioCoverUrl) {
          replaceMember({ ...member, portfolioCoverUrl: result.coverUrl })
        }
      })
      .catch((cause: unknown) => {
        if (current) setError(cause instanceof Error ? cause.message : 'Could not load your saved cover.')
      })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [member, replaceMember])

  const selectPhoto = (photo?: File) => {
    if (!photo) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || photo.size > 8 * 1024 * 1024) {
      setFile(null)
      setPreviewUrl(null)
      setError('Choose a JPG, PNG or WebP image under 8 MB.')
      return
    }
    setError('')
    setPreviewUrl(null)
    setFile(photo)
  }

  const createCover = async () => {
    if (!file) {
      setError('Upload a portrait photo to make your cover.')
      return
    }
    if (!name.trim()) {
      setError('Enter the name you want printed on the cover.')
      return
    }
    if (!consent) {
      setError('Confirm that you have permission to use this photo.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const result = await startPortfolioCover({ file, fields: { name: name.trim() } })
      setCoverUrl(result.coverUrl)
      replaceMember({ ...member, portfolioCoverUrl: result.coverUrl })
      setFile(null)
      setConsent(false)
      setStep('preview')
      toast.success('Your cover is ready and saved to your profile.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your cover. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const shareCover = async () => {
    if (!coverUrl) return
    const shareData = {
      title: `${name.trim() || member.name} · Africa Future Leaders 2026`,
      text: 'I’m proud to be selected as a Top100 Africa Future Leader 2026.',
      url: coverUrl,
    }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch (cause) {
        if (cause instanceof Error && cause.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(`${shareData.text}\n${coverUrl}`)
      toast.success('Your cover link and post text have been copied.')
    } catch {
      toast.error('Sharing is unavailable here. Open the cover image and copy its link to share.')
    }
  }

  const downloadName = `${(name.trim() || member.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-afl-2026-cover.png`

  return (
    <section className="cover-builder space-y-4 sm:space-y-6" aria-labelledby="portfolio-cover-title">
      <header className="space-y-1.5 sm:space-y-2">
        <p className="text-xs font-medium uppercase tracking-[.16em] text-orange-800">Your awardee cover</p>
        <h1 id="portfolio-cover-title" className="text-xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">Add your photo to the AFL template</h1>
        <p className="max-w-2xl text-sm leading-5 text-neutral-600 sm:text-base sm:leading-6">Your photo and name are placed into the official 2026 design. Nothing is AI-generated or changed about your appearance.</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {loading && <p role="status" className="text-sm text-neutral-500">Loading your saved cover…</p>}

      <CoverStepIndicator step={step} />

      {step === 'name' ? (
        <section className="max-w-xl space-y-4" aria-labelledby="cover-name-step">
          <div className="space-y-1.5">
            <h2 id="cover-name-step" className="text-lg font-semibold text-neutral-950">What name should appear?</h2>
            <p className="text-sm leading-5 text-neutral-600">This name will be printed on your official award cover.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cover-name">Name on cover</Label>
            <Input id="cover-name" autoComplete="name" maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" className="min-h-11" />
          </div>
          <Button type="button" onClick={() => { setError(''); setStep('photo') }} disabled={!name.trim()} className="min-h-11 w-full bg-orange-600 font-semibold text-white hover:bg-orange-700 sm:w-auto sm:min-w-52">
            Continue to photo <ArrowRight aria-hidden="true" />
          </Button>
        </section>
      ) : step === 'photo' ? (
        <section className="max-w-xl space-y-4" aria-labelledby="cover-photo-step">
          <div className="space-y-1.5">
            <h2 id="cover-photo-step" className="text-lg font-semibold text-neutral-950">Add your portrait</h2>
            <p className="text-sm leading-5 text-neutral-600">Choose a clear, front-facing photo. It will be fitted into the template as provided.</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Portrait photo</p>
            <Label htmlFor="portfolio-portrait" className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-orange-200 bg-orange-50 px-4 font-medium text-orange-900 hover:bg-orange-100">{file ? 'Change photo' : 'Choose photo'}</Label>
            <Input
              id="portfolio-portrait"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={saving}
              onChange={(event) => {
                selectPhoto(event.currentTarget.files?.[0])
                event.currentTarget.value = ''
              }}
              className="sr-only"
            />
            <p className="text-xs leading-5 text-neutral-500">JPG, PNG or WebP · up to 8 MB</p>
          </div>
          {file && previewUrl ? (
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3">
              <Image src={previewUrl} alt="Selected cover portrait" width={64} height={80} unoptimized className="h-20 w-16 rounded-lg object-cover" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900">Photo ready for your cover</p>
                <p className="max-w-64 truncate text-xs text-neutral-500">{file.name}</p>
              </div>
            </div>
          ) : null}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 p-3 text-sm leading-5 text-neutral-700">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={saving} className="mt-0.5 size-4 shrink-0 accent-orange-600" />
            <span>I have permission to use this photo and agree to its processing to create my award cover.</span>
          </label>
          <Button type="button" onClick={() => void createCover()} disabled={saving || !file || !consent || !name.trim()} className="min-h-11 w-full bg-orange-600 font-semibold text-white hover:bg-orange-700 disabled:bg-orange-200 disabled:text-neutral-700 sm:w-auto sm:min-w-52">
            {saving ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}
            {saving ? 'Creating your cover…' : coverUrl ? 'Update my cover' : 'Create my cover'}
          </Button>
        </section>
      ) : coverUrl ? (
        <section className="max-w-xl space-y-3" aria-labelledby="cover-preview-step">
          <div className="space-y-1">
            <h2 id="cover-preview-step" className="text-lg font-semibold text-neutral-950">Your cover is ready</h2>
            <p className="text-sm leading-5 text-neutral-600">It’s saved and now appears on your public awardee profile.</p>
          </div>
          <Image src={coverUrl} alt={`${name || member.name}'s Africa Future Leaders 2026 award cover`} width={720} height={900} unoptimized className="mx-auto block w-full max-w-[360px] rounded-lg border border-neutral-200" />
          <div className="mx-auto flex w-full max-w-[360px] items-center gap-2 pt-1">
            <a href="/api/member/portfolio-cover/download" download={downloadName} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700"><Download className="size-4" aria-hidden="true" />Download cover</a>
            <Button type="button" variant="outline" onClick={() => void shareCover()} aria-label="Share cover link" title="Share cover link" className="size-11 shrink-0 rounded-md border-orange-200 text-orange-800 hover:bg-orange-50"><Share2 className="size-5" aria-hidden="true" /></Button>
          </div>
        </section>
      ) : null}
    </section>
  )
}
