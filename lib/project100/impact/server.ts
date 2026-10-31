import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { prepareImpactPhoto } from "./images";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/types/roles";
import { signedMediaUrl, uploadMedia, deleteMedia } from "@/lib/media/storage";
import { validateUpload } from "@/lib/uploads/validate";
import {
  canonicalCountry,
  matchNigeriaState,
  planImpactGroups,
  rankImpactCountries,
} from "./grouping";
import { joinSchema, projectSchema, spendingSchema } from "./validation";
import { AFRICAN_APPLICANT_COUNTRIES } from "@/lib/dashboard/top100-moment-countries";
import type { ImpactView } from "./types";

export type ImpactDB = ReturnType<typeof createAdminClient>;
export class ImpactError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function impactErrorResponse(error: unknown) {
  if (error instanceof SyntaxError)
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        message: error.issues[0]?.message ?? "Check the details and try again.",
      },
      { status: 400 },
    );
  if (error instanceof ImpactError)
    return NextResponse.json(
      { message: error.message },
      { status: error.status },
    );
  console.error("[project100-impact] Operation unavailable.");
  return NextResponse.json(
    { message: "Project100 could not load. Please try again shortly." },
    { status: 503 },
  );
}
export function checkDB(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (["42P01", "PGRST202", "PGRST205"].includes(error.code ?? ""))
    throw new ImpactError(
      "Project100 support groups are being prepared. Please check back soon.",
      503,
    );
  const known = [
    "Not enough confirmed support in this currency",
    "This checkout is already reserved for different details",
    "This group is not accepting support",
    "Spending request already used",
    "New support must go to your joined group",
  ];
  if (known.some((message) => error.message?.includes(message)))
    throw new ImpactError(
      known.find((message) => error.message?.includes(message))!,
      409,
    );
  throw new Error("Project100 database operation failed");
}
export async function impactProfile(db: ImpactDB, memberId: string) {
  const { data, error } = await db
    .from("profiles")
    .select("id,full_name,email,membership_status,role")
    .eq("id", memberId)
    .single();
  checkDB(error);
  if (
    !data ||
    (!isAdminRole(data.role) && data.membership_status !== "approved")
  )
    throw new ImpactError(
      "An approved membership is required to join Project100.",
      403,
    );
  return data as {
    id: string;
    full_name: string | null;
    email: string | null;
    membership_status: string;
    role: string;
  };
}
export async function loadImpact(
  db: ImpactDB,
  memberId: string,
  groupId?: string,
  admin = false,
): Promise<ImpactView> {
  if (groupId) z.string().uuid().parse(groupId);
  const { data, error } = await db.rpc("project100_impact_snapshot", {
    p_member: memberId,
    p_group: groupId ?? null,
    p_admin: admin,
  });
  checkDB(error);
  if (!data) throw new Error("No impact snapshot");
  const view = data as Omit<ImpactView, "updates"> & {
    updates: (ImpactView["updates"][number] & { image_path?: string | null })[];
  };
  // Sign private images for this authenticated response; never expose raw storage paths.
  view.updates = await Promise.all(
    view.updates.map(async ({ image_path, ...update }) => {
      if (!image_path) return { ...update, image_url: null };
      try {
        return {
          ...update,
          image_url: await signedMediaUrl("project100-images", image_path, 900),
        };
      } catch {
        return { ...update, image_url: null, image_unavailable: true };
      }
    }),
  );
  for (const total of [
    view.totals.raised,
    view.totals.spent,
    ...view.groups.flatMap((g) => [g.raised, g.spent]),
  ]) {
    if (!Number.isSafeInteger(total.NGN) || !Number.isSafeInteger(total.USD))
      throw new Error("Unsupported impact amount");
  }
  return {
    ...view,
    checkoutEnabled:
      process.env.PROJECT100_CHECKOUT_ENABLED === "true" &&
      Boolean(process.env.BACHS_PROJECT100_WEBHOOK_SECRET),
  };
}
export async function joinImpact(
  db: ImpactDB,
  memberId: string,
  body: unknown,
) {
  const input = joinSchema.parse(body);
  const country = canonicalCountry(input.residenceCountry);
  if (!country) throw new ImpactError("Choose a valid country of residence.");
  const { data: group, error } = await db
    .from("project100_support_groups")
    .select("id,country,state,active")
    .eq("id", input.groupId)
    .single();
  checkDB(error);
  if (!group?.active)
    throw new ImpactError("This group is not accepting new members.", 409);
  const state =
    country === "Nigeria"
      ? matchNigeriaState(input.residenceState ?? "", "Nigeria")
      : null;
  if (
    country === "Nigeria"
      ? group.country !== "Nigeria" || group.state !== state
      : group.country === "Nigeria"
  )
    throw new ImpactError(
      "Choose your state group in Nigeria, or a destination country if you live abroad.",
    );
  const result = await db.from("project100_support_memberships").upsert(
    {
      member_id: memberId,
      group_id: group.id,
      residence_country: country,
      residence_state: state,
      joined_at: new Date().toISOString(),
    },
    { onConflict: "member_id" },
  );
  checkDB(result.error);
  return { groupId: group.id };
}
async function allRows<T>(
  db: ImpactDB,
  table: string,
  select: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db
      .from(table)
      .select(select)
      .order(table === "project100_support_memberships" ? "member_id" : "id")
      .range(offset, offset + 999);
    checkDB(error);
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}
export async function groupImpactMembers(db: ImpactDB, actor: string) {
  type Application = {
    member_id: string;
    full_name: string | null;
    country: string | null;
    location: string | null;
    status: string;
    consent: boolean;
  };
  const [applications, memberships, groups, profiles] = await Promise.all([
    allRows<Application>(
      db,
      "project100_applications",
      "id,member_id,full_name,country,location,status,consent",
    ),
    allRows<{ member_id: string; group_id: string }>(
      db,
      "project100_support_memberships",
      "member_id,group_id",
    ),
    allRows<{
      id: string;
      country: string;
      state: string | null;
      active: boolean;
    }>(db, "project100_support_groups", "id,country,state,active"),
    allRows<{
      id: string;
      full_name: string | null;
      location: string | null;
      membership_status: string;
    }>(db, "profiles", "id,full_name,location,membership_status"),
  ]);
  const approved = new Set(
    profiles.filter((p) => p.membership_status === "approved").map((p) => p.id),
  );
  const candidates = applications.filter((a) => approved.has(a.member_id));
  const plan = planImpactGroups(
    candidates,
    memberships,
    groups.filter((g) => g.active),
  );
  let assigned = 0;
  for (let offset = 0; offset < plan.assignments.length; offset += 250) {
    const rows = plan.assignments
      .slice(offset, offset + 250)
      .map((assignment) => ({
        member_id: assignment.memberId,
        group_id: assignment.groupId,
        residence_country: "Nigeria",
        residence_state: groups.find((g) => g.id === assignment.groupId)!.state,
      }));
    const { data, error } = await db
      .from("project100_support_memberships")
      .upsert(rows, { onConflict: "member_id", ignoreDuplicates: true })
      .select("member_id");
    checkDB(error);
    assigned += data?.length ?? 0;
  }
  const names = new Map(profiles.map((p) => [p.id, p.full_name ?? "Member"]));
  const joined = new Set(memberships.map((m) => m.member_id));
  const hasApplication = new Set(applications.map((a) => a.member_id));
  const awaitingParticipation = profiles
    .filter(
      (p) =>
        approved.has(p.id) && !joined.has(p.id) && !hasApplication.has(p.id),
    )
    .map((p) => ({
      memberId: p.id,
      reason: "Join Project100 to confirm your group",
    }));
  const report = {
    assigned,
    alreadyJoined: profiles.filter(
      (p) => approved.has(p.id) && joined.has(p.id),
    ).length,
    unresolved: [...plan.unresolved, ...awaitingParticipation].map((row) => ({
      ...row,
      name: names.get(row.memberId),
    })),
  };
  const result = await db
    .from("project100_support_grouping_log")
    .insert({ created_by: actor, report });
  checkDB(result.error);
  return report;
}
export async function createImpactProject(
  db: ImpactDB,
  actor: string,
  body: unknown,
) {
  const input = projectSchema.parse(body);
  const values = {
    title: input.title,
    description: input.description,
    plan: input.plan,
    target_minor: input.targetMinor,
    currency: input.currency,
    status: input.status,
  };
  if (input.projectId) {
    const { data, error } = await db
      .from("project100_support_projects")
      .update(values)
      .eq("id", input.projectId)
      .eq("group_id", input.groupId)
      .select("id");
    checkDB(error);
    if (!data?.length)
      throw new ImpactError("Project not found in this group.", 404);
  } else {
    const { error } = await db
      .from("project100_support_projects")
      .insert({ ...values, group_id: input.groupId, created_by: actor });
    checkDB(error);
  }
}
export async function impactCountryRanking(db: ImpactDB) {
  const year = new Date().getUTCFullYear();
  const records = await allRows<{
    country: string | null;
    year: number | string | null;
  }>(db, "awardees", "id,country,year");
  return {
    year,
    records: records.length,
    countries: rankImpactCountries(records, year),
  };
}
export async function configureImpactCountries(
  db: ImpactDB,
  actor: string,
  raw: unknown,
) {
  const { countries } = z
    .object({ countries: z.array(z.string()).length(6) })
    .strict()
    .parse(raw);
  if (
    new Set(countries).size !== 6 ||
    countries.some(
      (c) => c === "Nigeria" || !AFRICAN_APPLICANT_COUNTRIES.includes(c),
    )
  )
    throw new ImpactError(
      "Choose six different African countries outside Nigeria.",
    );
  const { error } = await db.rpc("configure_project100_countries", {
    p_countries: countries,
  });
  checkDB(error);
  const logged = await db
    .from("project100_support_grouping_log")
    .insert({ created_by: actor, report: { countryDestinations: countries } });
  checkDB(logged.error);
}
export async function recordImpactSpending(
  db: ImpactDB,
  actor: string,
  body: unknown,
) {
  const input = spendingSchema.parse(body);
  const { data, error } = await db.rpc("record_project100_spending", {
    p_actor: actor,
    p_input: input,
  });
  checkDB(error);
  return data;
}
export async function assertCanPostImpact(
  db: ImpactDB,
  memberId: string,
  groupId: string,
  admin = false,
) {
  z.string().uuid().parse(groupId);
  if (admin) return;
  const { data, error } = await db
    .from("project100_support_memberships")
    .select("group_id")
    .eq("member_id", memberId)
    .eq("group_id", groupId)
    .maybeSingle();
  checkDB(error);
  if (!data)
    throw new ImpactError("Join this group before sharing an update.", 403);
}
export async function publishImpactUpdate(
  db: ImpactDB,
  memberId: string,
  author: string,
  form: FormData,
  admin = false,
) {
  const groupId = z.string().uuid().parse(form.get("groupId"));
  const caption = z
    .string()
    .trim()
    .min(3, "Add a short caption.")
    .max(2000)
    .parse(form.get("caption"));
  await assertCanPostImpact(db, memberId, groupId, admin);
  const file = form.get("file");
  let imagePath: string | null = null;
  if (file instanceof File && file.size > 0) {
    const validation = validateUpload({
      name: file.name,
      size: file.size,
      type: file.type,
    });
    if (!validation.ok) throw new ImpactError(validation.reason);
    let image: Buffer;
    try {
      image = await prepareImpactPhoto(Buffer.from(await file.arrayBuffer()));
    } catch {
      throw new ImpactError("That file could not be read as an image.");
    }
    imagePath = `groups/${groupId}/${memberId}/${randomUUID()}.webp`;
    await uploadMedia({
      bucket: "project100-images",
      path: imagePath,
      body: image,
      contentType: "image/webp",
      upsert: false,
    });
  }
  const { error } = await db.from("project100_support_updates").insert({
    group_id: groupId,
    author_id: memberId,
    author_name: author,
    caption,
    image_path: imagePath,
  });
  if (error && imagePath) {
    try {
      await deleteMedia("project100-images", imagePath);
    } catch {
      console.error("[project100-impact] Private upload needs cleanup", {
        path: imagePath,
      });
    }
  }
  checkDB(error);
}
export async function deleteImpactUpdate(
  db: ImpactDB,
  memberId: string,
  updateId: string,
  admin = false,
) {
  z.string().uuid().parse(updateId);
  let lookup = db
    .from("project100_support_updates")
    .select("id,image_path")
    .eq("id", updateId);
  if (!admin) lookup = lookup.eq("author_id", memberId);
  const existing = await lookup.maybeSingle();
  checkDB(existing.error);
  if (!existing.data)
    throw new ImpactError("Update not found or you cannot remove it.", 404);
  if (existing.data.image_path)
    await deleteMedia("project100-images", existing.data.image_path);
  let query = db.from("project100_support_updates").delete().eq("id", updateId);
  if (!admin) query = query.eq("author_id", memberId);
  const { data, error } = await query.select("id");
  checkDB(error);
  if (!data?.length)
    throw new ImpactError("Update not found or you cannot remove it.", 404);
}
