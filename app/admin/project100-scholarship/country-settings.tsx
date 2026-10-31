"use client";
import { useState } from "react";
import { AFRICAN_APPLICANT_COUNTRIES } from "@/lib/dashboard/top100-moment-countries";
import type { ImpactGroup } from "@/lib/project100/impact/types";
import { impactRequest } from "@/app/dashboard/_components/project100/shared";
type Ranking = {
  year: number;
  records: number;
  countries: { country: string; count: number }[];
};
export function CountrySettings({
  groups,
  reload,
}: {
  groups: ImpactGroup[];
  reload: () => Promise<void>;
}) {
  const [countries, setCountries] = useState(
    groups
      .filter((g) => g.country !== "Nigeria" && g.active)
      .map((g) => g.country),
  );
  const [ranking, setRanking] = useState<Ranking | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  async function action(name: "ranking" | "countries") {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const body = await impactRequest("/api/admin/project100/impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: name,
          ...(name === "countries" ? { input: { countries } } : {}),
        }),
      });
      if (name === "ranking") setRanking(body);
      else {
        setSaved(true);
        await reload();
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Country destinations could not be updated.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="p100-panel">
      <summary className="min-h-11 cursor-pointer text-sm font-medium">
        Country destinations and awardee ranking
      </summary>
      <div className="p100-admin-form mt-5">
        <p className="p100-muted">
          Choose six African destination countries for members living abroad.
          State groups in Nigeria stay available. Retiring a country closes it
          to new support; earlier contributions and records stay in place.
        </p>
        <button
          className="p100-secondary self-start"
          disabled={busy}
          onClick={() => void action("ranking")}
        >
          {busy ? "Working…" : "Check current awardee ranking"}
        </button>
        {ranking && (
          <div className="p100-destination">
            <div>
              <p>
                {ranking.year} cohort · {ranking.records} awardee records
                checked
              </p>
              <ol className="my-3">
                {ranking.countries.map((c, i) => (
                  <li key={c.country}>
                    {i + 1}. {c.country} · {c.count} awardees
                  </li>
                ))}
              </ol>
              <p className="p100-fine">
                Country spellings and language variants are combined. Nigeria,
                non-African countries and unclear entries are excluded. Ties use
                alphabetical order.
              </p>
              <button
                className="p100-text-button"
                disabled={busy || ranking.countries.length !== 6}
                onClick={() =>
                  setCountries(ranking.countries.map((c) => c.country))
                }
              >
                Use these six destinations
              </button>
            </div>
          </div>
        )}
        <div className="p100-form-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <label key={index}>
              Destination {index + 1}
              <select
                value={countries[index] ?? ""}
                disabled={busy}
                onChange={(e) =>
                  setCountries((previous) =>
                    Array.from({ length: 6 }, (_, i) =>
                      i === index ? e.target.value : (previous[i] ?? ""),
                    ),
                  )
                }
              >
                <option value="">Choose an African country</option>
                {AFRICAN_APPLICANT_COUNTRIES.filter((c) => c !== "Nigeria").map(
                  (c) => (
                    <option key={c}>{c}</option>
                  ),
                )}
              </select>
            </label>
          ))}
        </div>
        {error && (
          <p className="p100-error" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="p100-success" role="status">
            The six country destinations are saved.
          </p>
        )}
        <button
          className="p100-primary self-start"
          disabled={
            busy ||
            countries.length !== 6 ||
            new Set(countries).size !== 6 ||
            countries.some((c) => !c)
          }
          onClick={() => void action("countries")}
        >
          Save six destinations
        </button>
      </div>
    </details>
  );
}
