import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

const taskSchema = z.object({
  title: z.string().trim().min(1).max(240),
  programme: z.string().trim().min(1).max(160),
  owner: z.string().trim().max(120),
  due_date: z.union([z.iso.date(), z.null()]),
  priority: z.enum(['P0', 'P1', 'P2']),
  status: z.enum(['not_started', 'in_progress', 'blocked', 'done']),
  blocker: z.string().trim().max(1000),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { data, error } = await createAdminClient().from('programme_manager_tasks').select('*').order('created_at')
  if (error) return NextResponse.json({ message: 'Could not load programme tasks.' }, { status: 500 })
  return NextResponse.json({ tasks: data })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const parsed = taskSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ message: 'Check the task details.' }, { status: 400 })
  const { data, error } = await createAdminClient().from('programme_manager_tasks').insert(parsed.data).select().single()
  if (error) return NextResponse.json({ message: 'Could not save the task.' }, { status: 500 })
  return NextResponse.json({ task: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const parsed = taskSchema.extend({ id: z.guid() }).safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ message: 'Check the task details.' }, { status: 400 })
  const { id, ...task } = parsed.data
  const { data, error } = await createAdminClient().from('programme_manager_tasks').update(task).eq('id', id).select().maybeSingle()
  if (error) return NextResponse.json({ message: 'Could not save the task.' }, { status: 500 })
  if (!data) return NextResponse.json({ message: 'Task not found.' }, { status: 404 })
  return NextResponse.json({ task: data })
}
