import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { requireSessionsAccess } from '@/lib/sessions-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  await requireSessionsAccess('/dashboard/discover/event-videos/2026-day-1')

  const file = await readFile(join(process.cwd(), 'private/session-materials/beyond-the-paycheck.pptx'))

  return new Response(new Uint8Array(file), {
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'Content-Disposition': 'attachment; filename="Beyond-the-Paycheck-session-slides.pptx"',
      'Content-Length': String(file.byteLength),
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    },
  })
}
