"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import type { ImpactGroup } from "@/lib/project100/impact/types";
import { impactRequest } from "./shared";

export function JoinForm({ groups }: { groups: ImpactGroup[] }) {
  const router = useRouter();
  const [country, setCountry] = useState("");
  const [groupId, setGroupId] = useState("");
  const [step, setStep] = useState<"country" | "region" | "confirm">("country");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const activeGroups = groups.filter(group => group.active);
  const countries = [...new Set(activeGroups.map(group => group.country))]
    .sort((left, right) => left.localeCompare(right));
  const regions = activeGroups.filter(group => group.country === country)
    .sort((left, right) => (left.state ?? left.name).localeCompare(right.state ?? right.name));
  const selected = regions.find(group => group.id === groupId);
  const requiresRegion = regions.length > 1 || regions.some(group => group.state);
  const totalSteps = requiresRegion ? 3 : 2;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");

    if (step === "country") {
      if (!regions.length) return;
      if (requiresRegion) {
        setStep("region");
      } else {
        setGroupId(regions[0].id);
        setStep("confirm");
      }
      return;
    }
    if (!selected) return;
    if (step === "region") {
      setStep("confirm");
      return;
    }

    setBusy(true);
    try {
      const result = await impactRequest("/api/member/project100/impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", input: { groupId: selected.id } }),
      });
      router.replace(`/dashboard/me/project100-scholarship/groups/${result.groupId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your group could not be joined.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="p100-panel p100-choice">
      <p className="p100-kicker">Step {step === "country" ? 1 : step === "region" ? 2 : totalSteps} of {totalSteps}</p>
      {step === "country" && <>
        <h2>Which country would you like to support?</h2>
        <p className="p100-muted">Choose where you want to make an impact.</p>
        <div className="p100-form-grid">
          <label>
            Impact country
            <select required value={country} onChange={event => {
              setCountry(event.target.value);
              setGroupId("");
            }}>
              <option value="">Select a country</option>
              {countries.map(name => <option key={name}>{name}</option>)}
            </select>
          </label>
        </div>
      </>}
      {step === "region" && <>
        <h2>Choose a state or group</h2>
        <p className="p100-muted">You’re choosing where to support in {country}.</p>
        <div className="p100-form-grid">
          <label>
            Impact state or group
            <select required value={groupId} onChange={event => setGroupId(event.target.value)}>
              <option value="">Select a state or group</option>
              {regions.map(group => <option key={group.id} value={group.id}>{group.state ?? group.name}</option>)}
            </select>
          </label>
        </div>
      </>}
      {step === "confirm" && selected && <>
        <h2>Confirm your impact group</h2>
        <p className="p100-destination"><strong>{selected.name}</strong>{selected.state && ` · ${selected.country}`}</p>
        <p className="p100-muted">
          Your choice is permanent once you confirm. You’ll return to this group’s funding, projects and members whenever you open Project100.
        </p>
      </>}
      {error && <p className="p100-error" role="alert">{error}</p>}
      <div className="p100-actions">
        {step !== "country" && <button type="button" className="p100-secondary" disabled={busy} onClick={() => {
          setError("");
          setStep(step === "confirm" && requiresRegion ? "region" : "country");
        }}>Back</button>}
        <button className="p100-primary" disabled={busy || (step === "country" ? !country : !selected)}>
          {busy ? "Confirming…" : step === "confirm" ? "Confirm and join" : "Continue"}
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
