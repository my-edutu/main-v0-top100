// @lib/api/require-admin.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth-server";
import { isAdminRole } from "@/lib/types/roles";
import { extractRoleFromSession, normalizeRole } from "@/lib/auth-utils";
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, createRateLimitResponse } from "@/lib/rate-limit";

type RequireAdminSuccess = {
  user: any;
  profile: any;
  roleSource: "jwt" | "database" | "none";
};

type RequireAdminFailure = {
  error: NextResponse;
};

export type RequireAdminResult = RequireAdminSuccess | RequireAdminFailure;

/**
 * Centralized admin authorization guard.
 *
 * BUG FIX: This function fixes the "can view but cannot act" bug by:
 * 1. First checking JWT token role (what the client is actually sending)
 * 2. Falling back to database role check if JWT is missing role
 * 3. Logging role source to help debug token vs DB mismatches
 * 4. Allowing both 'admin' and 'superadmin' roles
 *
 * USAGE:
 *   const adminCheck = await requireAdmin(request)
 *   if ('error' in adminCheck) return adminCheck.error
 *   // Proceed with admin operation
 *
 * DEBUGGING:
 *   Check console logs for [requireAdmin] messages showing:
 *   - JWT role vs DB role
 *   - Which source was used for authorization
 *   - Why authorization failed
 */
export const requireAdmin = async (
  request?: NextRequest
): Promise<RequireAdminResult> => {
  // SECURITY: Rate limiting for admin endpoints
  if (request?.headers) {
    const identifier = getClientIdentifier(request.headers);
    const rateLimitResult = checkRateLimit({
      ...RATE_LIMITS.ADMIN,
      identifier: `admin:${identifier}`,
    });

    if (!rateLimitResult.success) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[requireAdmin] Rate limit exceeded for ${identifier}`);
      }
      return {
        error: createRateLimitResponse(
          rateLimitResult,
          'Too many admin requests. Please try again later.'
        ) as NextResponse,
      };
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log("[requireAdmin] Starting admin authorization check");
  }

  let roleFromJWT: string | null = null;
  let roleFromDB: string | null = null;
  let userId: string | null = null;
  let userEmail: string | null = null;
  let profile: any = null;
  let user: any = null;

  // STEP 1: Try to get role from JWT token directly (serverSession)
  try {
    const serverSession = await getServerSession(request);

    // Log token expiry to detect staleness
    if (serverSession) {
      const raw = serverSession.user.rawPayload;
      if (raw?.exp) {
        const expireAt = new Date(raw.exp * 1000).toISOString();
        console.log(
          "[requireAdmin] token exp:",
          raw.exp,
          "-> expiresAt:",
          expireAt
        );
      }
    } else {
      console.warn("[requireAdmin] getServerSession returned null (no token found)");
    }

    if (serverSession?.user) {
      userId = serverSession.user.id;
      userEmail = serverSession.user.email || null;
      roleFromJWT = serverSession.user.role ?? null;
      user = serverSession.user;

      console.log("[requireAdmin] JWT token decoded:", {
        userId,
        email: userEmail,
        roleFromJWT,
        hasToken: !!serverSession.token,
      });

      // If JWT has admin role, authorize immediately (fast path)
      if (isAdminRole(roleFromJWT)) {
        console.log("[requireAdmin] ✅ AUTHORIZED via JWT role:", roleFromJWT);
        return {
          user: serverSession.user,
          profile: { role: roleFromJWT },
          roleSource: "jwt",
        };
      } else if (roleFromJWT) {
        console.log("[requireAdmin] ⚠️  JWT has non-admin role:", roleFromJWT);
      } else {
        console.log("[requireAdmin] ⚠️  JWT does not contain role claim");
      }
    } else {
      console.log("[requireAdmin] No server session found via JWT");
    }
  } catch (error) {
    console.error("[requireAdmin] Error reading JWT session:", error);
  }

  // STEP 2: Fall back to Supabase client session + DB check
  try {
    // Ensure createClient reads the same cookie header from the incoming request
    const cookieHeader = request?.headers?.get?.("cookie") ?? null;
    const supabase = await createClient(false, cookieHeader);

    // Supabase auth.getSession should reflect the request cookies now
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    console.log("[requireAdmin] Supabase session check:", {
      hasSession: !!session,
      sessionError: sessionError?.message,
    });

    if (!session || sessionError) {
      console.log("[requireAdmin] ❌ No Supabase session - returning 401");
      return {
        error: NextResponse.json(
          {
            message: "Authentication required",
            debug: {
              reason: "no_session",
              jwtRole: roleFromJWT,
              dbRole: roleFromDB,
            },
          },
          { status: 401 }
        ),
      };
    }

    // Get user from session (this should represent the same user as the JWT)
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    if (!supabaseUser) {
      console.log("[requireAdmin] ❌ No user in session - returning 401");
      return {
        error: NextResponse.json(
          { message: "Authentication required", debug: { reason: "no_user" } },
          { status: 401 }
        ),
      };
    }

    user = supabaseUser;
    userId = user.id;
    userEmail = user.email || null;

    // Also try extracting role from Supabase session object (session may include user metadata)
    const roleFromSupabaseSession = extractRoleFromSession(session);
    if (roleFromSupabaseSession && !roleFromJWT) {
      roleFromJWT = roleFromSupabaseSession;
      console.log(
        "[requireAdmin] Found role in Supabase session object:",
        roleFromSupabaseSession
      );
    }

    // STEP 3: Query database for role (service role to bypass RLS)
    const supabaseAdmin = await createClient(true); // service role client
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, email, full_name")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("[requireAdmin] Database profile query error:", profileError);
    }

    profile = profileData ?? null;

    if (profile?.role) {
      roleFromDB = normalizeRole(profile.role);
      console.log("[requireAdmin] Database role:", roleFromDB);
    }

    // STEP 4: Authorization decision
    console.log("[requireAdmin] Authorization summary:", {
      userId,
      email: userEmail,
      roleFromJWT,
      roleFromDB,
      jwtIsAdmin: isAdminRole(roleFromJWT),
      dbIsAdmin: isAdminRole(roleFromDB),
    });

    // Prefer JWT role, fall back to DB role
    const effectiveRole = roleFromJWT || roleFromDB;

    if (isAdminRole(effectiveRole)) {
      const roleSource = roleFromJWT ? "jwt" : "database";
      console.log(`[requireAdmin] ✅ AUTHORIZED via ${roleSource} role:`, effectiveRole);

      // ⚠️  WARNING: Role mismatch detected
      if (roleFromJWT !== roleFromDB && roleFromDB) {
        console.warn("[requireAdmin] 🔥 ROLE MISMATCH DETECTED!");
        console.warn("[requireAdmin]   JWT role:", roleFromJWT || "(none)");
        console.warn("[requireAdmin]   DB role:", roleFromDB);
        console.warn("[requireAdmin]   User should re-login to refresh token!");
      }

      return {
        user,
        profile: profile || { role: effectiveRole },
        roleSource,
      };
    }

    // Authorization failed
    console.log("[requireAdmin] ❌ FORBIDDEN - returning 403");
    console.log("[requireAdmin]   Effective role:", effectiveRole || "(none)");
    console.log("[requireAdmin]   Required: admin or superadmin");

    return {
      error: NextResponse.json(
        {
          message: "Admin access required",
          debug: {
            reason: "insufficient_privileges",
            userId,
            email: userEmail,
            roleFromJWT: roleFromJWT || null,
            roleFromDB: roleFromDB || null,
            effectiveRole: effectiveRole || null,
            requiresRelogin: roleFromJWT !== roleFromDB,
          },
        },
        { status: 403 }
      ),
    };
  } catch (error) {
    console.error("[requireAdmin] Unexpected error:", error);
    return {
      error: NextResponse.json(
        {
          message: "Internal server error during authorization",
          debug: { error: error instanceof Error ? error.message : "Unknown error" },
        },
        { status: 500 }
      ),
    };
  }
};

/**
 * Helper that throws an error instead of returning an error response.
 * Useful for API routes that want to use try/catch instead of checking result.
 */
export const assertAdminOrThrow = async (request?: NextRequest): Promise<void> => {
  const result = await requireAdmin(request);

  if ("error" in result) {
    const errorBody = await result.error.json();
    throw new Error(errorBody.message || "Admin access required");
  }
};
