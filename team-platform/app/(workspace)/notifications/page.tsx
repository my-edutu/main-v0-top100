import { Card, PageHeader } from '@/components/ui'
import { NotificationList } from '@/components/notification-list'
import { requireMember } from '@/lib/auth'
import { getNotifications } from '@/lib/data'

export const metadata = { title: 'Notifications' }
export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const member = await requireMember()
  const data = await getNotifications(member)
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Account updates" title="Notifications" description="Assignments, commissions, withdrawals and payment events." />
      <Card className="overflow-hidden"><NotificationList rows={data.rows} unread={data.unread} /></Card>
    </div>
  )
}
