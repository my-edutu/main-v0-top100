import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const auth = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  requireAdmin: vi.fn(),
}));
vi.mock("@/lib/auth-server", () => ({
  getServerSession: auth.getServerSession,
}));
vi.mock("@/lib/api/require-admin", () => ({ requireAdmin: auth.requireAdmin }));
import { GET, POST } from "@/app/api/member/project100/impact/route";
import { POST as adminPost } from "@/app/api/admin/project100/impact/route";
describe("Project100 impact access boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getServerSession.mockResolvedValue(null);
  });
  it("requires authentication before exposing group or financial data", async () => {
    expect(
      (
        await GET(
          new NextRequest("http://localhost/api/member/project100/impact"),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await POST(
          new NextRequest("http://localhost/api/member/project100/impact", {
            method: "POST",
            body: "{}",
          }),
        )
      ).status,
    ).toBe(401);
  });
  it("requires authoritative admin permission before grouping or recording support", async () => {
    auth.requireAdmin.mockResolvedValue({
      error: new Response("{}", { status: 403 }),
    });
    expect(
      (
        await adminPost(
          new NextRequest("http://localhost/api/admin/project100/impact", {
            method: "POST",
            body: JSON.stringify({ action: "group" }),
          }),
        )
      ).status,
    ).toBe(403);
  });
});
