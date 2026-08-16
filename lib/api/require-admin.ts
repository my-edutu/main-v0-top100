// @lib/api/require-admin.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/types/roles";
import { normalizeRole } from "@/lib/auth-utils";
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
  createRateLimitResponse,
} from "@/lib/rate-limit";

type RequireAdminSuccess = {
  user: any;
  profile: any;
  roleSource: "database";
};

type RequireAdminFailure = {
  error: NextResponse;
};

export type RequireAdminResult = RequireAdminSuccess | RequireAdminFailure;

/**
 * Centralized admin authorization guard.
 *
 * Authentication is verified by Supabase in getServerSession(). Authorization
 * is then resolved from the current profiles row using the service-role client.
 * The database role is deliberately authoritative so a user who has been
 * demoted cannot retain admin API access until an older JWT expires.
 */
export const requireAdmin = async (
  request?: NextRequest
): Promise<RequireAdminResult> => {
  if (request?.headers) {
    const identifier = getClientIdentifier(request.headers);
    const rateLimitResult = checkRateLimit({
      ...RATE_LIMITS.ADMIN,
      identifier: `admin:${identifier}`,
    });

    if (!rateLimitResult.success) {
      return {
        error: createRateLimitResponse(
          rateLimitResult,
          "Too many admin requests. Please try again later."
        ) as NextResponse,
      };
    }
  }

  try {
    const serverSession = await getServerSession(request);

    if (!serverSession?.user?.id) {
      return {
        error: NextResponse.json(
          { message: "Authentication required" },
          { status: 401 }
        ),
      };
    }

    const supabaseAdmin = createAdminClient();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, email, full_name")
      .eq("id", serverSession.user.id)
      .single();

    if (profileError) {
      console.error("[requireAdmin] Failed to resolve authoritative role", {
        userId: serverSession.user.id,
        code: profileError.code,
        message: profileError.message,
      });
      return {
        error: NextResponse.json(
          { message: "Unable to verify admin access" },
          { status: 500 }
        ),
      };
    }

    const roleFromDB = normalizeRole(profile?.role);
    const roleFromJWT = normalizeRole(serverSession.user.role);

    if (!isAdminRole(roleFromDB)) {
      if (process.env.NODE_ENV !== "test") {
        console.warn("[requireAdmin] Admin access denied", {
          userId: serverSession.user.id,
          jwtRole: roleFromJWT,
          databaseRole: roleFromDB,
        });
      }
      return {
        error: NextResponse.json(
          { message: "Admin access required" },
          { status: 403 }
        ),
      };
    }

    if (roleFromJWT !== roleFromDB && process.env.NODE_ENV !== "test") {
      console.warn("[requireAdmin] JWT/database role mismatch", {
        userId: serverSession.user.id,
        jwtRole: roleFromJWT,
        databaseRole: roleFromDB,
      });
    }

    const effectiveRole = roleFromDB ?? roleFromJWT;

    return {
      user: serverSession.user,
      profile: { ...profile, role: effectiveRole },
      roleSource: "database",
    };
  } catch (error) {
    console.error(
      "[requireAdmin] Unexpected authorization error",
      error instanceof Error ? error.message : error
    );
    return {
      error: NextResponse.json(
        { message: "Internal server error during authorization" },
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
