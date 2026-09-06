import { describe, expect, it } from 'vitest'

describe('awardee import planning', () => {
  it('gives duplicate names distinct slugs without overwriting an existing person', async () => {
    const module = await import('@/lib/awardee-import-planner').catch(() => null)
    expect(module?.planAwardeeImport).toBeTypeOf('function')

    const result = module!.planAwardeeImport(
      [
        { name: 'Alex Kim', slug: 'alex-kim', email: 'new-one@example.com' },
        { name: 'Alex Kim', slug: 'alex-kim', email: 'new-two@example.com' },
      ],
      [{ id: 'existing-1', slug: 'alex-kim', email: 'original@example.com' }],
    )

    expect(result.toUpdate).toEqual([])
    expect(result.toInsert.map((row) => row.slug)).toEqual(['alex-kim-2', 'alex-kim-3'])
  })

  it('updates the same person by normalized email and preserves their established slug', async () => {
    const { planAwardeeImport } = await import('@/lib/awardee-import-planner')
    const result = planAwardeeImport(
      [{ name: 'Alexandra Kim', slug: 'alexandra-kim', email: ' ALEX@EXAMPLE.COM ' }],
      [{ id: 'existing-1', slug: 'alex-kim', email: 'alex@example.com' }],
    )

    expect(result.toInsert).toEqual([])
    expect(result.toUpdate).toEqual([
      { id: 'existing-1', name: 'Alexandra Kim', slug: 'alex-kim', email: 'alex@example.com' },
    ])
  })

  it('rejects duplicate emails inside one spreadsheet', async () => {
    const { planAwardeeImport } = await import('@/lib/awardee-import-planner')
    expect(() => planAwardeeImport([
      { name: 'First Person', slug: 'first-person', email: 'same@example.com' },
      { name: 'Second Person', slug: 'second-person', email: 'SAME@example.com' },
    ], [])).toThrow('Duplicate email in spreadsheet: same@example.com')
  })

  it('rejects rows without an email because they cannot be safely matched or claimed', async () => {
    const { planAwardeeImport } = await import('@/lib/awardee-import-planner')
    expect(() => planAwardeeImport([
      { name: 'No Email Person', slug: 'no-email-person', email: null },
    ], [])).toThrow('Every imported awardee needs an email: No Email Person')
  })
})
