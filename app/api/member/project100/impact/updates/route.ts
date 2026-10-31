import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase/server";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import {
  deleteImpactUpdate,
  impactErrorResponse,
  impactProfile,
  publishImpactUpdate,
} from "@/lib/project100/impact/server";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const session = await getServerSession(request);
  if (!session?.user.id)
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
  try {
    const rate = await checkRateLimit({
      identifier: `project100-update:${session.user.id}`,
      maxRequests: 10,
      windowSeconds: 3600,
    });
    if (!rate.success)
      return createRateLimitResponse(
        rate,
        "You can share another update later.",
      );
    const db = createAdminClient(),
      profile = await impactProfile(db, session.user.id);
    await publishImpactUpdate(
      db,
      session.user.id,
      profile.full_name || "Group member",
      await request.formData(),
    );
    return NextResponse.json({ saved: true });
  } catch (error) {
    return impactErrorResponse(error);
  }
}
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(request);
  if (!session?.user.id)
    return NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
  try {
    const db = createAdminClient();
    await impactProfile(db, session.user.id);
    await deleteImpactUpdate(
      db,
      session.user.id,
      request.nextUrl.searchParams.get("id") ?? "",
    );
    return NextResponse.json({ removed: true });
  } catch (error) {
    return impactErrorResponse(error);
  }
}
