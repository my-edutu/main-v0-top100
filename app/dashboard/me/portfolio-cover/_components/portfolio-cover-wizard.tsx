'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Share2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getCurrentPortfolioCover, rejectPortfolioCover, selectPortfolioCover, startPortfolioCover } from '@/lib/portfolio-cover/client'
import { getPortfolioGenerationProgress } from '@/lib/portfolio-cover/progress'
import type { PortfolioCoverFields, PortfolioCoverGeneration, PortfolioTailoring, PortfolioVariant } from '@/lib/portfolio-cover/types'
import { COUNTRY_OPTIONS } from '@/lib/avatars'

const emptyFields: PortfolioCoverFields = {}
const COHORT_OPTIONS = ['2026', '2025', '2024', '2023']
const fieldMeta: Array<{ key: keyof PortfolioCoverFields; label: string; placeholder: string }> = [
  { key: 'name', label: 'Name on cover', placeholder: 'Your full name' },
  { key: 'school', label: 'School', placeholder: 'University or institution' },
  { key: 'cgpa', label: 'CGPA (over 5.0)', placeholder: '4.82 / 5.0' },
  { key: 'degreeClass', label: 'Class', placeholder: 'First Class' },
  { key: 'fieldOfStudy', label: 'Field', placeholder: 'Public health, climate, technology...' },
  { key: 'country', label: 'Country', placeholder: 'Nigeria' },
  { key: 'cohort', label: 'Cohort / year', placeholder: '2026 cohort' },
  { key: 'headline', label: 'Cover headline', placeholder: "Your impact in a few words" },
]

export function PortfolioCoverWizard() {
  const [enabled, setEnabled] = useState(false)
  const [generation, setGeneration] = useState<PortfolioCoverGeneration | null>(null)
  const [tailoring, setTailoring] = useState<PortfolioTailoring | null>(null)
  const [fields, setFields] = useState<PortfolioCoverFields>(emptyFields)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [consent, setConsent] = useState(false)
  const [welcome, setWelcome] = useState(true)
  const [step, setStep] = useState(0)
  const [cgpaValue, setCgpaValue] = useState('')
  const [cgpaScale, setCgpaScale] = useState('5.0')
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [generationStartedAt, setGenerationStartedAt] = useState<number | null>(null)
  const [generationElapsed, setGenerationElapsed] = useState(0)

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

  const isGenerating = busy || generation?.status === 'queued' || generation?.status === 'processing'
  useEffect(() => {
    if (!isGenerating) {
      setGenerationElapsed(0)
      setGenerationStartedAt(null)
      return
    }
    const startedAt = generationStartedAt ?? Date.now()
    if (generationStartedAt === null) setGenerationStartedAt(startedAt)
    const update = () => setGenerationElapsed(Date.now() - startedAt)
    update()
    const timer = window.setInterval(update, 500)
    return () => window.clearInterval(timer)
  }, [generationStartedAt, isGenerating])

  const setField = (key: keyof PortfolioCoverFields, value: string) => setFields((current) => ({ ...current, [key]: value }))
  const selected = generation?.status === 'selected' && generation.selectedUrl ? generation.selectedUrl : null
  const finishedCover = generation?.options['executive-charcoal']
  const hasCompletedCover = Boolean((generation?.status === 'ready' && finishedCover) || selected)
  const progress = getPortfolioGenerationProgress(generationElapsed)

  async function submit() {
    if (busy || !enabled) return
    if (!file || !tailoring || !consent) { setError('Upload a portrait, choose Male or Female, and accept the photo-edit consent to continue.'); return }
    try {
      setBusy(true); setError(''); setGenerationStartedAt(Date.now())
      const result = await startPortfolioCover({ file, tailoring, fields: Object.fromEntries(Object.entries(fields).filter(([, value]) => value?.trim())) })
      setGeneration(result.generation)
      toast.success(result.generation.status === 'ready' ? 'Your Top100 cover is ready.' : 'Your Top100 cover is being prepared.')
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
    const text = 'I’m proud to share that I’ve been featured as a Top100 Africa Future Leader. This recognition celebrates the work young African leaders are doing to create meaningful change, and I’m grateful to be part of this community.'
    const payload = { title: 'Featured as a Top100 Africa Future Leader', text, url: selected }
    try {
      if (navigator.share) {
        try { await navigator.share(payload); return }
        catch (cause) { if (cause instanceof Error && cause.name === 'AbortError') return }
      }
      await navigator.clipboard.writeText(`${text}\n\n${selected}`)
      toast.success('Share text and cover link copied.')
    } catch { toast.error('Could not prepare the share. Please try again.') }
  }

  return (
    <section className="cover-builder space-y-6" aria-labelledby="portfolio-cover-title">

      <Dialog open={welcome} onOpenChange={setWelcome}>
        <DialogContent overlayClassName="bg-black/75 backdrop-blur-[2px]" className="cover-intro max-h-[85dvh] w-[calc(100%-32px)] max-w-md overflow-y-auto bg-white p-6">
          <img src="/dashboard/cover-builder/intro.png" alt="A portrait becomes a styled magazine cover" className="cover-intro-art mx-auto h-36 w-full object-contain" />
          <DialogTitle className="text-2xl font-medium">Make your portfolio cover.</DialogTitle>
          <DialogDescription className="text-sm leading-6">Upload your portrait, choose a clothing style and add the facts you want shown. AI creates one polished Top100 cover for you to review. Your dashboard avatar stays unchanged.</DialogDescription>
          <label className="flex gap-3 text-sm leading-6"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-orange-600" />I agree to AI-assisted editing of my uploaded photo for this cover. I will review the result before using it.</label>
          <Button disabled={!consent} onClick={() => setWelcome(false)} className="cover-primary min-h-12">Agree and continue</Button>
        </DialogContent>
      </Dialog>
      <Dialog open={isGenerating} onOpenChange={() => undefined}>
        <DialogContent
          overlayClassName="bg-black/80 backdrop-blur-sm"
          className="w-[calc(100%-32px)] max-w-md overflow-hidden rounded-[28px] border-0 bg-[#171717] p-0 text-white shadow-2xl [&>button]:hidden"
          onEscapeKeyDown={event => event.preventDefault()}
          onPointerDownOutside={event => event.preventDefault()}
        >
          <div className="h-2 bg-gradient-to-r from-orange-600 via-orange-400 to-amber-300" />
          <div className="space-y-6 p-6 sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-xl font-semibold text-stone-950">100</div>
            <div>
              <DialogTitle className="text-2xl font-semibold tracking-tight text-white">{progress.title}</DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-6 text-stone-300">{progress.detail}</DialogDescription>
            </div>
            <div className="space-y-3">
              <div className="h-3 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Cover generation progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.value}>
                <div className="h-full rounded-full bg-gradient-to-r from-orange-600 via-orange-400 to-amber-300 transition-[width] duration-700 ease-out" style={{ width: `${progress.value}%` }} />
              </div>
              <div className="flex justify-between text-xs text-stone-400"><span>One premium cover</span><span>{progress.value}%</span></div>
            </div>
            <p className="border-t border-white/10 pt-5 text-xs leading-5 text-stone-400">Keep this page open. Most covers finish in about 20–40 seconds.</p>
          </div>
        </DialogContent>
      </Dialog>
      <h1 id="portfolio-cover-title" className={hasCompletedCover ? 'sr-only' : 'text-2xl font-medium'}>Create your cover</h1>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      {!generation || generation.status === 'rejected' || generation.status === 'failed' ? (
        <div className="mx-auto max-w-xl space-y-6">
          <p className="text-sm text-orange-700">Step {step + 1} of 4 · {['Portrait', 'Education', 'About you', 'Review'][step]}</p>
          <img src="/dashboard/cover-builder/intro.png" alt="" aria-hidden="true" className="h-16 w-24 object-contain" />
          <div className="flex gap-2">{[0,1,2,3].map(index => <span key={index} className="h-1 flex-1 rounded" style={{background:index <= step ? '#f97316' : '#e5e5e5'}} />)}</div>
          {step === 0 && <div className="space-y-5">
            <h2 className="text-xl font-medium">Start with your portrait.</h2>
            <div className="space-y-2">
              <Label htmlFor="portfolio-portrait">Portrait photo</Label>
              <Input
                id="portfolio-portrait"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                className="h-12 cursor-pointer p-0 text-sm text-neutral-600 file:mr-4 file:h-full file:border-0 file:border-r file:border-neutral-200 file:bg-orange-50 file:px-4 file:font-semibold file:text-orange-800 hover:file:bg-orange-100"
                onChange={event => {
                  const photo = event.target.files?.[0]
                  if (!photo) return
                  if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || photo.size > 8 * 1024 * 1024) {
                    setError('Choose a JPG, PNG or WebP under 8 MB.')
                    return
                  }
                  setError('')
                  setFile(photo)
                  setPreview(URL.createObjectURL(photo))
                }}
              />
              <p className="text-xs leading-5 text-neutral-500">Use a clear shoulders-to-waist portrait, up to 8 MB. Leave your upper body visible so the wardrobe edit can add the corporate clothing naturally.</p>
            </div>
            {preview && <img src={preview} alt="Selected portrait" className="h-32 w-24 rounded-xl object-cover" />}
            <fieldset className="space-y-3"><legend className="text-sm font-medium">Choose your gender</legend><p className="text-xs text-neutral-500">This selects the clothing treatment for your cover.</p><div className="flex gap-3">{(['male','female'] as const).map(value => <button key={value} type="button" aria-pressed={tailoring===value} onClick={()=>setTailoring(value)} className="min-h-12 flex-1 rounded-xl border px-4 capitalize aria-pressed:border-orange-500 aria-pressed:bg-orange-50">{value}</button>)}</div></fieldset>
          </div>}
          {step === 1 && <div className="space-y-4"><h2 className="text-xl font-medium">Your education</h2>
            {fieldMeta.filter(item=>['school','degreeClass'].includes(item.key)).map(({key,label,placeholder})=><div key={key} className="space-y-2"><Label htmlFor={key}>{label} (optional)</Label>{key === 'degreeClass' ? <select id={key} value={fields[key]??''} onChange={event=>setField(key,event.target.value)} className="flex h-11 w-full rounded-xl border border-input/80 bg-surface px-4 text-base shadow-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"><option value="">Choose class (optional)</option><option value="First Class">First Class</option><option value="Distinction">Distinction</option><option value="Hons">Hons</option><option value="Best graduating">Best graduating</option><option value="Others">Others</option></select> : <Input id={key} value={fields[key]??''} onChange={event=>setField(key,event.target.value)} placeholder={placeholder} />}</div>)}
            <div className="space-y-2"><Label htmlFor="cover-cgpa">CGPA (optional)</Label><div className="flex gap-2"><Input id="cover-cgpa" type="number" min="0" max={cgpaScale} step="0.01" value={cgpaValue} onChange={event=>setCgpaValue(event.target.value)} placeholder="Your score" /><select aria-label="CGPA scale" value={cgpaScale} onChange={event=>setCgpaScale(event.target.value)} className="rounded-xl border px-3"><option value="4.0">Out of 4.0</option><option value="5.0">Out of 5.0</option></select></div></div>
          </div>}
          {step === 2 && <div className="space-y-4"><h2 className="text-xl font-medium">What should appear on your cover?</h2><p className="text-sm text-neutral-500">Optional details. Leave anything blank to leave it off.</p>
            {fieldMeta.filter(item=>['name','headline','fieldOfStudy','country','cohort'].includes(item.key)).map(({key,label,placeholder})=><div key={key} className="space-y-2"><Label htmlFor={key}>{label}{['country','cohort','headline'].includes(key) ? ' (optional)' : ''}</Label>{key === 'country' ? <select id={key} value={fields[key]??''} onChange={event=>setField(key,event.target.value)} className="flex h-11 w-full rounded-xl border border-input/80 bg-surface px-4 text-base shadow-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"><option value="">Choose country (optional)</option>{COUNTRY_OPTIONS.map(country => <option key={country} value={country}>{country}</option>)}</select> : key === 'cohort' ? <select id={key} value={fields[key]??''} onChange={event=>setField(key,event.target.value)} className="flex h-11 w-full rounded-xl border border-input/80 bg-surface px-4 text-base shadow-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"><option value="">Choose cohort / year (optional)</option>{COHORT_OPTIONS.map(year => <option key={year} value={year}>{year}</option>)}</select> : <Input id={key} value={fields[key]??''} onChange={event=>setField(key,event.target.value)} placeholder={placeholder} />}</div>)}
            <Label htmlFor="cover-impact">Impact statement (optional)</Label><Textarea id="cover-impact" maxLength={420} value={fields.impactStatement??''} onChange={event=>setField('impactStatement',event.target.value)} />
          </div>}
          {step === 3 && <div className="mx-auto w-full max-w-2xl space-y-5 rounded-3xl border border-stone-200 bg-white p-5 text-center shadow-sm min-[540px]:p-6"><div className="grid items-start gap-6 min-[540px]:grid-cols-[180px_minmax(0,1fr)] min-[540px]:text-left">{preview && <img src={preview} alt="Portrait to be used" className="mx-auto h-56 w-44 rounded-2xl object-cover min-[540px]:mx-0" />}<div className="min-w-0"><h2 className="text-xl font-medium">Review before generating</h2><p className="mt-2 text-sm capitalize text-stone-600">Clothing treatment: {tailoring}</p><dl className="mx-auto mt-4 w-full max-w-md divide-y text-center min-[540px]:mx-0 min-[540px]:text-left">{Object.entries(fields).filter(([,value])=>value).map(([key,value])=><div key={key} className="py-2 min-[540px]:grid min-[540px]:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] min-[540px]:items-baseline min-[540px]:gap-3"><dt className="text-xs text-neutral-500">{fieldMeta.find(item=>item.key===key)?.label.replace(' (over 5.0)','')??'Impact statement'}</dt><dd className="break-words text-sm min-[540px]:text-right">{value}</dd></div>)}</dl></div></div><button type="button" onClick={()=>setWelcome(true)} className="mx-auto min-h-11 text-sm underline">Review photo-edit consent</button></div>}
          <div className="flex gap-3">{step>0 && <Button variant="outline" disabled={busy} onClick={()=>{setError('');setStep(step-1)}} className="min-h-12">Back</Button>}
          <Button className="cover-primary min-h-12 flex-1" disabled={busy || (step===3 && (!enabled || !consent))} onClick={()=>{
            setError('');
            if(step===0 && (!file || !tailoring || !consent)) {setError('Choose a portrait and gender, then agree to the photo-edit consent.');return}
            if(step===1) {if(cgpaValue && (!Number.isFinite(Number(cgpaValue)) || Number(cgpaValue)<0 || Number(cgpaValue)>Number(cgpaScale))) {setError('Your CGPA must be within the selected scale.');return} setField('cgpa',cgpaValue ? cgpaValue+' / '+cgpaScale : '')}
            if(step<3) setStep(step+1); else void submit()
          }}>{busy ? 'Preparing…' : step===3 ? 'Generate my cover' : 'Continue'}</Button></div>
          {step===3 && !enabled && <p role="status" className="text-sm text-neutral-600">Generation is currently unavailable. No photo has been submitted.</p>}
        </div>
      ) : null}

      {generation?.status === 'ready' && finishedCover ? <div className="mx-auto max-w-2xl space-y-4"><div className="text-center"><p className="text-[11px] font-medium uppercase tracking-[.2em] text-orange-700">Your Top100 cover</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">One cover, made for you.</h2><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-stone-600">Review it before adding it to your profile.</p></div><div className="overflow-hidden rounded-[28px] border border-stone-200 bg-white p-3 shadow-sm"><img src={finishedCover} alt="Your generated Top100 Africa Future Leaders magazine cover" className="aspect-[4/5] w-full rounded-[20px] object-cover" /><div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-stone-950">Africa Future Leaders 2026</p><p className="text-sm text-stone-500">Corporate editorial portrait</p></div><Button type="button" onClick={() => void choose('executive-charcoal')} disabled={busy} className="cover-primary min-h-12 rounded-full px-6">Use this cover</Button></div></div><Button type="button" variant="outline" onClick={() => void reject()} disabled={busy} className="min-h-12 w-full rounded-full border-stone-300 font-medium text-stone-700">This doesn’t look like me</Button></div> : null}
      {selected ? <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]"><img src={selected} alt="Your selected Top100 Africa Future Leaders magazine cover" className="aspect-[4/5] w-full rounded-[24px] object-cover " /><div className="flex flex-col justify-center rounded-[24px] border border-amber-200 bg-amber-50 p-6"><p className="text-xs font-medium uppercase tracking-[.22em] text-amber-800">Selected cover</p><h2 className="mt-2 text-3xl font-medium text-stone-950">Ready for your portfolio.</h2><p className="mt-3 text-sm font-semibold leading-6 text-stone-700">Download it for your profile, or share your public cover link. Your original dashboard avatar is unchanged.</p><div className="mt-6 flex flex-wrap gap-3"><a href={selected} download="top100-africa-future-leaders-cover.png" className="cover-primary inline-flex min-h-12 items-center rounded-full px-5 text-sm font-medium"><Download className="mr-2 h-4 w-4" aria-hidden="true" />Download</a><Button type="button" onClick={() => void share()} className="min-h-12 rounded-full bg-white font-medium text-stone-950 hover:bg-white"><Share2 className="mr-2 h-4 w-4" aria-hidden="true" />Share cover</Button></div></div></div> : null}
    </section>
  )
}
