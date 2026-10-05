import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type PasswordRecoveryClientOptions = {
  supabaseUrl?: string
  supabaseAnonKey?: string
  fetch?: typeof globalThis.fetch
}

export { createTimedFetch as createRecoveryFetch } from '@/lib/network/fetch-with-timeout'
import { createTimedFetch } from '@/lib/network/fetch-with-timeout'

let browserRecoveryClient: SupabaseClient | undefined

/**
 * Password recovery is intentionally isolated from the app's cookie-based
 * PKCE client. An implicit recovery link is portable across browsers/devices,
 * which matters when a reset is requested in the app but opened from an email
 * client elsewhere. The reset page consumes and clears the URL fragment.
 */
export function createPasswordRecoveryClient(options: PasswordRecoveryClientOptions = {}) {
  const useSharedClient = Object.keys(options).length === 0
  if (useSharedClient && browserRecoveryClient) return browserRecoveryClient

  const supabaseUrl = options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = options.supabaseAnonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Separate from the cookie-based app client, even without persistence.
      storageKey: `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-password-recovery`,
      flowType: 'implicit',
      detectSessionInUrl: true,
      persistSession: false,
      autoRefreshToken: false,
    },
    global: { fetch: createTimedFetch(options.fetch ?? globalThis.fetch.bind(globalThis)) },
  })
  if (useSharedClient) browserRecoveryClient = client
  return client
}
