'use client'
import { useEffect, useState, type FormEvent } from 'react'
import { createFeatureSubmission, fetchMemberHubState, type MemberProfile, type MemberFeatureSubmission } from '@/lib/member-hub'
const categories = { bio:'BIO/profile spotlight', story:'Awardee story', product:'Product/startup', project:'Impact project' }
export function FeatureSection({ member }: { member:MemberProfile }) {
 const [step,setStep]=useState(0)
 const [title,setTitle]=useState('')
 const [summary,setSummary]=useState('')
 const [category,setCategory]=useState<MemberFeatureSubmission['category']>('bio')
 const [saving,setSaving]=useState(false)
 const [saved,setSaved]=useState(false)
 const [error,setError]=useState('')
 const [submissions,setSubmissions]=useState<MemberFeatureSubmission[]>([])
 const [historyState,setHistoryState]=useState<'loading'|'ready'|'error'>('loading')
 const [reload,setReload]=useState(0)
 useEffect(()=>{
  let cancelled=false
  setHistoryState('loading')
  fetchMemberHubState().then(data=>{
   if(cancelled) return
   setSubmissions(current=>[...new Map([...current.filter(item=>item.memberId===member.id),...data.featureSubmissions.filter(item=>item.memberId===member.id)].map(item=>[item.id,item])).values()].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)))
   setHistoryState('ready')
  }).catch(()=>{if(!cancelled)setHistoryState('error')})
  return ()=>{cancelled=true}
 },[member.id,reload])
 async function submit(event:FormEvent) {
  event.preventDefault(); if(saving || saved) return; setError('')
  if((step===0 && !title.trim()) || (step===2 && !summary.trim())) { setError('Please complete this answer.'); return }
  if(step<3) {setStep(step+1); return}
  setSaving(true)
  try { const submission=await createFeatureSubmission({memberId:member.id,memberName:member.name,contactEmail:member.email,title:title.trim(),summary:summary.trim(),category}); setSubmissions(current=>[submission,...current.filter(item=>item.id!==submission.id)]); setSaved(true) }
  catch(cause) {setError(cause instanceof Error ? cause.message : 'Could not send. Please try again.')}
  finally {setSaving(false)}
 }
 return <div className="mx-auto max-w-xl space-y-8">
 <p className="text-sm leading-6 text-stone-600">Have more than one story? Submit each separately. Top100 can feature multiple posts from you, subject to editorial review.</p>
 {saved ? <div className="space-y-4 py-4"><p role="status">Your pitch has been sent to the AFL team for editorial review.</p><button type="button" className="min-h-12 rounded-xl border px-5" onClick={()=>{setTitle('');setSummary('');setCategory('bio');setStep(0);setError('');setSaved(false)}}>Submit another story</button></div> : <form onSubmit={submit} className="space-y-6 py-4">
  <p className="text-sm text-orange-700">Your story · {step+1} of 4</p>
  <h2 className="text-2xl font-medium">{['Give your story a title.','What kind of story is it?','Tell us why it matters.','Review your pitch.'][step]}</h2>
  {step===0 && <input aria-label="Feature title" autoFocus required value={title} onChange={e=>setTitle(e.target.value)} placeholder="My climate project for rural schools" className="h-14 w-full rounded-xl border px-4 text-base" />}
  {step===1 && <fieldset className="space-y-3"><legend className="sr-only">Category</legend>{Object.entries(categories).map(([value,label])=><label key={value} className="flex min-h-14 items-center gap-3 rounded-xl border p-4"><input type="radio" checked={category===value} onChange={()=>setCategory(value as typeof category)} name="category" />{label}</label>)}</fieldset>}
  {step===2 && <textarea aria-label="Summary" autoFocus required value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Share your work, its impact, and what you would like us to feature." rows={7} className="w-full rounded-xl border p-4 text-base" />}
  {step===3 && <dl className="space-y-4"><div><dt className="text-xs text-neutral-500">Title</dt><dd className="break-words">{title}</dd></div><div><dt className="text-xs text-neutral-500">Category</dt><dd>{categories[category]}</dd></div><div><dt className="text-xs text-neutral-500">Summary</dt><dd className="whitespace-pre-wrap break-words">{summary}</dd></div></dl>}
  {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  <div className="flex gap-3">{step>0 && <button type="button" disabled={saving} onClick={()=>{setError('');setStep(step-1)}} className="min-h-12 rounded-xl border px-5">Back</button>}<button disabled={saving} className="min-h-12 flex-1 rounded-xl px-4 text-black disabled:opacity-50" style={{background:'linear-gradient(90deg,#f97316,#fb923c,#f59e0b)'}}>{saving?'Sending…':step===3?'Submit to the team':'Continue'}</button></div>
 </form>}
 <section aria-labelledby="feature-history-title" className="border-t border-stone-200 pt-6">
  <h2 id="feature-history-title" className="text-lg font-medium">Your submissions</h2>
  {historyState==='loading' && <p role="status" className="py-4 text-sm text-stone-500">Loading submissions…</p>}
  {historyState==='error' && <div role="alert" className="py-4 text-sm"><p>Could not load your submission history.</p><button type="button" className="min-h-11 underline" onClick={()=>setReload(value=>value+1)}>Try again</button></div>}
  {historyState==='ready' && submissions.length===0 && <p className="py-4 text-sm text-stone-500">No submissions yet. Your stories and review statuses will appear here.</p>}
  <ul className="divide-y divide-stone-200">{submissions.map(item=><li key={item.id} className="space-y-2 py-4">
   <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="min-w-0 break-words text-base font-medium">{item.title}</h3><span className="text-xs text-orange-700">{{pending:'Awaiting review',reviewing:'In review',approved:'Approved',published:'Published'}[item.status]}</span></div>
   <p className="text-xs text-stone-500">{categories[item.category]}{Number.isFinite(Date.parse(item.createdAt)) ? ` · ${new Intl.DateTimeFormat('en',{month:'short',day:'numeric',year:'numeric'}).format(new Date(item.createdAt))}` : ''}</p>
   <p className="line-clamp-2 break-words text-sm leading-6 text-stone-600">{item.summary}</p>
  </li>)}</ul>
 </section>
 </div>
}
