"use client";
import Image from "@/components/safe-image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Globe2,
  HeartHandshake,
  MapPin,
  Users,
} from "lucide-react";
import { useDashboardMember } from "../../_providers/dashboard-member";
import { RouteSection } from "../route-section";
import type { ImpactGroup, ImpactView } from "@/lib/project100/impact/types";
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
  Totals,
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
  const { view, loading, error, reload } = useImpact(groupId);
  const group = view?.groups.find((g) => g.id === groupId);
  return (
    <RouteSection
      className="p100"
      eyebrow="An initiative of Top100 Africa Future Leaders"
      title="Project100 Scholarship"
      description={
        screen === "overview"
          ? "Together, we can keep the next chapter open."
          : undefined
      }
    >
      {screen !== "overview" && (
        <Link
          className="p100-back"
          href={
            screen === "support" && groupId ? `${base}/groups/${groupId}` : base
          }
        >
          <ArrowLeft size={16} />
          {screen === "support" ? "Back to the group" : "Project overview"}
        </Link>
      )}
      {screen === "overview" && (
        <>
          <section className="p100-hero">
            <div className="p100-hero-copy">
              <span className="p100-kicker">
                Education changes what comes next
              </span>
              <h2>
                One community.
                <br />
                More children
                <br />
                <span>in school.</span>
              </h2>
              <p>
                We’re bringing our community together to support students, one
                local project at a time. Find your group. Add your support.
                Follow the difference.
              </p>
              <Link
                className="p100-primary"
                href={
                  view?.membership
                    ? `${base}/groups/${view.membership.group_id}`
                    : `${base}/groups`
                }
              >
                {view?.membership
                  ? "Go to my impact group"
                  : "Find my impact group"}
                <ArrowRight size={18} />
              </Link>
            </div>
            <div className="p100-hero-image">
              <Image
                src="/project100-school-community.webp"
                alt="Students carrying school bags on their way to school"
                fill
                sizes="(max-width: 700px) 100vw, 50vw"
                priority
              />
              <div className="p100-image-caption">
                <span>A shared purpose.</span>
                <span>A future worth showing up for.</span>
              </div>
            </div>
          </section>
          {contributionId && (
            <PaymentReturn
              key={contributionId}
              id={contributionId}
              reload={reload}
            />
          )}
        </>
      )}
      <LoadState
        loading={loading && !view}
        error={error}
        retry={() => void reload()}
      />
      {view && screen === "overview" && <Overview view={view} />}
      {view && screen === "groups" && (
        <>
          <div className="p100-section-intro">
            <div>
              <span className="p100-kicker">01 / Find your community</span>
              <h2>Your next step starts with a place.</h2>
            </div>
            <p className="p100-muted">
              Nigeria’s state groups and six country communities. Every group
              has its own support pool, local plans and impact journal.
            </p>
          </div>
          <JoinForm
            groups={view.groups}
            membership={view.membership}
            location={member.location}
          />
          <GroupDirectory groups={view.groups} />
        </>
      )}
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
              <p>
                Different people. Shared purpose. A stronger future for students
                in {group.state ?? group.country}.
              </p>
              <div className="p100-actions">
                <Link
                  className="p100-primary"
                  href={
                    view.membership?.group_id === group.id ||
                    view.canSupportAnyGroup
                      ? `${base}/groups/${group.id}/support`
                      : "#join-my-group"
                  }
                >
                  {view.membership?.group_id === group.id ||
                  view.canSupportAnyGroup
                    ? "Support this community"
                    : "Join my impact group"}
                  <ArrowRight size={17} />
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
            <div className="p100-group-symbol" aria-hidden="true">
              <HeartHandshake strokeWidth={1} />
            </div>
          </section>
          <GroupFunding group={group} view={view} />
          {view.membership?.group_id !== group.id && (
            <div id="join-my-group">
              <JoinForm
                groups={view.groups}
                membership={view.membership}
                location={member.location}
                fixedGroup={group}
                onJoined={reload}
              />
            </div>
          )}
          <GroupContent
            view={view}
            group={group}
            memberId={member.id}
            reload={reload}
          />
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
            <JoinForm
              groups={view.groups}
              membership={view.membership}
              location={member.location}
              fixedGroup={group}
              onJoined={reload}
            />
          )}
        </>
      )}
    </RouteSection>
  );
}
function Overview({ view }: { view: ImpactView }) {
  const joined = view.membership
    ? view.groups.find((g) => g.id === view.membership!.group_id)
    : null;
  return (
    <>
      <section
        className="p100-impact-strip"
        aria-label="Project100 collective impact"
      >
        <div>
          <span className="p100-kicker">Raised together</span>
          <Totals value={view.totals.raised} />
          <small>Confirmed contributions · currencies shown separately</small>
        </div>
        <div>
          <span className="p100-kicker">People showing up</span>
          <strong>{view.groups.reduce((sum, g) => sum + g.members, 0)}</strong>
          <small>Members in impact groups</small>
        </div>
        <div>
          <span className="p100-kicker">Connected by purpose</span>
          <strong>{view.groups.filter((g) => g.active).length}</strong>
          <small>State and country communities</small>
        </div>
      </section>
      {joined && (
        <Link className="p100-my-group" href={`${base}/groups/${joined.id}`}>
          <span className="p100-my-group-icon">
            <Users size={22} />
          </span>
          <span>
            <small>Your community</small>
            <strong>{joined.name}</strong>
            <span>
              {impactMoney(joined.raised.NGN, "NGN")} raised
              {joined.raised.USD > 0
                ? ` + ${impactMoney(joined.raised.USD, "USD")}`
                : ""}{" "}
              · See what’s next
            </span>
          </span>
          <ArrowRight size={20} />
        </Link>
      )}
      <section className="p100-how">
        <div className="p100-section-intro">
          <div>
            <span className="p100-kicker">
              A little support. A longer story.
            </span>
            <h2>Here’s how we make it count.</h2>
          </div>
          <p className="p100-muted">
            Every contribution belongs to a community. Every local plan gives it
            a purpose. Every update brings you closer to the difference.
          </p>
        </div>
        <ol>
          {[
            {
              title: "Find your community",
              copy: "Join your state in Nigeria, or choose one of six African country groups if you live abroad.",
            },
            {
              title: "Get behind a local plan",
              copy: "See the school needs, the budget and the next step. Add your support, on your own or with your organisation.",
            },
            {
              title: "Stay close to the impact",
              copy: "Meet the supporters. See delivery records. Share photos and follow the moments your community makes possible.",
            },
          ].map((step, i) => (
            <li key={step.title}>
              <span className="p100-step-number">0{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </li>
          ))}
        </ol>
      </section>
      <GroupDirectory groups={view.groups} compact />
      {view.contributions.length > 0 && (
        <section>
          <div className="p100-section-intro">
            <div>
              <span className="p100-kicker">Your part in the story</span>
              <h2>My contributions</h2>
            </div>
          </div>
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
        </section>
      )}
    </>
  );
}
function GroupDirectory({
  groups,
  compact = false,
}: {
  groups: ImpactGroup[];
  compact?: boolean;
}) {
  const [filter, setFilter] = useState<"countries" | "nigeria">("countries"),
    [search, setSearch] = useState("");
  const filtered = groups.filter(
    (g) =>
      g.active &&
      (filter === "nigeria"
        ? g.country === "Nigeria"
        : g.country !== "Nigeria") &&
      `${g.name} ${g.country}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section className="p100-directory">
      <div className="p100-section-intro">
        <div>
          <span className="p100-kicker">
            <Globe2 size={15} />
            Local roots. African reach.
          </span>
          <h2>Find the place you’ll stand with.</h2>
        </div>
        {compact && (
          <Link className="p100-text-button" href={`${base}/groups`}>
            Choose my group
            <ArrowRight size={16} />
          </Link>
        )}
      </div>
      <div className="p100-directory-controls">
        <div className="p100-segment">
          <button
            aria-pressed={filter === "countries"}
            onClick={() => setFilter("countries")}
          >
            Across Africa
          </button>
          <button
            aria-pressed={filter === "nigeria"}
            onClick={() => setFilter("nigeria")}
          >
            Nigerian states
          </button>
        </div>
        <label className="p100-search">
          <span className="sr-only">Find a group</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              filter === "nigeria" ? "Find your state…" : "Find a country…"
            }
          />
        </label>
      </div>
      <div className="p100-group-grid">
        {filtered.map((g) => (
          <Link
            key={g.id}
            href={`${base}/groups/${g.id}`}
            className="p100-group-card"
          >
            <div className="p100-card-top">
              <span className="p100-group-index">
                {filter === "nigeria" ? "NG" : g.slug.toUpperCase()}
              </span>
              <ArrowRight size={19} />
            </div>
            <h3>{g.state ?? (g.slug === "cd" ? "DR Congo" : g.country)}</h3>
            <p>
              {filter === "nigeria"
                ? "Local projects. Shared progress."
                : "A community beyond borders."}
            </p>
            <div className="p100-card-stats">
              <Totals value={g.raised} />
              <span>
                {g.members} {g.members === 1 ? "member" : "members"}
              </span>
            </div>
          </Link>
        ))}
      </div>
      {!filtered.length && (
        <p className="p100-empty-line">No groups match that search.</p>
      )}
    </section>
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
