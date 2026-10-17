import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/api/require-admin'
import PageHeader from '../components/PageHeader'
import { BotWorkspace } from './workspace'

export default async function AflBotAdminPage() {
  const access = await requireAdmin()
  if ('error' in access) redirect(access.error.status === 401 ? '/admin/login' : '/dashboard')
  return <div className="space-y-6 pb-10">
    <PageHeader eyebrow="Africa Future Leaders" title="AFL WhatsApp bot"
      description="Give the bot approved knowledge and send reviewed announcements to your test group." />
    <BotWorkspace />
  </div>
}
