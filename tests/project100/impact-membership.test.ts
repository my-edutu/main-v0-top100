import { describe, expect, it, vi } from "vitest";
import { joinImpact, loadImpact, type ImpactDB } from "@/lib/project100/impact/server";

const lagos = "00000000-0000-4000-8000-000000000001";
const ghana = "00000000-0000-4000-8000-000000000002";

describe("Project100 group choice", () => {
  it("accepts a destination independently of residence and retains the first confirmed group", async () => {
    let saved: { group_id: string; residence_country: string } | undefined;
    const insert = vi.fn(async (values: typeof saved, options: { ignoreDuplicates: boolean }) => {
      if (!saved || !options.ignoreDuplicates) saved = values;
      return { error: null };
    });
    const db = {
      from(table: string) {
        if (table === "project100_support_groups") {
          return {
            select: () => ({
              eq: (_field: string, id: string) => ({
                maybeSingle: async () => ({ data: { id, active: true }, error: null }),
              }),
            }),
          };
        }
        return {
          upsert: insert,
          select: () => ({ eq: () => ({ single: async () => ({ data: saved, error: null }) }) }),
        };
      },
    } as unknown as ImpactDB;

    await expect(joinImpact(db, "member", { groupId: ghana }, "Lagos, Nigeria")).resolves.toEqual({ groupId: ghana });
    await expect(joinImpact(db, "member", { groupId: ghana }, "Lagos, Nigeria")).resolves.toEqual({ groupId: ghana });
    await expect(joinImpact(db, "member", { groupId: lagos })).rejects.toMatchObject({ status: 409 });
    expect(saved).toMatchObject({ group_id: ghana, residence_country: "Nigeria" });
    expect(insert).toHaveBeenLastCalledWith(expect.anything(), { onConflict: "member_id", ignoreDuplicates: true });
  });

  it("loads visible approved member names only for the viewer's own group", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [{ profiles: { full_name: "Ada Okafor" } }], error: null }),
    };
    const from = vi.fn().mockReturnValue(query);
    const db = {
      from,
      rpc: async () => ({
        error: null,
        data: {
          groups: [], updates: [],
          membership: { group_id: lagos },
          totals: { raised: { NGN: 0, USD: 0 }, spent: { NGN: 0, USD: 0 } },
        },
      }),
    } as unknown as ImpactDB;

    expect((await loadImpact(db, "member", ghana)).memberNames).toBeUndefined();
    expect(from).not.toHaveBeenCalled();
    expect((await loadImpact(db, "member", lagos)).memberNames).toEqual(["Ada Okafor"]);
    expect(query.select).toHaveBeenCalledWith("profiles!inner(full_name)");
    expect(query.eq.mock.calls).toEqual([
      ["group_id", lagos],
      ["profiles.is_public", true],
      ["profiles.membership_status", "approved"],
    ]);
    expect(query.neq).toHaveBeenCalledWith("member_id", "member");
  });
});
