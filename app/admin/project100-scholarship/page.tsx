"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowUpRight, CheckCircle2, Shuffle } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { CountrySettings } from "./country-settings";
import { GroupContent } from "@/app/dashboard/_components/project100/group-content";
import { GroupFunding } from "@/app/dashboard/_components/project100/group-funding";
import {
  impactRequest,
  LoadState,
  shortDate,
  Totals,
  useImpact,
} from "@/app/dashboard/_components/project100/shared";
import {
  impactMoney,
  type ImpactCurrency,
  type ImpactGroup,
  type ImpactProject,
  type ImpactView,
} from "@/lib/project100/impact/types";
import "@/app/dashboard/_components/project100/impact.css";

const endpoint = "/api/admin/project100/impact";
const post = (action: string, input?: unknown) =>
  impactRequest(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, input }),
  });
type GroupingReport = {
  assigned: number;
  alreadyJoined: number;
  unresolved: { memberId: string; name: string; reason: string }[];
};
export default function Project100AdminPage() {
  const [selected, setSelected] = useState(""),
    [grouping, setGrouping] = useState(false),
    [report, setReport] = useState<GroupingReport | null>(null),
    [actionError, setActionError] = useState("");
  const { view, error, loading, reload } = useImpact(
    selected || undefined,
    true,
  );
  const group = view?.groups.find((g) => g.id === selected);
  async function groupMembers() {
    setGrouping(true);
    setActionError("");
    try {
      setReport(await post("group"));
      await reload();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Grouping could not complete.",
      );
    } finally {
      setGrouping(false);
    }
  }
  return (
    <div className="p100 p100-admin space-y-6">
      <PageHeader
        eyebrow="Education · Communities · Impact"
        title="Project100 Scholarship"
        description="See what each community has raised, put a plan behind it, and record the support delivered."
        actions={
          <button
            className="p100-primary"
            onClick={() => void groupMembers()}
            disabled={grouping || !view}
          >
            <Shuffle size={17} />
            {grouping ? "Grouping members…" : "Group members in one click"}
          </button>
        }
      />
      <LoadState
        loading={loading && !view}
        error={error}
        retry={() => void reload()}
      />
      {actionError && (
        <p className="p100-error" role="alert">
          {actionError}
        </p>
      )}
      {report && (
        <section className="p100-admin-report" role="status">
          <h2>Groups are ready for the next chapter.</h2>
          <p className="mt-3">
            {report.assigned} newly assigned · {report.alreadyJoined} existing
            memberships preserved · {report.unresolved.length} need a location
            or destination choice.
          </p>
          <p className="p100-fine mt-2">
            Members with a submitted, consenting application and a clear
            Nigerian state are assigned locally. International members choose
            their country destination. Earlier contributions stay in their
            original group.
          </p>
          {report.unresolved.length > 0 && (
            <details>
              <summary>Members who need to choose a group</summary>
              <ul>
                {report.unresolved.map((r) => (
                  <li key={r.memberId}>
                    <strong>{r.name}</strong> · {r.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
      {view && (
        <>
          <section className="p100-impact-strip">
            <div>
              <span className="p100-kicker">Project support raised</span>
              <Totals value={view.totals.raised} />
              <small>Confirmed contributions, by currency</small>
            </div>
            <div>
              <span className="p100-kicker">Recorded as delivered</span>
              <Totals value={view.totals.spent} />
              <small>Evidence-backed spending records</small>
            </div>
            <div>
              <span className="p100-kicker">Community members</span>
              <strong>
                {view.groups.reduce((sum, g) => sum + g.members, 0)}
              </strong>
              <small>Across {view.groups.length} groups</small>
            </div>
          </section>
          <CountrySettings groups={view.groups} reload={reload} />
          <label className="p100-admin-group-select">
            Open a community
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Choose a state or country group</option>
              <optgroup label="Across Africa">
                {view.groups
                  .filter((g) => g.country !== "Nigeria")
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Nigerian states">
                {view.groups
                  .filter((g) => g.country === "Nigeria")
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
              </optgroup>
            </select>
          </label>
          {!group && <GroupSummary view={view} onSelect={setSelected} />}
          {group && (
            <div key={group.id}>
              <div className="p100-section-intro">
                <div>
                  <span className="p100-kicker">
                    {group.country} · {group.members} members
                  </span>
                  <h2>{group.name}</h2>
                </div>
                <Link
                  className="p100-secondary"
                  href={`/dashboard/me/project100-scholarship/groups/${group.id}/support`}
                >
                  Top up this community
                  <ArrowUpRight size={16} />
                </Link>
              </div>
              <GroupFunding group={group} view={view} />
              <Contributors view={view} reload={reload} />
              <div className="p100-admin-columns">
                <ProjectEditor
                  group={group}
                  projects={view.projects}
                  reload={reload}
                />
                <SpendingForm
                  group={group}
                  projects={view.projects}
                  reload={reload}
                />
              </div>
              <GroupContent view={view} group={group} admin reload={reload} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
function GroupSummary({
  view,
  onSelect,
}: {
  view: ImpactView;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="p100-group-grid">
      {view.groups.map((g) => (
        <button
          key={g.id}
          className="p100-group-card text-left"
          onClick={() => onSelect(g.id)}
        >
          <div className="p100-card-top">
            <span>
              {g.country === "Nigeria"
                ? "Nigeria · State group"
                : "Country group"}
            </span>
            <ArrowUpRight size={18} />
          </div>
          <h3>{g.state ?? (g.slug === "cd" ? "DR Congo" : g.country)}</h3>
          <div className="p100-card-stats">
            <Totals value={g.raised} />
            <span>{g.members} members</span>
          </div>
        </button>
      ))}
    </div>
  );
}
function Contributors({
  view,
  reload,
}: {
  view: ImpactView;
  reload: () => Promise<void>;
}) {
  const [search, setSearch] = useState(""),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const rows = view.contributions.filter((c) =>
    `${c.display_name} ${c.donor_name ?? ""} ${c.status}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  async function reconcile(id: string) {
    setBusy(id);
    setError("");
    try {
      await post("reconcile", { contributionId: id });
      await reload();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not check this contribution.",
      );
    } finally {
      setBusy("");
    }
  }
  return (
    <section>
      <div className="p100-section-intro">
        <div>
          <span className="p100-kicker">The support behind the plan</span>
          <h2>Contributions to this group</h2>
        </div>
        <label className="p100-search">
          <span className="sr-only">Search the latest contributions</span>
          <input
            type="search"
            placeholder="Find a supporter or status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <p className="p100-fine">
        Latest 100 contribution records. Full donor names are visible to admins,
        including for anonymous contributions.
      </p>
      {error && (
        <p className="p100-error" role="alert">
          {error}
        </p>
      )}
      {!rows.length ? (
        <p className="p100-empty-line">
          {view.contributions.length
            ? "No matching contributions in the latest records."
            : "No contributions yet. Your community’s supporters will appear here."}
        </p>
      ) : (
        <table className="p100-admin-table">
          <thead>
            <tr>
              <th>Supporter</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
              <th>Confirmation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td data-label="Supporter">
                  <strong className="font-medium">{c.display_name}</strong>
                  {c.donor_name !== c.display_name && (
                    <p className="p100-fine">By {c.donor_name}</p>
                  )}
                  <details>
                    <summary className="p100-fine cursor-pointer">
                      Payment reference
                    </summary>
                    <p className="p100-fine break-all">
                      {c.reference}
                      {c.charge_id ? ` · ${c.charge_id}` : ""}
                    </p>
                  </details>
                </td>
                <td data-label="Amount">
                  {impactMoney(c.amount_minor, c.currency)}
                </td>
                <td data-label="Status">
                  <span className={`p100-status ${c.status}`}>
                    {c.status === "paid"
                      ? "Confirmed"
                      : c.status === "needs_review"
                        ? "Under review"
                        : "Pending"}
                  </span>
                </td>
                <td data-label="Received">
                  {shortDate(c.paid_at ?? c.created_at)}
                </td>
                <td>
                  <button
                    className="p100-secondary"
                    disabled={Boolean(busy) || c.status === "needs_review"}
                    onClick={() => void reconcile(c.id)}
                  >
                    {busy === c.id
                      ? "Checking…"
                      : c.status === "needs_review"
                        ? "Review in Bachs"
                        : "Verify with Bachs"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
function ProjectEditor({
  group,
  projects,
  reload,
}: {
  group: ImpactGroup;
  projects: ImpactProject[];
  reload: () => Promise<void>;
}) {
  const [projectId, setProjectId] = useState(""),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [plan, setPlan] = useState(""),
    [amount, setAmount] = useState(""),
    [currency, setCurrency] = useState<ImpactCurrency>("NGN"),
    [status, setStatus] = useState<ImpactProject["status"]>("planned");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  function select(id: string) {
    setProjectId(id);
    const p = projects.find((p) => p.id === id);
    setTitle(p?.title ?? "");
    setDescription(p?.description ?? "");
    setPlan(p?.plan ?? "");
    setAmount(p ? String(p.target_minor / 100) : "");
    setCurrency(p?.currency ?? "NGN");
    setStatus(p?.status ?? "planned");
    setSaved(false);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setSaved(false);
    setError("");
    try {
      await post("project", {
        groupId: group.id,
        ...(projectId ? { projectId } : {}),
        title,
        description,
        plan,
        amount,
        currency,
        status,
      });
      await reload();
      if (!projectId) select("");
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The plan could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="p100-panel p100-admin-form">
      <span className="p100-kicker">Give the support a purpose</span>
      <h2>Publish a local project</h2>
      <p className="p100-muted">
        Describe the need, the budget and the steps. Keep the plan specific
        enough for supporters to understand.
      </p>
      <label>
        Project
        <select value={projectId} onChange={(e) => select(e.target.value)}>
          <option value="">Create a new project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Project title
        <input
          required
          minLength={3}
          maxLength={160}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. School fees for the next term"
        />
      </label>
      <label>
        The need
        <textarea
          required
          minLength={10}
          maxLength={2000}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Who will this help, and what do they need?"
        />
      </label>
      <label>
        Plan and budget breakdown
        <textarea
          required
          minLength={10}
          maxLength={4000}
          rows={5}
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          placeholder={
            "School fees — …\nLearning materials — …\nDelivery steps and expected dates — …"
          }
        />
      </label>
      <div className="p100-form-grid">
        <label>
          Total budget
          <input
            required
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label>
          Currency
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as ImpactCurrency)}
          >
            <option>NGN</option>
            <option>USD</option>
          </select>
        </label>
      </div>
      <label>
        Project stage
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ImpactProject["status"])}
        >
          <option value="planned">Planned</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
      </label>
      {error && (
        <p className="p100-error" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="p100-success" role="status">
          The project plan is published.
        </p>
      )}
      <button className="p100-primary" disabled={busy}>
        {busy
          ? "Saving plan…"
          : projectId
            ? "Update project plan"
            : "Publish project plan"}
      </button>
    </form>
  );
}
function SpendingForm({
  group,
  projects,
  reload,
}: {
  group: ImpactGroup;
  projects: ImpactProject[];
  reload: () => Promise<void>;
}) {
  const [amount, setAmount] = useState(""),
    [currency, setCurrency] = useState<ImpactCurrency>("NGN"),
    [projectId, setProjectId] = useState(""),
    [description, setDescription] = useState(""),
    [evidence, setEvidence] = useState(""),
    [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const requestKey = useRef<{ signature: string; key: string } | null>(null);
  const available = group.raised[currency] - group.spent[currency];
  async function record(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSaved(false);
    if (!review) {
      setReview(true);
      return;
    }
    const input = {
        groupId: group.id,
        projectId: projectId || null,
        amount,
        currency,
        description,
        evidence,
      },
      signature = JSON.stringify(input);
    if (requestKey.current?.signature !== signature)
      requestKey.current = { signature, key: crypto.randomUUID() };
    setBusy(true);
    try {
      await post("spending", {
        ...input,
        idempotencyKey: requestKey.current.key,
      });
      setSaved(true);
      setReview(false);
      setAmount("");
      setDescription("");
      setEvidence("");
      requestKey.current = null;
      await reload();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The support record could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={record} className="p100-panel p100-admin-form">
      <span className="p100-kicker">Turn progress into a clear record</span>
      <h2>Record support delivered</h2>
      <p className="p100-muted">
        Record support already delivered to a school or student. Add a receipt
        or delivery reference. This records spending; it does not send a bank
        payment.
      </p>
      <div className="p100-destination">
        <span>
          Remaining in {currency}
          <strong className="block">{impactMoney(available, currency)}</strong>
        </span>
      </div>
      {!review ? (
        <>
          <label>
            Local project
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">General education support</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          <div className="p100-form-grid">
            <label>
              Amount delivered
              <input
                required
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label>
              Currency
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as ImpactCurrency)}
              >
                <option>NGN</option>
                <option>USD</option>
              </select>
            </label>
          </div>
          <label>
            What was delivered?
            <textarea
              required
              minLength={5}
              maxLength={1000}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the school support, fees or materials delivered."
            />
          </label>
          <label>
            Receipt or delivery reference
            <input
              required
              minLength={5}
              maxLength={1000}
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="e.g. School receipt number or evidence document link"
            />
            <span className="p100-fine">
              Visible to admins. Do not include a child’s private details in the
              public description.
            </span>
          </label>
        </>
      ) : (
        <div className="p100-notice">
          <div>
            <p>
              Record {currency} {amount} for {group.name}?
            </p>
            <p className="mt-2">{description}</p>
            <p className="p100-fine mt-2">Evidence: {evidence}</p>
          </div>
        </div>
      )}
      {error && (
        <p className="p100-error" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="p100-success" role="status">
          <CheckCircle2 size={16} className="inline mr-1" />
          Support delivered has been recorded.
        </p>
      )}
      <div className="p100-actions">
        {review && (
          <button
            type="button"
            disabled={busy}
            className="p100-secondary"
            onClick={() => setReview(false)}
          >
            Edit record
          </button>
        )}
        <button disabled={busy || available <= 0} className="p100-primary">
          {busy
            ? "Recording support…"
            : review
              ? "Confirm delivery record"
              : "Review delivery record"}
        </button>
      </div>
    </form>
  );
}
