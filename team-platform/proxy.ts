import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { env } from '@/lib/env'

const PROTECTED = [
  '/dashboard',
  '/awardees',
  '/follow-ups',
  '/earnings',
  '/withdrawals',
  '/notifications',
  '/profile',
  '/admin',
]

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Team administration belongs to the primary Top100 admin panel. Keep the
  // team host focused on day-to-day team work and send legacy admin URLs there.
  if (path === '/admin' || path.startsWith('/admin/')) {
    const adminOrigin =
      process.env.NEXT_PUBLIC_TOP100_ADMIN_URL ||
      (process.env.NODE_ENV === 'development' ? 'http://localhost:3004' : 'https://top100afl.com')
    return NextResponse.redirect(new URL('/admin/team-operations', adminOrigin))
  }

  // Do not expose privileged team APIs on teams.top100afl.com. Their admin UI
  // and requests now live in the authenticated Top100 admin application.
  if (path === '/api/admin' || path.startsWith('/api/admin/')) {
    return NextResponse.json({ error: 'Team administration is available in Top100 Admin.' }, { status: 404 })
  }

  let response = NextResponse.next({ request })

  if (!env.supabaseUrl || !env.supabaseAnonKey) return response

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isProtected = PROTECTED.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  if (user && path === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
