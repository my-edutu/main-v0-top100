import { NextResponse } from 'next/server'

import { betterAuthServer } from '@/lib/better-auth/server'
import { createClient } from '@/lib/supabase/server'

type EnsureProfilePayload = {
  name?: string | null
  email?: string | null
  role?: string | null
}

const DEFAULT_ROLE = 'user'

export async function POST(request: Request) {
  try {
    const headers = new Headers(request.headers)
    const session = await betterAuthServer.api.getSession({
      headers,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as EnsureProfilePayload
    const supabase = createClient(true)

    const profilePayload = {
      id: session.user.id,
      email: body.email ?? session.user.email ?? null,
      full_name: body.name ?? session.user.name ?? null,
      role: body.role ?? (session.user as Record<string, unknown>)?.role ?? DEFAULT_ROLE,
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })

    if (error) {
      console.error('[profiles/ensure] upsert failed', error)
      return NextResponse.json({ error: 'Failed to sync profile' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[profiles/ensure] unexpected error', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
