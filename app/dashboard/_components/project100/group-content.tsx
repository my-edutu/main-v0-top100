"use client";
import { useRef, useState } from "react";
import Image from "@/components/safe-image";
import { Camera, CheckCircle2, ImagePlus, Trash2 } from "lucide-react";
import type { ImpactGroup, ImpactView } from "@/lib/project100/impact/types";
import { impactMoney } from "@/lib/project100/impact/types";
import { impactRequest, shortDate } from "./shared";

export function GroupContent({
  view,
  group,
  memberId,
  admin = false,
  reload,
}: {
  view: ImpactView;
  group: ImpactGroup;
  memberId?: string;
  admin?: boolean;
  reload: () => Promise<void>;
}) {
  const [tab, setTab] = useState("plan");
  const tabs = [
    { id: "plan", label: "The plan" },
    { id: "supporters", label: "Our supporters" },
    { id: "updates", label: "Impact journal" },
  ];
  return (
    <div>
      <div className="p100-tabs" role="tablist" aria-label="Explore your group">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`p100-tab-${t.id}`}
            aria-controls={`p100-panel-${t.id}`}
            aria-selected={tab === t.id}
            tabIndex={tab === t.id ? 0 : -1}
            onKeyDown={(event) => {
              if (
                ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              ) {
                event.preventDefault();
                const index = tabs.findIndex((t) => t.id === tab);
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? tabs.length - 1
                      : (index +
                          (event.key === "ArrowRight" ? 1 : -1) +
                          tabs.length) %
                        tabs.length;
                setTab(tabs[next].id);
                document.getElementById(`p100-tab-${tabs[next].id}`)?.focus();
              }
            }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <section
        role="tabpanel"
        id={`p100-panel-${tab}`}
        aria-labelledby={`p100-tab-${tab}`}
        className="p100-tab-content"
        tabIndex={0}
      >
        {tab === "plan" && (
          <>
            <div className="p100-section-intro">
              <div>
                <span className="p100-kicker">
                  From a shared goal to a local difference
                </span>
                <h2>What we’re working towards</h2>
              </div>
              <p className="p100-muted">
                Plans show what’s needed. The delivery record shows what your
                community has made possible.
              </p>
            </div>
            {!view.projects.length ? (
              <div className="p100-empty">
                <span className="p100-step-number">01</span>
                <h3>The first local plan is taking shape.</h3>
                <p>
                  The Project100 team will publish school needs, a budget and
                  the steps to deliver support here.
                </p>
              </div>
            ) : (
              view.projects.map((project) => (
                <article key={project.id} className="p100-project">
                  <div className="p100-project-heading">
                    <span className={`p100-status ${project.status}`}>
                      {project.status}
                    </span>
                    <span className="p100-muted">
                      Budget ·{" "}
                      {impactMoney(project.target_minor, project.currency)}
                    </span>
                  </div>
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                  <details>
                    <summary>See the plan and budget breakdown</summary>
                    <p className="p100-whitespace">{project.plan}</p>
                  </details>
                </article>
              ))
            )}
            <div className="p100-section-intro">
              <div>
                <span className="p100-kicker">Support in action</span>
                <h2>The delivery record</h2>
              </div>
            </div>
            {!view.spending.length ? (
              <p className="p100-empty-line">
                No support has been recorded as delivered yet. Confirmed
                contributions remain visible in the group total.
              </p>
            ) : (
              <ul className="p100-delivery-list">
                {view.spending.map((s) => (
                  <li key={s.id}>
                    <CheckCircle2 size={19} />
                    <div>
                      <h3>{s.description}</h3>
                      <p>
                        {impactMoney(s.amount_minor, s.currency)} ·{" "}
                        {shortDate(s.created_at)}
                      </p>
                      {admin && s.evidence && <p>Evidence: {s.evidence}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {tab === "supporters" && (
          <>
            <div className="p100-section-intro">
              <div>
                <span className="p100-kicker">
                  Different people. One shared purpose.
                </span>
                <h2>The people behind the progress</h2>
              </div>
              <p className="p100-muted">
                Latest 100 confirmed contributions. Organisation support is
                credited to the organisation; anonymous choices are respected.
              </p>
            </div>
            {!view.supporters.length ? (
              <div className="p100-empty">
                <h3>Be part of the first chapter.</h3>
                <p>
                  Confirmed contributions and the people behind them will appear
                  here.
                </p>
              </div>
            ) : (
              <ul className="p100-supporter-list">
                {view.supporters.map((s) => (
                  <li key={s.id}>
                    <span className="p100-initial" aria-hidden="true">
                      {s.display_name.charAt(0)}
                    </span>
                    <div>
                      <h3>{s.display_name}</h3>
                      <p>
                        Supported {group.state ?? group.country} ·{" "}
                        {shortDate(s.paid_at)}
                      </p>
                    </div>
                    <strong>{impactMoney(s.amount_minor, s.currency)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {tab === "updates" && (
          <>
            <div className="p100-section-intro">
              <div>
                <span className="p100-kicker">
                  <Camera size={15} />
                  Small moments. Lasting impact.
                </span>
                <h2>A journal we build together</h2>
              </div>
              <p className="p100-muted">
                Updates from the Project100 team and your group. Share school
                visits, progress and the moments that matter.
              </p>
            </div>
            {admin || view.membership?.group_id === group.id ? (
              <UpdateComposer
                groupId={group.id}
                admin={admin}
                onSaved={reload}
              />
            ) : (
              <p className="p100-empty-line">
                Join this group to share photos and updates.
              </p>
            )}
            {!view.updates.length ? (
              <div className="p100-empty">
                <Camera size={24} />
                <h3>The story starts with your community.</h3>
                <p>
                  Photos and updates will appear here as your group moves
                  forward.
                </p>
              </div>
            ) : (
              <div className="p100-journal">
                {view.updates.map((u) => (
                  <article key={u.id} className="p100-journal-entry">
                    {u.image_url && (
                      <Image
                        unoptimized
                        src={u.image_url}
                        alt={u.caption.slice(0, 160)}
                        loading="lazy"
                        width={800}
                        height={600}
                      />
                    )}
                    <div>
                      {u.image_unavailable && (
                        <p className="p100-fine">
                          This photo is temporarily unavailable.
                        </p>
                      )}
                      <div className="p100-entry-meta">
                        <span>
                          {u.author_name} · {shortDate(u.created_at)}
                        </span>
                        {(admin || u.author_id === memberId) && (
                          <DeleteUpdate
                            id={u.id}
                            admin={admin}
                            reload={reload}
                          />
                        )}
                      </div>
                      <p className="p100-whitespace">{u.caption}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
function UpdateComposer({
  groupId,
  admin,
  onSaved,
}: {
  groupId: string;
  admin: boolean;
  onSaved: () => Promise<void>;
}) {
  const [caption, setCaption] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  async function publish(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const form = new FormData();
      form.set("groupId", groupId);
      form.set("caption", caption);
      if (file) form.set("file", file);
      await impactRequest(
        admin
          ? "/api/admin/project100/impact"
          : "/api/member/project100/impact/updates",
        { method: "POST", body: form },
      );
      setCaption("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setSaved(true);
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The update could not be shared.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={publish} className="p100-composer">
      <label>
        Share a moment from your group
        <textarea
          required
          minLength={3}
          maxLength={2000}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="What is your community making possible?"
          rows={3}
          disabled={busy}
        />
      </label>
      <div className="p100-composer-bottom">
        <label className="p100-file">
          <ImagePlus size={18} />
          <span>{file ? file.name : "Add a photo"}</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => {
              const image = e.target.files?.[0] ?? null;
              if (image && image.size > 5 * 1024 * 1024) {
                setError("Images must be 5MB or smaller.");
                e.target.value = "";
                setFile(null);
              } else {
                setFile(image);
                setError("");
              }
            }}
          />
        </label>
        <button className="p100-primary" disabled={busy}>
          {busy ? "Sharing…" : "Share update"}
        </button>
      </div>
      <p className="p100-fine">
        JPG, PNG or WebP, up to 5MB. Share only photos you have permission to
        share.
      </p>
      {error && (
        <p className="p100-error" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="p100-success" role="status">
          Your update has been shared with the group.
        </p>
      )}
    </form>
  );
}
function DeleteUpdate({
  id,
  admin,
  reload,
}: {
  id: string;
  admin: boolean;
  reload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false);
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await impactRequest(
        admin
          ? "/api/admin/project100/impact"
          : `/api/member/project100/impact/updates?id=${id}`,
        admin
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "deleteUpdate", input: { id } }),
            }
          : { method: "DELETE" },
      );
      await reload();
    } catch {
      setError("Could not remove this update.");
      setBusy(false);
    }
  }
  return (
    <div>
      {confirm ? (
        <div className="p100-actions">
          <button
            className="p100-text-button"
            onClick={() => setConfirm(false)}
            disabled={busy}
          >
            Keep
          </button>
          <button
            className="p100-text-button"
            onClick={() => void remove()}
            disabled={busy}
          >
            {busy ? "Removing…" : "Remove update"}
          </button>
        </div>
      ) : (
        <button
          className="p100-icon-button"
          aria-label="Remove update"
          onClick={() => setConfirm(true)}
        >
          <Trash2 size={16} />
        </button>
      )}
      {error && (
        <p role="alert" className="p100-error">
          {error}
        </p>
      )}
    </div>
  );
}
