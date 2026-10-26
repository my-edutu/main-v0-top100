'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { Button, EmptyState } from '@/components/ui'
import { relativeTime } from '@/lib/format'

type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

export function NotificationList({ rows, unread }: { rows: Notification[]; unread: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function markAll() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Could not mark notifications read')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark notifications read')
    } finally {
      setLoading(false)
    }
  }

  if (!rows.length) {
    return (
      <EmptyState
        title="No notifications yet"
        description="Assignments, commissions, withdrawals and payment events will appear here."
        icon={<Bell className="h-5 w-5" />}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-ink/[0.07] px-4 py-3">
        <p className="text-[11px] text-muted">
          {unread ? `${unread} unread` : 'Everything is read'}
        </p>
        <Button variant="ghost" size="sm" onClick={markAll} disabled={loading || !unread}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
          Mark all read
        </Button>
      </div>
      {error ? <p className="px-4 py-2 text-xs text-red-700">{error}</p> : null}
      <ul>
        {rows.map((row) => {
          const content = (
            <div className={`flex gap-3 px-4 py-3.5 ${row.read_at ? '' : 'bg-ember/[0.035]'}`}>
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${row.read_at ? 'bg-ink/15' : 'bg-ember'}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold">{row.title}</p>
                {row.body ? <p className="mt-0.5 text-xs leading-5 text-muted">{row.body}</p> : null}
                <p className="mt-1 text-[10px] text-muted">{relativeTime(row.created_at)}</p>
              </div>
            </div>
          )
          return (
            <li key={row.id} className="border-t border-ink/[0.07] first:border-t-0">
              {row.link ? (
                <Link href={row.link} className="block transition hover:bg-ink/[0.02]">
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
