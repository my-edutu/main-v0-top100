import { z } from "zod";
import { matchNigeriaState } from "./grouping";

const uuid = z.string().uuid();
export const currencySchema = z.enum(["NGN", "USD"]);
const amount = z
  .string()
  .trim()
  .regex(
    /^\d{1,10}(?:\.\d{1,2})?$/,
    "Enter an amount with at most two decimal places.",
  )
  .transform((value) => {
    const [whole, fraction = ""] = value.split(".");
    return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  })
  .refine(
    (value) =>
      Number.isSafeInteger(value) && value > 0 && value <= 1_000_000_000_00,
    "Enter a valid amount.",
  );
export const joinSchema = z
  .object({
    groupId: uuid,
    residenceCountry: z.string().trim().min(2).max(80),
    residenceState: z.string().trim().max(80).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.residenceCountry.toLowerCase() === "nigeria" &&
      !matchNigeriaState(value.residenceState ?? "", "Nigeria")
    )
      ctx.addIssue({
        code: "custom",
        path: ["residenceState"],
        message: "Choose your Nigerian state.",
      });
  });
export const contributionSchema = z
  .object({
    groupId: uuid,
    amount,
    currency: currencySchema,
    attribution: z.enum(["personal", "organisation"]),
    organisation: z.string().trim().max(120).optional(),
    anonymous: z.boolean(),
    idempotencyKey: uuid,
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.attribution === "organisation" && !v.organisation)
      ctx.addIssue({
        code: "custom",
        path: ["organisation"],
        message: "Enter the organisation name.",
      });
    if (v.amount < (v.currency === "NGN" ? 100_000 : 100))
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message:
          v.currency === "NGN"
            ? "The minimum contribution is ₦1,000."
            : "The minimum contribution is $1.",
      });
  })
  .transform(({ amount, ...rest }) => ({ ...rest, amountMinor: amount }));
export const projectSchema = z
  .object({
    projectId: uuid.optional(),
    groupId: uuid,
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().min(10).max(2000),
    plan: z.string().trim().min(10).max(4000),
    amount,
    currency: currencySchema,
    status: z.enum(["planned", "active", "completed"]).default("planned"),
  })
  .strict()
  .transform(({ amount, ...rest }) => ({ ...rest, targetMinor: amount }));
export const spendingSchema = z
  .object({
    groupId: uuid,
    projectId: uuid.nullable().optional(),
    amount,
    currency: currencySchema,
    description: z.string().trim().min(5).max(1000),
    evidence: z
      .string()
      .trim()
      .min(5, "Add a receipt or delivery reference.")
      .max(1000),
    idempotencyKey: uuid,
  })
  .strict()
  .transform(({ amount, ...rest }) => ({ ...rest, amountMinor: amount }));
export const updateSchema = z
  .object({
    groupId: uuid,
    caption: z.string().trim().min(3).max(2000),
    imagePath: z.string().max(500).nullable().optional(),
  })
  .strict();
