import { updateSession } from '@/utils/supabase/middleware'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // `og` is excluded so share-card renders do not each pay a Supabase
  // session round-trip — crawlers hit that route, not signed-in users.
  matcher: [
    '/api/member/:path*',
    '/api/admin/:path*',
    '/((?!api|og|_next/static|_next/image|favicon.ico).*)',
  ],
}
