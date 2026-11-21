"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Users,
} from "lucide-react";
import { useDashboardMember } from "../../_providers/dashboard-member";
import { RouteSection } from "../route-section";
import type { ImpactView } from "@/lib/project100/impact/types";
import { impactMoney } from "@/lib/project100/impact/types";
import { clearImpactReservation } from "@/lib/project100/impact/client-reservation";
import { ContributionForm } from "./contribution-form";
import { GroupContent } from "./group-content";
import { GroupFunding } from "./group-funding";
import { JoinForm } from "./join-form";
import {
  impactRequest,
  LoadState,
  shortDate,
  useImpact,
} from "./shared";
import "./impact.css";
const base = "/dashboard/me/project100-scholarship";

export function Project100Impact({
  screen = "overview",
  groupId,
  contributionId,
}: {
  screen?: "overview" | "groups" | "group" | "support";
  groupId?: string;
  contributionId?: string;
}) {
  const { member } = useDashboardMember();
  const router = useRouter();
  const { view, loading, error, reload } = useImpact(groupId);
  const group = view?.groups.find((g) => g.id === groupId);
  const joinedGroupId = view?.membership?.group_id;
  const groupPath = joinedGroupId ? `${base}/groups/${joinedGroupId}` : null;
  const returningToGroup = Boolean(groupPath && (screen === "groups" || (screen === "overview" && !contributionId)));

  useEffect(() => {
    if (returningToGroup && groupPath) router.replace(groupPath);
  }, [groupPath, returningToGroup, router]);
  return (
    <RouteSection
      className="p100"
      title="Project100 Scholarship"
    >
      {screen === "support" && groupId && (
        <Link className="p100-back" href={`${base}/groups/${groupId}`}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to the group
        </Link>
      )}
      <LoadState
        loading={(loading && !view) || returningToGroup}
        error={error}
        retry={() => void reload()}
      />
      {screen === "overview" && view && !joinedGroupId && !contributionId && (
        <section className="p100-panel p100-choice">
          <h2>Help children stay in school</h2>
          <p className="p100-muted">
            Project100 brings members together to support local education projects. Choose where you want to help and join the group working there. Your group page shows how much has been raised, what’s been delivered and who’s involved.
          </p>
          <Link className="p100-primary" href={`${base}/groups`}>
            Choose where to help <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>
      )}
      {screen === "overview" && contributionId && (
        <>
          <PaymentReturn key={contributionId} id={contributionId} reload={reload} />
          {groupPath && <Link className="p100-primary" href={groupPath}>Go to my impact group <ArrowRight size={18} aria-hidden="true" /></Link>}
        </>
      )}
      {view && screen === "groups" && !joinedGroupId && <JoinForm groups={view.groups} />}
      {view && groupId && !group && (
        <section className="p100-empty" role="alert">
          <h2>This group could not be found.</h2>
          <Link href={`${base}/groups`} className="p100-secondary">
            Explore impact groups
          </Link>
        </section>
      )}
      {view && group && screen === "group" && (
        <>
          <section className="p100-group-hero">
            <div>
              <span className="p100-kicker">
                <MapPin size={15} />
                {group.country === "Nigeria"
                  ? "Nigeria · State community"
                  : "Africa · Country community"}
              </span>
              <h2>
                {group.state ??
                  (group.slug === "cd" ? "DR Congo" : group.country)}
              </h2>
              <div className="p100-actions">
                <Link
                  className="p100-primary"
                  href={view.membership?.group_id === group.id || view.canSupportAnyGroup
                    ? `${base}/groups/${group.id}/support`
                    : groupPath ?? `${base}/groups`}
                >
                  {view.membership?.group_id === group.id || view.canSupportAnyGroup
                    ? "Support this community"
                    : groupPath ? "Go to my group" : "Choose my impact group"}
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
                <span className="p100-member-count">
                  <Users size={17} />
                  {group.members} {group.members === 1 ? "member" : "members"}
                  {view.membership?.group_id === group.id
                    ? " · Your group"
                    : ""}
                </span>
              </div>
            </div>
          </section>
          <GroupFunding group={group} view={view} />
          {view.membership?.group_id === group.id && <GroupMembers names={view.memberNames ?? []} />}
          <GroupContent
            view={view}
            group={group}
            memberId={member.id}
            reload={reload}
          />
          {view.membership?.group_id === group.id && <ContributionHistory view={view} />}
        </>
      )}
      {view && group && screen === "support" && (
        <>
          <div className="p100-section-intro">
            <div>
              <span className="p100-kicker">
                03 / Put your support behind the plan
              </span>
              <h2>Your support has a place to go.</h2>
            </div>
            <p className="p100-muted">
              Contribute personally or bring your organisation into the story.
              Your chosen community stays attached to this contribution.
            </p>
          </div>
          {view.membership?.group_id === group.id || view.canSupportAnyGroup ? (
            <ContributionForm group={group} enabled={view.checkoutEnabled} />
          ) : (
            <Link className="p100-primary" href={groupPath ?? `${base}/groups`}>
              {groupPath ? "Go to my group" : "Choose my impact group"} <ArrowRight size={17} aria-hidden="true" />
            </Link>
          )}
        </>
      )}
    </RouteSection>
  );
}
function GroupMembers({ names }: { names: string[] }) {
  return (
    <section className="p100-panel p100-choice" aria-labelledby="project100-members">
      <h2 id="project100-members">People in your group</h2>
      <p className="p100-muted">Members with visible profiles who chose the same place to support.</p>
      {names.length ? (
        <>
          <ul className="p100-people">
            {names.slice(0, 6).map((name, index) => <li key={`${name}-${index}`}>{name}</li>)}
          </ul>
          {names.length > 6 && <details>
            <summary>See more group members</summary>
            <ul className="p100-people">
              {names.slice(6).map((name, index) => <li key={`${name}-${index}`}>{name}</li>)}
            </ul>
          </details>}
        </>
      ) : <p className="p100-muted">There are no other visible member profiles to show yet.</p>}
    </section>
  );
}

function ContributionHistory({ view }: { view: ImpactView }) {
  if (!view.contributions.length) return null;
  return (
    <details className="p100-panel">
      <summary className="font-semibold">My contributions</summary>
      <ul className="p100-contribution-history">
        {view.contributions.map((c) => (
          <li key={c.id}>
            <div>
              <strong>{impactMoney(c.amount_minor, c.currency)}</strong>
              <p>
                {view.groups.find((g) => g.id === c.group_id)?.name} ·{" "}
                {shortDate(c.created_at)}
              </p>
            </div>
            <span className={`p100-status ${c.status}`}>
              {c.status === "paid"
                ? "Confirmed"
                : c.status === "needs_review"
                  ? "Under review"
                  : "Awaiting payment confirmation"}
            </span>
          </li>
        ))}
      </ul>
      <p className="p100-fine">
        Latest 100 contributions. Pending payments are excluded from raised
        totals.
      </p>
    </details>
  );
}

function PaymentReturn({
  id,
  reload,
}: {
  id: string;
  reload: () => Promise<void>;
}) {
  const [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true);
  const confirm = useCallback(async () => {
    try {
      const body = await impactRequest("/api/member/project100/impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reconcile",
          input: { contributionId: id },
        }),
      });
      setStatus(body.status);
      await reload();
      if (body.status === "paid") {
        const group = new URL(window.location.href).searchParams.get("group");
        if (group)
          try {
            clearImpactReservation(sessionStorage, group, id);
          } catch {
            /* optional */
          }
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Confirmation is temporarily unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }, [id, reload]);
  useEffect(() => {
    let active = true;
    impactRequest("/api/member/project100/impact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reconcile",
        input: { contributionId: id },
      }),
    })
      .then(async (body) => {
        if (!active) return;
        setStatus(body.status);
        if (body.status === "paid") {
          const group = new URL(window.location.href).searchParams.get("group");
          if (group) clearImpactReservation(sessionStorage, group, id);
        }
        await reload();
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Confirmation is temporarily unavailable.",
          );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [id, reload]);
  return (
    <section
      className={
        status === "paid"
          ? "p100-payment-return p100-confirmed"
          : "p100-payment-return"
      }
      role="status"
    >
      {status === "paid" && <CheckCircle2 size={28} />}
      <h2>
        {status === "paid"
          ? "Your support is part of the story."
          : status === "needs_review"
            ? "The team is reviewing this contribution."
            : "Let’s confirm your contribution."}
      </h2>
      <p>
        {status === "paid"
          ? "Your payment is confirmed and included in the total for your chosen community."
          : status === "needs_review"
            ? "This amount is excluded from available support while the payment is reviewed."
            : "Returning from checkout does not confirm payment. We’ll check it securely before adding it to the group total."}
      </p>
      {error && (
        <p className="p100-error" role="alert">
          {error}
        </p>
      )}
      {status !== "paid" && status !== "needs_review" && (
        <button
          onClick={() => {
            setBusy(true);
            setError("");
            void confirm();
          }}
          className="p100-secondary"
          disabled={busy}
        >
          {busy ? "Checking payment…" : "Check payment status"}
        </button>
      )}
    </section>
  );
}
