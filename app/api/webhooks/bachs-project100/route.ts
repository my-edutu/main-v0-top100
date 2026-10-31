import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { impactErrorResponse } from "@/lib/project100/impact/server";
import { processImpactEvent } from "@/lib/project100/impact/payments";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    await processImpactEvent(
      createAdminClient(),
      await request.text(),
      request.headers,
    );
    return NextResponse.json({ received: true });
  } catch (error) {
    return impactErrorResponse(error);
  }
}
