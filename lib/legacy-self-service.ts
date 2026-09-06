import type { createAdminClient } from '@/lib/supabase/server'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * The email-only legacy profile editor is an opt-in compatibility feature.
 * Missing settings infrastructure must never make it public by accident.
 */
export async function legacySelfServiceEnabled(
  supabase: AdminClient,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('settings')
    .select('self_service_profile_edit_enabled')
    .limit(1)
    .maybeSingle()

  return !error && data?.self_service_profile_edit_enabled === true
}
