import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/api/require-admin'
import TeamTemplates from './team-templates'

export const dynamic = 'force-dynamic'

export default async function TeamTemplatesPage() {
  const access = await requireAdmin()
  if ('error' in access) redirect('/admin/login')
  return <TeamTemplates />
}
