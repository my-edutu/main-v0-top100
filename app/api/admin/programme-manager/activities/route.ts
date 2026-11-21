import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

const amount = z.number().int().min(0).max(1_000_000_000_000)
const expense = z.object({ name: z.string().trim().min(1).max(120), essential: z.boolean(), estimated: amount.nullable(), quoted: amount.nullable(), quote_evidence: z.string().trim().max(500), in_kind: amount, in_kind_evidence: z.string().trim().max(500), spent: amount.nullable(), spending_evidence: z.string().trim().max(500) }).refine(x => x.spent === null || !!x.spending_evidence).refine((x) => x.quoted === null ? x.in_kind === 0 : x.in_kind <= x.quoted)
const activity = z.object({ title: z.string().trim().min(1).max(240), month: z.number().int().min(1).max(12), format: z.string().trim().max(200), lead: z.string().trim().max(200), partner: z.string().trim().max(500), gate: z.string().trim().max(1500), decision_rule: z.string().trim().max(1500), target: z.string().trim().max(1500), priority: z.enum(['P0','P1','P2']), status: z.enum(['planned','approved']), open_for_interest: z.boolean(), linked_event_id: z.guid().nullable(), costs: z.array(expense).max(100), cash_received: amount, cash_evidence: z.string().trim().max(500) })

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request); if ('error' in auth) return auth.error
  const { data, error } = await createAdminClient().from('programme_manager_activities').select('*').order('month').order('created_at')
  if (error) return NextResponse.json({ message: 'Could not load the planning calendar.' }, { status: 500 })
  return NextResponse.json({ activities: data })
}
export async function POST(request: NextRequest) { return save(request, false) }
export async function PATCH(request: NextRequest) { return save(request, true) }
async function save(request: NextRequest, update: boolean) {
  const auth = await requireAdmin(request); if ('error' in auth) return auth.error
  const body = await request.json().catch(() => null)
  const parsed = (update ? activity.extend({ id: z.guid() }) : activity).safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: 'Check the activity and cost details.' }, { status: 400 })
  const { id, ...values } = parsed.data as z.infer<typeof activity> & { id?: string }
  const table = createAdminClient().from('programme_manager_activities')
  const query = update ? table.update(values).eq('id', id!) : table.insert(values)
  const { data, error } = await query.select().maybeSingle()
  if (error) return NextResponse.json({ message: error.code === '23514' ? 'Approval requires evidence for all essential quotes and enough received funding or confirmed in-kind support.' : 'Could not save the activity. Check the linked event and try again.' }, { status: 400 })
  if (!data) return NextResponse.json({ message: 'Activity not found.' }, { status: 404 })
  return NextResponse.json({ activity: data }, { status: update ? 200 : 201 })
}
