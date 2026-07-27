# Impact Interviews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public Impact Interviews page that spotlights Top100 awardee video interviews, with an awardee-only application flow and an admin console for publishing interviews and triaging applications.

**Architecture:** Two new Supabase tables (`interviews`, `interview_applications`) behind RLS, a pure-function core in `lib/interviews/` (Zod schemas, awardee matching, view mappers) that is unit-tested without Supabase, thin server components for `/interviews` and `/interviews/[slug]`, one hardened public multipart endpoint for applications, and an admin console at `/admin/interviews` with Interviews and Applications tabs.

**Tech Stack:** Next.js App Router (server components + ISR), Supabase (Postgres, RLS, private storage bucket), Zod, TipTap, Brevo, Cloudflare Turnstile, Tailwind, Radix UI, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-27-impact-interviews-design.md`

## Global Constraints

- Route base is `/interviews`; page and nav label is "Impact Interviews".
- Eligibility is Top100 awardees only, self-apply. Third-party nominations are out of scope.
- Awardee matching is advisory: an unmatched application is **flagged, not rejected**.
- `interview_applications` has **no public select and no public insert policy**. All writes go through the API route using the service-role client.
- Headshots live in the **private** `interview-applications` bucket. Admin reads them via signed URLs only.
- A failed headshot upload must **not** fail the application submission.
- If the interviews query fails, `/interviews` still renders hero, eligibility, form and FAQ with the empty state in place of the grid. The apply funnel keeps working.
- Awardee cohort year lives in `public.awardees.year` (integer). There is no `cohort_year` column on that table.
- Brand: orange→amber gradient for primary actions, `#05060f` dark panels, `rounded-[22px]`–`rounded-[32px]`, `orange-100` hairline borders, warm neutrals (`#fffaf4`, `#f7f3ec`).
- Never add a `Co-Authored-By` trailer to commits in this repo.

---

### Task 1: Database migration, storage bucket, and CSP fix

**Files:**
- Create: `supabase/migrations/20260727_interviews.sql`
- Modify: `next.config.mjs:9-29` (image remote patterns), `next.config.mjs:95` (CSP `frame-src`)

**Interfaces:**
- Consumes: existing `public.awardees(id, name, email, year, slug, image_url, avatar_url, country)`.
- Produces: tables `public.interviews`, `public.interview_applications`; storage bucket `interview-applications`.

`interview_applications` is created **before** `interviews` because `interviews.application_id` references it; the reverse foreign key (`interview_applications.published_interview_id`) is added afterwards with `alter table`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260727_interviews.sql`:

```sql
-- ---------------------------------------------------------------------------
-- IMPACT INTERVIEWS
-- Awardee video/written interview series + the application queue that feeds it.
-- ---------------------------------------------------------------------------

-- Applications first: interviews.application_id references this table.
create table if not exists public.interview_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  country text,
  cohort_year integer,
  role_title text,
  organisation text,
  bio text not null,
  impact_story text not null,
  linkedin_url text,
  other_link text,
  preferred_format text not null default 'either'
    check (preferred_format in ('video', 'written', 'either')),
  headshot_path text,
  matched_awardee_id uuid references public.awardees(id) on delete set null,
  verification text not null default 'unmatched'
    check (verification in ('matched', 'unmatched')),
  status text not null default 'pending'
    check (status in ('pending', 'shortlisted', 'scheduled', 'published', 'declined')),
  admin_notes text,
  scheduled_at timestamptz,
  published_interview_id uuid,
  consent_recorded boolean not null default false,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists interview_applications_status_idx
  on public.interview_applications (status, created_at desc);
create index if not exists interview_applications_email_idx
  on public.interview_applications (lower(email));
create index if not exists interview_applications_matched_idx
  on public.interview_applications (matched_awardee_id);

create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  format text not null default 'video' check (format in ('video', 'written')),
  video_id text,
  duration_seconds integer,
  thumbnail_url text,
  pull_quote text,
  summary text,
  body text,
  awardee_id uuid references public.awardees(id) on delete set null,
  awardee_name text not null,
  country text,
  cohort_year integer,
  topics text[] not null default '{}',
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  sort_order integer not null default 0,
  application_id uuid references public.interview_applications(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A video interview without a video id would render an empty player.
  constraint interviews_video_requires_id
    check (format <> 'video' or (video_id is not null and length(video_id) > 0))
);

create index if not exists interviews_slug_idx on public.interviews (slug);
create index if not exists interviews_status_published_idx
  on public.interviews (status, published_at desc);
create index if not exists interviews_featured_idx on public.interviews (featured);
create index if not exists interviews_awardee_idx on public.interviews (awardee_id);
create index if not exists interviews_cohort_idx on public.interviews (cohort_year);

-- Reverse link, added now that public.interviews exists.
DO $$ BEGIN
  alter table public.interview_applications
    add constraint interview_applications_published_interview_fkey
    foreign key (published_interview_id)
    references public.interviews(id) on delete set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- updated_at triggers, matching public.handle_awardee_updated.
create or replace function public.handle_interview_updated()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_interview_updated on public.interviews;
create trigger on_interview_updated
  before update on public.interviews
  for each row execute function public.handle_interview_updated();

drop trigger if exists on_interview_application_updated on public.interview_applications;
create trigger on_interview_application_updated
  before update on public.interview_applications
  for each row execute function public.handle_interview_updated();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.interviews enable row level security;
alter table public.interview_applications enable row level security;

DO $$ BEGIN
  create policy "Published interviews are public" on public.interviews
    for select using (status = 'published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Service manages interviews" on public.interviews
    for all using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Applications carry personal data: service role only, no public policy at all.
DO $$ BEGIN
  create policy "Service manages interview applications" on public.interview_applications
    for all using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- PRIVATE STORAGE BUCKET for applicant headshots
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('interview-applications', 'interview-applications', false)
on conflict (id) do nothing;
```

- [ ] **Step 2: Apply the migration**

Run the file in the Supabase SQL editor for the project (the repo has no local Supabase CLI setup — `supabase/migrations/` is applied by hand, the same way `SETUP-MEMBER-HUB.sql` was).

Verify:

```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('interviews', 'interview_applications');
```

Expected: two rows.

```sql
select id, public from storage.buckets where id = 'interview-applications';
```

Expected: one row with `public = false`.

- [ ] **Step 3: Allow YouTube frames and thumbnails**

`next.config.mjs:95` currently reads:

```js
              "frame-src https://challenges.cloudflare.com",
```

Replace with:

```js
              // Frames: Turnstile CAPTCHA widget + YouTube players (interviews,
              // awardee profile videos). Without youtube-nocookie.com here the
              // embeds are silently blocked by CSP in production.
              "frame-src https://challenges.cloudflare.com https://www.youtube-nocookie.com https://www.youtube.com",
```

In the `images.remotePatterns` array at `next.config.mjs:11-28`, add after the `flagcdn.com` entry:

```js
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
```

- [ ] **Step 4: Verify the build still compiles**

Run: `npx tsc --noEmit`
Expected: no new errors (the repo has a pre-existing `tsconfig.tsbuildinfo`; only new errors matter).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260727_interviews.sql next.config.mjs
git commit -m "feat(interviews): add interviews and application tables, allow youtube frames"
```

---

### Task 2: Application validation schema

**Files:**
- Create: `lib/interviews/schema.ts`
- Test: `tests/interviews/schema.test.ts`

**Interfaces:**
- Produces:
  - `PREFERRED_FORMATS: readonly ['video','written','either']`
  - `applicationSchema: ZodSchema` → parsed type `ApplicationInput`
  - `type ApplicationInput = { fullName, email, phone, country, cohortYear, roleTitle, organisation, bio, impactStory, linkedinUrl, otherLink, preferredFormat, consentRecorded }`
  - `HEADSHOT_MAX_BYTES: number`
  - `sniffImageType(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null`
  - `validateHeadshot(bytes: Uint8Array, size: number): { ok: true; extension: string; mime: string } | { ok: false; message: string }`

- [ ] **Step 1: Write the failing test**

Create `tests/interviews/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  applicationSchema,
  HEADSHOT_MAX_BYTES,
  sniffImageType,
  validateHeadshot,
} from '@/lib/interviews/schema'

const valid = {
  fullName: 'Amara Okonkwo',
  email: 'Amara@Example.com',
  phone: '+234 800 000 0000',
  country: 'Nigeria',
  cohortYear: '2025',
  roleTitle: 'Founder',
  organisation: 'Clinic Labs',
  bio: 'A'.repeat(320),
  impactStory: 'B'.repeat(120),
  linkedinUrl: 'https://linkedin.com/in/amara',
  otherLink: '',
  preferredFormat: 'video',
  consentRecorded: 'on',
}

describe('applicationSchema', () => {
  it('accepts a valid payload and normalises email and cohort year', () => {
    const result = applicationSchema.parse(valid)
    expect(result.email).toBe('amara@example.com')
    expect(result.cohortYear).toBe(2025)
    expect(result.consentRecorded).toBe(true)
  })

  it('rejects an invalid email', () => {
    expect(() => applicationSchema.parse({ ...valid, email: 'not-an-email' })).toThrow()
  })

  it('rejects a missing consent checkbox', () => {
    const { consentRecorded, ...withoutConsent } = valid
    expect(() => applicationSchema.parse(withoutConsent)).toThrow()
  })

  it('rejects a bio that is too short to be usable', () => {
    expect(() => applicationSchema.parse({ ...valid, bio: 'Too short.' })).toThrow()
  })

  it('rejects a cohort year before the programme existed', () => {
    expect(() => applicationSchema.parse({ ...valid, cohortYear: '1998' })).toThrow()
  })

  it('treats an empty optional link as absent rather than invalid', () => {
    const result = applicationSchema.parse({ ...valid, linkedinUrl: '', otherLink: '' })
    expect(result.linkedinUrl).toBe('')
    expect(result.otherLink).toBe('')
  })
})

describe('sniffImageType', () => {
  it('identifies a JPEG by magic bytes', () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
  })

  it('identifies a PNG by magic bytes', () => {
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png')
  })

  it('identifies a WEBP by its RIFF container', () => {
    const bytes = new Uint8Array(16)
    bytes.set([0x52, 0x49, 0x46, 0x46], 0) // RIFF
    bytes.set([0x57, 0x45, 0x42, 0x50], 8) // WEBP
    expect(sniffImageType(bytes)).toBe('image/webp')
  })

  it('returns null for a renamed non-image', () => {
    expect(sniffImageType(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBeNull() // %PDF
  })
})

describe('validateHeadshot', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])

  it('accepts a JPEG under the size cap', () => {
    const result = validateHeadshot(jpeg, 1024)
    expect(result).toEqual({ ok: true, extension: 'jpg', mime: 'image/jpeg' })
  })

  it('rejects a file over the size cap', () => {
    const result = validateHeadshot(jpeg, HEADSHOT_MAX_BYTES + 1)
    expect(result.ok).toBe(false)
  })

  it('rejects a file whose bytes are not an allowed image', () => {
    const result = validateHeadshot(new Uint8Array([0x25, 0x50, 0x44, 0x46]), 1024)
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/interviews/schema.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/interviews/schema"`.

- [ ] **Step 3: Write the implementation**

Create `lib/interviews/schema.ts`:

```ts
import { z } from 'zod'

export const PREFERRED_FORMATS = ['video', 'written', 'either'] as const
export type PreferredFormat = (typeof PREFERRED_FORMATS)[number]

/** The first Top100 cohort. Anything earlier is a typo, not a cohort. */
const FIRST_COHORT_YEAR = 2015

/**
 * ~100 words. The bio feeds the interview card and the published page, so a
 * one-liner is not usable copy — but the message has to say so plainly rather
 * than just failing.
 */
const BIO_MIN_CHARS = 300
const BIO_MAX_CHARS = 1600

/** Checkboxes arrive from FormData as "on"; JSON clients may send "true". */
const consentField = z
  .union([z.literal('on'), z.literal('true'), z.literal(true)])
  .transform(() => true)

/** An untouched optional URL input posts as "", which is absent, not invalid. */
const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((value) => value === '' || /^https?:\/\/\S+\.\S+/.test(value), {
    message: 'Enter a full URL starting with https://',
  })
  .default('')

export const applicationSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  phone: z.string().trim().max(40).default(''),
  country: z.string().trim().min(2, 'Enter your country').max(80),
  cohortYear: z.coerce
    .number()
    .int()
    .min(FIRST_COHORT_YEAR, 'Select the year you were recognised')
    .max(new Date().getFullYear() + 1),
  roleTitle: z.string().trim().max(140).default(''),
  organisation: z.string().trim().max(140).default(''),
  bio: z
    .string()
    .trim()
    .min(BIO_MIN_CHARS, 'Please write about 100 words so we have something to work with')
    .max(BIO_MAX_CHARS, 'Please keep this under about 250 words'),
  impactStory: z
    .string()
    .trim()
    .min(80, 'Tell us in a few sentences what this interview would be about')
    .max(2000),
  linkedinUrl: optionalUrl,
  otherLink: optionalUrl,
  preferredFormat: z.enum(PREFERRED_FORMATS),
  consentRecorded: consentField,
})

export type ApplicationInput = z.infer<typeof applicationSchema>

export const HEADSHOT_MAX_BYTES = 5 * 1024 * 1024

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/**
 * The browser-reported content type is attacker-controlled, so the file is
 * identified from its own leading bytes instead. Mirrors the hardening already
 * applied in app/api/upload-image/route.ts.
 */
export function sniffImageType(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }

  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (bytes.length >= 8 && png.every((byte, index) => bytes[index] === byte)) {
    return 'image/png'
  }

  const riff = [0x52, 0x49, 0x46, 0x46]
  const webp = [0x57, 0x45, 0x42, 0x50]
  if (
    bytes.length >= 12 &&
    riff.every((byte, index) => bytes[index] === byte) &&
    webp.every((byte, index) => bytes[index + 8] === byte)
  ) {
    return 'image/webp'
  }

  return null
}

export function validateHeadshot(
  bytes: Uint8Array,
  size: number,
): { ok: true; extension: string; mime: string } | { ok: false; message: string } {
  if (size > HEADSHOT_MAX_BYTES) {
    return { ok: false, message: 'Your headshot must be 5 MB or smaller.' }
  }

  const mime = sniffImageType(bytes)
  if (!mime) {
    return { ok: false, message: 'Upload a JPG, PNG or WEBP image.' }
  }

  return { ok: true, extension: EXTENSION_BY_MIME[mime], mime }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/interviews/schema.test.ts`
Expected: PASS — 13 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/interviews/schema.ts tests/interviews/schema.test.ts
git commit -m "feat(interviews): validation schema for interview applications"
```

---

### Task 3: Awardee matching and slug generation

**Files:**
- Create: `lib/interviews/matching.ts`
- Test: `tests/interviews/matching.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `type AwardeeCandidate = { id: string; name: string | null; email: string | null; year: number | null }`
  - `type MatchResult = { awardeeId: string | null; verification: 'matched' | 'unmatched' }`
  - `normaliseName(value: string): string`
  - `matchAwardee(input: { email: string; fullName: string; cohortYear: number }, candidates: AwardeeCandidate[]): MatchResult`
  - `slugifyInterview(title: string): string`
  - `uniqueSlug(base: string, taken: string[]): string`

`matchAwardee` is a pure function over candidate rows so it can be tested without a database.

- [ ] **Step 1: Write the failing test**

Create `tests/interviews/matching.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  matchAwardee,
  normaliseName,
  slugifyInterview,
  uniqueSlug,
  type AwardeeCandidate,
} from '@/lib/interviews/matching'

const candidates: AwardeeCandidate[] = [
  { id: 'a1', name: 'Amara Okonkwo', email: 'amara@example.com', year: 2025 },
  { id: 'a2', name: 'Thabo Mokoena', email: 'thabo@example.com', year: 2024 },
  { id: 'a3', name: 'Amara Okonkwo', email: 'amara.o@work.com', year: 2023 },
]

describe('normaliseName', () => {
  it('strips case, accents and punctuation', () => {
    expect(normaliseName('  Amara  Ókonkwo-Jr. ')).toBe('amara okonkwo jr')
  })
})

describe('matchAwardee', () => {
  it('matches on email regardless of case', () => {
    const result = matchAwardee(
      { email: 'AMARA@example.com', fullName: 'Someone Else', cohortYear: 2019 },
      candidates,
    )
    expect(result).toEqual({ awardeeId: 'a1', verification: 'matched' })
  })

  it('falls back to name plus cohort year when the email differs', () => {
    const result = matchAwardee(
      { email: 'personal@gmail.com', fullName: 'amara okonkwo', cohortYear: 2023 },
      candidates,
    )
    expect(result).toEqual({ awardeeId: 'a3', verification: 'matched' })
  })

  it('flags an application it cannot match instead of rejecting it', () => {
    const result = matchAwardee(
      { email: 'nobody@example.com', fullName: 'Unknown Person', cohortYear: 2025 },
      candidates,
    )
    expect(result).toEqual({ awardeeId: null, verification: 'unmatched' })
  })

  it('does not match a shared name when the cohort year does not line up', () => {
    const result = matchAwardee(
      { email: 'personal@gmail.com', fullName: 'Amara Okonkwo', cohortYear: 2018 },
      candidates,
    )
    expect(result.verification).toBe('unmatched')
  })
})

describe('slugifyInterview', () => {
  it('produces a url-safe slug', () => {
    expect(slugifyInterview('"I stopped waiting for permission" — Amara')).toBe(
      'i-stopped-waiting-for-permission-amara',
    )
  })

  it('falls back when a title has no url-safe characters', () => {
    expect(slugifyInterview('???')).toBe('interview')
  })
})

describe('uniqueSlug', () => {
  it('returns the base slug when it is free', () => {
    expect(uniqueSlug('amara-okonkwo', ['thabo-mokoena'])).toBe('amara-okonkwo')
  })

  it('suffixes on collision', () => {
    expect(uniqueSlug('amara-okonkwo', ['amara-okonkwo'])).toBe('amara-okonkwo-2')
  })

  it('keeps counting past an existing suffix', () => {
    expect(uniqueSlug('amara-okonkwo', ['amara-okonkwo', 'amara-okonkwo-2'])).toBe('amara-okonkwo-3')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/interviews/matching.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/interviews/matching"`.

- [ ] **Step 3: Write the implementation**

Create `lib/interviews/matching.ts`:

```ts
export type AwardeeCandidate = {
  id: string
  name: string | null
  email: string | null
  year: number | null
}

export type MatchResult = {
  awardeeId: string | null
  verification: 'matched' | 'unmatched'
}

/**
 * Names arrive typed by hand, so accents, punctuation and stray spacing all
 * differ from the directory copy. Compare on a flattened form.
 */
export function normaliseName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normaliseEmail(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Advisory only. Awardees routinely apply from a personal address that is not
 * the one in the directory, so a miss flags the application for review rather
 * than blocking it.
 */
export function matchAwardee(
  input: { email: string; fullName: string; cohortYear: number },
  candidates: AwardeeCandidate[],
): MatchResult {
  const email = normaliseEmail(input.email)
  const byEmail = candidates.find(
    (candidate) => candidate.email && normaliseEmail(candidate.email) === email,
  )
  if (byEmail) {
    return { awardeeId: byEmail.id, verification: 'matched' }
  }

  const name = normaliseName(input.fullName)
  const byNameAndYear = candidates.find(
    (candidate) =>
      candidate.name &&
      normaliseName(candidate.name) === name &&
      candidate.year === input.cohortYear,
  )
  if (byNameAndYear) {
    return { awardeeId: byNameAndYear.id, verification: 'matched' }
  }

  return { awardeeId: null, verification: 'unmatched' }
}

export function slugifyInterview(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')

  return slug || 'interview'
}

/** Two awardees sharing a name must not collide on slug. */
export function uniqueSlug(base: string, taken: string[]): string {
  const used = new Set(taken)
  if (!used.has(base)) {
    return base
  }

  let suffix = 2
  while (used.has(`${base}-${suffix}`)) {
    suffix += 1
  }

  return `${base}-${suffix}`
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/interviews/matching.test.ts`
Expected: PASS — 10 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/interviews/matching.ts tests/interviews/matching.test.ts
git commit -m "feat(interviews): awardee matching and slug generation"
```

---

### Task 4: Row types and view mappers

**Files:**
- Create: `lib/interviews/mappers.ts`
- Test: `tests/interviews/mappers.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `type InterviewRow` — the shape selected from `public.interviews`
  - `type InterviewCardView = { id, slug, title, awardeeName, awardeeSlug: string | null, videoId: string | null, country, cohortYear, thumbnailUrl, durationLabel, format, pullQuote, summary }`
  - `youtubeThumbnail(videoId: string): string`
  - `formatDuration(seconds: number | null): string | null`
  - `parseYouTubeId(input: string): string | null`
  - `toCardView(row: InterviewRow): InterviewCardView`
  - `pickFeatured(rows: InterviewRow[]): InterviewRow | null`

- [ ] **Step 1: Write the failing test**

Create `tests/interviews/mappers.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  formatDuration,
  parseYouTubeId,
  pickFeatured,
  toCardView,
  youtubeThumbnail,
  type InterviewRow,
} from '@/lib/interviews/mappers'

const baseRow: InterviewRow = {
  id: 'i1',
  slug: 'amara-okonkwo',
  title: 'I stopped waiting for permission',
  format: 'video',
  video_id: 'dQw4w9WgXcQ',
  duration_seconds: 1104,
  thumbnail_url: null,
  pull_quote: 'I stopped waiting for permission.',
  summary: 'Amara on building a clinic network.',
  body: '<p>Hello</p>',
  awardee_id: 'a1',
  awardee_name: 'Amara Okonkwo',
  country: 'Nigeria',
  cohort_year: 2025,
  topics: ['health'],
  featured: false,
  status: 'published',
  published_at: '2026-07-01T00:00:00.000Z',
  sort_order: 0,
  application_id: null,
  awardee: { slug: 'amara-okonkwo' },
}

describe('formatDuration', () => {
  it('formats minutes and seconds', () => {
    expect(formatDuration(1104)).toBe('18:24')
  })

  it('formats past an hour', () => {
    expect(formatDuration(3731)).toBe('1:02:11')
  })

  it('returns null when the duration is unknown', () => {
    expect(formatDuration(null)).toBeNull()
  })
})

describe('youtubeThumbnail', () => {
  it('builds a thumbnail url from a video id', () => {
    expect(youtubeThumbnail('dQw4w9WgXcQ')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
  })
})

describe('parseYouTubeId', () => {
  it('reads a watch url', () => {
    expect(parseYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s')).toBe('dQw4w9WgXcQ')
  })

  it('reads a short url', () => {
    expect(parseYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('reads an embed url', () => {
    expect(parseYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('accepts a bare id', () => {
    expect(parseYouTubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('rejects a non-youtube url', () => {
    expect(parseYouTubeId('https://vimeo.com/12345')).toBeNull()
  })
})

describe('toCardView', () => {
  it('falls back to the youtube thumbnail when none is stored', () => {
    expect(toCardView(baseRow).thumbnailUrl).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    )
  })

  it('prefers an explicit thumbnail override', () => {
    const view = toCardView({ ...baseRow, thumbnail_url: 'https://cdn.example.com/a.jpg' })
    expect(view.thumbnailUrl).toBe('https://cdn.example.com/a.jpg')
  })

  it('handles a written interview with no video', () => {
    const view = toCardView({
      ...baseRow,
      format: 'written',
      video_id: null,
      duration_seconds: null,
      thumbnail_url: null,
    })
    expect(view.format).toBe('written')
    expect(view.thumbnailUrl).toBeNull()
    expect(view.durationLabel).toBeNull()
  })

  it('exposes the linked awardee slug for profile links', () => {
    expect(toCardView(baseRow).awardeeSlug).toBe('amara-okonkwo')
  })

  it('carries the raw video id through for the player', () => {
    expect(toCardView(baseRow).videoId).toBe('dQw4w9WgXcQ')
  })
})

describe('pickFeatured', () => {
  it('prefers the flagged interview', () => {
    const rows = [baseRow, { ...baseRow, id: 'i2', slug: 'b', featured: true }]
    expect(pickFeatured(rows)?.id).toBe('i2')
  })

  it('falls back to the first row when nothing is flagged', () => {
    expect(pickFeatured([baseRow])?.id).toBe('i1')
  })

  it('returns null when there is nothing published', () => {
    expect(pickFeatured([])).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/interviews/mappers.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/interviews/mappers"`.

- [ ] **Step 3: Write the implementation**

Create `lib/interviews/mappers.ts`:

```ts
export type InterviewFormat = 'video' | 'written'
export type InterviewStatus = 'draft' | 'published'

export type InterviewRow = {
  id: string
  slug: string
  title: string
  format: InterviewFormat
  video_id: string | null
  duration_seconds: number | null
  thumbnail_url: string | null
  pull_quote: string | null
  summary: string | null
  body: string | null
  awardee_id: string | null
  awardee_name: string
  country: string | null
  cohort_year: number | null
  topics: string[] | null
  featured: boolean
  status: InterviewStatus
  published_at: string | null
  sort_order: number
  application_id: string | null
  /** Joined from public.awardees so cards can link to the profile. */
  awardee?: { slug: string | null } | null
}

export type InterviewCardView = {
  id: string
  slug: string
  title: string
  awardeeName: string
  awardeeSlug: string | null
  videoId: string | null
  country: string | null
  cohortYear: number | null
  thumbnailUrl: string | null
  durationLabel: string | null
  format: InterviewFormat
  pullQuote: string | null
  summary: string | null
}

export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

export function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) {
    return null
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60

  const paddedSeconds = String(remainder).padStart(2, '0')
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${paddedSeconds}`
  }

  return `${minutes}:${paddedSeconds}`
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

/**
 * Admins paste whatever the YouTube share button gave them. Accept every shape
 * it produces, and reject anything else before it becomes an empty player.
 */
export function parseYouTubeId(input: string): string | null {
  const value = input.trim()
  if (!value) {
    return null
  }

  if (YOUTUBE_ID.test(value)) {
    return value
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./, '')

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1)
    return YOUTUBE_ID.test(id) ? id : null
  }

  if (host !== 'youtube.com' && host !== 'youtube-nocookie.com' && host !== 'm.youtube.com') {
    return null
  }

  const param = url.searchParams.get('v')
  if (param && YOUTUBE_ID.test(param)) {
    return param
  }

  const match = url.pathname.match(/^\/(embed|shorts|v)\/([A-Za-z0-9_-]{11})/)
  return match ? match[2] : null
}

export function toCardView(row: InterviewRow): InterviewCardView {
  const thumbnailUrl =
    row.thumbnail_url || (row.video_id ? youtubeThumbnail(row.video_id) : null)

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    awardeeName: row.awardee_name,
    awardeeSlug: row.awardee?.slug ?? null,
    videoId: row.video_id,
    country: row.country,
    cohortYear: row.cohort_year,
    thumbnailUrl,
    durationLabel: formatDuration(row.duration_seconds),
    format: row.format,
    pullQuote: row.pull_quote,
    summary: row.summary,
  }
}

export function pickFeatured(rows: InterviewRow[]): InterviewRow | null {
  return rows.find((row) => row.featured) ?? rows[0] ?? null
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/interviews/mappers.test.ts`
Expected: PASS — 15 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/interviews/mappers.ts tests/interviews/mappers.test.ts
git commit -m "feat(interviews): row types and view mappers"
```

---

### Task 5: Supabase queries

**Files:**
- Create: `lib/interviews/queries.ts`

**Interfaces:**
- Consumes: `InterviewRow` from `lib/interviews/mappers.ts`; `AwardeeCandidate` from `lib/interviews/matching.ts`; `createAdminClient` from `lib/supabase/server`.
- Produces:
  - `getPublishedInterviews(): Promise<InterviewRow[]>`
  - `getInterviewBySlug(slug: string): Promise<InterviewRow | null>`
  - `getPublishedSlugs(): Promise<Array<{ slug: string; published_at: string | null }>>`
  - `getAwardeeCandidates(email: string, fullName: string): Promise<AwardeeCandidate[]>`
  - `findRecentPendingApplication(email: string): Promise<{ id: string } | null>`
  - `INTERVIEW_SELECT: string`

Every read swallows its error and returns an empty result. A fresh environment with no migration applied must render the page, not a 500.

- [ ] **Step 1: Write the implementation**

Create `lib/interviews/queries.ts`:

```ts
import { createAdminClient } from '@/lib/supabase/server'
import type { AwardeeCandidate } from '@/lib/interviews/matching'
import type { InterviewRow } from '@/lib/interviews/mappers'

export const INTERVIEW_SELECT = `
  id, slug, title, format, video_id, duration_seconds, thumbnail_url,
  pull_quote, summary, body, awardee_id, awardee_name, country, cohort_year,
  topics, featured, status, published_at, sort_order, application_id,
  awardee:awardees ( slug )
`

/**
 * Reads never throw. A missing table (environment without the migration) or an
 * unreachable Supabase must degrade to "no interviews yet" so the apply funnel
 * on /interviews keeps working. Same defensive posture as app/api/youtube/route.ts.
 */
export async function getPublishedInterviews(): Promise<InterviewRow[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('interviews')
      .select(INTERVIEW_SELECT)
      .eq('status', 'published')
      .order('sort_order', { ascending: true })
      .order('published_at', { ascending: false })

    if (error) {
      console.error('[interviews] getPublishedInterviews failed:', error.message)
      return []
    }

    return (data ?? []) as unknown as InterviewRow[]
  } catch (error) {
    console.error('[interviews] getPublishedInterviews threw:', error)
    return []
  }
}

export async function getInterviewBySlug(slug: string): Promise<InterviewRow | null> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('interviews')
      .select(INTERVIEW_SELECT)
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()

    if (error) {
      console.error('[interviews] getInterviewBySlug failed:', error.message)
      return null
    }

    return (data as unknown as InterviewRow) ?? null
  } catch (error) {
    console.error('[interviews] getInterviewBySlug threw:', error)
    return null
  }
}

export async function getPublishedSlugs(): Promise<Array<{ slug: string; published_at: string | null }>> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('interviews')
      .select('slug, published_at')
      .eq('status', 'published')

    if (error) {
      console.error('[interviews] getPublishedSlugs failed:', error.message)
      return []
    }

    return data ?? []
  } catch (error) {
    console.error('[interviews] getPublishedSlugs threw:', error)
    return []
  }
}

/**
 * Narrow the directory to plausible matches before matching in memory: an exact
 * email hit, or anyone sharing the applicant's surname. Pulling the whole
 * directory on every submission would not scale, and matching in SQL would make
 * the rules untestable.
 */
export async function getAwardeeCandidates(email: string, fullName: string): Promise<AwardeeCandidate[]> {
  try {
    const supabase = createAdminClient()
    const surname = fullName.trim().split(/\s+/).slice(-1)[0] ?? ''

    const { data, error } = await supabase
      .from('awardees')
      .select('id, name, email, year')
      .or(`email.ilike.${email},name.ilike.%${surname}%`)
      .limit(200)

    if (error) {
      console.error('[interviews] getAwardeeCandidates failed:', error.message)
      return []
    }

    return (data ?? []) as AwardeeCandidate[]
  } catch (error) {
    console.error('[interviews] getAwardeeCandidates threw:', error)
    return []
  }
}

const DUPLICATE_WINDOW_DAYS = 30

/** Stops a double-tapped submit button, and a reapplication while one is open. */
export async function findRecentPendingApplication(email: string): Promise<{ id: string } | null> {
  try {
    const supabase = createAdminClient()
    const since = new Date(Date.now() - DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('interview_applications')
      .select('id')
      .ilike('email', email)
      .eq('status', 'pending')
      .gte('created_at', since)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[interviews] findRecentPendingApplication failed:', error.message)
      return null
    }

    return data ?? null
  } catch (error) {
    console.error('[interviews] findRecentPendingApplication threw:', error)
    return null
  }
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/interviews/queries.ts
git commit -m "feat(interviews): supabase queries with defensive fallbacks"
```

---

### Task 6: Public application endpoint

**Files:**
- Create: `app/api/interviews/apply/route.ts`
- Create: `lib/interviews/emails.ts`

**Interfaces:**
- Consumes: `applicationSchema`, `validateHeadshot` (Task 2); `matchAwardee` (Task 3); `getAwardeeCandidates`, `findRecentPendingApplication` (Task 5); `sendEmail` from `lib/email/brevo`; `checkRateLimit`, `createRateLimitResponse`, `getClientIdentifier`, `RATE_LIMITS` from `lib/rate-limit`; `SITE_URL` from `lib/site`.
- Produces: `POST /api/interviews/apply` accepting `multipart/form-data`.
  - `200 { success: true, duplicate?: true, message: string }`
  - `400 { success: false, message: string, fieldErrors?: Record<string, string> }`
  - `429` from `createRateLimitResponse`
  - `500 { success: false, message: string }`
  - `lib/interviews/emails.ts` exports `applicationAdminEmail(...)` and `applicationApplicantEmail(...)`, each returning `{ subject: string; html: string }`.

Order of operations is load-bearing: rate limit → Turnstile → validate → duplicate guard → match → insert → upload → email.

- [ ] **Step 1: Write the email builders**

Create `lib/interviews/emails.ts`:

```ts
import { SITE_URL } from '@/lib/site'

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

type AdminEmailInput = {
  fullName: string
  email: string
  phone: string
  country: string
  cohortYear: number
  roleTitle: string
  organisation: string
  bio: string
  impactStory: string
  linkedinUrl: string
  otherLink: string
  preferredFormat: string
  verification: 'matched' | 'unmatched'
  hasHeadshot: boolean
}

const row = (label: string, value: string) => `
  <tr>
    <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.12em;white-space:nowrap;">${escapeHtml(label)}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;">${escapeHtml(value || 'Not provided')}</td>
  </tr>
`

export function applicationAdminEmail(input: AdminEmailInput): { subject: string; html: string } {
  const badge =
    input.verification === 'matched'
      ? '<span style="background:#dcfce7;color:#166534;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;">Matched to directory</span>'
      : '<span style="background:#fef3c7;color:#92400e;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;">Needs verification</span>'

  return {
    subject: `Interview application — ${input.fullName} (${input.cohortYear})`,
    html: `
      <html><body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#111827;">
        <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:24px;overflow:hidden;">
          <div style="padding:24px;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;">
            <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:0.28em;text-transform:uppercase;opacity:0.9;">Impact Interviews</p>
            <h1 style="margin:0;font-size:24px;line-height:1.2;">${escapeHtml(input.fullName)}</h1>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 18px 0;">${badge}</p>
            <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
              <tbody>
                ${row('Email', input.email)}
                ${row('Phone', input.phone)}
                ${row('Country', input.country)}
                ${row('Cohort', String(input.cohortYear))}
                ${row('Role', input.roleTitle)}
                ${row('Organisation', input.organisation)}
                ${row('Preferred format', input.preferredFormat)}
                ${row('LinkedIn', input.linkedinUrl)}
                ${row('Other link', input.otherLink)}
                ${row('Headshot', input.hasHeadshot ? 'Uploaded' : 'Not provided')}
                ${row('Bio', input.bio)}
                ${row('Story', input.impactStory)}
              </tbody>
            </table>
            <p style="margin:20px 0 0 0;">
              <a href="${SITE_URL}/admin/interviews?tab=applications"
                 style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;font-size:14px;">
                Open the application queue
              </a>
            </p>
          </div>
        </div>
      </body></html>
    `,
  }
}

export function applicationApplicantEmail(fullName: string): { subject: string; html: string } {
  const firstName = fullName.trim().split(/\s+/)[0] || 'there'

  return {
    subject: 'We received your Impact Interviews application',
    html: `
      <html><body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#111827;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:24px;overflow:hidden;">
          <div style="padding:24px;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;">
            <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:0.28em;text-transform:uppercase;opacity:0.9;">Impact Interviews</p>
            <h1 style="margin:0;font-size:24px;line-height:1.2;">Thanks, ${escapeHtml(firstName)}</h1>
          </div>
          <div style="padding:24px;font-size:15px;line-height:1.8;color:#374151;">
            <p style="margin:0 0 16px 0;">Your application to be featured in Impact Interviews is in. Here is what happens next:</p>
            <ol style="margin:0 0 16px 0;padding-left:20px;">
              <li>Our team reviews applications in batches, roughly every two weeks.</li>
              <li>If your story is a fit, we email you to agree a recording slot.</li>
              <li>Interviews run about 30 minutes and are recorded remotely.</li>
            </ol>
            <p style="margin:0 0 16px 0;">You do not need to do anything else for now. If your circumstances change, reply to this email and let us know.</p>
            <p style="margin:0;">— Top100 Africa Future Leaders</p>
          </div>
        </div>
      </body></html>
    `,
  }
}
```

- [ ] **Step 2: Write the route**

Create `app/api/interviews/apply/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { ZodError } from 'zod'

import { applicationSchema, validateHeadshot } from '@/lib/interviews/schema'
import { applicationAdminEmail, applicationApplicantEmail } from '@/lib/interviews/emails'
import { matchAwardee } from '@/lib/interviews/matching'
import { findRecentPendingApplication, getAwardeeCandidates } from '@/lib/interviews/queries'
import { sendEmail } from '@/lib/email/brevo'
import { createAdminClient } from '@/lib/supabase/server'
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIdentifier,
  RATE_LIMITS,
} from '@/lib/rate-limit'

const HEADSHOT_BUCKET = 'interview-applications'

async function verifyTurnstile(token: string | null): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  // Matches app/api/verify-captcha/route.ts: unconfigured is a no-op in dev.
  if (!secretKey) {
    return process.env.NODE_ENV === 'development'
  }

  if (!token) {
    return false
  }

  try {
    const body = new URLSearchParams()
    body.append('secret', secretKey)
    body.append('response', token)

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    })

    const data = (await response.json()) as { success?: boolean }
    return data.success === true
  } catch (error) {
    console.error('[interviews/apply] turnstile verification failed:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  const identifier = getClientIdentifier(request.headers)
  const rateLimit = checkRateLimit({
    ...RATE_LIMITS.UPLOAD,
    identifier: `interview-apply:${identifier}`,
  })

  if (!rateLimit.success) {
    return createRateLimitResponse(rateLimit, 'Too many submissions. Please try again later.')
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json(
      { success: false, message: 'We could not read your submission. Please try again.' },
      { status: 400 },
    )
  }

  const captchaOk = await verifyTurnstile((formData.get('captchaToken') as string) || null)
  if (!captchaOk) {
    return Response.json(
      { success: false, message: 'Please complete the verification challenge and try again.' },
      { status: 400 },
    )
  }

  const raw = Object.fromEntries(
    Array.from(formData.entries()).filter(([, value]) => typeof value === 'string'),
  )

  let input
  try {
    input = applicationSchema.parse(raw)
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of error.issues) {
        const key = String(issue.path[0] ?? 'form')
        if (!fieldErrors[key]) {
          fieldErrors[key] = issue.message
        }
      }

      return Response.json(
        { success: false, message: 'Please check the highlighted fields.', fieldErrors },
        { status: 400 },
      )
    }

    throw error
  }

  const duplicate = await findRecentPendingApplication(input.email)
  if (duplicate) {
    return Response.json({
      success: true,
      duplicate: true,
      message: 'We already have an application from you and it is still under review.',
    })
  }

  const candidates = await getAwardeeCandidates(input.email, input.fullName)
  const match = matchAwardee(
    { email: input.email, fullName: input.fullName, cohortYear: input.cohortYear },
    candidates,
  )

  const supabase = createAdminClient()

  const { data: application, error: insertError } = await supabase
    .from('interview_applications')
    .insert({
      full_name: input.fullName,
      email: input.email,
      phone: input.phone || null,
      country: input.country,
      cohort_year: input.cohortYear,
      role_title: input.roleTitle || null,
      organisation: input.organisation || null,
      bio: input.bio,
      impact_story: input.impactStory,
      linkedin_url: input.linkedinUrl || null,
      other_link: input.otherLink || null,
      preferred_format: input.preferredFormat,
      matched_awardee_id: match.awardeeId,
      verification: match.verification,
      consent_recorded: input.consentRecorded,
      consent_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertError || !application) {
    console.error('[interviews/apply] insert failed:', insertError?.message)
    return Response.json(
      { success: false, message: 'We could not save your application. Please try again.' },
      { status: 500 },
    )
  }

  // The headshot is a nice-to-have. Losing the applicant because their photo
  // failed to upload would be a far worse outcome, so this never fails the request.
  let hasHeadshot = false
  const headshot = formData.get('headshot')
  if (headshot instanceof File && headshot.size > 0) {
    try {
      const buffer = new Uint8Array(await headshot.arrayBuffer())
      const check = validateHeadshot(buffer, headshot.size)

      if (check.ok) {
        // The client filename never reaches the storage path.
        const path = `${application.id}/headshot.${check.extension}`
        const { error: uploadError } = await supabase.storage
          .from(HEADSHOT_BUCKET)
          .upload(path, buffer, { contentType: check.mime, upsert: true })

        if (uploadError) {
          console.error('[interviews/apply] headshot upload failed:', uploadError.message)
        } else {
          hasHeadshot = true
          await supabase
            .from('interview_applications')
            .update({ headshot_path: path })
            .eq('id', application.id)
        }
      } else {
        console.warn('[interviews/apply] headshot rejected:', check.message)
      }
    } catch (error) {
      console.error('[interviews/apply] headshot processing threw:', error)
    }
  }

  const adminAddress = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.BREVO_SENDER_EMAIL
  const adminEmail = applicationAdminEmail({
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    country: input.country,
    cohortYear: input.cohortYear,
    roleTitle: input.roleTitle,
    organisation: input.organisation,
    bio: input.bio,
    impactStory: input.impactStory,
    linkedinUrl: input.linkedinUrl,
    otherLink: input.otherLink,
    preferredFormat: input.preferredFormat,
    verification: match.verification,
    hasHeadshot,
  })

  const applicantEmail = applicationApplicantEmail(input.fullName)

  // Email delivery must not decide whether the application counts as received.
  await Promise.allSettled([
    adminAddress
      ? sendEmail({ to: adminAddress, subject: adminEmail.subject, html: adminEmail.html })
      : Promise.resolve(false),
    sendEmail({ to: input.email, subject: applicantEmail.subject, html: applicantEmail.html }),
  ])

  return Response.json({
    success: true,
    message: 'Your application is in. Check your inbox for a confirmation.',
  })
}
```

- [ ] **Step 3: Confirm the admin email env var exists**

Run: `grep -n "ADMIN_NOTIFICATION_EMAIL\|BREVO_SENDER_EMAIL" .env.local`
Expected: at least `BREVO_SENDER_EMAIL`. If `ADMIN_NOTIFICATION_EMAIL` is absent the route falls back to the sender address, which is correct behaviour — no change needed.

- [ ] **Step 4: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/interviews/apply/route.ts lib/interviews/emails.ts
git commit -m "feat(interviews): public application endpoint with matching, upload and emails"
```

---

### Task 7: Public page components

**Files:**
- Create: `app/interviews/_components/VideoFacade.tsx`
- Create: `app/interviews/_components/InterviewCard.tsx`
- Create: `app/interviews/_components/InterviewGrid.tsx`
- Create: `app/interviews/_components/InterviewsHero.tsx`
- Create: `app/interviews/_components/FeaturedInterview.tsx`
- Create: `app/interviews/_components/EligibilityBands.tsx`
- Create: `app/interviews/_components/InterviewsFaq.tsx`

**Interfaces:**
- Consumes: `InterviewCardView`, `toCardView` (Task 4).
- Produces:
  - `<VideoFacade videoId title thumbnailUrl className? />` — client component
  - `<InterviewCard interview={InterviewCardView} />`
  - `<InterviewGrid interviews={InterviewCardView[]} />` — client component owning the filter chips and the empty state
  - `<InterviewsHero />`, `<FeaturedInterview interview={InterviewCardView} />`, `<EligibilityBands />`, `<InterviewsFaq />`

- [ ] **Step 1: Write the video facade**

Create `app/interviews/_components/VideoFacade.tsx`:

```tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play } from 'lucide-react'

import { cn } from '@/lib/utils'

type VideoFacadeProps = {
  videoId: string
  title: string
  thumbnailUrl: string | null
  className?: string
}

/**
 * Renders a thumbnail and only mounts the YouTube iframe once the user asks for
 * it. A grid of live embeds pulls in the player bundle for every card and makes
 * the page crawl.
 */
export default function VideoFacade({ videoId, title, thumbnailUrl, className }: VideoFacadeProps) {
  const [playing, setPlaying] = useState(false)

  return (
    <div
      className={cn(
        'relative aspect-video w-full overflow-hidden rounded-[22px] bg-slate-900',
        className,
      )}
    >
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play interview: ${title}`}
          className="group absolute inset-0 h-full w-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-400"
        >
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 720px"
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : null}
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow-lg transition group-hover:scale-110">
            <Play className="ml-1 h-6 w-6 fill-orange-600 text-orange-600" aria-hidden="true" />
          </span>
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write the card**

Create `app/interviews/_components/InterviewCard.tsx`:

```tsx
import Image from 'next/image'
import Link from 'next/link'
import { FileText, Play } from 'lucide-react'

import type { InterviewCardView } from '@/lib/interviews/mappers'

export default function InterviewCard({ interview }: { interview: InterviewCardView }) {
  const meta = [interview.country, interview.cohortYear ? `${interview.cohortYear} cohort` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <Link
      href={`/interviews/${interview.slug}`}
      className="group flex flex-col overflow-hidden rounded-[22px] border border-orange-100 bg-white transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_18px_40px_-24px_rgba(249,115,22,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
        {interview.thumbnailUrl ? (
          <Image
            src={interview.thumbnailUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-500" />
        )}

        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-orange-700">
          {interview.format === 'written' ? (
            <>
              <FileText className="h-3 w-3" aria-hidden="true" /> Written
            </>
          ) : (
            <>
              <Play className="h-3 w-3 fill-orange-700" aria-hidden="true" /> Video
            </>
          )}
        </span>

        {interview.durationLabel ? (
          <span className="absolute bottom-3 right-3 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white">
            {interview.durationLabel}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-5">
        <h3 className="text-base font-semibold leading-snug text-slate-900 group-hover:text-orange-700">
          {interview.title}
        </h3>
        <p className="text-sm font-semibold text-orange-600">{interview.awardeeName}</p>
        {meta ? <p className="text-xs text-slate-500">{meta}</p> : null}
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Write the grid with filters and empty state**

Create `app/interviews/_components/InterviewGrid.tsx`:

```tsx
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import type { InterviewCardView } from '@/lib/interviews/mappers'
import InterviewCard from './InterviewCard'

type FormatFilter = 'all' | 'video' | 'written'

export default function InterviewGrid({ interviews }: { interviews: InterviewCardView[] }) {
  const [year, setYear] = useState<number | 'all'>('all')
  const [format, setFormat] = useState<FormatFilter>('all')

  const years = useMemo(
    () =>
      Array.from(new Set(interviews.map((item) => item.cohortYear).filter((value): value is number => Boolean(value))))
        .sort((a, b) => b - a),
    [interviews],
  )

  const visible = useMemo(
    () =>
      interviews.filter(
        (item) =>
          (year === 'all' || item.cohortYear === year) &&
          (format === 'all' || item.format === format),
      ),
    [interviews, year, format],
  )

  // The series launches empty. A bare grid reads as a broken page, so the
  // absence of interviews is stated plainly and pushed at the apply form.
  if (interviews.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-orange-200 bg-[#fffaf4] px-6 py-16 text-center">
        <p className="text-lg font-semibold text-slate-900">The first season is being recorded</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
          Interviews go live here as they are published. Awardees can apply now to be part of the
          first set.
        </p>
        <Link
          href="#apply"
          className="mt-6 inline-flex items-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95"
        >
          Apply to be interviewed
        </Link>
      </div>
    )
  }

  const chip = (active: boolean) =>
    cn(
      'rounded-full border px-4 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2',
      active
        ? 'border-orange-500 bg-orange-500 text-white'
        : 'border-orange-100 bg-white text-slate-600 hover:border-orange-300 hover:text-orange-700',
    )

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setYear('all')} className={chip(year === 'all')}>
          All years
        </button>
        {years.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setYear(value)}
            className={chip(year === value)}
          >
            {value}
          </button>
        ))}

        <span className="mx-1 hidden h-5 w-px bg-orange-100 sm:block" />

        {(['all', 'video', 'written'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFormat(value)}
            className={chip(format === value)}
          >
            {value === 'all' ? 'All formats' : value === 'video' ? 'Video' : 'Written Q&A'}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-[22px] border border-orange-100 bg-white px-6 py-12 text-center text-sm text-slate-600">
          No interviews match those filters yet.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((interview) => (
            <InterviewCard key={interview.id} interview={interview} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Write the hero, featured block, eligibility bands and FAQ**

Create `app/interviews/_components/InterviewsHero.tsx`:

```tsx
import Link from 'next/link'
import { ArrowRight, Play } from 'lucide-react'

export default function InterviewsHero() {
  return (
    <section className="relative overflow-hidden rounded-[32px] bg-[#05060f] px-6 py-16 text-center sm:px-12 sm:py-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 0%, rgba(249,115,22,0.35) 0%, rgba(5,6,15,0) 70%), radial-gradient(40% 40% at 85% 90%, rgba(245,158,11,0.22) 0%, rgba(5,6,15,0) 70%)',
        }}
      />
      <div className="relative mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-300">
          Impact Interviews
        </p>
        <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-5xl">
          The stories behind the Top 100
        </h1>
        <p className="mt-5 text-base leading-relaxed text-white/72 sm:text-lg">
          Awardees on the work they are doing, the setbacks that shaped it, and the Africa they are
          building. Recorded in their own words.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="#apply"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-7 py-3.5 text-sm font-semibold text-white transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060f] sm:w-auto"
          >
            Apply to be interviewed
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="#watch"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:w-auto"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            Watch the latest
          </Link>
        </div>
      </div>
    </section>
  )
}
```

Create `app/interviews/_components/FeaturedInterview.tsx`:

```tsx
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import type { InterviewCardView } from '@/lib/interviews/mappers'
import VideoFacade from './VideoFacade'

export default function FeaturedInterview({ interview }: { interview: InterviewCardView }) {
  const meta = [interview.country, interview.cohortYear ? `${interview.cohortYear} cohort` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <section id="watch" className="scroll-mt-24">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">
        Latest interview
      </p>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
        {interview.format === 'video' && interview.videoId ? (
          <VideoFacade
            videoId={interview.videoId}
            title={interview.title}
            thumbnailUrl={interview.thumbnailUrl}
          />
        ) : null}

        <div>
          {interview.pullQuote ? (
            <blockquote className="border-l-4 border-orange-400 pl-5 text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">
              &ldquo;{interview.pullQuote}&rdquo;
            </blockquote>
          ) : (
            <h2 className="text-2xl font-bold text-slate-900">{interview.title}</h2>
          )}

          <p className="mt-5 text-base font-semibold text-orange-600">{interview.awardeeName}</p>
          {meta ? <p className="mt-1 text-sm text-slate-500">{meta}</p> : null}

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={`/interviews/${interview.slug}`}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95"
            >
              Watch full interview
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            {interview.awardeeSlug ? (
              <Link
                href={`/awardees/${interview.awardeeSlug}`}
                className="inline-flex items-center rounded-full border border-orange-200 px-6 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
              >
                View profile
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
```

Create `app/interviews/_components/EligibilityBands.tsx`:

```tsx
import { Check, Sparkles } from 'lucide-react'

const LOOKING_FOR = [
  'A Top100 Africa Future Leaders awardee, from any cohort',
  'Work with measurable impact since the award — a venture, a project, a body of research',
  'A story with a turning point in it, not just a list of achievements',
  'Willing to sit for a recorded interview of about 30 minutes',
]

const WHY_APPLY = [
  'Your story reaches the full Top100 network, our magazine and our social platforms',
  'A permanent, shareable profile piece you can send to funders and partners',
  'Connection with awardees working on adjacent problems across 31 countries',
  'A stronger, more specific picture of what African leadership actually looks like',
]

export default function EligibilityBands() {
  return (
    <section className="grid gap-6 md:grid-cols-2">
      <div className="rounded-[28px] border border-orange-100 bg-[#fffaf4] p-8">
        <h2 className="text-xl font-bold text-slate-900">Who we&rsquo;re looking for</h2>
        <ul className="mt-5 space-y-3">
          {LOOKING_FOR.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-600">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-[28px] border border-orange-100 bg-white p-8">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <Sparkles className="h-5 w-5 text-orange-500" aria-hidden="true" />
          Why apply
        </h2>
        <ul className="mt-5 space-y-3">
          {WHY_APPLY.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-600">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
```

Create `app/interviews/_components/InterviewsFaq.tsx`:

```tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const FAQS = [
  {
    q: 'How long does the interview take?',
    a: 'About 30 minutes of recording, plus a short call beforehand so you know the questions. We edit it down to roughly 15–20 minutes.',
  },
  {
    q: 'Where is it recorded?',
    a: 'Remotely, over video. If you are at one of our summits or festivals we may record in person instead — we will tell you if that option is open.',
  },
  {
    q: 'What equipment do I need?',
    a: 'A laptop or phone with a working camera, a quiet room, and a stable connection. If bandwidth is a problem, choose the written Q&A format on the form instead.',
  },
  {
    q: 'When will I hear back?',
    a: 'We review applications in batches roughly every two weeks. You will hear from us either way.',
  },
  {
    q: 'Can I apply if I was recognised years ago?',
    a: 'Yes. Every cohort is eligible, and we are especially interested in what has happened since.',
  },
]

export default function InterviewsFaq() {
  return (
    <section>
      <h2 className="text-2xl font-bold text-slate-900">Questions, answered</h2>
      <Accordion type="single" collapsible className="mt-6">
        {FAQS.map((faq) => (
          <AccordionItem key={faq.q} value={faq.q} className="border-orange-100">
            <AccordionTrigger className="text-left text-base font-semibold text-slate-900 hover:text-orange-700">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-slate-600">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
```

- [ ] **Step 5: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add app/interviews/_components
git commit -m "feat(interviews): public page components"
```

---

### Task 8: Application form

**Files:**
- Create: `app/interviews/_components/ApplyForm.tsx`

**Interfaces:**
- Consumes: `POST /api/interviews/apply` (Task 6); `TurnstileCaptcha` from `components/ui/turnstile`; `LegalConsent` from `app/components/LegalConsent`; `PREFERRED_FORMATS` from `lib/interviews/schema`.
- Produces: `<ApplyForm defaults={{ fullName?: string; email?: string; country?: string }} />` — client component rendering the `#apply` section.

- [ ] **Step 1: Write the form**

Create `app/interviews/_components/ApplyForm.tsx`:

```tsx
'use client'

import { useRef, useState } from 'react'
import { CheckCircle2, Loader2, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TurnstileCaptcha } from '@/components/ui/turnstile'
import LegalConsent from '@/app/components/LegalConsent'
import { cn } from '@/lib/utils'

type ApplyFormProps = {
  defaults?: { fullName?: string; email?: string; country?: string }
}

const CURRENT_YEAR = new Date().getFullYear()
const COHORT_YEARS = Array.from({ length: CURRENT_YEAR - 2014 }, (_, index) => CURRENT_YEAR - index)

export default function ApplyForm({ defaults }: ApplyFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [captchaToken, setCaptchaToken] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('loading')
    setMessage('')
    setFieldErrors({})

    const formData = new FormData(event.currentTarget)
    if (captchaToken) {
      formData.set('captchaToken', captchaToken)
    }

    try {
      const response = await fetch('/api/interviews/apply', { method: 'POST', body: formData })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setStatus('idle')
        setFieldErrors(data.fieldErrors ?? {})
        // The form keeps everything the applicant typed — it is never reset here.
        setMessage(data.message || 'Something went wrong. Please try again.')
        return
      }

      setStatus('success')
      setMessage(data.message)
      formRef.current?.reset()
    } catch {
      setStatus('idle')
      setMessage('We could not reach the server. Check your connection and try again.')
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-[28px] border border-orange-100 bg-[#fffaf4] px-6 py-14 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-orange-600" aria-hidden="true" />
        <h3 className="mt-4 text-xl font-bold text-slate-900">Application received</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">{message}</p>
      </div>
    )
  }

  const errorFor = (name: string) => fieldErrors[name]

  const fieldClass = (name: string) =>
    cn('mt-1.5', errorFor(name) && 'border-red-400 focus-visible:ring-red-400')

  const ErrorText = ({ name }: { name: string }) =>
    errorFor(name) ? <p className="mt-1 text-xs text-red-600">{errorFor(name)}</p> : null

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="rounded-[28px] border border-orange-100 bg-white p-6 sm:p-9"
      noValidate
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="fullName">Full name *</Label>
          <Input id="fullName" name="fullName" required defaultValue={defaults?.fullName} className={fieldClass('fullName')} />
          <ErrorText name="fullName" />
        </div>

        <div>
          <Label htmlFor="email">Email *</Label>
          <Input id="email" name="email" type="email" required defaultValue={defaults?.email} className={fieldClass('email')} />
          <ErrorText name="email" />
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" className="mt-1.5" />
        </div>

        <div>
          <Label htmlFor="country">Country *</Label>
          <Input id="country" name="country" required defaultValue={defaults?.country} className={fieldClass('country')} />
          <ErrorText name="country" />
        </div>

        <div>
          <Label htmlFor="cohortYear">Year you were recognised *</Label>
          <select
            id="cohortYear"
            name="cohortYear"
            required
            defaultValue=""
            className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            <option value="" disabled>
              Select a year
            </option>
            {COHORT_YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <ErrorText name="cohortYear" />
        </div>

        <div>
          <Label htmlFor="roleTitle">Current role or title</Label>
          <Input id="roleTitle" name="roleTitle" className="mt-1.5" />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="organisation">Organisation</Label>
          <Input id="organisation" name="organisation" className="mt-1.5" />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="bio">Short bio (about 100 words) *</Label>
          <Textarea id="bio" name="bio" rows={5} required className={fieldClass('bio')} />
          <ErrorText name="bio" />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="impactStory">What should this interview be about? *</Label>
          <Textarea
            id="impactStory"
            name="impactStory"
            rows={5}
            required
            placeholder="The work, the turning point, what you learned the hard way."
            className={fieldClass('impactStory')}
          />
          <ErrorText name="impactStory" />
        </div>

        <div>
          <Label htmlFor="linkedinUrl">LinkedIn</Label>
          <Input id="linkedinUrl" name="linkedinUrl" placeholder="https://linkedin.com/in/…" className={fieldClass('linkedinUrl')} />
          <ErrorText name="linkedinUrl" />
        </div>

        <div>
          <Label htmlFor="otherLink">Website or portfolio</Label>
          <Input id="otherLink" name="otherLink" placeholder="https://…" className={fieldClass('otherLink')} />
          <ErrorText name="otherLink" />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="preferredFormat">Preferred format *</Label>
          <select
            id="preferredFormat"
            name="preferredFormat"
            required
            defaultValue="either"
            className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            <option value="video">Video interview</option>
            <option value="written">Written Q&amp;A</option>
            <option value="either">Either is fine</option>
          </select>
          <p className="mt-1.5 text-xs text-slate-500">
            Choose written Q&amp;A if bandwidth or scheduling makes a recorded call difficult.
          </p>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="headshot">Headshot (JPG, PNG or WEBP, max 5 MB)</Label>
          <input
            id="headshot"
            name="headshot"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="mt-1.5 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-orange-50 file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-orange-700"
          />
        </div>
      </div>

      <div className="mt-6">
        <LegalConsent id="interview-legal-consent" />
      </div>

      <label
        htmlFor="consentRecorded"
        className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 px-4 py-3"
      >
        <input
          id="consentRecorded"
          name="consentRecorded"
          type="checkbox"
          required
          className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-orange-600"
        />
        <span className="text-xs leading-6 text-slate-600">
          I agree to be recorded and for the interview to be published on Top100 Africa Future
          Leaders channels.
        </span>
      </label>

      <div className="mt-6">
        <TurnstileCaptcha onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} />
      </div>

      {message ? (
        <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={status === 'loading'}
        className="mt-6 w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 py-6 text-sm font-semibold text-white hover:opacity-95 sm:w-auto sm:px-10"
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Sending…
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" aria-hidden="true" />
            Submit application
          </>
        )}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/interviews/_components/ApplyForm.tsx
git commit -m "feat(interviews): application form"
```

---

### Task 9: Index and detail pages

**Files:**
- Create: `app/interviews/page.tsx`
- Create: `app/interviews/[slug]/page.tsx`

**Interfaces:**
- Consumes: everything from Tasks 4, 5, 7, 8; `createClient` from `lib/supabase/server` for the logged-in prefill; `SITE_URL`, `SITE_NAME` from `lib/site`.
- Produces: the two public routes.

- [ ] **Step 1: Write the index page**

Create `app/interviews/page.tsx`:

```tsx
import type { Metadata } from 'next'

import { getPublishedInterviews } from '@/lib/interviews/queries'
import { pickFeatured, toCardView } from '@/lib/interviews/mappers'
import { createClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/site'

import ApplyForm from './_components/ApplyForm'
import EligibilityBands from './_components/EligibilityBands'
import FeaturedInterview from './_components/FeaturedInterview'
import InterviewCard from './_components/InterviewCard'
import InterviewGrid from './_components/InterviewGrid'
import InterviewsFaq from './_components/InterviewsFaq'
import InterviewsHero from './_components/InterviewsHero'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Impact Interviews | Top100 Africa Future Leaders',
  description:
    'Top100 awardees on the work they are doing, the setbacks that shaped it, and the Africa they are building. Watch the series and apply to be interviewed.',
  alternates: { canonical: `${SITE_URL}/interviews` },
  openGraph: {
    title: 'Impact Interviews | Top100 Africa Future Leaders',
    description: 'The stories behind the Top 100, in awardees’ own words.',
    url: `${SITE_URL}/interviews`,
    type: 'website',
  },
}

async function getPrefill() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return undefined
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, location')
      .eq('id', user.id)
      .maybeSingle()

    return {
      fullName: profile?.full_name ?? undefined,
      email: profile?.email ?? user.email ?? undefined,
      country: profile?.location ?? undefined,
    }
  } catch {
    // Prefill is a convenience. An auth hiccup must not take the page down.
    return undefined
  }
}

export default async function InterviewsPage() {
  const [rows, prefill] = await Promise.all([getPublishedInterviews(), getPrefill()])

  const featuredRow = pickFeatured(rows)
  const featured = featuredRow ? toCardView(featuredRow) : null
  const cards = rows.map(toCardView)
  const upNext = cards.filter((card) => card.id !== featured?.id).slice(0, 3)

  return (
    <main className="bg-white">
      <div className="container space-y-20 py-10 sm:py-14">
        <InterviewsHero />

        {featured ? (
          <div className="space-y-10">
            <FeaturedInterview interview={featured} />

            {upNext.length > 0 ? (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Up next
                </h2>
                <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {upNext.map((interview) => (
                    <InterviewCard key={interview.id} interview={interview} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <section>
          {cards.length > 0 ? (
            <h2 className="mb-8 text-2xl font-bold text-slate-900">All interviews</h2>
          ) : null}
          <InterviewGrid interviews={cards} />
        </section>

        <EligibilityBands />

        <section id="apply" className="scroll-mt-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Apply to be interviewed
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Open to Top100 awardees from every cohort. Tell us what the interview would be about
              and we will come back to you either way.
            </p>
          </div>
          <div className="mx-auto mt-9 max-w-3xl">
            <ApplyForm defaults={prefill} />
          </div>
        </section>

        <div className="mx-auto max-w-3xl">
          <InterviewsFaq />
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Write the detail page**

Create `app/interviews/[slug]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'

import { getInterviewBySlug, getPublishedInterviews, getPublishedSlugs } from '@/lib/interviews/queries'
import { toCardView, youtubeThumbnail } from '@/lib/interviews/mappers'
import { SITE_NAME, SITE_URL } from '@/lib/site'

import InterviewCard from '../_components/InterviewCard'
import VideoFacade from '../_components/VideoFacade'

type PageProps = { params: Promise<{ slug: string }> }

export const revalidate = 300

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs()
  return slugs.map((entry) => ({ slug: entry.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const interview = await getInterviewBySlug(slug)

  if (!interview) {
    return { title: `Interview not found | ${SITE_NAME}` }
  }

  const title = `${interview.title} — ${interview.awardee_name} | Impact Interviews`
  const description =
    interview.summary ||
    `${interview.awardee_name} on their work, in the Top100 Africa Future Leaders interview series.`
  const image = interview.thumbnail_url || (interview.video_id ? youtubeThumbnail(interview.video_id) : undefined)

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/interviews/${interview.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/interviews/${interview.slug}`,
      type: 'article',
      images: image ? [{ url: image }] : undefined,
    },
  }
}

export default async function InterviewDetailPage({ params }: PageProps) {
  const { slug } = await params
  const interview = await getInterviewBySlug(slug)

  if (!interview) {
    notFound()
  }

  const view = toCardView(interview)
  const others = (await getPublishedInterviews())
    .filter((row) => row.slug !== interview.slug)
    .slice(0, 3)
    .map(toCardView)

  const meta = [interview.country, interview.cohort_year ? `${interview.cohort_year} cohort` : null]
    .filter(Boolean)
    .join(' · ')

  const jsonLd =
    interview.format === 'video' && interview.video_id
      ? {
          '@context': 'https://schema.org',
          '@type': 'VideoObject',
          name: interview.title,
          description: interview.summary || interview.pull_quote || interview.title,
          thumbnailUrl: view.thumbnailUrl,
          uploadDate: interview.published_at,
          embedUrl: `https://www.youtube-nocookie.com/embed/${interview.video_id}`,
        }
      : null

  return (
    <main className="bg-white">
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}

      <article className="container py-10 sm:py-14">
        <Link
          href="/interviews"
          className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700 hover:text-orange-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All interviews
        </Link>

        <header className="mx-auto mt-8 max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">
            Impact Interviews
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            {interview.title}
          </h1>
          <p className="mt-4 text-base font-semibold text-orange-600">{interview.awardee_name}</p>
          {meta ? <p className="mt-1 text-sm text-slate-500">{meta}</p> : null}
        </header>

        <div className="mx-auto mt-10 max-w-4xl">
          {interview.format === 'video' && interview.video_id ? (
            <VideoFacade
              videoId={interview.video_id}
              title={interview.title}
              thumbnailUrl={view.thumbnailUrl}
            />
          ) : null}
        </div>

        {interview.pull_quote ? (
          <blockquote className="mx-auto mt-12 max-w-3xl border-l-4 border-orange-400 pl-6 text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">
            &ldquo;{interview.pull_quote}&rdquo;
          </blockquote>
        ) : null}

        {interview.body ? (
          <div
            className="prose prose-slate mx-auto mt-10 max-w-3xl prose-headings:font-bold prose-a:text-orange-700"
            dangerouslySetInnerHTML={{ __html: interview.body }}
          />
        ) : null}

        {view.awardeeSlug ? (
          <div className="mx-auto mt-12 max-w-3xl rounded-[28px] border border-orange-100 bg-[#fffaf4] p-8 text-center">
            <p className="text-sm text-slate-600">
              {interview.awardee_name} is a Top100 Africa Future Leaders awardee.
            </p>
            <Link
              href={`/awardees/${view.awardeeSlug}`}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95"
            >
              View their profile
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : null}

        {others.length > 0 ? (
          <section className="mt-20">
            <h2 className="text-2xl font-bold text-slate-900">More interviews</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((item) => (
                <InterviewCard key={item.id} interview={item} />
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-16 text-center">
          <Link
            href="/interviews#apply"
            className="inline-flex items-center gap-2 rounded-full border border-orange-200 px-7 py-3.5 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
          >
            Apply to be interviewed
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </article>
    </main>
  )
}
```

- [ ] **Step 3: Verify the pages build**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add app/interviews/page.tsx "app/interviews/[slug]/page.tsx"
git commit -m "feat(interviews): public index and detail pages"
```

---

### Task 10: Admin console

**Files:**
- Create: `app/api/admin/interviews/route.ts`
- Create: `app/api/admin/interview-applications/route.ts`
- Create: `app/admin/interviews/page.tsx`
- Create: `app/admin/interviews/_components/InterviewsAdminClient.tsx`

**Interfaces:**
- Consumes: `requireAdmin` from `lib/api/require-admin`; `createAdminClient` from `lib/supabase/server`; `parseYouTubeId`, `INTERVIEW_SELECT`, `slugifyInterview`, `uniqueSlug` from earlier tasks.
- Produces:
  - `GET /api/admin/interviews` → `{ interviews: InterviewRow[] }`
  - `POST /api/admin/interviews` → creates; body accepts `videoUrl` and derives `video_id` + slug
  - `PATCH /api/admin/interviews` → `{ id, ...fields }`
  - `DELETE /api/admin/interviews?id=` 
  - `GET /api/admin/interview-applications` → `{ applications: Array<row & { headshotUrl: string | null }> }` (signed URLs, 1 hour)
  - `PATCH /api/admin/interview-applications` → `{ id, status?, admin_notes?, scheduled_at?, published_interview_id? }`

- [ ] **Step 1: Write the interviews admin route**

Create `app/api/admin/interviews/route.ts`:

```ts
import { NextRequest } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { INTERVIEW_SELECT } from '@/lib/interviews/queries'
import { parseYouTubeId } from '@/lib/interviews/mappers'
import { slugifyInterview, uniqueSlug } from '@/lib/interviews/matching'

const EDITABLE_FIELDS = [
  'title', 'format', 'duration_seconds', 'thumbnail_url', 'pull_quote', 'summary',
  'body', 'awardee_id', 'awardee_name', 'country', 'cohort_year', 'topics',
  'featured', 'status', 'sort_order', 'application_id', 'slug',
] as const

function pickEditable(body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {}
  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      patch[field] = body[field]
    }
  }
  return patch
}

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('interviews')
    .select(INTERVIEW_SELECT)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 })
  }

  return Response.json({ interviews: data ?? [] })
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const body = (await request.json()) as Record<string, unknown>
  const supabase = createAdminClient()

  const format = (body.format as string) || 'video'
  let videoId: string | null = null

  if (format === 'video') {
    videoId = parseYouTubeId(String(body.videoUrl ?? body.video_id ?? ''))
    if (!videoId) {
      // Catching this here keeps a dead player off the public page.
      return Response.json(
        { success: false, message: 'Enter a valid YouTube link or 11-character video ID.' },
        { status: 400 },
      )
    }
  }

  const title = String(body.title ?? '').trim()
  if (!title) {
    return Response.json({ success: false, message: 'A title is required.' }, { status: 400 })
  }

  const awardeeName = String(body.awardee_name ?? '').trim()
  if (!awardeeName) {
    return Response.json({ success: false, message: 'An awardee name is required.' }, { status: 400 })
  }

  const { data: existing } = await supabase.from('interviews').select('slug')
  const requested = String(body.slug ?? '').trim()
  const slug = uniqueSlug(
    requested ? slugifyInterview(requested) : slugifyInterview(awardeeName),
    (existing ?? []).map((row) => row.slug as string),
  )

  const status = (body.status as string) === 'published' ? 'published' : 'draft'

  const { data, error } = await supabase
    .from('interviews')
    .insert({
      ...pickEditable(body),
      slug,
      title,
      format,
      video_id: videoId,
      awardee_name: awardeeName,
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
    })
    .select('id, slug')
    .single()

  if (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 })
  }

  return Response.json({ success: true, interview: data })
}

export async function PATCH(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const body = (await request.json()) as Record<string, unknown>
  const id = String(body.id ?? '')
  if (!id) {
    return Response.json({ success: false, message: 'An interview id is required.' }, { status: 400 })
  }

  const patch = pickEditable(body)

  if ('videoUrl' in body) {
    const videoId = parseYouTubeId(String(body.videoUrl ?? ''))
    if (!videoId && (patch.format ?? 'video') === 'video') {
      return Response.json(
        { success: false, message: 'Enter a valid YouTube link or 11-character video ID.' },
        { status: 400 },
      )
    }
    patch.video_id = videoId
  }

  // Stamp the publish date the first time it goes live.
  if (patch.status === 'published') {
    const supabaseCheck = createAdminClient()
    const { data: current } = await supabaseCheck
      .from('interviews')
      .select('published_at')
      .eq('id', id)
      .maybeSingle()

    if (!current?.published_at) {
      patch.published_at = new Date().toISOString()
    }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('interviews').update(patch).eq('id', id)

  if (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return Response.json({ success: false, message: 'An interview id is required.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('interviews').delete().eq('id', id)

  if (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
```

- [ ] **Step 2: Write the applications admin route**

Create `app/api/admin/interview-applications/route.ts`:

```ts
import { NextRequest } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

const HEADSHOT_BUCKET = 'interview-applications'
const SIGNED_URL_TTL_SECONDS = 60 * 60

const EDITABLE_FIELDS = ['status', 'admin_notes', 'scheduled_at', 'published_interview_id'] as const

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const supabase = createAdminClient()
  const status = request.nextUrl.searchParams.get('status')

  let query = supabase
    .from('interview_applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 })
  }

  // The bucket is private, so headshots are only ever exposed as short-lived
  // signed URLs generated here — never as a public object path.
  const applications = await Promise.all(
    (data ?? []).map(async (application) => {
      if (!application.headshot_path) {
        return { ...application, headshotUrl: null }
      }

      const { data: signed } = await supabase.storage
        .from(HEADSHOT_BUCKET)
        .createSignedUrl(application.headshot_path, SIGNED_URL_TTL_SECONDS)

      return { ...application, headshotUrl: signed?.signedUrl ?? null }
    }),
  )

  return Response.json({ applications })
}

export async function PATCH(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const body = (await request.json()) as Record<string, unknown>
  const id = String(body.id ?? '')
  if (!id) {
    return Response.json({ success: false, message: 'An application id is required.' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}
  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      patch[field] = body[field]
    }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('interview_applications').update(patch).eq('id', id)

  if (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
```

- [ ] **Step 3: Write the admin page shell**

Create `app/admin/interviews/page.tsx`:

```tsx
import type { Metadata } from 'next'

import InterviewsAdminClient from './_components/InterviewsAdminClient'

export const metadata: Metadata = {
  title: 'Impact Interviews | Admin',
}

export default function AdminInterviewsPage() {
  return <InterviewsAdminClient />
}
```

- [ ] **Step 4: Write the admin client**

Create `app/admin/interviews/_components/InterviewsAdminClient.tsx`. It renders two tabs using the existing `@/components/ui/tabs`, fetching from the two routes above.

```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { InterviewRow } from '@/lib/interviews/mappers'

type Application = {
  id: string
  full_name: string
  email: string
  phone: string | null
  country: string | null
  cohort_year: number | null
  role_title: string | null
  organisation: string | null
  bio: string
  impact_story: string
  linkedin_url: string | null
  other_link: string | null
  preferred_format: string
  verification: 'matched' | 'unmatched'
  status: string
  admin_notes: string | null
  headshotUrl: string | null
  created_at: string
}

const STATUSES = ['pending', 'shortlisted', 'scheduled', 'published', 'declined'] as const

const emptyDraft = {
  title: '',
  videoUrl: '',
  format: 'video',
  awardee_name: '',
  country: '',
  cohort_year: '',
  pull_quote: '',
  summary: '',
  body: '',
  duration_seconds: '',
  status: 'draft',
  featured: false,
  sort_order: '0',
}

export default function InterviewsAdminClient() {
  const [interviews, setInterviews] = useState<InterviewRow[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({ ...emptyDraft })
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [interviewsResponse, applicationsResponse] = await Promise.all([
        fetch('/api/admin/interviews'),
        fetch('/api/admin/interview-applications'),
      ])

      const interviewsData = await interviewsResponse.json()
      const applicationsData = await applicationsResponse.json()

      setInterviews(interviewsData.interviews ?? [])
      setApplications(applicationsData.applications ?? [])
    } catch {
      toast.error('Could not load interviews')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const createInterview = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          cohort_year: draft.cohort_year ? Number(draft.cohort_year) : null,
          duration_seconds: draft.duration_seconds ? Number(draft.duration_seconds) : null,
          sort_order: Number(draft.sort_order) || 0,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        toast.error(data.message || 'Could not save the interview')
        return
      }

      toast.success('Interview saved')
      setDraft({ ...emptyDraft })
      setShowForm(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const updateInterview = async (id: string, patch: Record<string, unknown>) => {
    const response = await fetch('/api/admin/interviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })

    const data = await response.json()
    if (!response.ok || !data.success) {
      toast.error(data.message || 'Update failed')
      return
    }

    await load()
  }

  const updateApplication = async (id: string, patch: Record<string, unknown>) => {
    const response = await fetch('/api/admin/interview-applications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })

    const data = await response.json()
    if (!response.ok || !data.success) {
      toast.error(data.message || 'Update failed')
      return
    }

    toast.success('Application updated')
    await load()
  }

  const createFromApplication = (application: Application) => {
    setDraft({
      ...emptyDraft,
      awardee_name: application.full_name,
      country: application.country ?? '',
      cohort_year: application.cohort_year ? String(application.cohort_year) : '',
      summary: application.bio.slice(0, 240),
      format: application.preferred_format === 'written' ? 'written' : 'video',
    })
    setShowForm(true)
    toast.info(`Draft started for ${application.full_name}`)
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Impact Interviews</h1>
          <p className="text-sm text-slate-500">
            {interviews.length} interviews · {applications.filter((a) => a.status === 'pending').length} pending applications
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="interviews">
        <TabsList>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
          <TabsTrigger value="applications">
            Applications ({applications.filter((a) => a.status === 'pending').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="interviews" className="space-y-4 pt-4">
          <Button onClick={() => setShowForm((value) => !value)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            {showForm ? 'Close' : 'New interview'}
          </Button>

          {showForm ? (
            <div className="grid gap-4 rounded-2xl border border-orange-100 bg-white p-6 sm:grid-cols-2">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="awardee_name">Awardee name</Label>
                <Input id="awardee_name" value={draft.awardee_name} onChange={(e) => setDraft({ ...draft, awardee_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="videoUrl">YouTube URL</Label>
                <Input id="videoUrl" value={draft.videoUrl} onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value })} placeholder="https://youtu.be/…" />
              </div>
              <div>
                <Label htmlFor="duration_seconds">Duration (seconds)</Label>
                <Input id="duration_seconds" value={draft.duration_seconds} onChange={(e) => setDraft({ ...draft, duration_seconds: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="cohort_year">Cohort year</Label>
                <Input id="cohort_year" value={draft.cohort_year} onChange={(e) => setDraft({ ...draft, cohort_year: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="pull_quote">Pull quote</Label>
                <Input id="pull_quote" value={draft.pull_quote} onChange={(e) => setDraft({ ...draft, pull_quote: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea id="summary" rows={2} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="body">Body (HTML)</Label>
                <Textarea id="body" rows={6} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={() => void createInterview()} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  Save as draft
                </Button>
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-orange-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-orange-50 text-xs uppercase tracking-wider text-orange-800">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Awardee</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Featured</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-50">
                {interviews.map((interview) => (
                  <tr key={interview.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{interview.title}</td>
                    <td className="px-4 py-3 text-slate-600">{interview.awardee_name}</td>
                    <td className="px-4 py-3">
                      <select
                        value={interview.status}
                        onChange={(e) => void updateInterview(interview.id, { status: e.target.value })}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={interview.featured}
                        onChange={(e) => void updateInterview(interview.id, { featured: e.target.checked })}
                        className="h-4 w-4 accent-orange-600"
                        aria-label={`Feature ${interview.title}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a href={`/interviews/${interview.slug}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-orange-700 hover:underline">
                        View
                      </a>
                    </td>
                  </tr>
                ))}
                {interviews.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                      No interviews yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4 pt-4">
          {applications.map((application) => (
            <div key={application.id} className="rounded-2xl border border-orange-100 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex gap-4">
                  {application.headshotUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={application.headshotUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
                  ) : null}
                  <div>
                    <p className="font-semibold text-slate-900">
                      {application.full_name}{' '}
                      <span
                        className={
                          application.verification === 'matched'
                            ? 'ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-800'
                            : 'ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800'
                        }
                      >
                        {application.verification === 'matched' ? 'Matched' : 'Needs verification'}
                      </span>
                    </p>
                    <p className="text-sm text-slate-500">
                      {application.email} · {application.country} · {application.cohort_year} · prefers {application.preferred_format}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={application.status}
                    onChange={(e) => void updateApplication(application.id, { status: e.target.value })}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline" onClick={() => createFromApplication(application)}>
                    Create interview
                  </Button>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-slate-600">{application.impact_story}</p>

              <Textarea
                rows={2}
                defaultValue={application.admin_notes ?? ''}
                placeholder="Notes"
                className="mt-3"
                onBlur={(e) => {
                  if (e.target.value !== (application.admin_notes ?? '')) {
                    void updateApplication(application.id, { admin_notes: e.target.value })
                  }
                }}
              />
            </div>
          ))}

          {applications.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-orange-200 px-6 py-12 text-center text-sm text-slate-500">
              No applications yet.
            </p>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 5: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/interviews app/api/admin/interview-applications app/admin/interviews
git commit -m "feat(interviews): admin console for interviews and application queue"
```

---

### Task 11: Navigation, footer, sitemap and final verification

**Files:**
- Modify: `app/components/Header.tsx:71-84` (magazineItems)
- Modify: `app/components/Footer.tsx:35-37` (Platform links)
- Modify: `app/sitemap.ts`

**Interfaces:**
- Consumes: `getPublishedSlugs` from `lib/interviews/queries` (Task 5).
- Produces: no new exports.

- [ ] **Step 1: Add the nav entry**

In `app/components/Header.tsx`, change `magazineItems` so Impact Interviews sits at the top of the media cluster:

```tsx
const magazineItems: NavItem[] = [
  {
    label: "Impact Interviews",
    href: "/interviews",
  },
  {
    label: "2024 Edition",
    href: "/magazine/africa future leaders magazine 2024",
  },
  {
    label: "2025 Edition",
    href: "/magazine/afl2025",
  },
  {
    label: "All Editions",
    href: "/magazine",
  },
]
```

This flows into both `desktopGroups` and `mobileGroups`, so no other Header change is needed.

- [ ] **Step 2: Add the footer link**

In `app/components/Footer.tsx`, in the Platform list, add after the Awardees entry:

```tsx
                <li><Link href="/interviews" className="hover:text-orange-500 transition">Impact Interviews</Link></li>
```

- [ ] **Step 3: Add sitemap entries**

In `app/sitemap.ts`, add this static route after the `/awardees` entry:

```ts
    {
      url: `${baseUrl}/interviews`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
```

Add the import at the top:

```ts
import { getPublishedSlugs } from '@/lib/interviews/queries'
```

Before the `return`, add:

```ts
  const interviewSlugs = await getPublishedSlugs()

  const interviewRoutes: MetadataRoute.Sitemap = interviewSlugs.map((interview) => ({
    url: `${baseUrl}/interviews/${interview.slug}`,
    lastModified: interview.published_at ? new Date(interview.published_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))
```

And change the return to:

```ts
  return [...staticRoutes, ...awardeeRoutes, ...blogRoutes, ...interviewRoutes]
```

- [ ] **Step 4: Run the whole test suite**

Run: `npx vitest run`
Expected: PASS — all pre-existing suites plus the three new interview suites.

- [ ] **Step 5: Typecheck and build**

Run: `npx tsc --noEmit`
Expected: no new errors.

Run: `npx next build`
Expected: build succeeds; `/interviews` and `/interviews/[slug]` appear in the route list.

- [ ] **Step 6: Manual verification**

Start the dev server (`npm run dev`) and confirm:
1. `/interviews` renders the hero, eligibility bands, form and FAQ with the empty state in place of the grid.
2. Submitting the form with a short bio shows a field-level error and **keeps the typed values**.
3. A valid submission returns the success panel, creates a row in `interview_applications`, and stores a headshot in the private bucket.
4. Resubmitting the same email immediately returns the duplicate message and creates no second row.
5. `/admin/interviews` lists the application with a verification badge and a working headshot preview.
6. Publishing an interview from the admin makes it appear on `/interviews` and at its own `/interviews/[slug]` URL, with the video playing after the facade is clicked.

- [ ] **Step 7: Commit**

```bash
git add app/components/Header.tsx app/components/Footer.tsx app/sitemap.ts
git commit -m "feat(interviews): link Impact Interviews from nav, footer and sitemap"
```

---

## Self-review

**Spec coverage:** every spec section maps to a task — routes (7, 9, 10, 11), page sections (7, 9), detail page (9), both tables and the bucket (1), application flow with ordered guards (6), admin with both tabs (10), error handling (5, 6, 7, 9), testing (2, 3, 4), code layout (2–10), nav/footer/sitemap (11). The CSP `frame-src` fix is an addition discovered during planning — without it no embed on the site renders in production.

**Placeholder scan:** clean — no TBDs, no "handle errors appropriately", and every code step carries the code it needs.

**Type consistency:** `InterviewRow`, `InterviewCardView`, `AwardeeCandidate`, `MatchResult` and `ApplicationInput` are defined once and referenced by the same names throughout. `INTERVIEW_SELECT` is shared by the public queries and the admin route so both return the same shape.
