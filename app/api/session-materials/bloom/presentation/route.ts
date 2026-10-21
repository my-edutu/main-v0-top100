import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { requireSessionsAccess } from '@/lib/sessions-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  await requireSessionsAccess('/dashboard/discover/event-videos/2026-bloom-positioning')

  const file = await readFile(join(process.cwd(), 'private/session-materials/cynthia-ohaeri-bloom-preview.pdf'))

  return new Response(new Uint8Array(file), {
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'Content-Disposition': 'inline; filename="Cynthia-Ohaeri-BLOOM-preview.pdf"',
      'Content-Length': String(file.byteLength),
      'Content-Type': 'application/pdf',
    },
  })
}
