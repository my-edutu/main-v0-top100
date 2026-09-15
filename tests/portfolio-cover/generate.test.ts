import { describe, expect, it, vi } from 'vitest'

import { generatePortfolioCoverSet } from '@/lib/portfolio-cover/generate'

describe('portfolio cover generation orchestration', () => {
  it('uses one AI edit and persists one finished branded cover', async () => {
    const repo = {
      update: vi.fn(async (_id: string, patch: Record<string, unknown>) => patch),
      uploadOption: vi.fn(async () => undefined),
    }
    const editor = { edit: vi.fn(async () => ({ image: Buffer.from('image'), requestId: 'req' })) }
    const render = vi.fn(async () => Buffer.from('cover'))

    await generatePortfolioCoverSet({
      id: 'gen-1', memberId: 'member-1', memberName: 'Ada Lovelace', tailoring: 'female', fields: {}, portrait: Buffer.from('portrait'),
    }, { repo, editor, render })

    expect(editor.edit).toHaveBeenCalledTimes(1)
    expect(editor.edit.mock.calls[0][0].variant).toBe('executive-charcoal')
    expect(render.mock.calls.map(([call]) => call.variant)).toEqual(['executive-charcoal'])
    expect(repo.uploadOption).toHaveBeenCalledTimes(1)
    expect(repo.update).toHaveBeenLastCalledWith('gen-1', expect.objectContaining({
      status: 'ready',
      attempt: 1,
      option_paths: { 'executive-charcoal': 'member-1/gen-1/executive-charcoal.png' },
      provider_request_ids: ['req'],
    }))
  })

  it('marks a generation failed without exposing provider details', async () => {
    const repo = { update: vi.fn(async (_id: string, patch: Record<string, unknown>) => patch), uploadOption: vi.fn() }
    const editor = { edit: vi.fn(async () => { throw new Error('secret upstream body') }) }
    await expect(generatePortfolioCoverSet({ id: 'gen-1', memberId: 'member-1', memberName: 'Ada', tailoring: 'male', fields: {}, portrait: Buffer.from('portrait') }, { repo, editor, render: vi.fn() })).rejects.toThrow('secret upstream body')
    expect(repo.update).toHaveBeenLastCalledWith('gen-1', expect.objectContaining({ status: 'failed', failure_code: 'generation_failed' }))
  })
})
