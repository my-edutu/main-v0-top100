import { createClient } from '@supabase/supabase-js'

type PasswordRecoveryClientOptions = {
  supabaseUrl?: string
  supabaseAnonKey?: string
  fetch?: typeof globalThis.fetch
}

/**
 * Password recovery is intentionally isolated from the app's cookie-based
 * PKCE client. An implicit recovery link is portable across browsers/devices,
 * which matters when a reset is requested in the app but opened from an email
 * client elsewhere. The reset page consumes and clears the URL fragment.
 */
export function createPasswordRecoveryClient(options: PasswordRecoveryClientOptions = {}) {
  const supabaseUrl = options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = options.supabaseAnonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'implicit',
      detectSessionInUrl: true,
      persistSession: false,
      autoRefreshToken: false,
    },
    ...(options.fetch ? { global: { fetch: options.fetch } } : {}),
  })
}
