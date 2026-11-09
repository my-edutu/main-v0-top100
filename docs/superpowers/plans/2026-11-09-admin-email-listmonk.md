# Admin Email with Listmonk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide secure Top100-admin campaign composition, scheduling, history and evidence-based delivery reporting using private Listmonk and Stalwart.

**Architecture:** Deploy a pinned Listmonk and dedicated Postgres privately on Dokploy. Top100 owns authorisation, audience, suppression and per-recipient delivery truth; a private authenticated gateway checks each campaign recipient and forwards through Stalwart. Integrate Listmonk through server-only APIs and preserve existing award outreach. No real messages in tests.

**Tech Stack:** Next.js, React, TypeScript, self-hosted Supabase/Postgres, Listmonk, Stalwart SMTP, Dokploy.

**Spec:** `docs/superpowers/specs/2026-11-09-admin-email-design.md`.

## Global Constraints

- Use active self-hosted Dokploy and Supabase only; never touch Vercel or the retired project.
- Preserve existing opt-outs and award payment rules, including coupon expiry; fail closed if checks are unavailable.
- Do not send or schedule a real campaign during setup; test using disposable recipients and SMTP sink.
- Report SMTP acceptance separately from remote delivery; never claim inbox placement.
- Avoid exposing Listmonk, credentials or its database publicly; do not store credentials in Git.
- Pin versions, preserve the AGPL licence and do not copy proprietary credentials.

## Review Focus

1. A recipient pays or unsubscribes after scheduling: the gateway must skip them before sending.
2. A coupon expires after scheduling: the gateway must skip it.
3. SMTP acceptance is uncertain: never automatically resend without review.
4. Listmonk or suppression state is unavailable: the gateway blocks rather than sending.
5. A guessed admin route or forged gateway call: require admin or service authentication.

## Tasks

### 1. Infrastructure and API access
- [ ] Inspect installed Listmonk release, current Dokploy configuration, Docker and private network options. Pin an upstream release and test isolated compose with a disposable SMTP sink.
- [ ] Add deployment configuration and a server-only, authenticated Listmonk client. Test unavailable service, forbidden admin and credential secrecy.

### 2. Delivery gateway and event synchronisation
- [ ] Write failing tests for current suppression, changed payment state, expired coupons, duplicates, uncertain SMTP and untrusted gateway requests.
- [ ] Implement a private gateway that rechecks source data before each message, records outcomes and fails closed; adapt Listmonk's send-count semantics so skips are not reported as delivery.
- [ ] Integrate one-click unsubscribe and authenticated Stalwart failure events across both systems; test race conditions, idempotency and lost synchronisation.

### 3. Admin workflow
- [ ] Add admin-only APIs for campaign draft, preview, test, schedule, cancellation, campaign details and historical results. Verify audience locking, timezone conversion and historical existing outreach.
- [ ] Build a responsive Top100 admin email interface with accessible controls, real loading/error states and clear acceptance vs delivery labels. Check phone and desktop layouts.

### 4. Deployment and end-to-end verification
- [ ] Run relevant tests, type/lint checks and disposable-recipient integration tests. Verify every review-focus failure case.
- [ ] Deploy pinned services and app on Dokploy with backups and private credentials. Verify health, authentication, scheduling, existing unsubscribe safety and one authorised test to the user's inbox. Do not queue a real campaign.
