# Sales workspace and awardee ownership repair

The separate `team-platform` app is the workers' sales workspace. The primary Top100 app owns administration. Both share `team_*` records in the self-hosted database at supabase.top100afl.com.

## Evidence and intent

Live read-only audit on 30 October found 3,550 worklist rows, 2,663 active rows, 888 duplicate public identity groups (1,774 extra active rows), and 152 identities with multiple active owners. 144 duplicate groups have contact history; ten have commissions. Preserve historical records and money attribution.

## Design and implementation choices

Use the existing applications and shared database. Repair ownership at its source rather than hiding duplicate rows in presentation. Archive redundant projections with a canonical-row pointer and close redundant assignments; retain follow-ups, commissions and payment references on their original rows. Prefer commission/verified-payment evidence, then an actively assigned record with contact history, then the earliest assignment and creation/id. The SQL transaction takes the team assignment advisory locks and table write locks before repair and adds a unique active public identity index. Explicitly target that index during pool loads. Repeat loads update the same projection and assign only unowned unpaid rows. An index-less deployment must fail safely rather than duplicate.

Admin gets distinct scope controls, capacity and owner visibility, a persistent run summary, stable pagination, assignment filtering, request cancellation and error/retry states. Save country/capacity and run the distribution in one transaction to prevent two admin sessions racing through separate settings writes. Keep automatic assignment paused semantics.

The sales overview leads with overdue work and first contact, with commission secondary. Awardee rows show payment/contact/owner context, readable contact actions and stable sorting; random order is explicit and its seed persists across pages and filtering. Use neutral white surfaces, orange actions, green verified payment states, existing typography and mobile layouts. Never infer payment verification from a paid label alone.

## Verification and rollout

Exercise the actual SQL using local PostgreSQL: duplication with mixed history, colliding owners, no-email repeated loads, capacity, concurrent runs and wrong actors. Run both application test suites and typechecks; build the team app; inspect narrow and desktop renders. Live schema rollout requires a SQL-capable connection to this self-hosted database; the hosted Supabase connector is for an inactive unrelated hosted project and cannot apply this repair. Do not claim the live database fixed unless the transaction has actually been applied and audited.
