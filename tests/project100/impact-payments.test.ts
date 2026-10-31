import { describe, expect, it } from "vitest";
import { buildCheckoutRequest } from "@/lib/payments/bachs/checkout";
import { verifiedImpactPayment } from "@/lib/project100/impact/payment-evidence";
const config = {
  apiKey: "sk_sandbox_test",
  apiBaseUrl: "https://sandbox-api.bachs.io" as const,
  awardWebhookSecret: null,
  magazineWebhookSecret: null,
  organizationId: null,
  webhookToleranceSeconds: 300,
  checkoutHosts: new Set(["checkout.bachs.io"]),
  siteUrl: "https://www.top100afl.com",
};
describe("Project100 hosted contribution", () => {
  it("charges the chosen amount and currency without deriving an exchange rate", () => {
    const request = buildCheckoutRequest({
      orderId: "contribution",
      attemptId: "contribution",
      idempotencyKey: "stable",
      reference: "AFL-P100-contribution",
      currency: "NGN",
      purpose: "afl_project100_support_v1",
      supportAmountMinor: 10000001,
      customer: { email: "member@example.test" },
      config,
    });
    expect(request.pricing).toEqual({ currency: "NGN", amount: "100000.01" });
    expect(request.metadata.purpose).toBe("afl_project100_support_v1");
  });
  const contribution = {
    id: "donation",
    reference: "AFL-P100-donation",
    checkout_id: "checkout",
    amount_minor: 100000,
    currency: "NGN" as const,
  };
  const checkout = {
    checkout_id: "checkout",
    reference: "AFL-P100-donation",
    currency: "NGN",
    amount: "1000.00",
    metadata: {
      order_id: "donation",
      payment_attempt_id: "donation",
      purpose: "afl_project100_support_v1",
    },
    status: "completed",
    payment_status: "succeeded",
    charge: {
      payment_id: "charge",
      checkout_id: "checkout",
      reference: "AFL-P100-donation",
      status: "succeeded",
      currency: "NGN",
      amount_paid: "1000.00",
      refunds: [],
    },
  };
  it("accepts only authenticated checkout evidence matching the immutable contribution", () => {
    expect(verifiedImpactPayment(contribution, checkout)).toEqual({
      status: "paid",
      chargeId: "charge",
    });
    expect(
      verifiedImpactPayment(contribution, { ...checkout, amount: "999.99" })
        .status,
    ).toBe("needs_review");
    expect(
      verifiedImpactPayment(contribution, { ...checkout, currency: "USD" })
        .status,
    ).toBe("needs_review");
    expect(
      verifiedImpactPayment(contribution, {
        ...checkout,
        metadata: { ...checkout.metadata, purpose: "afl_award_fee_v1" },
      }).status,
    ).toBe("needs_review");
  });
  it("does not count refunds, disputes, pending checkout or a forged charge", () => {
    expect(
      verifiedImpactPayment(contribution, {
        ...checkout,
        status: "open",
        payment_status: "requires_payment_method",
        charge: null,
      }).status,
    ).toBe("pending");
    expect(
      verifiedImpactPayment(contribution, {
        ...checkout,
        charge: { ...checkout.charge, refunds: [{}] },
      }).status,
    ).toBe("needs_review");
    expect(
      verifiedImpactPayment(contribution, {
        ...checkout,
        charge: { ...checkout.charge, status: "disputed" },
      }).status,
    ).toBe("needs_review");
    expect(
      verifiedImpactPayment(contribution, {
        ...checkout,
        charge: { ...checkout.charge, reference: "some-other-payment" },
      }).status,
    ).toBe("needs_review");
  });
});
