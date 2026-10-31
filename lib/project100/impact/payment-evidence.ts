import { parseBachsAmount } from "@/lib/payments/bachs/money";
import type { ImpactCurrency } from "./types";
const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
type Reserved = {
  id: string;
  reference: string;
  checkout_id: string | null;
  amount_minor: number;
  currency: ImpactCurrency;
};
export function verifiedImpactPayment(
  reserved: Reserved,
  raw: unknown,
): {
  status: "paid" | "pending" | "expired" | "needs_review";
  chargeId?: string;
} {
  const checkout = record(raw),
    metadata = record(checkout.metadata),
    charge = record(checkout.charge);
  const review = { status: "needs_review" as const };
  if (
    checkout.checkout_id !== reserved.checkout_id ||
    checkout.reference !== reserved.reference ||
    checkout.currency !== reserved.currency ||
    metadata.order_id !== reserved.id ||
    metadata.payment_attempt_id !== reserved.id ||
    metadata.purpose !== "afl_project100_support_v1"
  )
    return review;
  try {
    if (
      parseBachsAmount(String(checkout.amount), reserved.currency) !==
      reserved.amount_minor
    )
      return review;
  } catch {
    return review;
  }
  if (
    (charge.refunds != null &&
      (!Array.isArray(charge.refunds) || charge.refunds.length > 0)) ||
    charge.dispute ||
    checkout.dispute
  )
    return review;
  if (
    ["open", "expired"].includes(String(checkout.status)) &&
    ["requires_payment_method", "unpaid", "failed", "expired"].includes(
      String(checkout.payment_status),
    ) &&
    (!checkout.charge ||
      ["incomplete", "failed", "cancelled", "expired"].includes(
        String(charge.status),
      ))
  )
    return {
      status:
        checkout.status === "expired" &&
        (!checkout.charge ||
          ["failed", "cancelled", "expired"].includes(String(charge.status)))
          ? "expired"
          : "pending",
    };
  if (
    checkout.status !== "completed" ||
    checkout.payment_status !== "succeeded" ||
    !["succeeded", "accepted"].includes(String(charge.status)) ||
    charge.checkout_id !== reserved.checkout_id ||
    charge.reference !== reserved.reference ||
    typeof charge.payment_id !== "string" ||
    !charge.payment_id ||
    typeof charge.currency !== "string" ||
    !/^[A-Z]{3}$/.test(charge.currency) ||
    typeof charge.amount_paid !== "string" ||
    !/^\d+(?:\.\d{1,6})?$/.test(charge.amount_paid) ||
    Number(charge.amount_paid) <= 0
  )
    return review;
  if (charge.currency === reserved.currency) {
    try {
      const gross = parseBachsAmount(charge.amount_paid, reserved.currency);
      if (gross !== reserved.amount_minor) {
        const fees = record(charge.fees);
        const breakdown = Array.isArray(fees.breakdown)
          ? fees.breakdown.map(record)
          : [];
        const processing = breakdown.filter((f) => f.type === "processing");
        if (
          charge.merchant_bears_cost !== false ||
          fees.currency !== reserved.currency ||
          processing.length !== 1 ||
          gross -
            parseBachsAmount(
              String(processing[0].amount),
              reserved.currency,
            ) !==
            reserved.amount_minor
        )
          return review;
      }
    } catch {
      return review;
    }
  }
  return { status: "paid", chargeId: charge.payment_id };
}
