import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

const partner = z.object({ name: z.string().trim().min(1).max(200), programme: z.string().trim().max(200), contact: z.string().trim().max(500), notes: z.string().trim().max(2000), status: z.enum(['prospect','in_discussion','confirmed','declined']), evidence: z.string().trim().max(1000) }).refine(x => x.status !== 'confirmed' || !!x.evidence)
const outcome = z.object({ activity_id: z.guid().nullable(), indicator: z.string().trim().min(1).max(200), value: z.number().finite().min(0).max(1e12), unit: z.string().trim().min(1).max(60), evidence: z.string().trim().max(1000), status: z.enum(['reported','verified']), notes: z.string().trim().max(2000) }).refine(x => x.status !== 'verified' || !!x.evidence)
const bodySchema = z.discriminatedUnion('kind', [z.object({ kind: z.literal('partner'), id: z.guid().optional(), record: partner }), z.object({ kind: z.literal('outcome'), id: z.guid().optional(), record: outcome })])
export async function GET(request: NextRequest) {
 const auth = await requireAdmin(request); if ('error' in auth) return auth.error
 const db = createAdminClient()
 const [partners, outcomes] = await Promise.all([db.from('programme_manager_partners').select('*').order('created_at'), db.from('programme_manager_outcomes').select('*').order('created_at')])
 if (partners.error || outcomes.error) return NextResponse.json({ message: 'Could not load partnerships and outcomes.' }, { status: 500 })
 return NextResponse.json({ partners: partners.data, outcomes: outcomes.data })
}
export async function POST(request: NextRequest) {
 const auth = await requireAdmin(request); if ('error' in auth) return auth.error
 const parsed = bodySchema.safeParse(await request.json().catch(() => null))
 if (!parsed.success) return NextResponse.json({ message: 'Check the record and evidence.' }, { status: 400 })
 const { kind, id } = parsed.data
 const record: Record<string, unknown> = parsed.data.record
 const table = createAdminClient().from(kind === 'partner' ? 'programme_manager_partners' : 'programme_manager_outcomes')
 const { data, error } = await (id ? table.update(record).eq('id', id) : table.insert(record)).select().maybeSingle()
 if (error) return NextResponse.json({ message: 'Could not save the record.' }, { status: 500 })
 if (!data) return NextResponse.json({ message: 'Record not found.' }, { status: 404 })
 return NextResponse.json({ record: data })
}
