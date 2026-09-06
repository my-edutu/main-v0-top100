'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Loader2, Share2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
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
    if (busy || !enabled) return
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
    <section className="cover-builder space-y-6" aria-labelledby="portfolio-cover-title">

      <Dialog open={welcome} onOpenChange={setWelcome}>
        <DialogContent className="cover-intro max-h-[85dvh] w-[calc(100%-32px)] max-w-md overflow-y-auto bg-white p-6">
          <img src="/dashboard/cover-builder/intro.png" alt="A portrait becomes a styled magazine cover" className="cover-intro-art mx-auto h-36 w-full object-contain" />
          <DialogTitle className="text-2xl font-medium">Make your portfolio cover.</DialogTitle>
          <DialogDescription className="text-sm leading-6">Upload your portrait, choose a clothing style and add the facts you want shown. AI helps create two cover options for you to review. Your dashboard avatar stays unchanged.</DialogDescription>
          <label className="flex gap-3 text-sm leading-6"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-orange-600" />I agree to AI-assisted editing of my uploaded photo for this cover. I will review the result before using it.</label>
          <Button disabled={!consent} onClick={() => setWelcome(false)} className="cover-primary min-h-12">Agree and continue</Button>
        </DialogContent>
      </Dialog>
      <h1 id="portfolio-cover-title" className="text-2xl font-medium">Create your cover</h1>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      {!generation || generation.status === 'rejected' || generation.status === 'failed' ? (
        <div className="mx-auto max-w-xl space-y-6">
          <p className="text-sm text-orange-700">Step {step + 1} of 4 · {['Portrait', 'Education', 'About you', 'Review'][step]}</p>
          <img src="/dashboard/cover-builder/intro.png" alt="" aria-hidden="true" className="h-16 w-24 object-contain" />
          <div className="flex gap-2">{[0,1,2,3].map(index => <span key={index} className="h-1 flex-1 rounded" style={{background:index <= step ? '#f97316' : '#e5e5e5'}} />)}</div>
          {step === 0 && <div className="space-y-5">
            <h2 className="text-xl font-medium">Start with your portrait.</h2>
            <Label htmlFor="portfolio-portrait">Portrait photo</Label>
            <Input id="portfolio-portrait" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => { const photo=event.target.files?.[0]; if (!photo) return; if (!['image/jpeg','image/png','image/webp'].includes(photo.type) || photo.size > 8*1024*1024) { setError('Choose a JPG, PNG or WebP under 8 MB.'); return } setError('');setFile(photo);setPreview(URL.createObjectURL(photo)) }} />
            <p className="text-xs text-neutral-500">Use a clear portrait, up to 8 MB. Review the generated options for an accurate likeness.</p>
            {preview && <img src={preview} alt="Selected portrait" className="h-32 w-24 rounded-xl object-cover" />}
            <fieldset className="space-y-3"><legend className="text-sm font-medium">Choose your gender</legend><p className="text-xs text-neutral-500">This selects the clothing treatment for your cover.</p><div className="flex gap-3">{(['male','female'] as const).map(value => <button key={value} type="button" aria-pressed={tailoring===value} onClick={()=>setTailoring(value)} className="min-h-12 flex-1 rounded-xl border px-4 capitalize aria-pressed:border-orange-500 aria-pressed:bg-orange-50">{value}</button>)}</div></fieldset>
          </div>}
          {step === 1 && <div className="space-y-4"><h2 className="text-xl font-medium">Your education</h2>
            {fieldMeta.filter(item=>['school','degreeClass'].includes(item.key)).map(({key,label,placeholder})=><div key={key} className="space-y-2"><Label htmlFor={key}>{label} (optional)</Label><Input id={key} value={fields[key]??''} onChange={event=>setField(key,event.target.value)} placeholder={placeholder} /></div>)}
            <div className="space-y-2"><Label htmlFor="cover-cgpa">CGPA (optional)</Label><div className="flex gap-2"><Input id="cover-cgpa" type="number" min="0" max={cgpaScale} step="0.01" value={cgpaValue} onChange={event=>setCgpaValue(event.target.value)} placeholder="Your score" /><select aria-label="CGPA scale" value={cgpaScale} onChange={event=>setCgpaScale(event.target.value)} className="rounded-xl border px-3"><option value="4.0">Out of 4.0</option><option value="5.0">Out of 5.0</option></select></div></div>
          </div>}
          {step === 2 && <div className="space-y-4"><h2 className="text-xl font-medium">What should appear on your cover?</h2><p className="text-sm text-neutral-500">Optional details. Leave anything blank to leave it off.</p>
            {fieldMeta.filter(item=>['name','fieldOfStudy','country','cohort'].includes(item.key)).map(({key,label,placeholder})=><div key={key} className="space-y-2"><Label htmlFor={key}>{label}</Label><Input id={key} value={fields[key]??''} onChange={event=>setField(key,event.target.value)} placeholder={placeholder} /></div>)}
            <Label htmlFor="cover-impact">Impact statement (optional)</Label><Textarea id="cover-impact" maxLength={420} value={fields.impactStatement??''} onChange={event=>setField('impactStatement',event.target.value)} />
          </div>}
          {step === 3 && <div className="space-y-4"><h2 className="text-xl font-medium">Review before generating</h2>{preview && <img src={preview} alt="Portrait to be used" className="h-24 w-20 rounded-xl object-cover" />}<p className="text-sm capitalize">Clothing treatment: {tailoring}</p><dl className="divide-y">{Object.entries(fields).filter(([,value])=>value).map(([key,value])=><div key={key} className="py-2"><dt className="text-xs text-neutral-500">{fieldMeta.find(item=>item.key===key)?.label.replace(' (over 5.0)','')??'Impact statement'}</dt><dd className="break-words text-sm">{value}</dd></div>)}</dl><button type="button" onClick={()=>setWelcome(true)} className="min-h-11 text-sm underline">Review photo-edit consent</button></div>}
          <div className="flex gap-3">{step>0 && <Button variant="outline" disabled={busy} onClick={()=>{setError('');setStep(step-1)}} className="min-h-12">Back</Button>}
          <Button className="cover-primary min-h-12 flex-1" disabled={busy || (step===3 && (!enabled || !consent))} onClick={()=>{
            setError('');
            if(step===0 && (!file || !tailoring || !consent)) {setError('Choose a portrait and gender, then agree to the photo-edit consent.');return}
            if(step===1) {if(cgpaValue && (!Number.isFinite(Number(cgpaValue)) || Number(cgpaValue)<0 || Number(cgpaValue)>Number(cgpaScale))) {setError('Your CGPA must be within the selected scale.');return} setField('cgpa',cgpaValue ? cgpaValue+' / '+cgpaScale : '')}
            if(step<3) setStep(step+1); else void submit()
          }}>{busy ? 'Preparing…' : step===3 ? 'Generate two covers' : 'Continue'}</Button></div>
          {step===3 && !enabled && <p role="status" className="text-sm text-neutral-600">Generation is currently unavailable. No photo has been submitted.</p>}
        </div>
      ) : null}

      {statusCopy ? <div role="status" className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-950"><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />{statusCopy}</div> : null}
      {generation?.status === 'ready' && hasOptions ? <div className="space-y-4"><div><p className="text-xs font-medium uppercase tracking-[.22em] text-amber-800">Choose your cover</p><h2 className="mt-1 text-2xl font-medium text-stone-950">Two editorial directions, one you.</h2></div><div className="grid gap-5 sm:grid-cols-2">{([['executive-charcoal', 'Executive Charcoal'], ['leadership-ivory', 'Leadership Ivory']] as const).map(([variant, label]) => <div key={variant} className="rounded-[24px] border border-stone-200 bg-white p-3 "><img src={generation.options[variant]} alt={`${label} Top100 magazine cover option`} className="aspect-[4/5] w-full rounded-[16px] object-cover" /><div className="flex items-center justify-between gap-3 p-3"><span className="text-sm font-medium text-stone-900">{label}</span><Button type="button" onClick={() => void choose(variant)} disabled={busy} className="rounded-full bg-stone-950 font-medium text-white">Choose</Button></div></div>)}</div><Button type="button" variant="outline" onClick={() => void reject()} disabled={busy} className="rounded-full border-stone-300 font-medium text-stone-700">Neither looks like me</Button></div> : null}
      {selected ? <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]"><img src={selected} alt="Your selected Top100 Africa Future Leaders magazine cover" className="aspect-[4/5] w-full rounded-[24px] object-cover " /><div className="flex flex-col justify-center rounded-[24px] border border-amber-200 bg-amber-50 p-6"><p className="text-xs font-medium uppercase tracking-[.22em] text-amber-800">Selected cover</p><h2 className="mt-2 text-3xl font-medium text-stone-950">Ready for your portfolio.</h2><p className="mt-3 text-sm font-semibold leading-6 text-stone-700">Download it for your profile, or share your public cover link. Your original dashboard avatar is unchanged.</p><div className="mt-6 flex flex-wrap gap-3"><a href={selected} download="top100-africa-future-leaders-cover.png" className="inline-flex min-h-12 items-center rounded-full bg-stone-950 px-5 text-sm font-medium text-white"><Download className="mr-2 h-4 w-4" aria-hidden="true" />Download</a><Button type="button" onClick={() => void share()} className="min-h-12 rounded-full bg-white font-medium text-stone-950 hover:bg-white"><Share2 className="mr-2 h-4 w-4" aria-hidden="true" />Share cover</Button></div></div></div> : null}
    </section>
  )
}
