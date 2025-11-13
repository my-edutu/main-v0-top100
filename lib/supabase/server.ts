import { createServerClient, type CookieOptions } from '@supabase/ssr'

// Helper function to safely access cookies in server components
async function getCookies() {
  if (typeof window !== 'undefined') {
    // Client-side, return a mock cookie store
    const cookieJar: Record<string, string> = {}
    return {
      get: (name: string) => {
        return { value: cookieJar[name] }
      },
      set: ({ name, value }: { name: string; value: string }) => {
        cookieJar[name] = value
      }
    }
  }

  // Server-side, use next/headers
  try {
    const { cookies } = require('next/headers')
    return await cookies()
  } catch (error) {
    console.warn('Could not access next/headers. Are you using this in a client component?')
    return {
      get: (name: string) => null,
      set: () => {}
    }
  }
}

let warnedMissingEnv = false

const getSupabaseConfig = (useServiceRole: boolean) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error(
      'Supabase URL is not configured. Define NEXT_PUBLIC_SUPABASE_URL in your environment.',
    )
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (useServiceRole) {
    if (serviceKey && serviceKey.trim().length > 0) {
      return { url: supabaseUrl, key: serviceKey }
    }

    if (!warnedMissingEnv) {
      console.warn(
        '[supabase] SUPABASE_SERVICE_ROLE_KEY is not configured. Falling back to anon key; some admin operations may fail.',
      )
      warnedMissingEnv = true
    }

    if (!anonKey) {
      throw new Error(
        'Supabase keys are not configured. Define SUPABASE_SERVICE_ROLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      )
    }

    return { url: supabaseUrl, key: anonKey }
  }

  if (!anonKey) {
    throw new Error(
      'Supabase anon key is not configured. Define NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.',
    )
  }

  return { url: supabaseUrl, key: anonKey }
}

export const createClient = async (useServiceRole: boolean = false) => {
  const cookieStore = await getCookies()

  const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig(useServiceRole)

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          if (typeof window !== 'undefined') {
            // Client-side: use document.cookie
            const value = document.cookie
              .split('; ')
              .find(row => row.startsWith(`${name}=`))
              ?.split('=')[1];
            return value || undefined;
          } else {
            // Server-side: use cookieStore
            return typeof cookieStore.get === 'function'
              ? cookieStore.get(name)?.value
              : undefined;
          }
        },
        set(name: string, value: string, options: CookieOptions) {
          if (typeof window !== 'undefined') {
            // Client-side: set document.cookie
            let cookieString = `${name}=${value}`
            if (options.maxAge) {
              const date = new Date()
              date.setTime(date.getTime() + (options.maxAge * 1000))
              cookieString += `; expires=${date.toUTCString()}`
            }
            if (options.path) cookieString += `; path=${options.path}`
            if (options.domain) cookieString += `; domain=${options.domain}`
            if (options.sameSite) cookieString += `; samesite=${options.sameSite}`
            if (options.secure) cookieString += '; secure'
            document.cookie = cookieString
          } else {
            // Server-side: use cookieStore
            try {
              if (typeof cookieStore.set === 'function') {
                cookieStore.set({ name, value, ...options })
              }
            } catch (error) {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          }
        },
        remove(name: string, options: CookieOptions) {
          if (typeof window !== 'undefined') {
            // Client-side: remove cookie
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT${options.path ? `; path=${options.path}` : ''}`
          } else {
            // Server-side: use cookieStore
            try {
              if (typeof cookieStore.set === 'function') {
                cookieStore.set({ name, value: '', ...options })
              }
            } catch (error) {
              // The `remove` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          }
        },
      },
    }
  )
}
