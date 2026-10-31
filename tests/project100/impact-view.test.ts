import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/media/storage", () => ({
  signedMediaUrl: async () => {
    throw new Error("Storage unavailable");
  },
  uploadMedia: vi.fn(),
  deleteMedia: vi.fn(),
}));
import { loadImpact, type ImpactDB } from "@/lib/project100/impact/server";
describe("Project100 partial image availability", () => {
  it("retains confirmed funding and the journal caption when a photo cannot be signed", async () => {
    const view = {
      groups: [
        {
          id: "group",
          raised: { NGN: 100000, USD: 0 },
          spent: { NGN: 0, USD: 0 },
        },
      ],
      updates: [
        {
          id: "update",
          caption: "School support delivered",
          image_path: "groups/private/photo.webp",
        },
      ],
      totals: { raised: { NGN: 100000, USD: 0 }, spent: { NGN: 0, USD: 0 } },
      projects: [],
      supporters: [],
      spending: [],
      contributions: [],
      membership: null,
    };
    const db = {
      rpc: async () => ({ data: view, error: null }),
    } as unknown as ImpactDB;
    const result = await loadImpact(db, "member");
    expect(result.totals.raised.NGN).toBe(100000);
    expect(result.updates[0]).toMatchObject({
      caption: "School support delivered",
      image_url: null,
      image_unavailable: true,
    });
  });
});
