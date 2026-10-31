"use client";
import type { ImpactGroup, ImpactView } from "@/lib/project100/impact/types";
import { impactMoney } from "@/lib/project100/impact/types";
import { Progress, Totals } from "./shared";
export function GroupFunding({
  group,
  view,
}: {
  group: ImpactGroup;
  view: ImpactView;
}) {
  const targets = view.projects.reduce(
    (sum, p) => ({ ...sum, [p.currency]: sum[p.currency] + p.target_minor }),
    { NGN: 0, USD: 0 },
  );
  return (
    <section className="p100-funding">
      <div className="p100-funding-main">
        <span className="p100-kicker">
          What this community is making possible
        </span>
        <Totals value={group.raised} className="p100-funding-total" />
        <p>confirmed support raised</p>
        {(["NGN", "USD"] as const).map(
          (currency) =>
            targets[currency] > 0 && (
              <div className="p100-goal" key={currency}>
                <div>
                  <span>
                    {impactMoney(group.raised[currency], currency)} raised
                  </span>
                  <span>
                    {impactMoney(targets[currency], currency)} planned
                  </span>
                </div>
                <Progress
                  raised={group.raised[currency]}
                  target={targets[currency]}
                  label={`${currency} funding progress`}
                />
                <p>
                  {impactMoney(
                    Math.max(0, targets[currency] - group.raised[currency]),
                    currency,
                  )}{" "}
                  to meet the published project budgets
                </p>
              </div>
            ),
        )}
      </div>
      <dl>
        <div>
          <dt>Recorded as delivered</dt>
          <dd>
            <Totals value={group.spent} />
          </dd>
        </div>
        <div>
          <dt>Remaining for the community</dt>
          <dd>
            <Totals
              value={{
                NGN: group.raised.NGN - group.spent.NGN,
                USD: group.raised.USD - group.spent.USD,
              }}
            />
          </dd>
        </div>
      </dl>
      {(["NGN", "USD"] as const).some(
        (c) => group.raised[c] < group.spent[c],
      ) && (
        <p className="p100-error" role="alert">
          Some support is under review. The Project100 team is reconciling the
          difference before recording further spending.
        </p>
      )}
    </section>
  );
}
