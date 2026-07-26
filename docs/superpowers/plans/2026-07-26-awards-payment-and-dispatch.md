# Awards, Payment and Dispatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Africa Future Leaders awardee can claim their compulsory ₦20,000 physical award, pay the award price plus live-quoted GIG Logistics shipping in one Paystack transaction, and track delivery from the member dashboard.

**Architecture:** A single `award_orders` row per member drives a strict state machine (`draft → quoted → awaiting_payment → paid → dispatched → in_transit → delivered`). Shipping is quoted through a `CourierAdapter` interface so GIG's wire format is isolated in one file. Payment amounts are computed server-side from a stored, expiring quote and confirmed by a signature-verified Paystack webhook, which is the only thing that can move an order to `paid`. A shipment is never booked before `paid`.

**Tech Stack:** Next.js 15.5.20 App Router, TypeScript, Supabase (Postgres + service-role client), Paystack, GIG Logistics, Vitest, Tailwind, Radix/shadcn UI, `zod`.

**Spec:** `docs/superpowers/specs/2026-07-26-member-dashboard-awards-and-community-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **All money is integer kobo.** ₦20,000 = `2000000`. No floating-point arithmetic touches any payment value, anywhere, ever.
- **The client never supplies an amount.** Charges are computed server-side from the stored quote.
- **A shipment is never booked before `status = 'paid'`.**
- Route handlers declare `export const runtime = 'nodejs'`.
- Member auth: `getCurrentUser()` from `@/lib/auth-server`. On failure return `NextResponse.json({ message: 'Authentication required.' }, { status: 401 })`.
- Admin auth: `requireAdmin(request)` from `@/lib/api/require-admin`, which returns `{ error }` on failure.
- All DB access from route handlers uses `createAdminClient()` from `@/lib/supabase/server` (service role).
- Next 15 dynamic route params are Promises: `{ params }: { params: Promise<{ id: string }> }`, then `const { id } = await params`.
- **Do not use the `text-white` Tailwind utility.** `app/globals.css` rewrites dark utilities with `!important` under `html.light`, which breaks it site-wide. Use the literal `text-[#fffaf0]` exactly as the existing dashboard code does.
- Match the existing dashboard visual language: `rounded-[22px]`–`rounded-[30px]`, `border-orange-100`, `bg-[#fffaf4]` page background, `bg-orange-500` primary actions.
- **Commit messages must NOT include a `Co-Authored-By` trailer.** This repo's commits carry the author only.
- Missing-migration errors (`PGRST204`, `/column .* does not exist|schema cache/i`) return HTTP 503 with a message naming the SQL file to run — copy the pattern at `app/api/member/me/route.ts:113-118`.

## File Structure

**Created**

| File | Responsibility |
| --- | --- |
| `vitest.config.ts` | Test runner config with the `@` path alias |
| `lib/awards/money.ts` | Kobo arithmetic, award price resolution, naira formatting |
| `lib/awards/status.ts` | Order state machine — legal transitions, paid/claim predicates |
| `lib/awards/quote.ts` | Quote TTL and expiry checks |
| `lib/awards/server.ts` | DB row ↔ API shape mapping, order loading helpers |
| `lib/awards.ts` | Client-side types + `fetch` wrappers (mirrors `lib/member-hub.ts`) |
| `lib/payments/paystack.ts` | Signature verification, amount checks, transaction init |
| `lib/courier/types.ts` | `CourierAdapter` interface and its input/output types |
| `lib/courier/manual.ts` | Fallback adapter used when GIG is unconfigured |
| `lib/courier/gig.ts` | GIG Logistics HTTP implementation |
| `lib/courier/index.ts` | Adapter selection |
| `supabase/migrations/20260726_award_orders.sql` | `award_orders` table, indexes, RLS |
| `app/api/member/award/route.ts` | GET current order |
| `app/api/member/award/quote/route.ts` | POST delivery details → shipping quote |
| `app/api/member/award/checkout/route.ts` | POST → Paystack init |
| `app/api/member/award/track/route.ts` | GET → refresh tracking |
| `app/api/webhooks/paystack/route.ts` | POST → verify, mark paid, dispatch |
| `app/api/admin/awards/route.ts` | Admin list + update |
| `app/dashboard/awards-section.tsx` | Awards UI (own file — `page.tsx` is already 1,952 lines) |
| `app/admin/awards/page.tsx` | Admin orders console |
| `tests/awards/*.test.ts`, `tests/payments/*.test.ts` | Unit tests |

**Modified**

| File | Change |
| --- | --- |
| `package.json` | Add `vitest` dev dependency + `test` scripts |
| `app/dashboard/page.tsx` | Add `'awards'` to `DashboardSection`, `dashboardNav`, `dashboardCardStyles`; render `<AwardsSection>`; add the claim banner |
| `.env.local` | New Paystack, GIG and award-price variables |

---

### Task 1: Test runner and kobo money module

**Files:**
- Create: `vitest.config.ts`, `lib/awards/money.ts`, `tests/awards/money.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing
- Produces: `DEFAULT_AWARD_PRICE_KOBO: number`, `awardPriceKobo(): number`, `assertKobo(value: number, label: string): void`, `totalKobo(awardKobo: number, shippingKobo: number): number`, `formatNaira(kobo: number): string`

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest@^3
```

- [ ] **Step 2: Create the Vitest config**

`vitest.config.ts`:

```ts
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 3: Add test scripts to `package.json`**

In the `"scripts"` block, alongside the existing `"lint"` entry, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write the failing test**

`tests/awards/money.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import {
  DEFAULT_AWARD_PRICE_KOBO,
  awardPriceKobo,
  formatNaira,
  totalKobo,
} from '@/lib/awards/money'

afterEach(() => {
  delete process.env.AWARD_PRICE_KOBO
})

describe('formatNaira', () => {
  it('formats the award price with thousands separators', () => {
    expect(formatNaira(2_000_000)).toBe('₦20,000')
  })

  it('formats a shipping cost', () => {
    expect(formatNaira(350_000)).toBe('₦3,500')
  })

  it('renders a kobo remainder as decimals', () => {
    expect(formatNaira(2_000_050)).toBe('₦20,000.50')
  })

  it('formats zero', () => {
    expect(formatNaira(0)).toBe('₦0')
  })
})

describe('totalKobo', () => {
  it('adds the award price and shipping', () => {
    expect(totalKobo(2_000_000, 350_000)).toBe(2_350_000)
  })

  it('rejects a fractional amount rather than rounding it', () => {
    expect(() => totalKobo(2_000_000, 350.5)).toThrow(/integer/)
  })

  it('rejects a negative amount', () => {
    expect(() => totalKobo(2_000_000, -1)).toThrow(/integer/)
  })
})

describe('awardPriceKobo', () => {
  it('defaults to ₦20,000 when the env var is unset', () => {
    expect(awardPriceKobo()).toBe(DEFAULT_AWARD_PRICE_KOBO)
    expect(awardPriceKobo()).toBe(2_000_000)
  })

  it('reads a configured override', () => {
    process.env.AWARD_PRICE_KOBO = '2500000'
    expect(awardPriceKobo()).toBe(2_500_000)
  })

  it('throws on a non-numeric override instead of silently charging the default', () => {
    process.env.AWARD_PRICE_KOBO = 'free'
    expect(() => awardPriceKobo()).toThrow(/positive integer/)
  })

  it('throws on a zero override', () => {
    process.env.AWARD_PRICE_KOBO = '0'
    expect(() => awardPriceKobo()).toThrow(/positive integer/)
  })
})
```

- [ ] **Step 5: Run the test and verify it fails**

Run: `npm test -- tests/awards/money.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/awards/money"`

- [ ] **Step 6: Write the implementation**

`lib/awards/money.ts`:

```ts
// lib/awards/money.ts
// Money for the award flow. Every amount in this system is an integer number
// of kobo — floats are never allowed near a charge, because 0.1 + 0.2 problems
// on real money are unacceptable.

export const KOBO_PER_NAIRA = 100

/** ₦20,000, the standing Africa Future Leaders award price. */
export const DEFAULT_AWARD_PRICE_KOBO = 2_000_000

/** Throw unless `value` is a valid kobo amount (non-negative integer). */
export function assertKobo(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer number of kobo, received: ${value}`)
  }
}

/**
 * The award price, overridable via AWARD_PRICE_KOBO so the price can change
 * without a code change. A malformed override throws rather than silently
 * falling back — quietly charging a different price than configured would be
 * worse than a loud failure.
 */
export function awardPriceKobo(): number {
  const raw = process.env.AWARD_PRICE_KOBO
  if (raw === undefined || raw === '') return DEFAULT_AWARD_PRICE_KOBO

  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`AWARD_PRICE_KOBO must be a positive integer number of kobo, received: ${raw}`)
  }
  return parsed
}

/** Award price + shipping. Both operands are validated first. */
export function totalKobo(awardKobo: number, shippingKobo: number): number {
  assertKobo(awardKobo, 'award amount')
  assertKobo(shippingKobo, 'shipping amount')
  return awardKobo + shippingKobo
}

/** Render kobo as naira for display: 2_000_000 -> "₦20,000". */
export function formatNaira(kobo: number): string {
  assertKobo(kobo, 'amount')
  const naira = Math.floor(kobo / KOBO_PER_NAIRA)
  const remainder = kobo % KOBO_PER_NAIRA
  const body = naira.toLocaleString('en-NG')
  return remainder === 0 ? `₦${body}` : `₦${body}.${String(remainder).padStart(2, '0')}`
}
```

- [ ] **Step 7: Run the test and verify it passes**

Run: `npm test -- tests/awards/money.test.ts`
Expected: PASS — 11 tests passed

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts package.json package-lock.json lib/awards/money.ts tests/awards/money.test.ts
git commit -m "feat(awards): kobo money module and vitest test runner"
```

---

### Task 2: Order state machine

**Files:**
- Create: `lib/awards/status.ts`, `tests/awards/status.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `AwardStatus` union type, `canTransition(from: AwardStatus, to: AwardStatus): boolean`, `assertTransition(from: AwardStatus, to: AwardStatus): void`, `isPaid(status: AwardStatus): boolean`, `needsClaim(status: AwardStatus | null): boolean`

- [ ] **Step 1: Write the failing test**

`tests/awards/status.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  assertTransition,
  canTransition,
  isPaid,
  needsClaim,
  type AwardStatus,
} from '@/lib/awards/status'

describe('canTransition', () => {
  it('allows a fresh order to be quoted', () => {
    expect(canTransition('draft', 'quoted')).toBe(true)
  })

  it('allows a re-quote of an already quoted order', () => {
    expect(canTransition('quoted', 'quoted')).toBe(true)
  })

  it('allows a quoted order to move to checkout', () => {
    expect(canTransition('quoted', 'awaiting_payment')).toBe(true)
  })

  it('allows payment confirmation', () => {
    expect(canTransition('awaiting_payment', 'paid')).toBe(true)
  })

  it('allows dispatch after payment', () => {
    expect(canTransition('paid', 'dispatched')).toBe(true)
  })

  it('refuses to dispatch an unpaid order', () => {
    expect(canTransition('quoted', 'dispatched')).toBe(false)
    expect(canTransition('awaiting_payment', 'dispatched')).toBe(false)
    expect(canTransition('draft', 'dispatched')).toBe(false)
  })

  it('refuses to mark an order paid without going through checkout', () => {
    expect(canTransition('draft', 'paid')).toBe(false)
    expect(canTransition('quoted', 'paid')).toBe(false)
  })

  it('treats delivered and cancelled as terminal', () => {
    const terminals: AwardStatus[] = ['delivered', 'cancelled']
    const targets: AwardStatus[] = ['draft', 'quoted', 'paid', 'dispatched', 'in_transit', 'delivered']
    for (const from of terminals) {
      for (const to of targets) {
        expect(canTransition(from, to)).toBe(false)
      }
    }
  })

  it('lets a failed quote be retried', () => {
    expect(canTransition('quote_failed', 'quoted')).toBe(true)
  })
})

describe('assertTransition', () => {
  it('is silent on a legal transition', () => {
    expect(() => assertTransition('paid', 'dispatched')).not.toThrow()
  })

  it('throws naming both states on an illegal transition', () => {
    expect(() => assertTransition('draft', 'dispatched')).toThrow(/draft.*dispatched/)
  })
})

describe('isPaid', () => {
  it('is true from paid onwards', () => {
    expect(isPaid('paid')).toBe(true)
    expect(isPaid('dispatched')).toBe(true)
    expect(isPaid('in_transit')).toBe(true)
    expect(isPaid('delivered')).toBe(true)
  })

  it('is false before payment', () => {
    expect(isPaid('draft')).toBe(false)
    expect(isPaid('quoted')).toBe(false)
    expect(isPaid('awaiting_payment')).toBe(false)
    expect(isPaid('quote_failed')).toBe(false)
  })
})

describe('needsClaim', () => {
  it('prompts a member with no order at all', () => {
    expect(needsClaim(null)).toBe(true)
  })

  it('prompts a member who started but has not paid', () => {
    expect(needsClaim('draft')).toBe(true)
    expect(needsClaim('quoted')).toBe(true)
    expect(needsClaim('awaiting_payment')).toBe(true)
  })

  it('stops prompting once paid', () => {
    expect(needsClaim('paid')).toBe(false)
    expect(needsClaim('delivered')).toBe(false)
  })

  it('stops prompting a cancelled order', () => {
    expect(needsClaim('cancelled')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- tests/awards/status.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/awards/status"`

- [ ] **Step 3: Write the implementation**

`lib/awards/status.ts`:

```ts
// lib/awards/status.ts
// The award order state machine. Transitions are enumerated rather than
// checked ad-hoc at call sites so that "never dispatch before paid" is a
// property of the type, not of whoever wrote the last route handler.

export type AwardStatus =
  | 'draft'
  | 'quoted'
  | 'quote_failed'
  | 'awaiting_payment'
  | 'paid'
  | 'dispatched'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'

const TRANSITIONS: Record<AwardStatus, readonly AwardStatus[]> = {
  // A member editing their address re-quotes, so quoted -> quoted is legal.
  draft: ['quoted', 'quote_failed', 'cancelled'],
  quoted: ['quoted', 'quote_failed', 'awaiting_payment', 'cancelled'],
  quote_failed: ['quoted', 'cancelled'],
  // Back to `quoted` when a checkout is abandoned or its quote expires.
  awaiting_payment: ['paid', 'quoted', 'cancelled'],
  paid: ['dispatched', 'cancelled'],
  dispatched: ['in_transit', 'delivered', 'cancelled'],
  in_transit: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

/** Statuses at which the member's money has been taken. */
const PAID_STATUSES: readonly AwardStatus[] = ['paid', 'dispatched', 'in_transit', 'delivered']

export function canTransition(from: AwardStatus, to: AwardStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false
}

export function assertTransition(from: AwardStatus, to: AwardStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal award order transition: ${from} -> ${to}`)
  }
}

export function isPaid(status: AwardStatus): boolean {
  return PAID_STATUSES.includes(status)
}

/**
 * Whether the compulsory-award prompt should still be shown. `null` means the
 * member has never started an order.
 */
export function needsClaim(status: AwardStatus | null): boolean {
  if (status === null) return true
  if (status === 'cancelled') return false
  return !isPaid(status)
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test -- tests/awards/status.test.ts`
Expected: PASS — 15 tests passed

- [ ] **Step 5: Commit**

```bash
git add lib/awards/status.ts tests/awards/status.test.ts
git commit -m "feat(awards): order state machine with dispatch-after-payment guarantee"
```

---

### Task 3: Paystack signature verification and amount checks

**Files:**
- Create: `lib/payments/paystack.ts`, `tests/payments/paystack.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `verifyPaystackSignature(rawBody: string, signature: string | null, secret: string): boolean`, `paidAmountMatches(paidKobo: number, expectedKobo: number): boolean`, `initializeTransaction(input: InitInput): Promise<InitResult>`, `buildReference(orderId: string): string`
- `InitInput = { email: string; amountKobo: number; reference: string; callbackUrl: string; metadata?: Record<string, unknown> }`
- `InitResult = { authorizationUrl: string; accessCode: string; reference: string }`

- [ ] **Step 1: Write the failing test**

`tests/payments/paystack.test.ts`:

```ts
import crypto from 'node:crypto'
import { describe, it, expect } from 'vitest'
import { buildReference, paidAmountMatches, verifyPaystackSignature } from '@/lib/payments/paystack'

const SECRET = 'sk_test_example_secret'
const BODY = JSON.stringify({
  event: 'charge.success',
  data: { reference: 'AFL-AWARD-abc', amount: 2_350_000 },
})

function sign(body: string, secret = SECRET): string {
  return crypto.createHmac('sha512', secret).update(body, 'utf8').digest('hex')
}

describe('verifyPaystackSignature', () => {
  it('accepts a correctly signed body', () => {
    expect(verifyPaystackSignature(BODY, sign(BODY), SECRET)).toBe(true)
  })

  it('rejects a body signed with a different secret', () => {
    expect(verifyPaystackSignature(BODY, sign(BODY, 'sk_test_attacker'), SECRET)).toBe(false)
  })

  it('rejects a tampered body carrying a valid signature for other content', () => {
    const tampered = JSON.stringify({
      event: 'charge.success',
      data: { reference: 'AFL-AWARD-abc', amount: 100 },
    })
    expect(verifyPaystackSignature(tampered, sign(BODY), SECRET)).toBe(false)
  })

  it('rejects a missing signature header', () => {
    expect(verifyPaystackSignature(BODY, null, SECRET)).toBe(false)
  })

  it('rejects a short signature without throwing', () => {
    expect(verifyPaystackSignature(BODY, 'abc', SECRET)).toBe(false)
  })

  it('rejects an empty signature', () => {
    expect(verifyPaystackSignature(BODY, '', SECRET)).toBe(false)
  })
})

describe('paidAmountMatches', () => {
  it('accepts the exact expected amount', () => {
    expect(paidAmountMatches(2_350_000, 2_350_000)).toBe(true)
  })

  it('rejects an underpayment', () => {
    expect(paidAmountMatches(100, 2_350_000)).toBe(false)
  })

  it('rejects an underpayment that is one kobo short', () => {
    expect(paidAmountMatches(2_349_999, 2_350_000)).toBe(false)
  })

  it('accepts an overpayment', () => {
    expect(paidAmountMatches(2_400_000, 2_350_000)).toBe(true)
  })

  it('rejects a non-integer paid amount', () => {
    expect(paidAmountMatches(2_350_000.5, 2_350_000)).toBe(false)
  })
})

describe('buildReference', () => {
  it('namespaces the reference with the order id', () => {
    expect(buildReference('0f8f-1234')).toMatch(/^AFL-AWARD-0f8f-1234$/)
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- tests/payments/paystack.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/payments/paystack"`

- [ ] **Step 3: Write the implementation**

`lib/payments/paystack.ts`:

```ts
// lib/payments/paystack.ts
// Paystack integration. Server-only: this module reads PAYSTACK_SECRET_KEY and
// must never be imported into a client component.
import crypto from 'node:crypto'

import { assertKobo } from '@/lib/awards/money'

const PAYSTACK_API = 'https://api.paystack.co'

export type InitInput = {
  email: string
  amountKobo: number
  reference: string
  callbackUrl: string
  metadata?: Record<string, unknown>
}

export type InitResult = {
  authorizationUrl: string
  accessCode: string
  reference: string
}

/** Deterministic reference so a retried checkout reuses one Paystack transaction. */
export function buildReference(orderId: string): string {
  return `AFL-AWARD-${orderId}`
}

/**
 * Verify Paystack's x-paystack-signature: HMAC-SHA512 of the RAW request body
 * using the secret key. The caller must pass the exact bytes received —
 * re-serialising parsed JSON changes the payload and breaks verification.
 */
export function verifyPaystackSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false

  const expected = crypto.createHmac('sha512', secret).update(rawBody, 'utf8').digest('hex')
  const expectedBuffer = Buffer.from(expected, 'utf8')
  const providedBuffer = Buffer.from(signature, 'utf8')

  // timingSafeEqual throws on a length mismatch, so check length first. Length
  // is not secret — the digest length is fixed and public.
  if (expectedBuffer.length !== providedBuffer.length) return false
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer)
}

/**
 * Whether the amount Paystack reports covers what we expected to charge.
 * Overpayment is accepted; underpayment never is.
 */
export function paidAmountMatches(paidKobo: number, expectedKobo: number): boolean {
  if (!Number.isInteger(paidKobo) || !Number.isInteger(expectedKobo)) return false
  return paidKobo >= expectedKobo
}

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not configured')
  return key
}

/** Initialise a Paystack transaction and return its hosted checkout URL. */
export async function initializeTransaction(input: InitInput): Promise<InitResult> {
  assertKobo(input.amountKobo, 'charge amount')

  const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata ?? {},
      currency: 'NGN',
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.status) {
    throw new Error(payload?.message || 'Could not start the payment. Please try again.')
  }

  return {
    authorizationUrl: payload.data.authorization_url,
    accessCode: payload.data.access_code,
    reference: payload.data.reference,
  }
}

/** Server-side confirmation, used as a fallback when the webhook is delayed. */
export async function verifyTransaction(reference: string): Promise<{
  status: string
  amountKobo: number
}> {
  const response = await fetch(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.status) {
    throw new Error(payload?.message || 'Could not verify the payment.')
  }

  return { status: payload.data.status, amountKobo: payload.data.amount }
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test -- tests/payments/paystack.test.ts`
Expected: PASS — 12 tests passed

- [ ] **Step 5: Commit**

```bash
git add lib/payments/paystack.ts tests/payments/paystack.test.ts
git commit -m "feat(payments): paystack signature verification and transaction init"
```

---

### Task 4: `award_orders` database migration

**Files:**
- Create: `supabase/migrations/20260726_award_orders.sql`

**Interfaces:**
- Consumes: nothing
- Produces: table `public.award_orders` with the columns every later task reads and writes

- [ ] **Step 1: Write the migration**

`supabase/migrations/20260726_award_orders.sql`:

```sql
-- Award orders: one physical Africa Future Leaders award per member.
-- Prerequisite: supabase/SETUP-MEMBER-HUB.sql must already have been run.
create extension if not exists "pgcrypto";

create table if not exists public.award_orders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  awardee_id uuid,
  cohort_year integer,

  status text not null default 'draft' check (status in (
    'draft','quoted','quote_failed','awaiting_payment',
    'paid','dispatched','in_transit','delivered','cancelled'
  )),

  recipient_name text,
  phone text,
  email text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  country text,
  postal_code text,

  -- Every amount is integer kobo. 2000000 = NGN 20,000.
  award_amount_kobo integer not null default 2000000 check (award_amount_kobo >= 0),
  shipping_amount_kobo integer check (shipping_amount_kobo >= 0),
  total_amount_kobo integer check (total_amount_kobo >= 0),
  currency text not null default 'NGN',

  gig_quote jsonb,
  gig_quote_expires_at timestamptz,
  gig_waybill text,
  gig_tracking_url text,
  gig_last_status text,
  gig_response jsonb,

  paystack_reference text unique,
  paystack_status text,
  paid_at timestamptz,

  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One live award per member. Cancelled orders do not block a fresh attempt.
create unique index if not exists award_orders_one_active_per_profile
  on public.award_orders (profile_id)
  where status <> 'cancelled';

create index if not exists award_orders_status_idx on public.award_orders (status);
create index if not exists award_orders_reference_idx on public.award_orders (paystack_reference);

create or replace function public.touch_award_orders_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists award_orders_set_updated_at on public.award_orders;
create trigger award_orders_set_updated_at
  before update on public.award_orders
  for each row execute function public.touch_award_orders_updated_at();

alter table public.award_orders enable row level security;

do $$ begin
  create policy "Members read their own award order" on public.award_orders
    for select using (auth.uid() = profile_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Service role manages award orders" on public.award_orders
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;
```

- [ ] **Step 2: Apply the migration**

Open the Supabase dashboard → SQL Editor → paste the file contents → Run.

If it errors with `relation "public.profiles" does not exist` or a missing column, `supabase/SETUP-MEMBER-HUB.sql` has not been run against this database yet. Run that file first, then retry.

- [ ] **Step 3: Verify the table and its constraint**

Run in the SQL editor:

```sql
select column_name, data_type
from information_schema.columns
where table_name = 'award_orders'
order by ordinal_position;

select indexname from pg_indexes where tablename = 'award_orders';
```

Expected: 30 columns listed, and `award_orders_one_active_per_profile` among the indexes.

- [ ] **Step 4: Verify the one-active-order rule actually holds**

Run in the SQL editor, substituting a real profile id:

```sql
-- Substitute a real profiles.id for :pid
insert into public.award_orders (profile_id) values (:pid);
insert into public.award_orders (profile_id) values (:pid);  -- must fail
```

Expected: the second insert fails with `duplicate key value violates unique constraint "award_orders_one_active_per_profile"`.

Then clean up: `delete from public.award_orders where profile_id = :pid;`

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260726_award_orders.sql
git commit -m "feat(awards): award_orders table with one-active-order-per-member constraint"
```

---

### Task 5: Courier adapter contract, manual adapter and quote expiry

**Files:**
- Create: `lib/courier/types.ts`, `lib/courier/manual.ts`, `lib/courier/index.ts`, `lib/awards/quote.ts`, `tests/awards/quote.test.ts`

**Interfaces:**
- Consumes: `assertKobo` from `@/lib/awards/money`
- Produces:
  - `CourierAdapter` with `quote(input: QuoteInput): Promise<QuoteResult>`, `book(input: BookInput): Promise<BookResult>`, `track(waybill: string): Promise<TrackResult>`
  - `QuoteInput = { recipientName: string; phone: string; addressLine1: string; addressLine2?: string; city: string; state: string; country: string; postalCode?: string }`
  - `QuoteResult = { ok: true; shippingKobo: number; raw: unknown } | { ok: false; reason: string; raw: unknown }`
  - `BookInput = QuoteInput & { orderId: string; email: string }`
  - `BookResult = { waybill: string; trackingUrl: string | null; raw: unknown }`
  - `TrackResult = { status: 'dispatched' | 'in_transit' | 'delivered' | 'unknown'; description: string; raw: unknown }`
  - `getCourier(): CourierAdapter`
  - `QUOTE_TTL_MS: number`, `quoteExpiresAt(now?: number): string`, `isQuoteExpired(expiresAt: string | null, now?: number): boolean`

- [ ] **Step 1: Write the failing test**

`tests/awards/quote.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { QUOTE_TTL_MS, isQuoteExpired, quoteExpiresAt } from '@/lib/awards/quote'

const NOW = Date.parse('2026-07-26T12:00:00.000Z')

describe('QUOTE_TTL_MS', () => {
  it('is 24 hours', () => {
    expect(QUOTE_TTL_MS).toBe(24 * 60 * 60 * 1000)
  })
})

describe('quoteExpiresAt', () => {
  it('returns an ISO timestamp one TTL in the future', () => {
    expect(quoteExpiresAt(NOW)).toBe('2026-07-27T12:00:00.000Z')
  })
})

describe('isQuoteExpired', () => {
  it('treats a missing expiry as expired', () => {
    expect(isQuoteExpired(null, NOW)).toBe(true)
  })

  it('treats an unparseable expiry as expired', () => {
    expect(isQuoteExpired('not-a-date', NOW)).toBe(true)
  })

  it('is false for a future expiry', () => {
    expect(isQuoteExpired('2026-07-27T00:00:00.000Z', NOW)).toBe(false)
  })

  it('is true for a past expiry', () => {
    expect(isQuoteExpired('2026-07-25T12:00:00.000Z', NOW)).toBe(true)
  })

  it('is true exactly at the expiry instant', () => {
    expect(isQuoteExpired('2026-07-26T12:00:00.000Z', NOW)).toBe(true)
  })

  it('round-trips with quoteExpiresAt', () => {
    const expiry = quoteExpiresAt(NOW)
    expect(isQuoteExpired(expiry, NOW)).toBe(false)
    expect(isQuoteExpired(expiry, NOW + QUOTE_TTL_MS + 1)).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- tests/awards/quote.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/awards/quote"`

- [ ] **Step 3: Write the quote expiry module**

`lib/awards/quote.ts`:

```ts
// lib/awards/quote.ts
// Shipping quotes go stale. A member must not be able to sit on a cheap quote
// and pay it weeks later, so every quote carries an expiry that checkout
// re-checks before charging.

export const QUOTE_TTL_MS = 24 * 60 * 60 * 1000

export function quoteExpiresAt(now: number = Date.now()): string {
  return new Date(now + QUOTE_TTL_MS).toISOString()
}

/** Missing or unparseable expiries count as expired — fail closed. */
export function isQuoteExpired(expiresAt: string | null, now: number = Date.now()): boolean {
  if (!expiresAt) return true
  const timestamp = Date.parse(expiresAt)
  if (Number.isNaN(timestamp)) return true
  return timestamp <= now
}
```

- [ ] **Step 4: Write the courier contract**

`lib/courier/types.ts`:

```ts
// lib/courier/types.ts
// The courier boundary. Everything above this interface is carrier-agnostic;
// only lib/courier/gig.ts knows GIG's wire format.

export type QuoteInput = {
  recipientName: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  country: string
  postalCode?: string
}

export type QuoteResult =
  | { ok: true; shippingKobo: number; raw: unknown }
  | { ok: false; reason: string; raw: unknown }

export type BookInput = QuoteInput & {
  orderId: string
  email: string
}

export type BookResult = {
  waybill: string
  trackingUrl: string | null
  raw: unknown
}

export type TrackResult = {
  status: 'dispatched' | 'in_transit' | 'delivered' | 'unknown'
  description: string
  raw: unknown
}

export interface CourierAdapter {
  readonly name: string
  quote(input: QuoteInput): Promise<QuoteResult>
  book(input: BookInput): Promise<BookResult>
  track(waybill: string): Promise<TrackResult>
}
```

- [ ] **Step 5: Write the manual adapter**

`lib/courier/manual.ts`:

```ts
// lib/courier/manual.ts
// Used when no carrier is configured. It never invents a shipping price —
// it declines to quote, which routes the order to `quote_failed` so the admin
// team sets a price by hand. Silently guessing a number here would charge a
// member the wrong amount.
import type { BookInput, BookResult, CourierAdapter, QuoteInput, QuoteResult, TrackResult } from './types'

export const manualCourier: CourierAdapter = {
  name: 'manual',

  async quote(_input: QuoteInput): Promise<QuoteResult> {
    return {
      ok: false,
      reason: 'Automated delivery quotes are unavailable. Our team will contact you with a delivery cost.',
      raw: null,
    }
  },

  async book(input: BookInput): Promise<BookResult> {
    throw new Error(
      `No courier is configured, so order ${input.orderId} cannot be dispatched automatically. ` +
        'Set GIG_API_BASE_URL or dispatch this order manually from /admin/awards.',
    )
  },

  async track(_waybill: string): Promise<TrackResult> {
    return { status: 'unknown', description: 'Tracking is unavailable for manually dispatched orders.', raw: null }
  },
}
```

- [ ] **Step 6: Write the adapter selector**

`lib/courier/index.ts`:

```ts
// lib/courier/index.ts
import { gigCourier } from './gig'
import { manualCourier } from './manual'
import type { CourierAdapter } from './types'

export * from './types'

/**
 * GIG when it is configured, manual otherwise. Selection is by env presence so
 * a missing credential degrades to "admin quotes it by hand" rather than to a
 * crash mid-checkout.
 */
export function getCourier(): CourierAdapter {
  if (process.env.GIG_API_BASE_URL && process.env.GIG_API_USERNAME && process.env.GIG_API_PASSWORD) {
    return gigCourier
  }
  return manualCourier
}
```

- [ ] **Step 7: Create a placeholder GIG module so the import resolves**

Task 6 replaces this file entirely. It exists now only so `lib/courier/index.ts` compiles.

`lib/courier/gig.ts`:

```ts
// lib/courier/gig.ts
// GIG Logistics adapter. Implemented in Task 6 against the GIG API docs.
import { manualCourier } from './manual'
import type { CourierAdapter } from './types'

export const gigCourier: CourierAdapter = { ...manualCourier, name: 'gig-unconfigured' }
```

- [ ] **Step 8: Run the tests and verify they pass**

Run: `npm test`
Expected: PASS — all suites green (money, status, paystack, quote)

- [ ] **Step 9: Commit**

```bash
git add lib/courier lib/awards/quote.ts tests/awards/quote.test.ts
git commit -m "feat(awards): courier adapter contract, manual fallback and quote expiry"
```

---

### Task 6: GIG Logistics HTTP adapter

> **BLOCKED — needs input before this task can start.** Everything else in this plan is unblocked: the rest of the system talks to `CourierAdapter`, and `getCourier()` falls back to `manualCourier` until GIG is configured. Required from the product owner:
> 1. GIG API base URL (sandbox and production)
> 2. The auth call: endpoint, request shape, response shape, and token lifetime
> 3. The price/quote endpoint: request shape, response shape, and **the unit its price is denominated in** (naira or kobo)
> 4. The capture-shipment endpoint: request shape, and which response field carries the waybill
> 5. The tracking endpoint and its status vocabulary
> 6. The sender/origin station details to quote from

**Files:**
- Modify: `lib/courier/gig.ts` (replace the Task 5 placeholder)
- Create: `tests/courier/gig.test.ts`

**Interfaces:**
- Consumes: `CourierAdapter` and its types from `@/lib/courier/types`
- Produces: `gigCourier: CourierAdapter` — the same interface Task 5 already established, so no other file changes

- [ ] **Step 1: Write tests against the documented response shapes**

Using the real response examples from the GIG docs, write `tests/courier/gig.test.ts` with `vi.stubGlobal('fetch', ...)` returning those documented payloads, asserting that:
- a successful quote maps to `{ ok: true, shippingKobo }` with the price **converted to kobo** (multiply by 100 if GIG quotes in naira)
- an unserviceable destination maps to `{ ok: false, reason }` rather than throwing
- a successful booking returns the waybill from the documented field
- the auth token is requested once and reused across two consecutive quotes

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- tests/courier/gig.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement the adapter**

Replace `lib/courier/gig.ts` with an implementation that:
- caches the auth token in a module-level variable with its expiry, refreshing only when expired
- converts GIG's price into integer kobo and passes it through `assertKobo` before returning
- returns `{ ok: false, reason }` for unserviceable destinations instead of throwing
- includes the raw GIG payload in `raw` on every result, so `gig_response` keeps an audit trail
- maps GIG's tracking vocabulary onto `'dispatched' | 'in_transit' | 'delivered' | 'unknown'`

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test -- tests/courier/gig.test.ts`
Expected: PASS

- [ ] **Step 5: Add the GIG variables to `.env.local`**

```
GIG_API_BASE_URL=
GIG_API_USERNAME=
GIG_API_PASSWORD=
GIG_SENDER_NAME=
GIG_SENDER_PHONE=
GIG_SENDER_ADDRESS=
GIG_SENDER_STATION=
```

- [ ] **Step 6: Commit**

```bash
git add lib/courier/gig.ts tests/courier/gig.test.ts
git commit -m "feat(awards): GIG Logistics courier adapter"
```

---

### Task 7: Read the current member's award order

**Files:**
- Create: `lib/awards/server.ts`, `app/api/member/award/route.ts`

**Interfaces:**
- Consumes: `AwardStatus`, `needsClaim` from `@/lib/awards/status`; `awardPriceKobo` from `@/lib/awards/money`
- Produces:
  - `AwardOrderView` — the JSON shape every client and later task consumes:
    `{ id, status, recipientName, phone, email, addressLine1, addressLine2, city, state, country, postalCode, awardAmountKobo, shippingAmountKobo, totalAmountKobo, currency, quoteExpiresAt, waybill, trackingUrl, deliveryStatus, paidAt, createdAt }`
  - `mapAwardOrder(row: any): AwardOrderView`
  - `loadOrderForUser(supabase, userId): Promise<any | null>`
  - `isMissingAwardTable(error: { code?: string; message?: string } | null): boolean`
  - `AWARD_SETUP_MESSAGE: string`

- [ ] **Step 1: Write the server mapping module**

`lib/awards/server.ts`:

```ts
// lib/awards/server.ts
// Server-only helpers mapping award_orders rows onto the API shape.
// Never import into a client component.
import type { createAdminClient } from '@/lib/supabase/server'
import type { AwardStatus } from '@/lib/awards/status'

export const AWARD_SETUP_MESSAGE =
  'The awards database is not set up yet. Ask the admin to run supabase/migrations/20260726_award_orders.sql.'

export type AwardOrderView = {
  id: string
  status: AwardStatus
  recipientName: string
  phone: string
  email: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  country: string
  postalCode: string
  awardAmountKobo: number
  shippingAmountKobo: number | null
  totalAmountKobo: number | null
  currency: string
  quoteExpiresAt: string | null
  waybill: string | null
  trackingUrl: string | null
  deliveryStatus: string | null
  paidAt: string | null
  createdAt: string
}

export function mapAwardOrder(row: any): AwardOrderView {
  return {
    id: row.id,
    status: (row.status ?? 'draft') as AwardStatus,
    recipientName: row.recipient_name ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    addressLine1: row.address_line1 ?? '',
    addressLine2: row.address_line2 ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    country: row.country ?? '',
    postalCode: row.postal_code ?? '',
    awardAmountKobo: row.award_amount_kobo ?? 0,
    shippingAmountKobo: row.shipping_amount_kobo ?? null,
    totalAmountKobo: row.total_amount_kobo ?? null,
    currency: row.currency ?? 'NGN',
    quoteExpiresAt: row.gig_quote_expires_at ?? null,
    waybill: row.gig_waybill ?? null,
    trackingUrl: row.gig_tracking_url ?? null,
    deliveryStatus: row.gig_last_status ?? null,
    paidAt: row.paid_at ?? null,
    createdAt: row.created_at,
  }
}

/** The member's one live order, or null if they have never started one. */
export async function loadOrderForUser(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const { data, error } = await supabase
    .from('award_orders')
    .select('*')
    .eq('profile_id', userId)
    .neq('status', 'cancelled')
    .maybeSingle()

  return { order: data ?? null, error }
}

/** True when the failure is "the migration has not been run yet". */
export function isMissingAwardTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === 'PGRST204' || error.code === '42P01') return true
  return /relation .*award_orders.* does not exist|schema cache/i.test(error.message ?? '')
}
```

- [ ] **Step 2: Write the GET route**

`app/api/member/award/route.ts`:

```ts
// app/api/member/award/route.ts
// The authenticated member's award order.
//   GET -> their order (or null if they have not started one) + the award price
import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { awardPriceKobo } from '@/lib/awards/money'
import { needsClaim } from '@/lib/awards/status'
import {
  AWARD_SETUP_MESSAGE,
  isMissingAwardTable,
  loadOrderForUser,
  mapAwardOrder,
} from '@/lib/awards/server'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const supabase = createAdminClient()
  const { order, error } = await loadOrderForUser(supabase, user.id)

  if (error) {
    if (isMissingAwardTable(error)) {
      return NextResponse.json({ message: AWARD_SETUP_MESSAGE }, { status: 503 })
    }
    return NextResponse.json({ message: 'Could not load your award order.' }, { status: 500 })
  }

  const view = order ? mapAwardOrder(order) : null

  return NextResponse.json({
    order: view,
    awardPriceKobo: awardPriceKobo(),
    needsClaim: needsClaim(view?.status ?? null),
  })
}
```

- [ ] **Step 3: Verify the route responds**

Start the dev server (`npm run dev`), sign in as a member, then in the browser console on `/dashboard`:

```js
await (await fetch('/api/member/award')).json()
```

Expected: `{ order: null, awardPriceKobo: 2000000, needsClaim: true }`

Then sign out and re-run the same fetch.
Expected: `{ message: 'Authentication required.' }` with status 401.

- [ ] **Step 4: Commit**

```bash
git add lib/awards/server.ts app/api/member/award/route.ts
git commit -m "feat(awards): read the current member's award order"
```

---

### Task 8: Quote shipping from delivery details

**Files:**
- Create: `app/api/member/award/quote/route.ts`

**Interfaces:**
- Consumes: `getCourier` from `@/lib/courier`; `quoteExpiresAt` from `@/lib/awards/quote`; `awardPriceKobo`, `totalKobo` from `@/lib/awards/money`; `mapAwardOrder`, `loadOrderForUser`, `isMissingAwardTable`, `AWARD_SETUP_MESSAGE` from `@/lib/awards/server`
- Produces: `POST /api/member/award/quote` → `{ order: AwardOrderView }` on success, `{ message }` on failure

- [ ] **Step 1: Write the route**

`app/api/member/award/quote/route.ts`:

```ts
// app/api/member/award/quote/route.ts
// POST delivery details -> live shipping quote, stored server-side with an
// expiry. The response carries the itemised total the member is shown.
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import { awardPriceKobo, totalKobo } from '@/lib/awards/money'
import { quoteExpiresAt } from '@/lib/awards/quote'
import { getCourier } from '@/lib/courier'
import {
  AWARD_SETUP_MESSAGE,
  isMissingAwardTable,
  loadOrderForUser,
  mapAwardOrder,
} from '@/lib/awards/server'

export const runtime = 'nodejs'

const deliverySchema = z.object({
  recipientName: z.string().trim().min(2, 'Enter the full name for delivery.').max(120),
  phone: z.string().trim().min(7, 'Enter a reachable phone number.').max(32),
  email: z.string().trim().email('Enter a valid email address.').max(200),
  addressLine1: z.string().trim().min(4, 'Enter your street address.').max(200),
  addressLine2: z.string().trim().max(200).optional().default(''),
  city: z.string().trim().min(2, 'Enter your city.').max(100),
  state: z.string().trim().min(2, 'Enter your state or region.').max(100),
  country: z.string().trim().min(2, 'Enter your country.').max(100),
  postalCode: z.string().trim().max(32).optional().default(''),
})

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  // Quoting hits an external carrier API — rate limit per member, not per IP,
  // so one member on a shared network cannot lock out another.
  const rate = checkRateLimit({ ...RATE_LIMITS.QUERY, identifier: `award-quote:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many quote requests. Please wait a moment.')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = deliverySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Check your delivery details.' },
      { status: 400 },
    )
  }
  const details = parsed.data

  const supabase = createAdminClient()
  const { order: existing, error: loadError } = await loadOrderForUser(supabase, user.id)

  if (loadError) {
    if (isMissingAwardTable(loadError)) {
      return NextResponse.json({ message: AWARD_SETUP_MESSAGE }, { status: 503 })
    }
    return NextResponse.json({ message: 'Could not load your award order.' }, { status: 500 })
  }

  // A paid order's address is locked — it is already with the courier.
  if (existing && ['paid', 'dispatched', 'in_transit', 'delivered'].includes(existing.status)) {
    return NextResponse.json(
      { message: 'Your award is already paid for. Contact the admin team to change the delivery address.' },
      { status: 409 },
    )
  }

  const quote = await getCourier().quote(details)
  const award = awardPriceKobo()

  const columns: Record<string, unknown> = {
    profile_id: user.id,
    recipient_name: details.recipientName,
    phone: details.phone,
    email: details.email,
    address_line1: details.addressLine1,
    address_line2: details.addressLine2 || null,
    city: details.city,
    state: details.state,
    country: details.country,
    postal_code: details.postalCode || null,
    award_amount_kobo: award,
    gig_response: quote.raw ?? null,
  }

  if (quote.ok) {
    columns.status = 'quoted'
    columns.shipping_amount_kobo = quote.shippingKobo
    columns.total_amount_kobo = totalKobo(award, quote.shippingKobo)
    columns.gig_quote = quote.raw ?? null
    columns.gig_quote_expires_at = quoteExpiresAt()
  } else {
    // No usable quote: park the order for the admin team rather than guessing
    // a shipping price the member would then be charged.
    columns.status = 'quote_failed'
    columns.shipping_amount_kobo = null
    columns.total_amount_kobo = null
    columns.gig_quote = null
    columns.gig_quote_expires_at = null
  }

  const query = existing
    ? supabase.from('award_orders').update(columns).eq('id', existing.id)
    : supabase.from('award_orders').insert(columns)

  const { data: saved, error: saveError } = await query.select('*').single()

  if (saveError) {
    if (isMissingAwardTable(saveError)) {
      return NextResponse.json({ message: AWARD_SETUP_MESSAGE }, { status: 503 })
    }
    return NextResponse.json({ message: 'Could not save your delivery details.' }, { status: 500 })
  }

  return NextResponse.json({
    order: mapAwardOrder(saved),
    message: quote.ok ? null : quote.reason,
  })
}
```

- [ ] **Step 2: Verify with a valid address**

With the dev server running and signed in as a member, in the browser console:

```js
await (await fetch('/api/member/award/quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    recipientName: 'Test Awardee', phone: '08030000000', email: 'test@example.com',
    addressLine1: '12 Test Street', city: 'Lagos', state: 'Lagos', country: 'Nigeria',
  }),
})).json()
```

Expected while GIG is unconfigured: `order.status === 'quote_failed'` and a `message` explaining the team will be in touch. This is correct behaviour — the manual adapter refuses to invent a price.

- [ ] **Step 3: Verify validation rejects a bad address**

```js
await (await fetch('/api/member/award/quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ recipientName: 'X', phone: '1', email: 'nope', addressLine1: '', city: '', state: '', country: '' }),
})).json()
```

Expected: status 400 with a specific field message such as `Enter the full name for delivery.`

- [ ] **Step 4: Commit**

```bash
git add app/api/member/award/quote/route.ts
git commit -m "feat(awards): quote shipping from validated delivery details"
```

---

### Task 9: Paystack checkout initialisation

**Files:**
- Create: `app/api/member/award/checkout/route.ts`

**Interfaces:**
- Consumes: `initializeTransaction`, `buildReference` from `@/lib/payments/paystack`; `isQuoteExpired` from `@/lib/awards/quote`; `assertTransition` from `@/lib/awards/status`
- Produces: `POST /api/member/award/checkout` → `{ authorizationUrl: string; reference: string }`

- [ ] **Step 1: Write the route**

`app/api/member/award/checkout/route.ts`:

```ts
// app/api/member/award/checkout/route.ts
// POST -> initialise a Paystack transaction for the member's stored quote.
// The charged amount comes from the database, never from the request body.
import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import { assertKobo } from '@/lib/awards/money'
import { isQuoteExpired } from '@/lib/awards/quote'
import { assertTransition } from '@/lib/awards/status'
import { buildReference, initializeTransaction } from '@/lib/payments/paystack'
import { AWARD_SETUP_MESSAGE, isMissingAwardTable, loadOrderForUser } from '@/lib/awards/server'

export const runtime = 'nodejs'

function siteOrigin(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const rate = checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: `award-checkout:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many payment attempts. Please wait a moment.')

  const supabase = createAdminClient()
  const { order, error } = await loadOrderForUser(supabase, user.id)

  if (error) {
    if (isMissingAwardTable(error)) return NextResponse.json({ message: AWARD_SETUP_MESSAGE }, { status: 503 })
    return NextResponse.json({ message: 'Could not load your award order.' }, { status: 500 })
  }
  if (!order) {
    return NextResponse.json({ message: 'Add your delivery details first.' }, { status: 400 })
  }
  if (order.status === 'quote_failed') {
    return NextResponse.json(
      { message: 'We could not price delivery to your address. Our team will contact you.' },
      { status: 409 },
    )
  }
  if (!['quoted', 'awaiting_payment'].includes(order.status)) {
    return NextResponse.json({ message: 'This award order is not ready for payment.' }, { status: 409 })
  }

  // A stale quote must be re-priced before it can be charged.
  if (isQuoteExpired(order.gig_quote_expires_at)) {
    await supabase.from('award_orders').update({ status: 'quoted' }).eq('id', order.id)
    return NextResponse.json(
      { message: 'Your delivery quote expired. Please confirm your address again to get a fresh price.', expired: true },
      { status: 409 },
    )
  }

  const amountKobo = order.total_amount_kobo
  if (typeof amountKobo !== 'number') {
    return NextResponse.json({ message: 'This award order has no price yet.' }, { status: 409 })
  }
  // Belt and braces: the DB is the source of truth, but a corrupted row must
  // not reach Paystack as a charge.
  assertKobo(amountKobo, 'order total')

  assertTransition(order.status, 'awaiting_payment')

  const reference = buildReference(order.id)

  let init
  try {
    init = await initializeTransaction({
      email: order.email || user.email || '',
      amountKobo,
      reference,
      callbackUrl: `${siteOrigin(request)}/dashboard?section=awards&payment=done`,
      metadata: { orderId: order.id, profileId: user.id, purpose: 'africa-future-leaders-award' },
    })
  } catch (paymentError) {
    return NextResponse.json(
      { message: paymentError instanceof Error ? paymentError.message : 'Could not start the payment.' },
      { status: 502 },
    )
  }

  await supabase
    .from('award_orders')
    .update({ status: 'awaiting_payment', paystack_reference: init.reference, paystack_status: 'pending' })
    .eq('id', order.id)

  return NextResponse.json({ authorizationUrl: init.authorizationUrl, reference: init.reference })
}
```

- [ ] **Step 2: Verify an unpriced order is refused**

Signed in as a member whose order is at `quote_failed`, in the browser console:

```js
await (await fetch('/api/member/award/checkout', { method: 'POST' })).json()
```

Expected: status 409, message `We could not price delivery to your address. Our team will contact you.`

This confirms the route never charges without a real quote.

- [ ] **Step 3: Commit**

```bash
git add app/api/member/award/checkout/route.ts
git commit -m "feat(awards): paystack checkout from the stored server-side quote"
```

---

### Task 10: Paystack webhook and idempotent dispatch

**Files:**
- Create: `app/api/webhooks/paystack/route.ts`

**Interfaces:**
- Consumes: `verifyPaystackSignature`, `paidAmountMatches` from `@/lib/payments/paystack`; `getCourier` from `@/lib/courier`; `canTransition` from `@/lib/awards/status`
- Produces: `POST /api/webhooks/paystack` → always `{ received: true }` with status 200 once the signature is valid

- [ ] **Step 1: Write the route**

`app/api/webhooks/paystack/route.ts`:

```ts
// app/api/webhooks/paystack/route.ts
// The ONLY thing that can move an order to `paid`. Paystack retries webhooks,
// so every step here is idempotent: a replayed event must not charge twice,
// book twice, or downgrade an already-dispatched order.
import { NextRequest, NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/server'
import { paidAmountMatches, verifyPaystackSignature } from '@/lib/payments/paystack'
import { canTransition } from '@/lib/awards/status'
import { getCourier } from '@/lib/courier'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) {
    console.error('[paystack-webhook] PAYSTACK_SECRET_KEY is not configured')
    return NextResponse.json({ message: 'Payments are not configured.' }, { status: 500 })
  }

  // Read the RAW body. Parsing first and re-serialising would change the bytes
  // and break signature verification.
  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature')

  if (!verifyPaystackSignature(rawBody, signature, secret)) {
    return NextResponse.json({ message: 'Invalid signature.' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ message: 'Invalid payload.' }, { status: 400 })
  }

  // Acknowledge anything that is not a successful charge so Paystack stops retrying.
  if (event?.event !== 'charge.success') {
    return NextResponse.json({ received: true })
  }

  const reference: string | undefined = event?.data?.reference
  const paidKobo: number | undefined = event?.data?.amount
  if (!reference || typeof paidKobo !== 'number') {
    return NextResponse.json({ received: true })
  }

  const supabase = createAdminClient()
  const { data: order } = await supabase
    .from('award_orders')
    .select('*')
    .eq('paystack_reference', reference)
    .maybeSingle()

  if (!order) {
    console.warn('[paystack-webhook] no award order for reference', reference)
    return NextResponse.json({ received: true })
  }

  // Replay of an event we already handled — acknowledge and stop.
  if (!canTransition(order.status, 'paid') && order.status !== 'paid') {
    return NextResponse.json({ received: true })
  }

  if (!paidAmountMatches(paidKobo, order.total_amount_kobo ?? Number.MAX_SAFE_INTEGER)) {
    console.error('[paystack-webhook] amount mismatch', {
      reference,
      paidKobo,
      expected: order.total_amount_kobo,
    })
    await supabase
      .from('award_orders')
      .update({ paystack_status: 'amount_mismatch', admin_note: `Paid ${paidKobo} kobo, expected ${order.total_amount_kobo}` })
      .eq('id', order.id)
    return NextResponse.json({ received: true })
  }

  // Mark paid only from a pre-paid status. The `.eq('status', ...)` guard makes
  // concurrent webhook retries race-safe: only one update can match.
  if (order.status !== 'paid') {
    const { data: updated } = await supabase
      .from('award_orders')
      .update({ status: 'paid', paystack_status: 'success', paid_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('status', order.status)
      .select('id')
      .maybeSingle()

    if (!updated) {
      // Another retry won the race and already marked it paid.
      return NextResponse.json({ received: true })
    }
  }

  // Book the shipment exactly once, guarded on the waybill being absent.
  if (!order.gig_waybill) {
    try {
      const booking = await getCourier().book({
        orderId: order.id,
        email: order.email ?? '',
        recipientName: order.recipient_name ?? '',
        phone: order.phone ?? '',
        addressLine1: order.address_line1 ?? '',
        addressLine2: order.address_line2 ?? undefined,
        city: order.city ?? '',
        state: order.state ?? '',
        country: order.country ?? '',
        postalCode: order.postal_code ?? undefined,
      })

      await supabase
        .from('award_orders')
        .update({
          status: 'dispatched',
          gig_waybill: booking.waybill,
          gig_tracking_url: booking.trackingUrl,
          gig_response: booking.raw ?? null,
        })
        .eq('id', order.id)
        .is('gig_waybill', null)
    } catch (bookingError) {
      // The member has paid. A booking failure must never fail the webhook, or
      // Paystack will retry and we risk re-processing a completed payment.
      // The order stays `paid` and surfaces in /admin/awards for manual dispatch.
      console.error('[paystack-webhook] dispatch booking failed', order.id, bookingError)
      await supabase
        .from('award_orders')
        .update({
          admin_note: `Automatic dispatch failed: ${
            bookingError instanceof Error ? bookingError.message : 'unknown error'
          }`,
        })
        .eq('id', order.id)
    }
  }

  return NextResponse.json({ received: true })
}
```

- [ ] **Step 2: Verify an unsigned request is rejected**

With the dev server running:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/api/webhooks/paystack \
  -H 'Content-Type: application/json' \
  -d '{"event":"charge.success","data":{"reference":"AFL-AWARD-fake","amount":100}}'
```

Expected: `401`

- [ ] **Step 3: Verify a correctly signed request is accepted**

```bash
BODY='{"event":"charge.success","data":{"reference":"AFL-AWARD-fake","amount":100}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha512 -hmac "$PAYSTACK_SECRET_KEY" -hex | sed 's/.*= //')
curl -s -X POST http://localhost:3000/api/webhooks/paystack \
  -H 'Content-Type: application/json' -H "x-paystack-signature: $SIG" -d "$BODY"
```

Expected: `{"received":true}` — the unknown reference is acknowledged without touching any order.

- [ ] **Step 4: Register the webhook with Paystack**

In the Paystack dashboard → Settings → API Keys & Webhooks, set the webhook URL to
`https://top100afl.com/api/webhooks/paystack`.

- [ ] **Step 5: Commit**

```bash
git add app/api/webhooks/paystack/route.ts
git commit -m "feat(awards): idempotent paystack webhook with dispatch-on-payment"
```

---

### Task 11: Delivery tracking refresh

**Files:**
- Create: `app/api/member/award/track/route.ts`

**Interfaces:**
- Consumes: `getCourier` from `@/lib/courier`; `canTransition` from `@/lib/awards/status`; `loadOrderForUser`, `mapAwardOrder` from `@/lib/awards/server`
- Produces: `GET /api/member/award/track` → `{ order: AwardOrderView }`

- [ ] **Step 1: Write the route**

`app/api/member/award/track/route.ts`:

```ts
// app/api/member/award/track/route.ts
// GET -> re-read delivery status from the courier and persist any advance.
import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import { canTransition, type AwardStatus } from '@/lib/awards/status'
import { getCourier } from '@/lib/courier'
import { loadOrderForUser, mapAwardOrder } from '@/lib/awards/server'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const rate = checkRateLimit({ ...RATE_LIMITS.QUERY, identifier: `award-track:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many tracking requests. Please wait a moment.')

  const supabase = createAdminClient()
  const { order } = await loadOrderForUser(supabase, user.id)

  if (!order) return NextResponse.json({ message: 'No award order found.' }, { status: 404 })
  if (!order.gig_waybill) return NextResponse.json({ order: mapAwardOrder(order) })

  let tracking
  try {
    tracking = await getCourier().track(order.gig_waybill)
  } catch (trackingError) {
    console.error('[award-track] tracking lookup failed', order.id, trackingError)
    return NextResponse.json({ order: mapAwardOrder(order) })
  }

  const columns: Record<string, unknown> = { gig_last_status: tracking.description }

  // Only advance the status — never move an order backwards on a noisy read.
  const next = tracking.status as AwardStatus
  if (next !== 'unknown' && canTransition(order.status as AwardStatus, next)) {
    columns.status = next
  }

  const { data: updated } = await supabase
    .from('award_orders')
    .update(columns)
    .eq('id', order.id)
    .select('*')
    .maybeSingle()

  return NextResponse.json({ order: mapAwardOrder(updated ?? order) })
}
```

- [ ] **Step 2: Verify the route responds for an order with no waybill**

Signed in as a member with an unpaid order:

```js
await (await fetch('/api/member/award/track')).json()
```

Expected: the order echoed back unchanged, with no courier call attempted.

- [ ] **Step 3: Commit**

```bash
git add app/api/member/award/track/route.ts
git commit -m "feat(awards): delivery tracking refresh"
```

---

### Task 12: Awards dashboard section

**Files:**
- Create: `lib/awards.ts`, `app/dashboard/awards-section.tsx`

**Interfaces:**
- Consumes: every `/api/member/award*` route from Tasks 7–11; `formatNaira` from `@/lib/awards/money`
- Produces: default export `AwardsSection` (a client component taking `{ member: MemberProfile; onClaimStateChange?: (needsClaim: boolean) => void }`); client helpers `fetchAwardOrder`, `submitDeliveryDetails`, `startAwardCheckout`, `refreshAwardTracking`

- [ ] **Step 1: Write the client data module**

`lib/awards.ts` — mirrors the `fetch`-wrapper style of `lib/member-hub.ts`:

```ts
// lib/awards.ts
// Client-side wrappers around /api/member/award*. Safe to import into client
// components — it contains no secrets and no server-only imports.
import type { AwardStatus } from '@/lib/awards/status'

export type AwardOrder = {
  id: string
  status: AwardStatus
  recipientName: string
  phone: string
  email: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  country: string
  postalCode: string
  awardAmountKobo: number
  shippingAmountKobo: number | null
  totalAmountKobo: number | null
  currency: string
  quoteExpiresAt: string | null
  waybill: string | null
  trackingUrl: string | null
  deliveryStatus: string | null
  paidAt: string | null
  createdAt: string
}

export type AwardState = {
  order: AwardOrder | null
  awardPriceKobo: number
  needsClaim: boolean
}

export type DeliveryDetails = {
  recipientName: string
  phone: string
  email: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  country: string
  postalCode?: string
}

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.message || 'Request failed. Please try again.')
  return data
}

export async function fetchAwardOrder(): Promise<AwardState> {
  const res = await fetch('/api/member/award', { cache: 'no-store' })
  return (await jsonOrThrow(res)) as AwardState
}

/** Save delivery details and get a shipping quote. */
export async function submitDeliveryDetails(
  details: DeliveryDetails,
): Promise<{ order: AwardOrder; message: string | null }> {
  const res = await fetch('/api/member/award/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(details),
  })
  return (await jsonOrThrow(res)) as { order: AwardOrder; message: string | null }
}

/** Start payment. Returns the Paystack URL the browser should navigate to. */
export async function startAwardCheckout(): Promise<{ authorizationUrl: string; reference: string }> {
  const res = await fetch('/api/member/award/checkout', { method: 'POST' })
  return (await jsonOrThrow(res)) as { authorizationUrl: string; reference: string }
}

export async function refreshAwardTracking(): Promise<{ order: AwardOrder }> {
  const res = await fetch('/api/member/award/track', { cache: 'no-store' })
  return (await jsonOrThrow(res)) as { order: AwardOrder }
}
```

- [ ] **Step 2: Write the Awards section component**

`app/dashboard/awards-section.tsx`:

```tsx
'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Loader2, PackageCheck, RefreshCw, Trophy, Truck } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatNaira } from '@/lib/awards/money'
import {
  fetchAwardOrder,
  refreshAwardTracking,
  startAwardCheckout,
  submitDeliveryDetails,
  type AwardOrder,
  type AwardState,
} from '@/lib/awards'
import type { MemberProfile } from '@/lib/member-hub'

// Statuses at which the courier already has the parcel, so the address is
// locked and the member sees tracking instead of a form.
const TRACKING_STATUSES = ['paid', 'dispatched', 'in_transit', 'delivered']

export default function AwardsSection({
  member,
  onClaimStateChange,
}: {
  member: MemberProfile
  onClaimStateChange?: (needsClaim: boolean) => void
}) {
  const [state, setState] = useState<AwardState | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [quoting, setQuoting] = useState(false)
  const [paying, setPaying] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [notice, setNotice] = useState('')
  // Lets a member with a quote go back and correct their address.
  const [editingAddress, setEditingAddress] = useState(false)

  const applyState = useCallback(
    (next: AwardState) => {
      setState(next)
      onClaimStateChange?.(next.needsClaim)
    },
    [onClaimStateChange],
  )

  useEffect(() => {
    let cancelled = false
    fetchAwardOrder()
      .then((next) => {
        if (!cancelled) {
          applyState(next)
          setLoadError('')
        }
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Could not load your award.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [applyState])

  async function handleDeliverySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    try {
      setQuoting(true)
      setNotice('')
      const result = await submitDeliveryDetails({
        recipientName: String(form.get('recipientName') || ''),
        phone: String(form.get('phone') || ''),
        email: String(form.get('email') || ''),
        addressLine1: String(form.get('addressLine1') || ''),
        addressLine2: String(form.get('addressLine2') || ''),
        city: String(form.get('city') || ''),
        state: String(form.get('state') || ''),
        country: String(form.get('country') || ''),
        postalCode: String(form.get('postalCode') || ''),
      })

      applyState({ ...(state as AwardState), order: result.order, needsClaim: true })
      setEditingAddress(false)

      if (result.message) {
        // quote_failed is informational, not an error — the team follows up.
        setNotice(result.message)
      } else {
        toast.success('Delivery quote ready. Review your total below.')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save your delivery details.'
      toast.error(message)
    } finally {
      setQuoting(false)
    }
  }

  async function handlePay() {
    try {
      setPaying(true)
      const { authorizationUrl } = await startAwardCheckout()
      window.location.href = authorizationUrl
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not start the payment.'
      toast.error(message)
      setPaying(false)
    }
    // On success the browser navigates away, so `paying` stays true and the
    // button stays disabled — that is deliberate, it prevents a double charge.
  }

  async function handleRefreshTracking() {
    try {
      setRefreshing(true)
      const { order } = await refreshAwardTracking()
      applyState({ ...(state as AwardState), order, needsClaim: false })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not refresh tracking.')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[240px] place-items-center rounded-[28px] border border-orange-100 bg-white">
        <div className="text-center">
          <div className="mx-auto mb-3 inline-block h-7 w-7 animate-spin rounded-full border-b-2 border-t-2 border-orange-500" />
          <p className="text-sm font-semibold text-black/60">Loading your award...</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-[28px] border border-orange-100 bg-white p-6">
        <p className="text-sm font-semibold text-orange-700">{loadError}</p>
      </div>
    )
  }

  const order = state?.order ?? null
  const showTracking = order ? TRACKING_STATUSES.includes(order.status) : false
  const showTotals = !editingAddress && order?.status === 'quoted' && order.totalAmountKobo !== null

  return (
    <div className="space-y-5">
      <section className="rounded-[30px] border border-orange-100 bg-white p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-[#fffaf0]">
            <Trophy className="h-7 w-7" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Your award</p>
            <h3 className="mt-2 text-3xl font-bold tracking-tight text-black">
              The Africa Future Leaders Award
            </h3>
            <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-black/60">
              Every awardee receives the physical award. Add your delivery address to see your total,
              pay once, and track it to your door.
            </p>
          </div>
        </div>
      </section>

      {notice ? (
        <div role="status" className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-medium leading-6 text-amber-900">{notice}</p>
        </div>
      ) : null}

      {showTracking && order ? (
        <TrackingPanel order={order} onRefresh={handleRefreshTracking} refreshing={refreshing} />
      ) : showTotals && order ? (
        <TotalsPanel
          order={order}
          paying={paying}
          onPay={handlePay}
          onEditAddress={() => setEditingAddress(true)}
        />
      ) : (
        <DeliveryForm member={member} order={order} onSubmit={handleDeliverySubmit} submitting={quoting} />
      )}
    </div>
  )
}

function DeliveryForm({
  member,
  order,
  onSubmit,
  submitting,
}: {
  member: MemberProfile
  order: AwardOrder | null
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  submitting: boolean
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-[28px] border border-orange-100 bg-white p-5 sm:p-6">
      <h4 className="text-2xl font-bold tracking-tight text-black">Where should we send it?</h4>
      <p className="mt-2 text-sm font-medium leading-6 text-black/60">
        Delivery is quoted live from this address, so double-check it before you pay.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <AwardField label="Full name" name="recipientName" defaultValue={order?.recipientName || member.name} />
        <AwardField label="Phone number" name="phone" defaultValue={order?.phone || ''} />
        <AwardField label="Email" name="email" type="email" defaultValue={order?.email || member.email} />
        <AwardField label="Street address" name="addressLine1" defaultValue={order?.addressLine1 || ''} />
        <AwardField label="Apartment, suite (optional)" name="addressLine2" defaultValue={order?.addressLine2 || ''} required={false} />
        <AwardField label="City" name="city" defaultValue={order?.city || ''} />
        <AwardField label="State or region" name="state" defaultValue={order?.state || ''} />
        <AwardField label="Country" name="country" defaultValue={order?.country || ''} />
        <AwardField label="Postal code (optional)" name="postalCode" defaultValue={order?.postalCode || ''} required={false} />
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="mt-6 rounded-full bg-orange-500 px-8 py-6 text-[#fffaf0] hover:bg-orange-600 disabled:bg-orange-200 disabled:text-black/45"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Getting your delivery price...
          </>
        ) : (
          'Continue to total'
        )}
      </Button>
    </form>
  )
}

function TotalsPanel({
  order,
  paying,
  onPay,
  onEditAddress,
}: {
  order: AwardOrder
  paying: boolean
  onPay: () => void
  onEditAddress: () => void
}) {
  return (
    <section className="rounded-[28px] border border-orange-100 bg-white p-5 sm:p-6">
      <h4 className="text-2xl font-bold tracking-tight text-black">Your total</h4>

      <dl className="mt-5 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm font-medium text-black/65">Africa Future Leaders Award</dt>
          <dd className="text-sm font-bold text-black">{formatNaira(order.awardAmountKobo)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm font-medium text-black/65">Delivery — GIG Logistics</dt>
          <dd className="text-sm font-bold text-black">{formatNaira(order.shippingAmountKobo ?? 0)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-orange-100 pt-3">
          <dt className="text-base font-bold text-black">Total</dt>
          <dd className="text-xl font-bold text-black">{formatNaira(order.totalAmountKobo ?? 0)}</dd>
        </div>
      </dl>

      <p className="mt-4 text-sm font-medium leading-6 text-black/55">
        Delivering to {order.addressLine1}, {order.city}, {order.country}.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={onPay}
          disabled={paying}
          className="rounded-full bg-orange-500 px-8 py-6 text-[#fffaf0] hover:bg-orange-600 disabled:bg-orange-200 disabled:text-black/45"
        >
          {paying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Taking you to payment...
            </>
          ) : (
            `Pay ${formatNaira(order.totalAmountKobo ?? 0)}`
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onEditAddress}
          disabled={paying}
          className="rounded-full border-orange-200 bg-white text-black hover:bg-orange-50"
        >
          Edit address
        </Button>
      </div>
    </section>
  )
}

function TrackingPanel({
  order,
  onRefresh,
  refreshing,
}: {
  order: AwardOrder
  onRefresh: () => void
  refreshing: boolean
}) {
  const delivered = order.status === 'delivered'

  return (
    <section className="rounded-[28px] border border-orange-100 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          {delivered ? <PackageCheck className="h-6 w-6" strokeWidth={2.2} /> : <Truck className="h-6 w-6" strokeWidth={2.2} />}
        </div>
        <div className="min-w-0">
          <h4 className="text-2xl font-bold tracking-tight text-black">
            {delivered ? 'Delivered' : 'On its way'}
          </h4>
          <p className="mt-2 text-sm font-medium leading-6 text-black/60">
            {order.deliveryStatus || 'Your award is being prepared for dispatch.'}
          </p>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <AwardInfo label="Paid" value={formatNaira(order.totalAmountKobo ?? 0)} />
        <AwardInfo label="Waybill" value={order.waybill || 'Assigned once dispatched'} />
      </dl>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onRefresh}
          disabled={refreshing}
          className="rounded-full border-orange-200 bg-white text-black hover:bg-orange-50"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing' : 'Refresh status'}
        </Button>
        {order.trackingUrl ? (
          <a
            href={order.trackingUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-orange-700 underline underline-offset-4"
          >
            Track on GIG Logistics
          </a>
        ) : null}
      </div>
    </section>
  )
}

function AwardField({
  label,
  name,
  defaultValue,
  type = 'text',
  required = true,
}: {
  label: string
  name: string
  defaultValue: string
  type?: string
  required?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`award-${name}`} className="font-semibold text-black">
        {label}
      </Label>
      <Input
        id={`award-${name}`}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="h-14 rounded-2xl border-orange-100 text-base text-black placeholder:text-black/40"
      />
    </div>
  )
}

function AwardInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-[#fffaf4] px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-black">{value}</dd>
    </div>
  )
}
```

- [ ] **Step 3: Verify on desktop and mobile**

Run `npm run dev`, sign in as a member, open the Awards section (Task 13 adds the nav entry; until then navigate by temporarily rendering it).

Check: the form validates, submits, and shows a real response; at 375px width nothing overflows horizontally; the Pay button disables while submitting.

- [ ] **Step 4: Commit**

```bash
git add lib/awards.ts app/dashboard/awards-section.tsx
git commit -m "feat(awards): awards dashboard section with itemised checkout"
```

---

### Task 13: Dashboard navigation and the compulsory claim prompt

**Files:**
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `AwardsSection` from `./awards-section`; `fetchAwardOrder` from `@/lib/awards`
- Produces: an `'awards'` dashboard section reachable from the sidebar, the home grid, and a claim banner

- [ ] **Step 1: Add `'awards'` to the section type**

In `app/dashboard/page.tsx`, at the `DashboardSection` type (line 65), add `'awards'` to the union:

```ts
type DashboardSection = 'home' | 'profile' | 'directory' | 'messages' | 'opportunities' | 'awards' | 'featured' | 'events' | 'partnerships' | 'magazine' | 'notifications' | 'settings'
```

- [ ] **Step 2: Add the nav entry**

In the `dashboardNav` array, immediately after the `opportunities` entry:

```ts
  { id: 'awards', title: 'My Award', label: 'Claim and track', icon: Trophy, tone: 'orange' },
```

Change the existing `opportunities` entry's icon from `Trophy` to `BriefcaseBusiness` so the two sections do not share an icon. `BriefcaseBusiness` is already imported at line 11.

- [ ] **Step 3: Add the card styling**

In `dashboardCardStyles`, add an `awards` entry:

```ts
  awards: {
    card: 'bg-[#fff1e6] text-black border border-orange-200',
    icon: 'text-orange-600',
    arrow: 'text-orange-600',
    detail: 'text-black/52',
  },
```

- [ ] **Step 4: Import the section and track claim state**

Add the import next to the existing `MessagesSection` import (line 63):

```ts
import AwardsSection from './awards-section'
```

Add state alongside `unreadMessages` (line 193):

```ts
  const [needsAwardClaim, setNeedsAwardClaim] = useState(false)
```

Add an effect next to the existing conversations effect (line 241):

```ts
  // Drives the compulsory-award banner. Best-effort: a failure here must not
  // break the dashboard, so it silently leaves the banner hidden.
  useEffect(() => {
    let cancelled = false
    fetchAwardOrder()
      .then((state) => {
        if (!cancelled) setNeedsAwardClaim(state.needsClaim)
      })
      .catch(() => {
        // Awards may not be set up yet — the section itself explains it.
      })
    return () => {
      cancelled = true
    }
  }, [])
```

Add the import for it alongside the `@/lib/member-hub` import block:

```ts
import { fetchAwardOrder } from '@/lib/awards'
```

- [ ] **Step 5: Render the section**

In the `<main>` block, after the `opportunities` line (line 484):

```tsx
            {activeSection === 'awards' && <AwardsSection member={member} onClaimStateChange={setNeedsAwardClaim} />}
```

- [ ] **Step 6: Add the claim banner**

Directly after `<MembershipStatusBanner member={member} />` (line 471):

```tsx
            {needsAwardClaim && activeSection !== 'awards' && (
              <button
                type="button"
                onClick={() => openSection('awards')}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-[24px] border border-orange-200 bg-orange-50 px-5 py-4 text-left transition hover:border-orange-300"
              >
                <span>
                  <span className="block text-sm font-bold text-black">Claim your Africa Future Leaders award</span>
                  <span className="mt-1 block text-sm font-medium leading-6 text-black/60">
                    Every awardee receives the physical award. Add your delivery address to see the total and pay.
                  </span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-[#fffaf0]">
                  Claim now
                  <ArrowRight className="h-4 w-4" strokeWidth={2.8} />
                </span>
              </button>
            )}
```

- [ ] **Step 7: Handle the payment-return deep link**

The checkout callback returns to `/dashboard?section=awards&payment=done`. In the existing welcome-params effect (line 204), after the welcome handling, add:

```ts
      if (params.get('section') === 'awards') {
        setActiveSection('awards')
        params.delete('section')
        params.delete('payment')
        const qs = params.toString()
        window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''))
      }
```

- [ ] **Step 8: Verify the build compiles**

Run: `npx next build`
Expected: build completes and the route table lists `/dashboard`.

- [ ] **Step 9: Verify the navigation works**

Run `npm run dev`, sign in as a member.

Check: the sidebar shows "My Award"; the home grid shows its card; the claim banner appears on Home and is hidden while the Awards section is open; clicking the banner opens Awards; at 375px width the banner wraps without horizontal overflow.

- [ ] **Step 10: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(awards): dashboard navigation and compulsory claim prompt"
```

---

### Task 14: Admin awards console

**Files:**
- Create: `app/api/admin/awards/route.ts`, `app/admin/awards/page.tsx`

**Interfaces:**
- Consumes: `requireAdmin` from `@/lib/api/require-admin`; `mapAwardOrder` from `@/lib/awards/server`; `assertTransition` from `@/lib/awards/status`; `totalKobo` from `@/lib/awards/money`
- Produces: `GET /api/admin/awards` → `{ orders: (AwardOrderView & { memberName: string })[] }`; `PATCH /api/admin/awards` accepting `{ orderId, status?, shippingAmountKobo?, adminNote?, waybill? }`

- [ ] **Step 1: Write the admin API route**

`app/api/admin/awards/route.ts`:

```ts
// app/api/admin/awards/route.ts
// Admin view of every award order, plus the manual overrides the team needs
// when an automated quote or dispatch fails.
import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { totalKobo } from '@/lib/awards/money'
import { assertTransition, type AwardStatus } from '@/lib/awards/status'
import { quoteExpiresAt } from '@/lib/awards/quote'
import { AWARD_SETUP_MESSAGE, isMissingAwardTable, mapAwardOrder } from '@/lib/awards/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('award_orders')
    .select('*, profiles!award_orders_profile_id_fkey(full_name, email)')
    .order('created_at', { ascending: false })

  if (error) {
    if (isMissingAwardTable(error)) return NextResponse.json({ message: AWARD_SETUP_MESSAGE }, { status: 503 })
    return NextResponse.json({ message: 'Could not load award orders.' }, { status: 500 })
  }

  return NextResponse.json({
    orders: (data ?? []).map((row: any) => ({
      ...mapAwardOrder(row),
      memberName: row.profiles?.full_name ?? row.recipient_name ?? 'Awardee',
      memberEmail: row.profiles?.email ?? row.email ?? '',
    })),
  })
}

export async function PATCH(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const { orderId, status, shippingAmountKobo, adminNote, waybill } = body ?? {}
  if (!orderId) return NextResponse.json({ message: 'orderId is required.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: order } = await supabase.from('award_orders').select('*').eq('id', orderId).maybeSingle()
  if (!order) return NextResponse.json({ message: 'Award order not found.' }, { status: 404 })

  const columns: Record<string, unknown> = {}

  // Manual shipping price for a destination GIG could not quote. This puts the
  // order back at `quoted` so the member can pay the agreed amount.
  if (typeof shippingAmountKobo === 'number') {
    if (!Number.isInteger(shippingAmountKobo) || shippingAmountKobo < 0) {
      return NextResponse.json({ message: 'Shipping amount must be a whole number of kobo.' }, { status: 400 })
    }
    columns.shipping_amount_kobo = shippingAmountKobo
    columns.total_amount_kobo = totalKobo(order.award_amount_kobo, shippingAmountKobo)
    columns.status = 'quoted'
    columns.gig_quote_expires_at = quoteExpiresAt()
  }

  if (typeof status === 'string') {
    try {
      assertTransition(order.status as AwardStatus, status as AwardStatus)
    } catch (transitionError) {
      return NextResponse.json(
        { message: transitionError instanceof Error ? transitionError.message : 'Illegal status change.' },
        { status: 409 },
      )
    }
    columns.status = status
  }

  if (typeof adminNote === 'string') columns.admin_note = adminNote
  if (typeof waybill === 'string') columns.gig_waybill = waybill

  if (Object.keys(columns).length === 0) {
    return NextResponse.json({ message: 'Nothing to update.' }, { status: 400 })
  }

  const { data: updated, error } = await supabase
    .from('award_orders')
    .update(columns)
    .eq('id', orderId)
    .select('*')
    .single()

  if (error) return NextResponse.json({ message: 'Could not update this order.' }, { status: 500 })

  return NextResponse.json({ order: mapAwardOrder(updated) })
}
```

- [ ] **Step 2: Write the admin page**

Create `app/admin/awards/page.tsx` following the layout conventions of the existing `app/admin/feature-requests/page.tsx`. It must show a table of every order with member name, status badge, total (via `formatNaira`), waybill, and created date; provide a filter by status; and for `quote_failed` orders offer a "Set shipping price" input that PATCHes `shippingAmountKobo`, plus an admin-note field.

- [ ] **Step 3: Verify admin access control**

While signed in as a **member** (not an admin), in the browser console:

```js
;(await fetch('/api/admin/awards')).status
```

Expected: `401` or `403` — never `200`.

Then sign in as an admin and load `/admin/awards`.
Expected: the orders table renders.

- [ ] **Step 4: Verify the manual price override**

On an order at `quote_failed`, set a shipping price of `350000` in the admin UI.

Expected: the order moves to `quoted` with a total of `award + 350000`, and the member's dashboard now offers Pay.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/awards/route.ts app/admin/awards/page.tsx
git commit -m "feat(awards): admin awards console with manual price override"
```

---

## Environment variables

Add to `.env.local` (and to the Vercel project settings for production):

```
PAYSTACK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxx
AWARD_PRICE_KOBO=2000000
NEXT_PUBLIC_SITE_URL=https://top100afl.com

GIG_API_BASE_URL=
GIG_API_USERNAME=
GIG_API_PASSWORD=
GIG_SENDER_NAME=
GIG_SENDER_PHONE=
GIG_SENDER_ADDRESS=
GIG_SENDER_STATION=
```

## End-to-end verification

After Task 14, with Paystack **test** keys configured, walk the whole flow:

1. Sign in as a member with no award order → the claim banner appears on Home.
2. Open My Award → submit delivery details → a shipping quote returns (or `quote_failed` if GIG is unconfigured).
3. Confirm the itemised total reads `₦20,000` + shipping = total.
4. Pay with a Paystack test card → redirected back to `/dashboard?section=awards&payment=done`.
5. Confirm the order reaches `paid`, then `dispatched` with a waybill.
6. Re-send the same webhook event manually → confirm the order does **not** change and no second shipment is booked.
7. Confirm `/admin/awards` lists the order with the correct total.
8. Repeat steps 1–4 at 375px viewport width and confirm no horizontal overflow.

## Known gaps carried into later plans

- **Plan B** — member uploads and member blog posts
- **Plan C** — opportunities categories and DM email notifications
