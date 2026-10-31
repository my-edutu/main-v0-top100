import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/require-admin";
import { createAdminClient } from "@/lib/supabase/server";
import {
  createImpactProject,
  configureImpactCountries,
  impactCountryRanking,
  deleteImpactUpdate,
  groupImpactMembers,
  impactErrorResponse,
  loadImpact,
  publishImpactUpdate,
  recordImpactSpending,
} from "@/lib/project100/impact/server";
import { reconcileImpactContribution } from "@/lib/project100/impact/payments";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  try {
    return NextResponse.json(
      await loadImpact(
        createAdminClient(),
        auth.user.id,
        request.nextUrl.searchParams.get("group") ?? undefined,
        true,
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return impactErrorResponse(error);
  }
}
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  try {
    const db = createAdminClient();
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      await publishImpactUpdate(
        db,
        auth.user.id,
        auth.profile.full_name || "Project100 team",
        await request.formData(),
        true,
      );
      return NextResponse.json({ saved: true });
    }
    const { action, input } = z
      .object({
        action: z.enum([
          "group",
          "project",
          "spending",
          "deleteUpdate",
          "reconcile",
          "countries",
          "ranking",
        ]),
        input: z.unknown().optional(),
      })
      .strict()
      .parse(await request.json());
    if (action === "group")
      return NextResponse.json(await groupImpactMembers(db, auth.user.id));
    if (action === "ranking")
      return NextResponse.json(await impactCountryRanking(db));
    if (action === "countries")
      await configureImpactCountries(db, auth.user.id, input);
    if (action === "project")
      await createImpactProject(db, auth.user.id, input);
    if (action === "spending")
      await recordImpactSpending(db, auth.user.id, input);
    if (action === "deleteUpdate")
      await deleteImpactUpdate(
        db,
        auth.user.id,
        z.object({ id: z.string().uuid() }).parse(input).id,
        true,
      );
    if (action === "reconcile")
      return NextResponse.json(
        await reconcileImpactContribution(
          db,
          auth.user.id,
          z.object({ contributionId: z.string().uuid() }).parse(input)
            .contributionId,
          true,
        ),
      );
    return NextResponse.json({ saved: true });
  } catch (error) {
    return impactErrorResponse(error);
  }
}
