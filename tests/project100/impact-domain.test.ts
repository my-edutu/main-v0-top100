import { describe, expect, it } from "vitest";
import {
  canonicalCountry,
  matchNigeriaState,
  planImpactGroups,
  rankImpactCountries,
} from "@/lib/project100/impact/grouping";
import {
  contributionSchema,
  joinSchema,
  spendingSchema,
} from "@/lib/project100/impact/validation";

describe("Project100 geographic grouping", () => {
  it("ranks African destinations by cohort after combining aliases and excluding Nigeria and unknown countries", () => {
    const records = [
      ...Array.from({ length: 10 }, () => ({ country: "Nigeria", year: 2026 })),
      { country: "Cameroun", year: 2026 },
      { country: "Cameroon", year: 2026 },
      { country: "BÃ©nin", year: 2026 },
      { country: "BENIN", year: 2026 },
      { country: "RDC", year: 2026 },
      { country: "DR Congo", year: 2026 },
      { country: "Ghana", year: 2025 },
      { country: "Canada", year: 2026 },
      { country: null, year: 2026 },
    ];
    expect(rankImpactCountries(records, 2026)).toEqual([
      { country: "Benin", count: 2 },
      { country: "Cameroon", count: 2 },
      { country: "Democratic Republic of the Congo", count: 2 },
    ]);
    expect(canonicalCountry("Australia")).toBe("Australia");
  });
  it("combines imported country names without confusing Niger with Nigeria or Congo with DR Congo", () => {
    expect(canonicalCountry("BÃ©nin")).toBe("Benin");
    expect(canonicalCountry("Cameroun")).toBe("Cameroon");
    expect(canonicalCountry("RDC")).toBe("Democratic Republic of the Congo");
    expect(canonicalCountry("Niger")).toBe("Niger");
    expect(canonicalCountry("Congo")).toBeNull();
  });
  it("finds a local state but refuses conflicting or incomplete locations", () => {
    expect(matchNigeriaState("Niger Delta")).toBeNull();
    expect(matchNigeriaState("Plateau")).toBeNull();
    expect(matchNigeriaState("Kaduna, Ghana")).toBeNull();
    expect(matchNigeriaState("Plateau", "Nigeria")).toBe("Plateau");
    expect(matchNigeriaState("Kaduna State, Nigeria")).toBe("Kaduna");
    expect(matchNigeriaState("Abuja, FCT")).toBe("Federal Capital Territory");
    expect(matchNigeriaState("Lagos / Kaduna")).toBeNull();
    expect(matchNigeriaState("Nigeria")).toBeNull();
    expect(matchNigeriaState("Niger State")).toBe("Niger");
  });
  it("assigns consenting Nigerian applicants once and leaves international destination choices to members", () => {
    const groups = [
      { id: "kaduna", country: "Nigeria", state: "Kaduna" },
      { id: "ghana", country: "Ghana", state: null },
    ];
    const applicants = [
      {
        member_id: "one",
        country: "Nigeria",
        location: "Kaduna",
        status: "submitted",
        consent: true,
      },
      {
        member_id: "two",
        country: "Ghana",
        location: "Accra",
        status: "submitted",
        consent: true,
      },
      {
        member_id: "three",
        country: "Nigeria",
        location: "Kaduna",
        status: "draft",
        consent: true,
      },
      {
        member_id: "four",
        country: "Nigeria",
        location: "Kaduna",
        status: "submitted",
        consent: false,
      },
    ];
    expect(planImpactGroups(applicants, [], groups)).toEqual({
      assignments: [{ memberId: "one", groupId: "kaduna" }],
      unresolved: [{ memberId: "two", reason: "Choose a destination country" }],
      alreadyJoined: 0,
    });
    expect(
      planImpactGroups(
        applicants,
        [{ member_id: "one", group_id: "ghana" }],
        groups,
      ).assignments,
    ).toEqual([]);
  });
});

describe("Project100 contribution boundaries", () => {
  const input = {
    groupId: "00000000-0000-4000-8000-000000000001",
    amount: "1000.01",
    currency: "NGN",
    attribution: "personal",
    anonymous: false,
    idempotencyKey: "00000000-0000-4000-8000-000000000002",
  };
  it("parses exact minor units and rejects fractional kobo, exponent notation and unsafe amounts", () => {
    expect(contributionSchema.parse(input).amountMinor).toBe(100001);
    for (const amount of [
      "1e6",
      "1000.001",
      "-100",
      "99999999999999999999",
      "0",
      "999.99",
    ])
      expect(contributionSchema.safeParse({ ...input, amount }).success).toBe(
        false,
      );
  });
  it("requires an organisation name for organisation attribution and an explicit destination", () => {
    expect(
      contributionSchema.safeParse({ ...input, attribution: "organisation" })
        .success,
    ).toBe(false);
    expect(
      joinSchema.safeParse({
        groupId: input.groupId,
        residenceCountry: "Nigeria",
      }).success,
    ).toBe(false);
    expect(
      joinSchema.safeParse({
        groupId: input.groupId,
        residenceCountry: "Nigeria",
        residenceState: "Kaduna",
      }).success,
    ).toBe(true);
  });
  it("requires evidence and a positive exact amount to record delivered support", () => {
    expect(
      spendingSchema.safeParse({
        groupId: input.groupId,
        amount: "1000",
        currency: "NGN",
        description: "School fees",
        evidence: "",
        idempotencyKey: input.idempotencyKey,
      }).success,
    ).toBe(false);
  });
});
