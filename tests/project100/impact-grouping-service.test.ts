import { describe, expect, it } from "vitest";
import {
  groupImpactMembers,
  type ImpactDB,
} from "@/lib/project100/impact/server";
describe("Project100 participation before bulk grouping", () => {
  it("does not synthesise Project100 consent from an approved profile", async () => {
    const tables: Record<string, unknown[]> = {
      project100_applications: [],
      project100_support_memberships: [],
      project100_support_groups: [
        { id: "kaduna", country: "Nigeria", state: "Kaduna", active: true },
      ],
      profiles: [
        {
          id: "member",
          full_name: "Member",
          location: "Kaduna, Nigeria",
          membership_status: "approved",
        },
      ],
    };
    const inserted: unknown[] = [];
    const db = {
      from: (table: string) => ({
        select: () => ({
          order: () => ({
            range: async () => ({ data: tables[table], error: null }),
          }),
        }),
        upsert: (values: unknown) => {
          inserted.push(values);
          return { select: async () => ({ data: [], error: null }) };
        },
        insert: async () => ({ error: null }),
      }),
    } as unknown as ImpactDB;
    const report = await groupImpactMembers(db, "admin");
    expect(report.assigned).toBe(0);
    expect(inserted).toHaveLength(0);
    expect(report.unresolved).toContainEqual(
      expect.objectContaining({
        memberId: "member",
        reason: "Join Project100 to confirm your group",
      }),
    );
  });
});
