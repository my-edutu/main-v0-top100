import { describe, expect, it, vi } from 'vitest'

import { generatePortfolioCoverSet } from '@/lib/portfolio-cover/generate'

describe('portfolio cover generation orchestration', () => {
  it('edits both fixed variants, renders deterministic covers, and persists ready state', async () => {
    const repo = {
      update: vi.fn(async (_id: string, patch: Record<string, unknown>) => patch),
      uploadOption: vi.fn(async () => undefined),
    }
    const editor = { edit: vi.fn(async () => ({ image: Buffer.from('image'), requestId: 'req' })) }
    const render = vi.fn(async () => Buffer.from('cover'))

    await generatePortfolioCoverSet({
      id: 'gen-1', memberId: 'member-1', memberName: 'Ada Lovelace', tailoring: 'female', fields: {}, portrait: Buffer.from('portrait'), mask: Buffer.from('mask'),
    }, { repo, editor, render })

    expect(editor.edit).toHaveBeenCalledTimes(2)
    expect(editor.edit.mock.calls.map(([call]) => call.variant)).toEqual(['executive-charcoal', 'leadership-ivory'])
    expect(repo.uploadOption).toHaveBeenCalledTimes(2)
    expect(repo.update).toHaveBeenLastCalledWith('gen-1', expect.objectContaining({ status: 'ready', attempt: 1 }))
  })

  it('marks a generation failed without exposing provider details', async () => {
    const repo = { update: vi.fn(async (_id: string, patch: Record<string, unknown>) => patch), uploadOption: vi.fn() }
    const editor = { edit: vi.fn(async () => { throw new Error('secret upstream body') }) }
    await expect(generatePortfolioCoverSet({ id: 'gen-1', memberId: 'member-1', memberName: 'Ada', tailoring: 'male', fields: {}, portrait: Buffer.from('portrait'), mask: Buffer.from('mask') }, { repo, editor, render: vi.fn() })).rejects.toThrow('secret upstream body')
    expect(repo.update).toHaveBeenLastCalledWith('gen-1', expect.objectContaining({ status: 'failed', failure_code: 'generation_failed' }))
  })
})
