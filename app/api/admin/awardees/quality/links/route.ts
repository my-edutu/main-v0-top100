import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { rejectCrossOriginMutation } from '@/lib/security/same-origin'
import { QUALITY_BATCH_SIZE } from '@/lib/admin/profile-quality'
import { loadProfileQuality } from '@/lib/admin/profile-quality-server'
import { checkProfileLink } from '@/lib/admin/profile-link-probe'

export const runtime = 'nodejs'
const input = z.object({ ids: z.array(z.string().uuid()).min(1).max(QUALITY_BATCH_SIZE) })

export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOriginMutation(request)
  if (crossOrigin) return crossOrigin
  const access = await requireAdmin(request)
  if ('error' in access) return access.error
  const parsed = input.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ message: 'Select a valid batch of public profiles.' }, { status: 400 })

  try {
    const profiles = await loadProfileQuality([...new Set(parsed.data.ids)])
    const jobs = profiles.flatMap(({ row, targets }) => targets.map(target => ({ id: row.id, target })))
    const checked = new Map(profiles.map(({ row }) => [row.id, [...row.invalidLinks]]))
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(12000)])
    let index = 0
    await Promise.all(Array.from({ length: Math.min(jobs.length, 8) }, async () => {
      while (index < jobs.length) {
        const { id, target } = jobs[index++]
        checked.get(id)?.push(await checkProfileLink(target, signal))
      }
    }))
    return Response.json({ results: Object.fromEntries(checked) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ message: 'Link checks are temporarily unavailable.' }, { status: 503 })
  }
}
