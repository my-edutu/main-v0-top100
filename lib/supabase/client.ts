import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Use SSR-compatible browser client that stores auth in cookies
// This ensures middleware can read the session
export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    cookies: {
      get(name: string) {
        // Get cookie from document.cookie
        const value = document.cookie
          .split('; ')
          .find(row => row.startsWith(`${name}=`))
          ?.split('=')[1]
        return value ? decodeURIComponent(value) : null
      },
      set(name: string, value: string, options: any) {
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
        console.log('🍪 [Supabase Client] Set cookie:', name, 'Value length:', value.length)
      },
      remove(name: string, options: any) {
        // Remove cookie by setting expired date
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
        console.log('🍪 [Supabase Client] Removed cookie:', name)
      },
    },
  }
)
