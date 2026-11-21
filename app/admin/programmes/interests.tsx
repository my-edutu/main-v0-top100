'use client'
import { useEffect, useState } from 'react'
import { communityCategories, communityRoles, type CommunityDetails } from '@/lib/programme-manager/interest'
type Entry = { id:string; kind:string; community_details:CommunityDetails | null; consented_at:string; profiles:{ full_name:string | null; email:string | null } | null; programme_manager_activities:{ title:string } | null }
export function Interests() {
 const [items,setItems]=useState<Entry[]>([]); const [error,setError]=useState(''); const [loading,setLoading]=useState(true)
 useEffect(()=>{fetch('/api/admin/programme-manager/interests').then(async r=>{const body=await r.json(); if(!r.ok) throw new Error(body.message);setItems(body.interests)}).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[])
 return <section className="rounded-lg border bg-white p-5"><h2 className="font-semibold">Member interest</h2><p className="mt-1 text-sm text-neutral-600">Members have consented to follow-up. Interest does not mean enrollment or acceptance.</p>{error&&<p role="alert" className="mt-4 text-red-700">{error}</p>}{loading?<p>Loading…</p>:!error&&items.length===0?<p className="mt-4 text-sm">No interests recorded yet.</p>:<ul className="mt-4 divide-y">{items.map(i=><li key={i.id} className="py-3"><p className="font-medium">{i.community_details?.full_name || i.profiles?.full_name || 'Member'} · {i.kind === 'community' ? 'Community Impact Network' : i.kind}</p><p className="text-sm text-neutral-600">{i.community_details?.email || i.profiles?.email || 'No email'} · {i.programme_manager_activities?.title || 'General interest'} · {new Date(i.consented_at).toLocaleDateString('en-GB')}</p>{i.community_details && <dl className="mt-2 space-y-1 text-sm">
   <div><dt className="inline font-medium">Roles </dt><dd className="inline">{i.community_details.roles.map(role => communityRoles[role]).join(', ')}</dd></div>
   <div><dt className="inline font-medium">Categories </dt><dd className="inline">{i.community_details.categories.map(category => communityCategories[category]).join(', ')}</dd></div>
   <div><dt className="inline font-medium">Location and availability </dt><dd className="inline">{i.community_details.location} · {i.community_details.availability}</dd></div>
   <div><dt className="inline font-medium">Contribution </dt><dd className="inline whitespace-pre-wrap break-words">{i.community_details.contribution}</dd></div>
 </dl>}</li>)}</ul>}</section>
}
