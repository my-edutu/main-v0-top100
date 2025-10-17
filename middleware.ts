import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const ADMIN_PREFIX = "/admin"
const SIGN_IN_PATH = "/auth/signin"

async function fetchSession(req: NextRequest) {
  try {
    const url = req.nextUrl.clone()
    url.pathname = "/api/better-auth/get-session"
    url.search = ""

    const response = await fetch(url, {
      method: "GET",
      headers: {
        cookie: req.headers.get("cookie") ?? "",
        accept: "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error("[middleware] failed to resolve Better Auth session", error)
    return null
  }
}

export async function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith(ADMIN_PREFIX)) {
    return NextResponse.next()
  }

  const session = await fetchSession(req)
  const user = session?.user

  if (!user) {
    const url = req.nextUrl.clone()
    url.pathname = SIGN_IN_PATH
    url.searchParams.set("from", req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  const role = user.role ?? "user"

  if (role !== "admin") {
    const url = req.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
