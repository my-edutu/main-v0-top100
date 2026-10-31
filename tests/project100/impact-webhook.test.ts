import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  processImpactEvent,
  verifyImpactWebhook,
  startImpactCheckout,
} from "@/lib/project100/impact/payments";
import type { ImpactDB } from "@/lib/project100/impact/server";
const secret = "project100-test-webhook-secret";
function headers(raw: string) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${raw}`)
    .digest("hex");
  return new Headers({
    "x-bachs-timestamp": timestamp,
    "x-bachs-signature": signature,
  });
}
const contribution = {
  id: "00000000-0000-4000-8000-000000000001",
  checkout_id: "chk_project100",
  reference: "AFL-P100-test",
  amount_minor: 100000,
  currency: "NGN",
  status: "pending",
};
const checkout = {
  checkout_id: "chk_project100",
  reference: "AFL-P100-test",
  amount: "1000.00",
  currency: "NGN",
  metadata: {
    order_id: contribution.id,
    payment_attempt_id: contribution.id,
    purpose: "afl_project100_support_v1",
  },
  status: "completed",
  payment_status: "succeeded",
  charge: {
    payment_id: "pay_project100",
    checkout_id: "chk_project100",
    reference: "AFL-P100-test",
    status: "succeeded",
    currency: "NGN",
    amount_paid: "1000.00",
    refunds: [],
  },
};
function boundary() {
  const calls: Record<string, unknown>[] = [];
  const db = {
    from: () => ({
      select: () => ({
        eq: (_field: string, id: string) => ({
          maybeSingle: async () => ({
            data:
              id === contribution.checkout_id || id === contribution.reference
                ? contribution
                : null,
            error: null,
          }),
        }),
      }),
    }),
    rpc: async (_name: string, input: Record<string, unknown>) => {
      calls.push(input);
      return { data: input.p_status, error: null };
    },
  } as unknown as ImpactDB;
  return { db, calls };
}
describe("Project100 signed payment evidence", () => {
  beforeEach(() => {
    vi.stubEnv("BACHS_PROJECT100_WEBHOOK_SECRET", secret);
    vi.stubEnv("BACHS_API_KEY", "sk_sandbox_test");
    vi.stubEnv("BACHS_API_BASE_URL", "https://sandbox-api.bachs.io");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.top100afl.com");
    vi.stubEnv("BACHS_CHECKOUT_HOSTS", "checkout.bachs.io");
    vi.stubEnv("BACHS_ORGANIZATION_ID", "");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  it("recovers an already completed payment before offering to replace an expired checkout", async () => {
    vi.stubEnv("PROJECT100_CHECKOUT_ENABLED", "true");
    const reserved = {
      ...contribution,
      member_id: "member",
      group_id: "00000000-0000-4000-8000-000000000002",
      checkout_url: "https://checkout.bachs.io/c/existing",
      checkout_expires_at: "2020-01-01T00:00:00Z",
    };
    const query = {
      eq: (_field?: string, _value?: unknown) => query,
      maybeSingle: async () => ({ data: reserved, error: null }),
    };
    const db = {
      rpc: async (name: string) => ({
        data: name === "reserve_project100_contribution" ? reserved : "paid",
        error: null,
      }),
      from: () => ({ select: () => query }),
    } as unknown as ImpactDB;
    vi.stubGlobal("fetch", async () => Response.json(checkout));
    const result = await startImpactCheckout(
      db,
      {
        id: "member",
        full_name: "Member",
        email: "member@example.test",
        role: "admin",
      },
      {
        groupId: reserved.group_id,
        amount: "1000",
        currency: "NGN",
        attribution: "personal",
        anonymous: false,
        idempotencyKey: "00000000-0000-4000-8000-000000000003",
      },
    );
    expect(result).toMatchObject({
      status: "paid",
      contributionId: contribution.id,
    });
  });
  it("checks exact bytes and accepts any matching V2 signature during rotation", () => {
    const raw = '{"event":"test"}',
      signed = headers(raw);
    expect(verifyImpactWebhook(raw, signed, secret)).toBe(true);
    expect(verifyImpactWebhook(raw + " ", signed, secret)).toBe(false);
    const rotated = new Headers({
      "x-bachs-signature-v2": `t=${signed.get("x-bachs-timestamp")},v1=${"0".repeat(64)},v1=${signed.get("x-bachs-signature")}`,
    });
    expect(verifyImpactWebhook(raw, rotated, secret)).toBe(true);
  });
  it("rejects a forged delivery before reading payment records or calling the provider", async () => {
    const { db, calls } = boundary();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new Error("must not call provider");
      }),
    );
    await expect(
      processImpactEvent(db, "{}", new Headers()),
    ).rejects.toMatchObject({ status: 401 });
    expect(calls).toHaveLength(0);
  });
  it("settles only provider evidence for the same purpose, original amount and destination reservation", async () => {
    const { db, calls } = boundary();
    vi.stubGlobal("fetch", async () => Response.json(checkout));
    const raw = JSON.stringify({
      id: "evt_paid",
      type: "checkout.completed",
      data: { checkout_id: "chk_project100" },
    });
    await processImpactEvent(db, raw, headers(raw));
    expect(calls).toEqual([
      {
        p_id: contribution.id,
        p_event_id: "checkout.completed:evt_paid",
        p_status: "paid",
        p_charge_id: "pay_project100",
      },
    ]);
  });
  it("processes a reference-only success instead of silently acknowledging it", async () => {
    const { db, calls } = boundary();
    vi.stubGlobal("fetch", async () => Response.json(checkout));
    const raw = JSON.stringify({
      id: "evt_reference",
      type: "collection.succeeded",
      data: { reference: contribution.reference },
    });
    await processImpactEvent(db, raw, headers(raw));
    expect(calls[0]).toMatchObject({ p_status: "paid", p_id: contribution.id });
  });
  it("freezes a reference-only reversal", async () => {
    const { db, calls } = boundary();
    vi.stubGlobal("fetch", async () => Response.json(checkout));
    const raw = JSON.stringify({
      id: "evt_reverse_reference",
      type: "dispute.created",
      data: { reference: contribution.reference },
    });
    await processImpactEvent(db, raw, headers(raw));
    expect(calls[0]).toMatchObject({
      p_status: "needs_review",
      p_id: contribution.id,
    });
  });
  it("binds authenticated success that arrives before checkout id persistence", async () => {
    const early = { ...contribution, checkout_id: null };
    const calls: Record<string, unknown>[] = [];
    const db = {
      from: () => ({
        select: () => ({
          eq: (field: string) => ({
            maybeSingle: async () => ({
              data: field === "id" ? early : null,
              error: null,
            }),
          }),
        }),
      }),
      rpc: async (name: string, input: Record<string, unknown>) => {
        calls.push({ name, ...input });
        return { data: "paid", error: null };
      },
    } as unknown as ImpactDB;
    vi.stubGlobal("fetch", async () => Response.json(checkout));
    const raw = JSON.stringify({
      id: "evt_early",
      type: "collection.succeeded",
      data: { checkout_id: "chk_project100" },
    });
    await processImpactEvent(db, raw, headers(raw));
    expect(calls).toContainEqual({
      name: "bind_project100_checkout",
      p_id: contribution.id,
      p_checkout_id: "chk_project100",
    });
    expect(calls).toContainEqual(
      expect.objectContaining({
        name: "settle_project100_contribution",
        p_status: "paid",
        p_id: contribution.id,
      }),
    );
  });
  it("asks Bachs to retry a known reference while its checkout identity is not yet saved", async () => {
    const early = { ...contribution, checkout_id: null };
    const db = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: early, error: null }),
          }),
        }),
      }),
    } as unknown as ImpactDB;
    const raw = JSON.stringify({
      id: "evt_early_reference",
      type: "collection.succeeded",
      data: { reference: contribution.reference },
    });
    await expect(
      processImpactEvent(db, raw, headers(raw)),
    ).rejects.toMatchObject({ status: 503 });
  });
  it("freezes mismatched paid evidence instead of counting it", async () => {
    const { db, calls } = boundary();
    vi.stubGlobal("fetch", async () =>
      Response.json({ ...checkout, amount: "999.99" }),
    );
    const raw = JSON.stringify({
      id: "evt_mismatch",
      type: "collection.succeeded",
      data: { checkout_id: "chk_project100" },
    });
    await processImpactEvent(db, raw, headers(raw));
    expect(calls[0].p_status).toBe("needs_review");
  });
  it("handles a refund arriving before success by resolving its authenticated charge", async () => {
    const { db, calls } = boundary();
    vi.stubGlobal("fetch", async (url: string) => {
      expect(url).toBe(
        "https://sandbox-api.bachs.io/v1/payments/pay_project100",
      );
      return Response.json({ checkout_id: "chk_project100" });
    });
    const raw = JSON.stringify({
      id: "evt_refund",
      type: "refund.paid",
      data: { charge_id: "pay_project100", reference: "refund-reference" },
    });
    await processImpactEvent(db, raw, headers(raw));
    expect(calls).toEqual([
      {
        p_id: contribution.id,
        p_event_id: "refund.paid:evt_refund",
        p_status: "needs_review",
        p_charge_id: "pay_project100",
      },
    ]);
  });
  it("requests a retry if provider verification is unavailable", async () => {
    const { db, calls } = boundary();
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 503 }));
    const raw = JSON.stringify({
      id: "evt_retry",
      type: "collection.succeeded",
      data: { checkout_id: "chk_project100" },
    });
    await expect(
      processImpactEvent(db, raw, headers(raw)),
    ).rejects.toMatchObject({ status: 503 });
    expect(calls).toHaveLength(0);
  });
});
