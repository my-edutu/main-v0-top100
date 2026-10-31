import { nigeriaStates, locationSuggestions } from "@/lib/awards/locations";
import {
  AFRICAN_APPLICANT_COUNTRIES,
  OTHER_APPLICANT_COUNTRIES,
} from "@/lib/dashboard/top100-moment-countries";
import { RESIDENCE_COUNTRIES } from "./countries";

const countryAliases: Record<string, string> = {
  ng: "Nigeria",
  nigerian: "Nigeria",
  ngeria: "Nigeria",
  nigeri: "Nigeria",
  cameroun: "Cameroon",
  camerooon: "Cameroon",
  ethiopian: "Ethiopia",
  "addis ababa": "Ethiopia",
  "addis ababa ethiopia": "Ethiopia",
  bénin: "Benin",
  béninoise: "Benin",
  "calavi/cotonou": "Benin",
  rdc: "Democratic Republic of the Congo",
  rdcongo: "Democratic Republic of the Congo",
  "dr congo": "Democratic Republic of the Congo",
  "république démocratique du congo": "Democratic Republic of the Congo",
  "republique democratique du congo": "Democratic Republic of the Congo",
  "democratic republic of congo": "Democratic Republic of the Congo",
  "the democratic republic of the congo": "Democratic Republic of the Congo",
  "congo republic democratic of": "Democratic Republic of the Congo",
  "democratic republic of the congo (drc)": "Democratic Republic of the Congo",
};
export function canonicalCountry(input: string): string | null {
  let value = input.trim().replace(/\s+/g, " ");
  // Repair the known UTF-8-as-Latin-1 import issue without changing stored data.
  if (/[ÃÂâ]/.test(value)) {
    try {
      value = decodeURIComponent(
        Array.from(
          value,
          (c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`,
        ).join(""),
      );
    } catch {
      /* retain original */
    }
  }
  const key = value.toLowerCase();
  if (/^kinshasa(?:[, /]|$)/.test(key))
    return "Democratic Republic of the Congo";
  return (
    countryAliases[key] ??
    [
      ...AFRICAN_APPLICANT_COUNTRIES,
      ...OTHER_APPLICANT_COUNTRIES,
      ...RESIDENCE_COUNTRIES,
    ].find((c) => c.toLowerCase() === key) ??
    null
  );
}
export function rankImpactCountries(
  records: { country: string | null; year: number | string | null }[],
  year: number,
) {
  const african = new Set<string>(AFRICAN_APPLICANT_COUNTRIES);
  const counts = new Map<string, number>();
  for (const record of records) {
    if (Number(record.year) !== year) continue;
    const country = canonicalCountry(record.country ?? "");
    if (country && country !== "Nigeria" && african.has(country))
      counts.set(country, (counts.get(country) ?? 0) + 1);
  }
  return [...counts]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country))
    .slice(0, 6);
}
export function matchNigeriaState(
  location: string,
  country?: string,
): string | null {
  const parts = location
    .toLowerCase()
    .replace(/[().]/g, " ")
    .replace(/\s+-\s+/g, ",")
    .split(/[,;/|]+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const nigeria =
    country?.toLowerCase() === "nigeria" ||
    parts.some((p) => /\bnigeria\b/.test(p));
  const stateFor = (part: string) => {
    const name = part
      .replace(/\bnigeria\b/g, "")
      .replace(/^state of /, "")
      .replace(/ state$/, "")
      .trim();
    if (
      /^(abuja|fct|abuja fct|fct abuja|federal capital territory)$/.test(name)
    )
      return "Federal Capital Territory";
    return (
      nigeriaStates.find((s) => s.name.toLowerCase() === name)?.name ?? null
    );
  };
  if (
    parts.some((p) => {
      const found = canonicalCountry(p.replace(/ country$/, ""));
      return (
        found && found !== "Nigeria" && !(nigeria && stateFor(p) === found)
      );
    })
  )
    return null;
  const fragments = parts
    .map((p) => p.replace(/\bnigeria\b/g, "").trim())
    .filter(Boolean);
  const states = [
    ...new Set(fragments.map(stateFor).filter((s): s is string => Boolean(s))),
  ];
  if (states.length !== 1) return null;
  const state = states[0];
  if (
    !nigeria &&
    ["Niger", "Delta", "Rivers", "Plateau", "Cross River"].includes(state) &&
    !parts.some((p) => /\bstate\b/.test(p))
  )
    return null;
  const localities = new Set(
    locationSuggestions(state).map((l) => l.toLowerCase()),
  );
  if (fragments.some((p) => !stateFor(p) && !localities.has(p))) return null;
  return state;
}
type Applicant = {
  member_id: string;
  country: string | null;
  location: string | null;
  status: string;
  consent: boolean;
};
export function planImpactGroups(
  applicants: Applicant[],
  memberships: { member_id: string; group_id: string }[],
  groups: { id: string; country: string; state: string | null }[],
) {
  const joined = new Set(memberships.map((m) => m.member_id));
  const assignments: { memberId: string; groupId: string }[] = [];
  const unresolved: { memberId: string; reason: string }[] = [];
  let alreadyJoined = 0;
  for (const applicant of applicants) {
    if (applicant.status !== "submitted" || !applicant.consent) continue;
    if (joined.has(applicant.member_id)) {
      alreadyJoined++;
      continue;
    }
    if (canonicalCountry(applicant.country ?? "") !== "Nigeria") {
      unresolved.push({
        memberId: applicant.member_id,
        reason: "Choose a destination country",
      });
      continue;
    }
    const state = matchNigeriaState(applicant.location ?? "", "Nigeria");
    const group = state
      ? groups.find((g) => g.country === "Nigeria" && g.state === state)
      : null;
    if (!group) {
      unresolved.push({
        memberId: applicant.member_id,
        reason: "Confirm a Nigerian state",
      });
      continue;
    }
    assignments.push({ memberId: applicant.member_id, groupId: group.id });
    joined.add(applicant.member_id);
  }
  return { assignments, unresolved, alreadyJoined };
}
