import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth-server'
import { currentBioDestination } from '@/lib/dashboard/bio-routing'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function CurrentMemberBioPage() {
  const user = await getCurrentUser()
  if (!user?.id) redirect(currentBioDestination(null, null))

  let slug: string | null = null
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('slug')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      console.error('[bio] Could not resolve the current member BIO:', error.message)
    }
    slug = data?.slug ?? null
  } catch (error) {
    console.error(
      '[bio] Could not resolve the current member BIO:',
      error instanceof Error ? error.message : 'Unknown error',
    )
  }

  redirect(currentBioDestination(user.id, slug))
}
