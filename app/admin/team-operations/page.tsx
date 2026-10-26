import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/api/require-admin'
import TeamOperations from './team-operations'

export const dynamic = 'force-dynamic'

export default async function TeamOperationsPage() {
  const access = await requireAdmin()
  if ('error' in access) redirect('/admin/login')
  return <TeamOperations />
}
