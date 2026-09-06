import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { mapProfileToMember } from '@/lib/member-hub-server'
import { AdminConversations } from './view'
export default async function Page() {
  const access = await requireAdmin()
  if ('error' in access) return <p>Please sign in with an admin account.</p>
  const { data } = await createAdminClient()
    .from('profiles')
    .select('*')
    .eq('id', access.user.id)
    .single()
  if (!data) return <p>Your admin profile could not be loaded.</p>
  return <AdminConversations member={mapProfileToMember(data)} />
}
