import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Helper to check if we're in the browser
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'

// Use SSR-compatible browser client that stores auth in cookies
// This ensures middleware can read the session
export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    cookies: {
      get(name: string) {
        if (!isBrowser) return null
        // Get cookie from document.cookie
        const value = document.cookie
          .split('; ')
          .find(row => row.startsWith(`${name}=`))
          ?.split('=')[1]
        return value ? decodeURIComponent(value) : null
      },
      set(name: string, value: string, options: any) {
        if (!isBrowser) return
        // Set cookie to document.cookie
        let cookie = `${name}=${encodeURIComponent(value)}`

        if (options?.maxAge) {
          cookie += `; max-age=${options.maxAge}`
        }
        if (options?.expires) {
          cookie += `; expires=${new Date(options.expires).toUTCString()}`
        }

        // Always set path to root
        cookie += '; path=/'

        // Set SameSite and Secure for better compatibility
        cookie += '; SameSite=Lax'

        // Only use Secure in production (https)
        if (window.location.protocol === 'https:') {
          cookie += '; Secure'
        }

        document.cookie = cookie
      },
      remove(name: string, options: any) {
        if (!isBrowser) return
        // Remove cookie by setting expired date
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
      },
    },
  }
)

// Also export a function to create client for use in components
export function createClient() {
  return supabase
}
