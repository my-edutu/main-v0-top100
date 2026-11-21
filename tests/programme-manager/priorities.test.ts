import { describe, expect, it } from 'vitest'
import { selectPriorities } from '@/lib/programme-manager/priorities'

describe('weekly priorities', () => {
  it('includes overdue and current-week tasks, excludes completed and future tasks, and caps at five', () => {
    const tasks = [
      { id: 'overdue', due_date: '2027-01-03', priority: 'P1', status: 'blocked' },
      { id: 'week', due_date: '2027-01-08', priority: 'P0', status: 'not_started' },
      { id: 'future', due_date: '2027-01-18', priority: 'P0', status: 'not_started' },
      { id: 'done', due_date: '2027-01-04', priority: 'P0', status: 'done' },
    ]
    expect(selectPriorities(tasks, '2027-01-04').map((task) => task.id)).toEqual(['overdue', 'week'])
    expect(selectPriorities(Array.from({ length: 8 }, (_, i) => ({ ...tasks[1], id: String(i) })), '2027-01-04')).toHaveLength(5)
  })
})
