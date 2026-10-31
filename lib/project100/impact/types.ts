export type ImpactCurrency = "NGN" | "USD";
export type ImpactTotals = Record<ImpactCurrency, number>;
export type ImpactGroup = {
  id: string;
  slug: string;
  name: string;
  country: string;
  state: string | null;
  active: boolean;
  raised: ImpactTotals;
  spent: ImpactTotals;
  members: number;
};
export type ImpactMembership = { member_id: string; group_id: string };
export type ImpactProject = {
  id: string;
  group_id: string;
  title: string;
  description: string;
  plan: string;
  target_minor: number;
  currency: ImpactCurrency;
  status: "planned" | "active" | "completed";
};
export type ImpactSupporter = {
  id: string;
  group_id: string;
  display_name: string;
  amount_minor: number;
  currency: ImpactCurrency;
  paid_at: string;
};
export type ImpactUpdate = {
  id: string;
  group_id: string;
  author_id: string;
  author_name: string;
  caption: string;
  image_url: string | null;
  image_unavailable?: boolean;
  created_at: string;
};
export type ImpactSpending = {
  id: string;
  group_id: string;
  project_id: string | null;
  amount_minor: number;
  currency: ImpactCurrency;
  description: string;
  evidence: string;
  created_at: string;
};
export type ImpactContribution = {
  id: string;
  group_id: string;
  amount_minor: number;
  currency: ImpactCurrency;
  status: "pending" | "paid" | "needs_review";
  display_name: string;
  donor_name?: string | null;
  reference?: string | null;
  charge_id?: string | null;
  created_at: string;
  paid_at: string | null;
};
export type ImpactView = {
  groups: ImpactGroup[];
  membership: {
    group_id: string;
    residence_country: string;
    residence_state: string | null;
  } | null;
  projects: ImpactProject[];
  supporters: ImpactSupporter[];
  updates: ImpactUpdate[];
  spending: ImpactSpending[];
  contributions: ImpactContribution[];
  totals: { raised: ImpactTotals; spent: ImpactTotals };
  checkoutEnabled: boolean;
  canSupportAnyGroup?: boolean;
};
export const IMPACT_COUNTRIES = [
  "Ethiopia",
  "Ghana",
  "Cameroon",
  "Kenya",
  "Benin",
  "Democratic Republic of the Congo",
] as const;
export const impactMoney = (minor: number, currency: ImpactCurrency) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
