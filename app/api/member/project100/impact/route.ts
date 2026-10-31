import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRole } from "@/lib/types/roles";
import { getServerSession } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase/server";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import {
  impactErrorResponse,
  impactProfile,
  joinImpact,
  loadImpact,
} from "@/lib/project100/impact/server";
import {
  reconcileImpactContribution,
  startImpactCheckout,
} from "@/lib/project100/impact/payments";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const session = await getServerSession(request);
  if (!session?.user.id)
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
  try {
    const db = createAdminClient();
    const profile = await impactProfile(db, session.user.id);
    return NextResponse.json(
      {
        ...(await loadImpact(
          db,
          session.user.id,
          request.nextUrl.searchParams.get("group") ?? undefined,
        )),
        canSupportAnyGroup: isAdminRole(profile.role),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return impactErrorResponse(error);
  }
}
export async function POST(request: NextRequest) {
  const session = await getServerSession(request);
  if (!session?.user.id)
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
  try {
    const rate = await checkRateLimit({
      identifier: `project100:${session.user.id}`,
      maxRequests: 20,
      windowSeconds: 60,
    });
    if (!rate.success)
      return createRateLimitResponse(
        rate,
        "Please wait a moment before trying again.",
      );
    const db = createAdminClient();
    const profile = await impactProfile(db, session.user.id);
    const { action, input } = z
      .object({
        action: z.enum(["join", "checkout", "reconcile"]),
        input: z.unknown(),
      })
      .strict()
      .parse(await request.json());
    if (action === "join")
      return NextResponse.json(await joinImpact(db, session.user.id, input));
    if (action === "checkout")
      return NextResponse.json(
        await startImpactCheckout(
          db,
          { ...profile, email: session.user.email ?? profile.email },
          input,
        ),
      );
    const { contributionId } = z
      .object({ contributionId: z.string().uuid() })
      .strict()
      .parse(input);
    return NextResponse.json(
      await reconcileImpactContribution(db, session.user.id, contributionId),
    );
  } catch (error) {
    return impactErrorResponse(error);
  }
}
