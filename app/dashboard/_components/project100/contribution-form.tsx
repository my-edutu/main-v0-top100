"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Heart, LockKeyhole } from "lucide-react";
import type {
  ImpactCurrency,
  ImpactGroup,
} from "@/lib/project100/impact/types";
import { impactMoney } from "@/lib/project100/impact/types";
import { contributionSchema } from "@/lib/project100/impact/validation";
import { impactRequest } from "./shared";
export function ContributionForm({
  group,
  enabled,
}: {
  group: ImpactGroup;
  enabled: boolean;
}) {
  const [currency, setCurrency] = useState<ImpactCurrency>("NGN"),
    [amount, setAmount] = useState("10000");
  const [attribution, setAttribution] = useState<"personal" | "organisation">(
      "personal",
    ),
    [organisation, setOrganisation] = useState(""),
    [anonymous, setAnonymous] = useState(false);
  const [review, setReview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [paid, setPaid] = useState(false);
  const reservation = useRef<{ signature: string; key: string } | null>(null);
  const input = {
    groupId: group.id,
    amount,
    currency,
    attribution,
    ...(attribution === "organisation" ? { organisation } : {}),
    anonymous,
  };
  function reserveKey() {
    const signature = JSON.stringify(input),
      storageKey = `project100-checkout:${group.id}`;
    if (reservation.current?.signature !== signature) {
      let saved: { signature: string; key: string } | null = null;
      try {
        saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
      } catch {
        /* storage may be unavailable */
      }
      reservation.current =
        saved?.signature === signature && /^[a-f0-9-]{36}$/i.test(saved.key)
          ? saved
          : { signature, key: crypto.randomUUID() };
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(reservation.current));
      } catch {
        /* in-memory retry key remains stable */
      }
    }
    return reservation.current!.key;
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const idempotencyKey = reserveKey();
    const parsed = contributionSchema.safeParse({ ...input, idempotencyKey });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your contribution.");
      return;
    }
    if (!review) {
      setReview(true);
      return;
    }
    setBusy(true);
    try {
      const body = await impactRequest("/api/member/project100/impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "checkout",
          input: { ...input, idempotencyKey },
        }),
      });
      if (body.status === "paid") {
        setPaid(true);
        try {
          sessionStorage.removeItem(`project100-checkout:${group.id}`);
        } catch {
          /* optional */
        }
      } else if (typeof body.checkoutUrl === "string") {
        try {
          sessionStorage.setItem(
            `project100-checkout:${group.id}`,
            JSON.stringify({
              ...reservation.current,
              contributionId: body.contributionId,
            }),
          );
        } catch {
          /* The server still retains the checkout reservation. */
        }
        window.location.assign(body.checkoutUrl);
      } else
        throw new Error(
          "Checkout did not open. Your contribution has not been confirmed.",
        );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Checkout could not open.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (paid)
    return (
      <section className="p100-panel p100-confirmed">
        <CheckCircle2 size={32} />
        <h2>Your support is part of the story.</h2>
        <p>This contribution is confirmed for {group.name}.</p>
        <Link
          className="p100-primary"
          href={`/dashboard/me/project100-scholarship/groups/${group.id}`}
        >
          Follow your group
          <ArrowRight size={17} />
        </Link>
      </section>
    );
  const suggestions =
    currency === "NGN"
      ? ["5000", "10000", "25000", "100000"]
      : ["10", "25", "50", "100"];
  const parsed = contributionSchema.safeParse({
    ...input,
    idempotencyKey: "00000000-0000-4000-8000-000000000001",
  });
  return (
    <form onSubmit={submit} className="p100-panel p100-contribution">
      <span className="p100-kicker">
        <Heart size={15} />
        {review ? "Review your support" : "Every contribution moves us forward"}
      </span>
      <h2>
        {review
          ? "A clear destination. A shared purpose."
          : "Give a little. Help change a chapter."}
      </h2>
      <div className="p100-destination">
        <span>
          Supporting <strong>{group.state ?? group.country}</strong>
          <small>{group.name}</small>
        </span>
      </div>
      {!review ? (
        <>
          <fieldset disabled={busy}>
            <legend>Contribution currency</legend>
            <div className="p100-segment">
              {(["NGN", "USD"] as const).map((c) => (
                <button
                  type="button"
                  key={c}
                  aria-pressed={currency === c}
                  onClick={() => {
                    setCurrency(c);
                    setAmount(c === "NGN" ? "10000" : "25");
                  }}
                >
                  {c === "NGN" ? "Naira · NGN" : "US dollar · USD"}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="p100-suggestions">
            {suggestions.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={amount === a}
                onClick={() => setAmount(a)}
              >
                {impactMoney(Number(a) * 100, currency)}
              </button>
            ))}
          </div>
          <label>
            Your amount ({currency})
            <input
              required
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter an amount"
              aria-describedby="p100-currency-help"
            />
          </label>
          <p id="p100-currency-help" className="p100-fine">
            {currency === "NGN"
              ? "Minimum ₦1,000. Checkout charges in naira."
              : "Minimum $1. Bachs shows available local payment currencies and any conversion before you pay."}
          </p>
          <fieldset>
            <legend>Who is making this impact?</legend>
            <div className="p100-radio-row">
              <label>
                <input
                  type="radio"
                  name="attribution"
                  checked={attribution === "personal"}
                  onChange={() => setAttribution("personal")}
                />
                Me personally
              </label>
              <label>
                <input
                  type="radio"
                  name="attribution"
                  checked={attribution === "organisation"}
                  onChange={() => setAttribution("organisation")}
                />
                My organisation
              </label>
            </div>
          </fieldset>
          {attribution === "organisation" && (
            <label>
              Organisation name
              <input
                required
                maxLength={120}
                value={organisation}
                onChange={(e) => setOrganisation(e.target.value)}
                placeholder="e.g. Top100 Africa Future Leaders"
              />
              <span className="p100-fine">
                The confirmed support will be credited to this organisation.
              </span>
            </label>
          )}
          <label className="p100-checkbox">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />
            <span>
              Show my contribution as anonymous to other members
              <span className="p100-fine">
                The Project100 team can still see the payment record.
              </span>
            </span>
          </label>
        </>
      ) : (
        <dl className="p100-review">
          <div>
            <dt>Contribution</dt>
            <dd>
              {parsed.success
                ? impactMoney(parsed.data.amountMinor, currency)
                : amount}
            </dd>
          </div>
          <div>
            <dt>Credited to</dt>
            <dd>
              {anonymous
                ? "Anonymous supporter"
                : attribution === "organisation"
                  ? organisation
                  : "You"}
            </dd>
          </div>
          <div>
            <dt>Destination</dt>
            <dd>{group.state ?? group.country}</dd>
          </div>
          <div>
            <dt>Purpose</dt>
            <dd>Project100 education support</dd>
          </div>
        </dl>
      )}
      {error && (
        <p role="alert" className="p100-error">
          {error}
        </p>
      )}
      {!group.active && (
        <p className="p100-notice">
          This community is closed to new support. Earlier contributions and
          delivery records remain with the group.
        </p>
      )}
      {!enabled && (
        <p className="p100-notice">
          Online contributions will open soon. Your group and its updates are
          ready to explore.
        </p>
      )}
      <div className="p100-actions">
        {review && (
          <button
            type="button"
            className="p100-secondary"
            onClick={() => {
              setReview(false);
              setError("");
            }}
            disabled={busy}
          >
            Edit details
          </button>
        )}
        <button
          className="p100-primary"
          disabled={busy || !enabled || !group.active}
        >
          {busy
            ? "Opening secure checkout…"
            : review
              ? "Continue to secure payment"
              : "Review my contribution"}
          <ArrowRight size={17} />
        </button>
      </div>
      {error.includes("expired") && (
        <button
          type="button"
          className="p100-text-button"
          onClick={() => {
            reservation.current = null;
            try {
              sessionStorage.removeItem(`project100-checkout:${group.id}`);
            } catch {
              /* optional */
            }
            setError("");
            setReview(false);
          }}
        >
          Start a new contribution
        </button>
      )}
      <p className="p100-fine">
        <LockKeyhole size={13} />
        Payment is confirmed after Bachs verifies it. Earlier support stays with
        its original community.
      </p>
    </form>
  );
}
