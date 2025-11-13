import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from '@/lib/supabase/server'

const ADMIN_PREFIX = "/admin"
const DASHBOARD_PREFIX = "/dashboard"
const SIGN_IN_PATH = "/auth/signin"

export async function middleware(req: NextRequest) {
  // Allow non-protected routes to pass through
  const pathname = req.nextUrl.pathname;
  if (!pathname.startsWith(ADMIN_PREFIX) && !pathname.startsWith(DASHBOARD_PREFIX)) {
    return NextResponse.next()
  }

  console.log('[Middleware] Checking access to:', pathname)

  // Create Supabase client with anon key for auth checks
  const supabase = await createClient()

  // Get session
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  console.log('[Middleware] Session check:', session ? `USER: ${session.user.email}` : 'NO SESSION')
  if (error) console.error('[Middleware] Session error:', error)

  // If no session, redirect to sign in
  if (!session || error) {
    const url = req.nextUrl.clone()
    url.pathname = SIGN_IN_PATH
    url.searchParams.set("from", req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Get user profile to check access level
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Use service role client for profile query to bypass RLS
    const supabaseAdmin = await createClient(true)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[Middleware] Profile fetch error:', profileError)
    }

    // For admin routes, require admin role
    if (pathname.startsWith(ADMIN_PREFIX)) {
      if (profileError || !profile || profile.role !== 'admin') {
        console.log('[Middleware] Access denied to admin route:', { profileError, profile, pathname })
        const url = req.nextUrl.clone()
        url.pathname = '/'  // Redirect to homepage if not admin
        return NextResponse.redirect(url)
      }
    }

    // For dashboard routes, allow both admin and user roles
    if (pathname.startsWith(DASHBOARD_PREFIX)) {
      if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'user')) {
        console.log('[Middleware] Access denied to dashboard route:', { profileError, profile, pathname })
        const url = req.nextUrl.clone()
        url.pathname = '/'  // Redirect to homepage if not authorized
        return NextResponse.redirect(url)
      }
    }
  } else {
    // If no user, redirect to sign in
    const url = req.nextUrl.clone()
    url.pathname = SIGN_IN_PATH
    url.searchParams.set("from", req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // If user has appropriate access, allow access
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*'],
}
