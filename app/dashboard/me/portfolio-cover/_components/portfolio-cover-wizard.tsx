'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, ImagePlus, Loader2, Share2, Sparkles, WandSparkles } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getCurrentPortfolioCover, rejectPortfolioCover, selectPortfolioCover, startPortfolioCover } from '@/lib/portfolio-cover/client'
import type { PortfolioCoverFields, PortfolioCoverGeneration, PortfolioTailoring, PortfolioVariant } from '@/lib/portfolio-cover/types'

const emptyFields: PortfolioCoverFields = {}
const fieldMeta: Array<{ key: keyof PortfolioCoverFields; label: string; placeholder: string }> = [
  { key: 'name', label: 'Name on cover', placeholder: 'Your full name' },
  { key: 'school', label: 'School', placeholder: 'University or institution' },
  { key: 'cgpa', label: 'CGPA (over 5.0)', placeholder: '4.82 / 5.0' },
  { key: 'degreeClass', label: 'Class', placeholder: 'First Class' },
  { key: 'fieldOfStudy', label: 'Field', placeholder: 'Public health, climate, technology...' },
  { key: 'country', label: 'Country', placeholder: 'Nigeria' },
  { key: 'cohort', label: 'Cohort / year', placeholder: '2026 cohort' },
]

export function PortfolioCoverWizard() {
  const [enabled, setEnabled] = useState(true)
  const [generation, setGeneration] = useState<PortfolioCoverGeneration | null>(null)
  const [tailoring, setTailoring] = useState<PortfolioTailoring | null>(null)
  const [fields, setFields] = useState<PortfolioCoverFields>(emptyFields)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [consent, setConsent] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const result = await getCurrentPortfolioCover()
      setEnabled(result.enabled)
      setGeneration(result.generation)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load portfolio cover status.') }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!generation || !['queued', 'processing'].includes(generation.status)) return
    const timer = window.setInterval(() => void load(), 4000)
    return () => window.clearInterval(timer)
  }, [generation, load])

  const setField = (key: keyof PortfolioCoverFields, value: string) => setFields((current) => ({ ...current, [key]: value }))
  const selected = generation?.status === 'selected' && generation.selectedUrl ? generation.selectedUrl : null
  const hasOptions = Boolean(generation?.options['executive-charcoal'] && generation?.options['leadership-ivory'])

  async function submit() {
    if (!file || !tailoring || !consent) { setError('Upload a portrait, choose Male or Female, and accept the photo-edit consent to continue.'); return }
    try {
      setBusy(true); setError('')
      const result = await startPortfolioCover({ file, tailoring, fields: Object.fromEntries(Object.entries(fields).filter(([, value]) => value?.trim())) })
      setGeneration(result.generation)
      toast.success('Your two cover options are being prepared.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not start cover generation.') } finally { setBusy(false) }
  }

  async function choose(variant: PortfolioVariant) {
    if (!generation) return
    try { setBusy(true); const result = await selectPortfolioCover(generation.id, variant); setGeneration(result.generation); toast.success('Your Top100 cover is ready to share.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not select that cover.') } finally { setBusy(false) }
  }

  async function reject() {
    if (!generation) return
    try { setBusy(true); const result = await rejectPortfolioCover(generation.id); setGeneration(result.generation); toast.success('Thanks. An admin can reset your cover set for another try.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not reject this cover set.') } finally { setBusy(false) }
  }

  async function share() {
    if (!selected) return
    try {
      if (navigator.share) await navigator.share({ title: 'My Top100 Africa Future Leaders profile', url: selected })
      else { await navigator.clipboard.writeText(selected); toast.success('Cover link copied.') }
    } catch { /* user cancelled native share */ }
  }

  const statusCopy = useMemo(() => generation?.status === 'processing' || generation?.status === 'queued' ? 'Our studio is preparing two editorial options...' : '', [generation])

  return (
    <section className="space-y-6" aria-labelledby="portfolio-cover-title">
      <div className="overflow-hidden rounded-[28px] border border-amber-200 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,.35),transparent_42%),linear-gradient(135deg,#fffdf5,#fff)] p-6 shadow-[0_20px_70px_rgba(113,82,0,.12)] sm:p-9">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[.26em] text-amber-800">Top100 editorial studio</p>
            <h1 id="portfolio-cover-title" className="mt-2 font-serif text-4xl font-black tracking-[-.04em] text-stone-950 sm:text-5xl">Your Africa Future Leaders cover.</h1>
            <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-stone-600">Create a vertical magazine-style profile for your portfolio. Your original avatar stays exactly as it is; we only create a separate shareable cover.</p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-950 text-amber-300 shadow-lg"><WandSparkles className="h-7 w-7" aria-hidden="true" /></div>
        </div>
      </div>

      {!enabled ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-950">Portfolio cover generation is being prepared for launch. Your profile and avatar are unaffected.</div> : null}
      {error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{error}</div> : null}

      {!generation || generation.status === 'rejected' || generation.status === 'failed' ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-[24px] border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-3"><ImagePlus className="h-5 w-5 text-amber-700" aria-hidden="true" /><h2 className="text-xl font-black text-stone-950">Build your cover</h2></div>
            <p className="mt-2 text-sm font-semibold leading-6 text-stone-500">Only fill in the details you want displayed. Anything left blank is left off the cover.</p>
            <div className="mt-6 space-y-5">
              <div className="space-y-2"><Label htmlFor="portfolio-portrait" className="font-black text-stone-900">Portrait photo</Label><Input id="portfolio-portrait" type="file" accept="image/jpeg,image/png,image/webp" disabled={!enabled || busy} onChange={(event) => { const next = event.target.files?.[0] ?? null; setFile(next); setPreview(next ? URL.createObjectURL(next) : '') }} className="h-14 rounded-xl border-stone-200 bg-stone-50 pt-3" /><p className="text-xs font-semibold text-stone-500">Use a clear vertical portrait, up to 8 MB. Your face is preserved.</p></div>
              {preview ? <div className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-3"><img src={preview} alt="Portrait selected for your cover" className="h-20 w-16 rounded-lg object-cover" /><span className="text-sm font-bold text-amber-950">Ready for the editorial edit.</span></div> : null}
              <fieldset disabled={!enabled || busy} className="space-y-2"><legend className="text-sm font-black text-stone-900">Wardrobe tailoring</legend><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => setTailoring('male')} className={`min-h-14 rounded-xl border px-4 text-sm font-black transition ${tailoring === 'male' ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-amber-500'}`}>Male</button><button type="button" onClick={() => setTailoring('female')} className={`min-h-14 rounded-xl border px-4 text-sm font-black transition ${tailoring === 'female' ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-amber-500'}`}>Female</button></div><p className="text-xs font-semibold text-stone-500">Choose directly; we never infer gender.</p></fieldset>
              <div className="grid gap-4 sm:grid-cols-2">{fieldMeta.map(({ key, label, placeholder }) => <div key={key} className="space-y-2"><Label htmlFor={`portfolio-${key}`} className="font-bold text-stone-800">{label}</Label><Input id={`portfolio-${key}`} value={fields[key] ?? ''} onChange={(event) => setField(key, event.target.value)} placeholder={placeholder} disabled={!enabled || busy} className="h-12 rounded-xl border-stone-200 text-base" /></div>)}</div>
              <div className="space-y-2"><Label htmlFor="portfolio-headline" className="font-bold text-stone-800">Cover headline (optional)</Label><Input id="portfolio-headline" value={fields.headline ?? ''} onChange={(event) => setField('headline', event.target.value)} placeholder="Building a healthier, brighter Africa" disabled={!enabled || busy} className="h-12 rounded-xl border-stone-200 text-base" /></div>
              <div className="space-y-2"><Label htmlFor="portfolio-impact" className="font-bold text-stone-800">Impact statement (optional)</Label><Textarea id="portfolio-impact" value={fields.impactStatement ?? ''} onChange={(event) => setField('impactStatement', event.target.value)} placeholder="One concise sentence about the work you are leading." disabled={!enabled || busy} className="min-h-28 rounded-xl border-stone-200 text-base" /></div>
              <label className="flex gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm font-semibold leading-6 text-stone-700"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-amber-500" />I consent to an AI-assisted clothing edit. My face and identity must stay unchanged; I understand this creates a separate portfolio cover.</label>
              <Button type="button" onClick={() => void submit()} disabled={!enabled || busy} className="min-h-13 w-full rounded-full bg-stone-950 px-6 text-base font-black text-white hover:bg-stone-800">{busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> : <Sparkles className="mr-2 h-5 w-5 text-amber-300" aria-hidden="true" />}{busy ? 'Preparing your options...' : 'Generate two cover options'}</Button>
            </div>
          </div>
          <aside className="rounded-[24px] border border-amber-200 bg-amber-50 p-5"><p className="text-xs font-black uppercase tracking-[.22em] text-amber-800">What stays consistent</p><ul className="mt-4 space-y-4 text-sm font-semibold leading-6 text-amber-950"><li>Vertical 4:5 magazine composition.</li><li>Top100 masthead and editorial typography.</li><li>Two suit directions: Executive Charcoal and Leadership Ivory.</li><li>Your facts are laid out by Top100, never invented by AI.</li><li>Your current avatar is never replaced.</li></ul></aside>
        </div>
      ) : null}

      {statusCopy ? <div role="status" className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-950"><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />{statusCopy}</div> : null}
      {generation?.status === 'ready' && hasOptions ? <div className="space-y-4"><div><p className="text-xs font-black uppercase tracking-[.22em] text-amber-800">Choose your cover</p><h2 className="mt-1 text-2xl font-black text-stone-950">Two editorial directions, one you.</h2></div><div className="grid gap-5 sm:grid-cols-2">{([['executive-charcoal', 'Executive Charcoal'], ['leadership-ivory', 'Leadership Ivory']] as const).map(([variant, label]) => <div key={variant} className="rounded-[24px] border border-stone-200 bg-white p-3 shadow-sm"><img src={generation.options[variant]} alt={`${label} Top100 magazine cover option`} className="aspect-[4/5] w-full rounded-[16px] object-cover" /><div className="flex items-center justify-between gap-3 p-3"><span className="text-sm font-black text-stone-900">{label}</span><Button type="button" onClick={() => void choose(variant)} disabled={busy} className="rounded-full bg-stone-950 font-black text-white">Choose</Button></div></div>)}</div><Button type="button" variant="outline" onClick={() => void reject()} disabled={busy} className="rounded-full border-stone-300 font-black text-stone-700">Neither looks like me</Button></div> : null}
      {selected ? <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]"><img src={selected} alt="Your selected Top100 Africa Future Leaders magazine cover" className="aspect-[4/5] w-full rounded-[24px] object-cover shadow-xl" /><div className="flex flex-col justify-center rounded-[24px] border border-amber-200 bg-amber-50 p-6"><p className="text-xs font-black uppercase tracking-[.22em] text-amber-800">Selected cover</p><h2 className="mt-2 text-3xl font-black text-stone-950">Ready for your portfolio.</h2><p className="mt-3 text-sm font-semibold leading-6 text-stone-700">Download it for your profile, or share your public cover link. Your original dashboard avatar is unchanged.</p><div className="mt-6 flex flex-wrap gap-3"><a href={selected} download="top100-africa-future-leaders-cover.png" className="inline-flex min-h-12 items-center rounded-full bg-stone-950 px-5 text-sm font-black text-white"><Download className="mr-2 h-4 w-4" aria-hidden="true" />Download</a><Button type="button" onClick={() => void share()} className="min-h-12 rounded-full bg-white font-black text-stone-950 hover:bg-white"><Share2 className="mr-2 h-4 w-4" aria-hidden="true" />Share cover</Button></div></div></div> : null}
    </section>
  )
}
