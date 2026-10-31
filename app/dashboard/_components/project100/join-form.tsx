"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import { nigeriaStates } from "@/lib/awards/locations";
import { RESIDENCE_COUNTRIES } from "@/lib/project100/impact/countries";
import {
  canonicalCountry,
  matchNigeriaState,
} from "@/lib/project100/impact/grouping";
import type { ImpactGroup, ImpactView } from "@/lib/project100/impact/types";
import { impactRequest } from "./shared";

export function JoinForm({
  groups,
  membership,
  location = "",
  fixedGroup,
  onJoined,
}: {
  groups: ImpactGroup[];
  membership: ImpactView["membership"];
  location?: string;
  fixedGroup?: ImpactGroup;
  onJoined?: () => Promise<void>;
}) {
  const router = useRouter();
  const locationCountry = /\bnigeria\b/i.test(location)
    ? "Nigeria"
    : canonicalCountry(location);
  const [country, setCountry] = useState(
    membership?.residence_country ?? locationCountry ?? "",
  );
  const [state, setState] = useState(
    membership?.residence_state ?? matchNigeriaState(location) ?? "",
  );
  const [destination, setDestination] = useState(fixedGroup?.id ?? "");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const local = country === "Nigeria";
  const group = local
    ? groups.find(
        (g) => g.country === "Nigeria" && g.state === state && g.active,
      )
    : groups.find(
        (g) => g.id === destination && g.country !== "Nigeria" && g.active,
      );
  const fixedMismatch = Boolean(
    fixedGroup && group && group.id !== fixedGroup.id,
  );
  async function join(event: React.FormEvent) {
    event.preventDefault();
    if (!group) return;
    setBusy(true);
    setError("");
    try {
      await impactRequest("/api/member/project100/impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          input: {
            groupId: group.id,
            residenceCountry: country,
            ...(local ? { residenceState: state } : {}),
          },
        }),
      });
      if (onJoined) await onJoined();
      router.push(`/dashboard/me/project100-scholarship/groups/${group.id}`);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Your group could not be joined.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={join} className="p100-join p100-panel">
      <span className="p100-kicker">
        <MapPin size={15} />A place to make a difference
      </span>
      <h2>Find your people. Build something lasting.</h2>
      <p className="p100-muted">
        In Nigeria, support starts in your state. Living abroad? Choose an
        African community to stand with.
      </p>
      <div className="p100-form-grid">
        <label>
          Where do you live?
          <select
            required
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setError("");
            }}
            disabled={busy}
          >
            <option value="">Choose your country of residence</option>
            {RESIDENCE_COUNTRIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        {country &&
          (local ? (
            <label>
              Your state
              <select
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                disabled={busy}
              >
                <option value="">Choose your state</option>
                {nigeriaStates.map((s) => {
                  const name =
                    s.name === "FCT" ? "Federal Capital Territory" : s.name;
                  return <option key={name}>{name}</option>;
                })}
              </select>
            </label>
          ) : (
            <label>
              Where would you like to support?
              <select
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                disabled={busy}
              >
                <option value="">Choose a destination country</option>
                {groups
                  .filter((g) => g.country !== "Nigeria" && g.active)
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.country}
                    </option>
                  ))}
              </select>
            </label>
          ))}
      </div>
      {group && (
        <div className="p100-destination">
          <MapPin size={18} />
          <span>
            You’ll join <strong>{group.name}</strong>. Your contributions will
            be reserved for this community.
          </span>
        </div>
      )}
      {fixedMismatch && (
        <p className="p100-muted">
          Your location belongs to {group?.name}. We’ll take you there when you
          join.
        </p>
      )}
      {error && (
        <p className="p100-error" role="alert">
          {error}
        </p>
      )}
      <button className="p100-primary" disabled={busy || !group}>
        {busy
          ? "Joining your group…"
          : membership?.group_id === group?.id
            ? "Go to my group"
            : "Join my impact group"}
        <ArrowRight size={17} />
      </button>
      <p className="p100-fine">
        Joining is free. You can contribute when you’re ready. Changing groups
        only changes future support.
      </p>
    </form>
  );
}
