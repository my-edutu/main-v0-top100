import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
const database = process.env.TOP100_IMPACT_TEST_DB;
const pool = database
  ? new Pool({ host: "/tmp", database, user: process.env.USER })
  : null;
describe.runIf(Boolean(database))("Project100 atomic financial records", () => {
  const member = randomUUID(),
    actor = randomUUID();
  let group: string;
  beforeAll(async () => {
    if (!database?.startsWith("top100_impact_test_"))
      throw new Error("Use an isolated local impact test database.");
    await pool!.query(
      "drop schema public cascade; create schema public; grant usage on schema public to anon,authenticated,service_role; create table public.profiles(id uuid primary key)",
    );
    await pool!.query(
      "drop schema if exists storage cascade; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); insert into storage.buckets(id,name,public) values('project100-images','project100-images',true)",
    );
    await pool!.query(
      readFileSync(
        "supabase/migrations/20261031012629_project100_impact_groups.sql",
        "utf8",
      ),
    );
    await pool!.query("insert into profiles(id) values($1),($2)", [
      member,
      actor,
    ]);
    group = (
      await pool!.query(
        "select id from project100_support_groups where state='Kaduna'",
      )
    ).rows[0].id;
    await pool!.query(
      "insert into project100_support_memberships(member_id,group_id,residence_country,residence_state) values($1,$2,$3,$4)",
      [member, group, "Nigeria", "Kaduna"],
    );
  });
  afterAll(async () => {
    await pool?.end();
  });
  it("makes a pre-existing Project100 photo bucket private", async () => {
    const bucket = (
      await pool!.query(
        "select public,file_size_limit,allowed_mime_types from storage.buckets where id='project100-images'",
      )
    ).rows[0];
    expect(bucket.public).toBe(false);
    expect(bucket.allowed_mime_types).toEqual(["image/webp"]);
  });
  const input = (overrides = {}) => ({
    groupId: group,
    amountMinor: 100000,
    currency: "NGN",
    attribution: "personal",
    anonymous: false,
    idempotencyKey: randomUUID(),
    ...overrides,
  });
  async function reserve(details = input(), staff = false) {
    return (
      await pool!.query(
        "select (reserve_project100_contribution($1,$2::jsonb,$3,$4,$5)).*",
        [
          member,
          JSON.stringify(details),
          "Private Member",
          "private@example.test",
          staff,
        ],
      )
    ).rows[0];
  }
  async function settle(id: string, event: string, status = "paid") {
    return pool!.query("select settle_project100_contribution($1,$2,$3,$4)", [
      id,
      event,
      status,
      `charge-${id}`,
    ]);
  }
  it("keeps an old reservation recoverable after a group change but refuses new support outside the joined group", async () => {
    const details = input(),
      old = await reserve(details);
    const destination = (
      await pool!.query(
        "select id from project100_support_groups where country='Ghana'",
      )
    ).rows[0].id;
    await pool!.query(
      "update project100_support_memberships set group_id=$1 where member_id=$2",
      [destination, member],
    );
    expect((await reserve(details)).id).toBe(old.id);
    await expect(reserve()).rejects.toThrow(/joined group/);
    await pool!.query(
      "update project100_support_memberships set group_id=$1 where member_id=$2",
      [group, member],
    );
  });
  it("reserves the same contribution once under concurrent retries and refuses changed allocation", async () => {
    const details = input();
    const [one, two] = await Promise.all([reserve(details), reserve(details)]);
    expect(one.id).toBe(two.id);
    await expect(reserve({ ...details, amountMinor: 100001 })).rejects.toThrow(
      /different details/,
    );
    await expect(
      pool!.query(
        "update project100_support_contributions set group_id=(select id from project100_support_groups where country=$1 limit 1) where id=$2",
        ["Ghana", one.id],
      ),
    ).rejects.toThrow(/immutable/);
  });
  it("deduplicates settlement, freezes refunded support and rejects late success", async () => {
    const c = await reserve();
    await Promise.all([
      settle(c.id, `success-${c.id}`),
      settle(c.id, `success-${c.id}`),
    ]);
    expect(
      (
        await pool!.query(
          "select count(*) from project100_support_events where contribution_id=$1",
          [c.id],
        )
      ).rows[0].count,
    ).toBe("1");
    await settle(c.id, `refund-${c.id}`, "needs_review");
    await settle(c.id, `late-${c.id}`);
    expect(
      (
        await pool!.query(
          "select status from project100_support_contributions where id=$1",
          [c.id],
        )
      ).rows[0].status,
    ).toBe("needs_review");
  });
  it("retains original charge evidence and freezes a second distinct charge for the same contribution", async () => {
    const c = await reserve();
    await settle(c.id, `original-${c.id}`);
    await pool!.query("select settle_project100_contribution($1,$2,$3,$4)", [
      c.id,
      `second-${c.id}`,
      "paid",
      `duplicate-charge-${c.id}`,
    ]);
    const row = (
      await pool!.query(
        "select status,charge_id from project100_support_contributions where id=$1",
        [c.id],
      )
    ).rows[0];
    expect(row).toEqual({
      status: "needs_review",
      charge_id: `charge-${c.id}`,
    });
    expect(
      (
        await pool!.query(
          "select charge_id from project100_support_events where event_id=$1",
          [`second-${c.id}`],
        )
      ).rows[0].charge_id,
    ).toBe(`duplicate-charge-${c.id}`);
  });
  it("serializes spending so two requests cannot consume the same confirmed funds", async () => {
    const c = await reserve();
    await settle(c.id, `success-${c.id}`);
    const record = () =>
      pool!.query("select record_project100_spending($1,$2::jsonb)", [
        actor,
        JSON.stringify(
          input({
            amountMinor: 80000,
            description: "School fees delivered",
            evidence: "Receipt SCHOOL-001",
          }),
        ),
      ]);
    const results = await Promise.allSettled([record(), record()]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    await expect(
      pool!.query("select record_project100_spending($1,$2::jsonb)", [
        actor,
        JSON.stringify(
          input({
            currency: "USD",
            amountMinor: 1,
            description: "School fees",
            evidence: "Receipt",
          }),
        ),
      ]),
    ).rejects.toThrow(/Not enough/);
  });
  it("hides anonymous attribution and all private payment/contact fields in member snapshots", async () => {
    const c = await reserve(
      input({
        anonymous: true,
        attribution: "organisation",
        organisation: "Private Organisation",
      }),
    );
    await settle(c.id, `success-${c.id}`);
    const view = (
      await pool!.query("select project100_impact_snapshot($1,$2,false) view", [
        actor,
        group,
      ])
    ).rows[0].view;
    expect(
      view.supporters.find((s: { id: string }) => s.id === c.id).display_name,
    ).toBe("Anonymous supporter");
    expect(JSON.stringify(view)).not.toContain("private@example.test");
    expect(JSON.stringify(view)).not.toContain(`charge-${c.id}`);
    expect(view.groups).toHaveLength(43);
    expect(view.totals.raised.USD).toBe(0);
  });
  it("denies member role access to financial tables and settlement RPCs", async () => {
    const client = await pool!.connect();
    try {
      await client.query("set role authenticated");
      await expect(
        client.query("select * from project100_support_contributions"),
      ).rejects.toThrow(/permission denied/);
      await expect(
        client.query("select settle_project100_contribution($1,$2,$3,$4)", [
          randomUUID(),
          "forged",
          "paid",
          "forged-charge",
        ]),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await client.query("reset role");
      client.release();
    }
  });
  it("keeps earlier contributions allocated when an admin retires a country destination", async () => {
    const oldGroup = (
      await pool!.query(
        "select id from project100_support_groups where country='Ethiopia'",
      )
    ).rows[0].id;
    const c = await reserve(input({ groupId: oldGroup }), true);
    const countries = [
      "Ghana",
      "Cameroon",
      "Kenya",
      "Benin",
      "Democratic Republic of the Congo",
      "Rwanda",
    ];
    await pool!.query("select configure_project100_countries($1::text[])", [
      countries,
    ]);
    expect(
      (
        await pool!.query(
          "select active from project100_support_groups where id=$1",
          [oldGroup],
        )
      ).rows[0].active,
    ).toBe(false);
    expect(
      (
        await pool!.query(
          "select group_id from project100_support_contributions where id=$1",
          [c.id],
        )
      ).rows[0].group_id,
    ).toBe(oldGroup);
    expect(
      (
        await pool!.query(
          "select count(*) from project100_support_groups where country<>'Nigeria' and active",
        )
      ).rows[0].count,
    ).toBe("6");
    await expect(reserve(input({ groupId: oldGroup }), true)).rejects.toThrow(
      /not accepting/,
    );
  });
});
