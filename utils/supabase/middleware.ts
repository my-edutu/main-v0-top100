import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRole, parseRole } from '@/lib/types/roles'

/**
 * Look up the user's app role in the profiles table using the service role key.
 * Used only for /admin route protection; bypasses RLS so the answer is
 * authoritative regardless of row-level policies.
 */
async function getRoleFromDatabase(userId: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey || !userId) return null

  try {
    const res = await fetch(
      `${url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=role`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    )
    if (!res.ok) return null
    const rows = await res.json()
    return rows?.[0]?.role ?? null
  } catch {
    return null
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const isDemoAuthMode =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'placeholder-local-dev-key'

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value }) => supabaseResponse.cookies.set(name, value))
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: Don't remove getClaims()
  const { data } = await supabase.auth.getClaims()

  const user = data?.claims

  // SECURITY: Check session expiration
  if (user) {
    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionData?.session

    if (session) {
      // Check if session is expired or about to expire
      const expiresAt = session.expires_at
      if (expiresAt) {
        const expirationTime = expiresAt * 1000 // Convert to milliseconds
        const now = Date.now()
        const timeUntilExpiry = expirationTime - now

        // If session expired or expires in less than 5 minutes, force re-authentication
        if (timeUntilExpiry <= 0) {
          console.log('[Security] Session expired, forcing logout')

          // Clear session
          await supabase.auth.signOut()

          // Redirect to the sign-in page matching the area they were in
          const url = request.nextUrl.clone()
          url.pathname = request.nextUrl.pathname.startsWith('/admin') ? '/admin/login' : '/login'
          url.searchParams.set('reason', 'expired')
          url.searchParams.set('redirect', request.nextUrl.pathname)
          return NextResponse.redirect(url)
        } else if (timeUntilExpiry < 5 * 60 * 1000 && request.nextUrl.pathname.startsWith('/admin')) {
          // Session expiring soon (< 5 minutes) for admin users - log warning
          console.warn('[Security] Admin session expiring in', Math.floor(timeUntilExpiry / 1000 / 60), 'minutes')
        }
      }
    }
  }

  // Protect admin routes: require authentication AND an admin role.
  // /admin/login is exempt — it only forwards to the admin sign-in screen.
  const pathname = request.nextUrl.pathname
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.search = ''
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    // Role check: trust the JWT claim (app_metadata is service-role writable
    // only), fall back to the profiles table when the claim is absent.
    let role = parseRole((user as any).app_metadata?.role)
    if (!isAdminRole(role)) {
      role = parseRole(await getRoleFromDatabase((user as any).sub))
    }

    if (!isAdminRole(role)) {
      console.warn('[Security] Non-admin user attempted to access', pathname)
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  if (!user && request.nextUrl.pathname.startsWith('/dashboard') && !isDemoAuthMode) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
