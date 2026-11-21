export type PriorityTask = { id: string; due_date: string | null; priority: string; status: string }

/** `today` is a local calendar date. The current week ends on Sunday. */
export function selectPriorities<T extends PriorityTask>(tasks: T[], today: string): T[] {
  const date = new Date(`${today}T12:00:00Z`)
  const daysUntilSunday = (7 - date.getUTCDay()) % 7
  date.setUTCDate(date.getUTCDate() + daysUntilSunday)
  const end = date.toISOString().slice(0, 10)
  return tasks.filter((task) => task.status !== 'done' && task.due_date && task.due_date <= end)
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!) || a.priority.localeCompare(b.priority) || a.id.localeCompare(b.id))
    .slice(0, 5)
}
