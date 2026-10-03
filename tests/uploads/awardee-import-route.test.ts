import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as XLSX from 'xlsx'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  storageFrom: vi.fn(),
}))
vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: vi.fn().mockResolvedValue({ user: { id: 'admin-1' } }) }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ from: mocks.from, rpc: mocks.rpc, storage: { from: mocks.storageFrom } }) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { POST } from '@/app/api/awardees/import/route'

function request(action: string, mapping?: unknown, previewId?: string) {
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
    ['Full Name', 'Email', 'About'],
    ['Ada Okoro', 'ada@example.com', 'AFL winner and researcher'],
  ]), 'Winners')
  const bytes = new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'xlsx' }))
  const form = new FormData()
  form.set('file', new File([bytes], 'winners.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  form.set('action', action)
  if (mapping) form.set('mapping', JSON.stringify(mapping))
  if (previewId) form.set('previewId', previewId)
  return new NextRequest('http://localhost:3000/api/awardees/import', { method: 'POST', body: form })
}

describe('admin winner import review', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.from.mockReturnValue({
      select: () => ({ order: () => ({ range: vi.fn().mockResolvedValue({ data: [], error: null }) }) }),
    })
    mocks.storageFrom.mockReturnValue({
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
      createSignedUploadUrl: vi.fn().mockResolvedValue({ data: { token: 'signed-token' }, error: null }),
    })
    mocks.rpc.mockResolvedValue({ data: { id: 'batch-1', count: 1 }, error: null })
  })

  it('prepares uploads for the 5.9 MiB CSV used by the awardee import', async () => {
    const response = await POST(new NextRequest('http://localhost:3000/api/awardees/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'prepare-upload',
        filename: '1ST BATCH 2026 AFL - Sheet1.csv',
        fileSize: Math.round(5.9 * 1024 * 1024),
      }),
    }))

    expect(response.status).toBe(200)
    expect((await response.json()).bucket).toBe('awardee-import-staging')
    expect(mocks.storageFrom).toHaveBeenCalledWith('awardee-import-staging')
  })

  it('rejects an import spreadsheet larger than 10 MiB', async () => {
    const response = await POST(new NextRequest('http://localhost:3000/api/awardees/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'prepare-upload', filename: 'winners.csv', fileSize: 10 * 1024 * 1024 + 1 }),
    }))

    expect(response.status).toBe(400)
  })

  it('previews a mapping without writing winner records', async () => {
    const inspection = await POST(request('inspect'))
    const { mapping } = await inspection.json()
    expect(inspection.status).toBe(200)
    const response = await POST(request('preview', mapping))
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.summary.new).toBe(1)
    expect(body.actions[0].payload.bio).toBe('AFL winner and researcher')
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('rejects a commit when the reviewed preview does not match', async () => {
    const inspection = await POST(request('inspect'))
    const { mapping } = await inspection.json()
    const response = await POST(request('commit', mapping, 'stale-preview'))
    expect(response.status).toBe(409)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
