// @lib/auth-server.ts  (REPLACE existing / duplicate files with this single canonical file)
import { cache } from "react";
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
 * Robust helper: try to extract a token from:
 * 1) Authorization header
 * 2) `cookie` header (many cookie name patterns checked)
 *
 * Returns token string or null.
 */
function getTokenFromHeaders(headers?: Headers): string | null {
  if (!headers) return null;

  // 1) Authorization
  const authHeader = headers.get("authorization") || headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // 2) Cookie header (server-side)
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) return null;

  // parse cookie string into map
  const cookiePairs = cookieHeader.split(";").map((c) => c.trim());
  const cookies: Record<string, string> = {};
  for (const pair of cookiePairs) {
    const eq = pair.indexOf("=");
    if (eq > -1) {
      const k = pair.substring(0, eq);
      const v = pair.substring(eq + 1);
      cookies[k] = decodeURIComponent(v);
    }
  }

  // list of likely Supabase cookie names / patterns to check:
  const candidates = [
    // new supabase auth helpers
    "sb:token", // sometimes used
    // cookies that look like sb-<project-ref>-auth-token or sb-<project-ref>-session
    ...Object.keys(cookies).filter((n) => n.startsWith("sb-") && (n.endsWith("-auth-token") || n.endsWith("-session"))),
    // historic names
    "supabase-auth-token",
    "sb-access-token",
    "sb-refresh-token",
    // fallback: any cookie that contains "session" or "auth" in name
    ...Object.keys(cookies).filter((n) => /session|auth/i.test(n)),
  ];

  for (const name of candidates) {
    const val = cookies[name];
    if (!val) continue;

    // Supabase sometimes stores a JSON string containing access_token / refresh_token
    try {
      if (val.startsWith("{") || val.startsWith("%7B")) {
        // try decode JSON
        const parsed = JSON.parse(decodeURIComponent(val));
        if (parsed?.access_token) return parsed.access_token;
        if (parsed?.token) return parsed.token;
      }
    } catch (e) {
      // not JSON — proceed to check if value looks like a JWT (three dot-separated parts)
    }

    // if the cookie value itself looks like JWT — return it
    if (val.split(".").length === 3) return val;
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
        cookieHeader = headers.get("cookie");
      } else if (req.headers && typeof req.headers.get === "function") {
        headers = req.headers;
        cookieHeader = headers.get("cookie");
      } else if (req?.headers) {
        headers = new Headers(req.headers as any);
        cookieHeader = headers.get("cookie");
      }
    }

    const token = getTokenFromHeaders(headers ?? (req && req.headers) ?? new Headers());

    if (!token) {
      if (process.env.NODE_ENV === 'development') {
        console.log("[getServerSession] No token found in request");
      }
      return null;
    }

    // SECURITY FIX: Use Supabase to verify JWT signature
    // This ensures the token is valid and signed by Supabase
    const supabase = await createClient(false, cookieHeader);

    // getUser() verifies the JWT signature using Supabase's secret
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

    if (error || !supabaseUser) {
      if (process.env.NODE_ENV === 'development') {
        console.log("[getServerSession] Token verification failed:", error?.message);
      }
      return null;
    }

    // Verify token expiration
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      if (process.env.NODE_ENV === 'development') {
        console.log("[getServerSession] Session invalid or expired");
      }
      return null;
    }

    // Check if token is expired
    const expiresAt = session.expires_at;
    if (expiresAt && expiresAt * 1000 < Date.now()) {
      if (process.env.NODE_ENV === 'development') {
        console.log("[getServerSession] Token expired");
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
