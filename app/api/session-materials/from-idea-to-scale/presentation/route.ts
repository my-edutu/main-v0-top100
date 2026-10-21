import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { requireSessionsAccess } from '@/lib/sessions-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  await requireSessionsAccess('/dashboard/discover/event-videos/2026-from-idea-to-scale')

  const file = await readFile(join(process.cwd(), 'private/session-materials/from-idea-to-scale-top100-afl-2026.pdf'))

  return new Response(new Uint8Array(file), {
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'Content-Disposition': 'inline; filename="From-Idea-to-Scale-workshop-preview.pdf"',
      'Content-Length': String(file.byteLength),
      'Content-Type': 'application/pdf',
    },
  })
}
