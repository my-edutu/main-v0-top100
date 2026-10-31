import { z } from "zod";
import { parseBachsAmount } from "@/lib/payments/bachs/money";
import { isAdminRole } from "@/lib/types/roles";
import { bachsConfig } from "@/lib/payments/bachs/config";
import { createCheckoutSession } from "@/lib/payments/bachs/checkout";
import { verifyBachsSignature } from "@/lib/payments/bachs/signature";
import type { BachsConfig } from "@/lib/payments/bachs/types";
import { contributionSchema } from "./validation";
import { verifiedImpactPayment } from "./payment-evidence";
import { checkDB, ImpactError, type ImpactDB } from "./server";
import type { ImpactCurrency } from "./types";

type Contribution = {
  id: string;
  member_id: string;
  group_id: string;
  reference: string;
  amount_minor: number;
  currency: ImpactCurrency;
  status: string;
  checkout_id: string | null;
  checkout_url: string | null;
  checkout_expires_at: string | null;
  display_name: string;
  donor_name: string;
  payer_email: string;
};
const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
async function providerGet(config: BachsConfig, path: string) {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok)
    throw new ImpactError(
      "Payment confirmation is temporarily unavailable. Try again shortly.",
      503,
    );
  return object(await response.json());
}
export async function startImpactCheckout(
  db: ImpactDB,
  member: {
    id: string;
    full_name: string | null;
    email: string | null;
    role?: string;
  },
  body: unknown,
) {
  const input = contributionSchema.parse(body);
  if (
    process.env.PROJECT100_CHECKOUT_ENABLED !== "true" ||
    !process.env.BACHS_PROJECT100_WEBHOOK_SECRET
  )
    throw new ImpactError(
      "Online contributions will open soon. You can join your group now.",
      503,
    );
  if (!member.email)
    throw new ImpactError(
      "Add an email address to your account before contributing.",
    );
  const config = bachsConfig();
  const { data, error } = await db.rpc("reserve_project100_contribution", {
    p_member: member.id,
    p_input: input,
    p_name: member.full_name?.trim() || "Project100 supporter",
    p_email: member.email,
    p_allow_any_group: isAdminRole(member.role),
  });
  checkDB(error);
  const reserved = data as Contribution;
  if (reserved.status === "paid")
    return { contributionId: reserved.id, status: "paid" };
  if (reserved.status === "needs_review")
    throw new ImpactError(
      "This contribution is under review. Please contact the Project100 team.",
      409,
    );
  if (reserved.checkout_url && reserved.checkout_expires_at) {
    if (Date.parse(reserved.checkout_expires_at) <= Date.now()) {
      const result = await reconcileImpactContribution(
        db,
        member.id,
        reserved.id,
      );
      if (result.status === "paid")
        return { contributionId: reserved.id, status: "paid" };
      if (result.status === "needs_review")
        throw new ImpactError(
          "This contribution is under review. Please contact the Project100 team.",
          409,
        );
      if (result.status === "expired")
        throw new ImpactError(
          "This checkout has expired. Start a new contribution to continue.",
          409,
        );
      throw new ImpactError(
        "This payment is still being confirmed. Please check this contribution again shortly.",
        409,
      );
    }
    return {
      contributionId: reserved.id,
      checkoutUrl: reserved.checkout_url,
      status: "pending",
    };
  }
  const session = await createCheckoutSession(
    {
      orderId: reserved.id,
      attemptId: reserved.id,
      idempotencyKey: `project100-${reserved.id}`,
      reference: reserved.reference,
      currency: reserved.currency,
      adaptivePricing: reserved.currency === "USD",
      purpose: "afl_project100_support_v1",
      supportAmountMinor: reserved.amount_minor,
      customer: { email: reserved.payer_email, name: reserved.donor_name },
      config,
      recover: true,
      successPath: `/dashboard/me/project100-scholarship?contribution=${reserved.id}&group=${reserved.group_id}`,
      cancelPath: `/dashboard/me/project100-scholarship?contribution=${reserved.id}&group=${reserved.group_id}`,
    },
    { maxAttempts: 2 },
  );
  const bound = await db.rpc("bind_project100_checkout", {
    p_id: reserved.id,
    p_checkout_id: session.checkoutId,
  });
  checkDB(bound.error);
  const saved = await db
    .from("project100_support_contributions")
    .update({
      checkout_id: session.checkoutId,
      checkout_url: session.checkoutUrl,
      checkout_expires_at: session.expiresAt,
    })
    .eq("id", reserved.id);
  checkDB(saved.error);
  if (session.status !== "open") {
    const result = await reconcileImpactContribution(
      db,
      member.id,
      reserved.id,
    );
    if (result.status === "paid")
      return { contributionId: reserved.id, status: "paid" };
    if (result.status === "expired")
      throw new ImpactError(
        "This checkout has expired. Start a new contribution to continue.",
        409,
      );
    throw new ImpactError(
      "This contribution is still being confirmed or is under review. Please check it again shortly.",
      409,
    );
  }
  return {
    contributionId: reserved.id,
    checkoutUrl: session.checkoutUrl,
    status: "pending",
  };
}
export async function reconcileImpactContribution(
  db: ImpactDB,
  memberId: string,
  id: string,
  admin = false,
) {
  z.string().uuid().parse(id);
  let query = db
    .from("project100_support_contributions")
    .select("*")
    .eq("id", id);
  if (!admin) query = query.eq("member_id", memberId);
  const { data, error } = await query.maybeSingle();
  checkDB(error);
  if (!data) throw new ImpactError("Contribution not found.", 404);
  const contribution = data as Contribution;
  if (contribution.status === "needs_review")
    return { status: contribution.status };
  if (!contribution.checkout_id) return { status: "pending" };
  const checkout = await providerGet(
    bachsConfig(),
    `/v1/checkout-sessions/${encodeURIComponent(contribution.checkout_id)}`,
  );
  const evidence = verifiedImpactPayment(contribution, checkout);
  if (evidence.status === "pending" || evidence.status === "expired")
    return {
      status: contribution.status === "paid" ? "paid" : evidence.status,
    };
  const settled = await db.rpc("settle_project100_contribution", {
    p_id: id,
    p_event_id: `reconcile:${id}:${evidence.status}`,
    p_status: evidence.status,
    p_charge_id: evidence.chargeId ?? null,
  });
  checkDB(settled.error);
  return { status: settled.data as string };
}
export function verifyImpactWebhook(
  rawBody: string,
  headers: Headers,
  secret: string,
  toleranceSeconds = 300,
) {
  const v2 = headers.get("x-bachs-signature-v2");
  if (v2) {
    const parts = v2.split(",").map((p) => p.trim());
    const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
    return parts
      .filter((p) => p.startsWith("v1="))
      .some((p) =>
        verifyBachsSignature({
          rawBody,
          timestampHeader: timestamp,
          signatureHeader: p.slice(3),
          secret,
          toleranceSeconds,
        }),
      );
  }
  return verifyBachsSignature({
    rawBody,
    timestampHeader: headers.get("x-bachs-timestamp"),
    signatureHeader: headers.get("x-bachs-signature"),
    secret,
    toleranceSeconds,
  });
}
export async function processImpactEvent(
  db: ImpactDB,
  rawBody: string,
  headers: Headers,
) {
  const secret = process.env.BACHS_PROJECT100_WEBHOOK_SECRET;
  if (!secret) throw new ImpactError("Webhook is not configured.", 503);
  if (!verifyImpactWebhook(rawBody, headers, secret))
    throw new ImpactError("Invalid signature.", 401);
  const event = z
    .object({
      id: z.string().min(1).max(255),
      type: z.string().min(1),
      organization_id: z.string().nullable().optional(),
      data: z.record(z.unknown()),
    })
    .parse(JSON.parse(rawBody));
  const config = bachsConfig();
  if (config.organizationId && event.organization_id !== config.organizationId)
    throw new ImpactError("Invalid webhook account.", 400);
  const reversal = /^(refund\.(created|paid)|dispute\.(created|updated))$/.test(
    event.type,
  );
  if (
    !reversal &&
    !["collection.succeeded", "checkout.completed"].includes(event.type)
  )
    return;
  const data = event.data;
  let checkoutId =
    typeof data.checkout_id === "string" ? data.checkout_id : null;
  let reference = typeof data.reference === "string" ? data.reference : null;
  const chargeId = typeof data.charge_id === "string" ? data.charge_id : null;
  const find = async (
    field: string,
    value: string,
  ): Promise<Contribution | null> => {
    const result = await db
      .from("project100_support_contributions")
      .select("*")
      .eq(field, value)
      .maybeSingle();
    checkDB(result.error);
    return result.data as Contribution | null;
  };
  let contribution =
    reversal && chargeId ? await find("charge_id", chargeId) : null;
  if (!contribution && checkoutId)
    contribution = await find("checkout_id", checkoutId);
  if (!contribution && reference?.startsWith("AFL-P100-"))
    contribution = await find("reference", reference);
  if (!checkoutId && contribution) checkoutId = contribution.checkout_id;
  if (!checkoutId && !contribution && chargeId) {
    const payment = await providerGet(
      config,
      `/v1/payments/${encodeURIComponent(chargeId)}`,
    );
    checkoutId =
      typeof payment.checkout_id === "string" ? payment.checkout_id : null;
    reference =
      typeof payment.reference === "string" ? payment.reference : reference;
    if (checkoutId) contribution = await find("checkout_id", checkoutId);
    if (!contribution && reference?.startsWith("AFL-P100-"))
      contribution = await find("reference", reference);
  }
  let checkout: Record<string, unknown> | null = null;
  if (!contribution && checkoutId) {
    checkout = await providerGet(
      config,
      `/v1/checkout-sessions/${encodeURIComponent(checkoutId)}`,
    );
    const metadata = object(checkout.metadata);
    if (metadata.purpose !== "afl_project100_support_v1") return;
    const id = z.string().uuid().safeParse(metadata.order_id);
    if (id.success) contribution = await find("id", id.data);
    if (!contribution)
      throw new ImpactError(
        "Contribution identity is not ready. Retry this event.",
        503,
      );
  }
  if (!contribution) {
    if (reference?.startsWith("AFL-P100-"))
      throw new ImpactError(
        "Contribution identity is not ready. Retry this event.",
        503,
      );
    return;
  }
  checkoutId = checkoutId ?? contribution.checkout_id;
  if (!checkoutId)
    throw new ImpactError(
      "Checkout identity is not ready. Retry this event.",
      503,
    );
  if (!reversal || !contribution.checkout_id)
    checkout =
      checkout ??
      (await providerGet(
        config,
        `/v1/checkout-sessions/${encodeURIComponent(checkoutId)}`,
      ));
  if (!contribution.checkout_id) {
    const metadata = object(checkout?.metadata);
    // A signed event may beat the create-session response. Bind only after an
    // authenticated provider read proves the original reservation contract.
    if (
      !checkout ||
      checkout.checkout_id !== checkoutId ||
      checkout.reference !== contribution.reference ||
      checkout.currency !== contribution.currency ||
      metadata.order_id !== contribution.id ||
      metadata.payment_attempt_id !== contribution.id ||
      metadata.purpose !== "afl_project100_support_v1" ||
      parseBachsAmount(String(checkout.amount), contribution.currency) !==
        contribution.amount_minor
    )
      throw new ImpactError(
        "Checkout evidence does not match this contribution.",
        503,
      );
    const bound = await db.rpc("bind_project100_checkout", {
      p_id: contribution.id,
      p_checkout_id: checkoutId,
    });
    checkDB(bound.error);
    contribution = { ...contribution, checkout_id: checkoutId };
  }
  const evidence = reversal
    ? { status: "needs_review" as const, chargeId: chargeId ?? undefined }
    : verifiedImpactPayment(contribution, checkout);
  if (evidence.status === "pending" || evidence.status === "expired")
    throw new ImpactError("Payment evidence is not ready yet.", 503);
  const settled = await db.rpc("settle_project100_contribution", {
    p_id: contribution.id,
    p_event_id: `${event.type}:${event.id}`,
    p_status: evidence.status,
    p_charge_id: evidence.chargeId ?? null,
  });
  checkDB(settled.error);
}
