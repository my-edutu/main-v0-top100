import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type PasswordRecoveryClientOptions = {
  supabaseUrl?: string
  supabaseAnonKey?: string
  fetch?: typeof globalThis.fetch
}

// Bound stalled Auth requests and cancel the underlying network operation.
export function createRecoveryFetch(fetcher: typeof globalThis.fetch, timeoutMs = 15_000): typeof globalThis.fetch {
  return async (input, init) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    const signal = init?.signal
      ? AbortSignal.any([init.signal, controller.signal])
      : controller.signal
    try {
      return await fetcher(input, { ...init, signal })
    } finally {
      clearTimeout(timeout)
    }
  }
}

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
    global: { fetch: createRecoveryFetch(options.fetch ?? globalThis.fetch.bind(globalThis)) },
  })
  if (useSharedClient) browserRecoveryClient = client
  return client
}
