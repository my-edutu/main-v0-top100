import { cache } from "react";
import { headers as nextHeaders } from "next/headers";
import type { Role } from "./types/roles";
import { extractUserFromJWTPayload } from "./auth-utils";
import { createClient } from "./supabase/server";

/**
 * Unified ServerSession shape used by requireAdmin and debug endpoints.
 */
export interface ServerSession {
  token: string;
  user: {
    id: string;
    email?: string | null;
    role: Role | null;
    user_metadata?: any;
    app_metadata?: any;
    rawPayload: any;
  };
}

/**
 * Extract an explicit bearer token from the Authorization header, if present.
 * Cookie-based sessions are handled by @supabase/ssr (which understands the
 * base64-encoded and chunked sb-*-auth-token cookie format) — never parse
 * session cookies by hand here.
 */
function getBearerToken(headers?: Headers): string | null {
  if (!headers) return null;
  const authHeader = headers.get("authorization") || headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
}

/**
 * SECURE: Verify JWT signature and extract user info using Supabase's getUser.
 * This properly validates the token against Supabase's JWT secret.
 */
export async function getServerSession(req?: Request | { headers?: Headers } | any): Promise<ServerSession | null> {
  try {
    let headers: Headers | undefined;
    let cookieHeader: string | null = null;

    if (req) {
      // NextRequest passes headers directly; Node Request may have headers property
      if ("headers" in req && req.headers instanceof Headers) {
        headers = req.headers;
        cookieHeader = req.headers.get("cookie");
      } else if (req.headers && typeof req.headers.get === "function") {
        headers = req.headers as Headers;
        cookieHeader = (req.headers as Headers).get("cookie");
      } else if (req?.headers) {
        headers = new Headers(req.headers as any);
        cookieHeader = headers.get("cookie");
      }
    } else {
      try {
        headers = await nextHeaders();
        cookieHeader = headers.get("cookie");
      } catch (e) {
        // Not in a request context (e.g. build time or outside Next.js)
      }
    }

    const bearerToken = getBearerToken(headers);

    if (!bearerToken && !cookieHeader) {
      if (process.env.NODE_ENV === 'development') {
        console.log("[getServerSession] No token or cookies found in request");
      }
      return null;
    }

    // Let @supabase/ssr read the session from cookies; getUser() verifies the
    // JWT signature against Supabase (works for both cookie and bearer auth).
    const supabase = await createClient(false, cookieHeader);

    const { data: { user: supabaseUser }, error } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser();

    if (error || !supabaseUser) {
      if (process.env.NODE_ENV === 'development') {
        console.log("[getServerSession] Token verification failed:", error?.message);
      }
      return null;
    }

    // Resolve the access token for the ServerSession shape
    let token = bearerToken;
    if (!token) {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token ?? null;
    }

    if (!token) {
      if (process.env.NODE_ENV === 'development') {
        console.log("[getServerSession] Verified user but no access token available");
      }
      return null;
    }

    // Extract user info from verified Supabase user object
    const user = extractUserFromJWTPayload({
      sub: supabaseUser.id,
      email: supabaseUser.email,
      user_metadata: supabaseUser.user_metadata,
      app_metadata: supabaseUser.app_metadata,
      role: supabaseUser.role,
    });

    if (!user?.id) {
      if (process.env.NODE_ENV === 'development') {
        console.log("[getServerSession] User ID not found in verified token");
      }
      return null;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log("[getServerSession] ✓ Token verified successfully:", {
        userId: user.id.substring(0, 8) + "...",
        email: user.email?.replace(/(.{2}).*(@.*)/, '$1***$2'),
        role: user.role,
      });
    }

    return {
      token,
      user: {
        id: user.id,
        email: user.email ?? null,
        role: user.role ?? null,
        user_metadata: supabaseUser.user_metadata ?? null,
        app_metadata: supabaseUser.app_metadata ?? null,
        rawPayload: supabaseUser,
      },
    };
  } catch (err) {
    console.error("[getServerSession] Error verifying token:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Cached helper for server components
 */
export const getCurrentUser = cache(async () => {
  const session = await getServerSession();
  return session?.user ?? null;
});
