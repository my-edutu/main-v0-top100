import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

let cached: SupabaseClient | null = null

/**
 * Service-role client. Bypasses RLS, so every caller must first authorize the
 * current user against team_memberships. Never import this from a client
 * component.
 */
export function createAdminClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient must never run in the browser')
  }
  if (!env.supabaseUrl || !env.serviceRoleKey) {
    throw new Error('Supabase service role is not configured')
  }
  if (!cached) {
    cached = createClient(env.supabaseUrl, env.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        fetch: (input, init) => {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 20_000)
          return fetch(input, { ...init, signal: controller.signal }).finally(() =>
            clearTimeout(timeout),
          )
        },
      },
    })
  }
  return cached
}
