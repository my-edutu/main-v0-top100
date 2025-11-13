import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Use SSR-compatible browser client that stores auth in cookies
// This ensures middleware can read the session
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
