import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const ADMIN_PREFIX = "/admin"
const SIGN_IN_PATH = "/auth/signin"

export async function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith(ADMIN_PREFIX)) {
    return NextResponse.next()
  }

  const url = req.nextUrl.clone()
  url.pathname = SIGN_IN_PATH
  url.searchParams.set("from", req.nextUrl.pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/admin/:path*'],
}
