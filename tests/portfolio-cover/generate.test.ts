import { describe, expect, it, vi } from 'vitest'

import { generatePortfolioCoverSet } from '@/lib/portfolio-cover/generate'

describe('portfolio cover generation orchestration', () => {
  it('places the uploaded portrait directly in the supplied template without an AI edit', async () => {
    const repo = {
      update: vi.fn(async (_id: string, patch: Record<string, unknown>) => patch),
      uploadOption: vi.fn(async () => undefined),
    }
    const editor = { edit: vi.fn(async () => ({ image: Buffer.from('edited-image'), requestId: 'req' })) }
    const render = vi.fn(async () => Buffer.from('cover'))

    await generatePortfolioCoverSet({
      id: 'gen-1', memberId: 'member-1', memberName: 'Ada Lovelace', tailoring: 'female', fields: {}, portrait: Buffer.from('portrait'),
    }, { repo, editor, render })

    expect(editor.edit).not.toHaveBeenCalled()
    expect(render.mock.calls.map(([call]) => call.portrait)).toEqual([Buffer.from('portrait')])
    expect(render.mock.calls.map(([call]) => call.memberName)).toEqual(['Ada Lovelace'])
    expect(repo.uploadOption).toHaveBeenCalledTimes(1)
    expect(repo.update).toHaveBeenLastCalledWith('gen-1', expect.objectContaining({
      status: 'ready',
      attempt: 1,
      option_paths: { 'executive-charcoal': 'member-1/gen-1/executive-charcoal.png' },
      provider_request_ids: [],
    }))
  })

  it('marks a failed template render without exposing upstream details', async () => {
    const repo = { update: vi.fn(async (_id: string, patch: Record<string, unknown>) => patch), uploadOption: vi.fn() }
    const render = vi.fn(async () => { throw new Error('secret upstream body') })
    await expect(generatePortfolioCoverSet({ id: 'gen-1', memberId: 'member-1', memberName: 'Ada', tailoring: 'male', fields: {}, portrait: Buffer.from('portrait') }, { repo, render })).rejects.toThrow('secret upstream body')
    expect(repo.update).toHaveBeenLastCalledWith('gen-1', expect.objectContaining({ status: 'failed', failure_code: 'generation_failed' }))
  })
})
