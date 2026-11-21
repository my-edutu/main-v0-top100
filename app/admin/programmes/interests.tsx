'use client'
import { useEffect, useState } from 'react'
type Entry = { id:string; kind:string; consented_at:string; profiles:{ full_name:string | null; email:string | null } | null; programme_manager_activities:{ title:string } | null }
export function Interests() {
 const [items,setItems]=useState<Entry[]>([]); const [error,setError]=useState(''); const [loading,setLoading]=useState(true)
 useEffect(()=>{fetch('/api/admin/programme-manager/interests').then(async r=>{const body=await r.json(); if(!r.ok) throw new Error(body.message);setItems(body.interests)}).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[])
 return <section className="rounded-lg border bg-white p-5"><h2 className="font-semibold">Member interest</h2><p className="mt-1 text-sm text-neutral-600">Members have consented to follow-up. Interest does not mean enrollment or acceptance.</p>{error&&<p role="alert" className="mt-4 text-red-700">{error}</p>}{loading?<p>Loading…</p>:!error&&items.length===0?<p className="mt-4 text-sm">No interests recorded yet.</p>:<ul className="mt-4 divide-y">{items.map(i=><li key={i.id} className="py-3"><p className="font-medium">{i.profiles?.full_name || 'Member'} · {i.kind}</p><p className="text-sm text-neutral-600">{i.profiles?.email || 'No email'} · {i.programme_manager_activities?.title || 'General interest'} · {new Date(i.consented_at).toLocaleDateString('en-GB')}</p></li>)}</ul>}</section>
}
