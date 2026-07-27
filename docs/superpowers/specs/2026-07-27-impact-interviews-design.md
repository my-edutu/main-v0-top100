# Impact Interviews — Design

**Date:** 2026-07-27
**Status:** Approved for implementation

## Purpose

A public video-interview series that spotlights Top100 awardees, plus an application flow so awardees can put themselves forward for it. The page is the front door for the series: visitors watch, awardees apply, and the team triages applications and publishes finished interviews without touching code.

Inspiration: swisafrica.org/interviews — hero, eligibility, "why apply", nomination form, video gallery. We keep that structure and adapt it to the Top100 brand and to an awardee-only funnel.

## Decisions

| Decision | Choice |
|---|---|
| Eligibility | Top100 awardees only, self-apply (no third-party nominations) |
| Content storage | Dedicated `interviews` table + `/admin/interviews` console |
| Applications | Dedicated `interview_applications` table + admin review queue |
| Access to form | Public form, server-side awardee matching, prefill if logged in |
| Layout | Featured film + grid, with an "up next" strip |
| Detail pages | Yes — `/interviews/[slug]` |
| Extra form fields | Headshot upload, preferred format (video / written Q&A / either) |
| Build order | Full vertical slice — public pages, API and admin together |

Rejected: reusing `youtube_videos` (no awardee linkage or pull-quotes); hardcoded content file (every interview needs a deploy); routing submissions through `/api/applications` (no status pipeline, no headshot path).

## Routes

| Route | Purpose |
|---|---|
| `/interviews` | Index — hero, featured interview, grid, eligibility, apply form (`#apply`), FAQ |
| `/interviews/[slug]` | One interview — video or written Q&A, pull-quote, write-up, awardee link, share, related |
| `POST /api/interviews/apply` | Public submission. Multipart, Turnstile-gated, rate-limited |
| `GET/POST/PATCH/DELETE /api/admin/interviews` | Interview CRUD (admin only) |
| `GET/PATCH /api/admin/interview-applications` | Application queue (admin only) |
| `/admin/interviews` | Admin console — **Interviews** and **Applications** tabs |

Nav: "Impact Interviews" is added to the existing **Magazine** dropdown group in `app/components/Header.tsx` (desktop and mobile), a footer Quick Links entry in `app/components/Footer.tsx`, and an entry in `app/sitemap.ts` covering `/interviews` and every published interview slug.

## Public page — `/interviews`

Top to bottom:

1. **Dark hero panel** — `#05060f` with the radial orange wash used elsewhere on the site. Eyebrow "Impact Interviews", headline, one line of subcopy, two CTAs: *Apply to be interviewed* (→ `#apply`) and *Watch the latest* (→ featured).
2. **Featured interview** — 16:9 player, pull-quote, awardee name · country · cohort, link to `/awardees/[slug]`, *Watch full interview →* to the detail page. Chosen by `featured = true`, falling back to the most recently published.
3. **Up next strip** — three cards directly under the player, preserving some of the binge-watching pull of a playlist layout without losing per-interview URLs.
4. **Filter chips** — cohort year and format (Video / Written Q&A). Client-side filtering over the already-fetched list; no extra requests.
5. **Grid** — 3 columns desktop, 2 tablet, 1 mobile. Card: thumbnail with duration badge and format badge, title, awardee name · country, cohort year. Whole card is a link to the detail page.
6. **Empty state** — when nothing is published the grid is replaced by "The first season is being recorded — apply to be part of it." The page launches with zero interviews, so this is the state most visitors see first.
7. **Eligibility band** ("Who we're looking for") and **why apply** benefits — warm `orange-50` cards with orange-100 hairline borders.
8. **`#apply`** — the application form.
9. **FAQ accordion** — how long the interview runs, where it is recorded, what equipment is needed, when applicants hear back. Uses the existing Radix accordion. Reduces inbound email.

**Video embeds use a facade**: the card and featured player render a thumbnail plus a play button, and the YouTube iframe is only injected on click. With a grid of embeds this is the difference between a fast page and a slow one.

Rendering: server component with ISR (`revalidate = 300`). The apply form is a client component.

## Detail page — `/interviews/[slug]`

Breadcrumb → title and awardee meta → player (or, for `format = 'written'`, the Q&A body) → pull-quote block → rich-text write-up → awardee card linking to `/awardees/[slug]` → share row → three related interviews.

`generateMetadata` sets title, description (from `summary`), and OG image (thumbnail). `VideoObject` JSON-LD is emitted through the existing `StructuredData` component for video-format interviews. `generateStaticParams` pre-renders published slugs. Unknown slug → `notFound()`.

## Data model

Migration: `supabase/migrations/20260727_interviews.sql`.

### `interviews`

```
id                    uuid pk default gen_random_uuid()
slug                  text unique not null
title                 text not null
format                text not null default 'video' check (format in ('video','written'))
video_id              text                       -- YouTube ID; null for written
duration_seconds      integer
thumbnail_url         text                       -- override; falls back to YouTube thumbnail
pull_quote            text
summary               text                       -- card + meta description
body                  text                       -- rich HTML (TipTap); the Q&A for written format
awardee_id            uuid references public.awardees(id) on delete set null
awardee_name          text not null
country               text
cohort_year           integer
topics                text[] default '{}'
featured              boolean default false
status                text not null default 'draft' check (status in ('draft','published'))
published_at          timestamptz
sort_order            integer default 0
application_id        uuid references public.interview_applications(id) on delete set null
created_at            timestamptz default now()
updated_at            timestamptz default now()
```

`awardee_id` links to the directory so the interview can pull the awardee's photo and profile link. `awardee_name` and `country` are stored on the row as well, so an interview does not break if the directory row is renamed or removed.

Constraint: `format = 'video'` requires a non-null `video_id`.

Indexes: `slug`, `(status, published_at desc)`, `featured`, `awardee_id`, `cohort_year`.

RLS: public `select` where `status = 'published'`; service role full access. `updated_at` maintained by a trigger, following the pattern of `handle_awardee_updated`.

### `interview_applications`

```
id                    uuid pk default gen_random_uuid()
full_name             text not null
email                 text not null
phone                 text
country               text
cohort_year           integer
role_title            text
organisation          text
bio                   text not null
impact_story          text not null
linkedin_url          text
other_link            text
preferred_format      text not null check (preferred_format in ('video','written','either'))
headshot_path         text                       -- key in the private bucket
matched_awardee_id    uuid references public.awardees(id) on delete set null
verification          text not null default 'unmatched' check (verification in ('matched','unmatched'))
status                text not null default 'pending'
                        check (status in ('pending','shortlisted','scheduled','published','declined'))
admin_notes           text
scheduled_at          timestamptz
published_interview_id uuid references public.interviews(id) on delete set null
consent_recorded      boolean not null default false
consent_at            timestamptz
created_at            timestamptz default now()
updated_at            timestamptz default now()
```

Indexes: `(status, created_at desc)`, `email`, `matched_awardee_id`.

RLS: **no public select and no public insert policy**. All writes go through the API route using the service-role client, so applicant data is never reachable from the browser with an anon key.

`interviews.application_id` and `interview_applications.published_interview_id` reference each other; the migration creates `interview_applications` first and adds the `interviews.application_id` foreign key afterwards.

### Storage

Private bucket `interview-applications`. Object path `{applicationId}/headshot.{ext}`. Admin views headshots through server-generated signed URLs (1 hour). Applicant photos should not be publicly enumerable, so this bucket is not public.

## Application flow

Form fields: full name, email, phone, country, cohort year, role/title, organisation, short bio (100–150 words), what the interview should be about, LinkedIn, optional other link, preferred format, headshot, consent checkbox. The existing `LegalConsent` component covers terms and privacy. Turnstile (`components/ui/turnstile.tsx`, already no-ops without a site key) and the existing `checkRateLimit` helper gate submission. If the visitor is authenticated, name, email and country prefill from their profile.

Submission handling, in order:

1. Rate-limit check by client identifier.
2. Turnstile verification (when a site key is configured).
3. Zod validation of the parsed multipart fields.
4. Duplicate guard: an existing `pending` application with the same email inside 30 days returns a friendly "we already have your application" and creates no second row.
5. Awardee match — look up `awardees` by normalised email, then by normalised name plus cohort year. Sets `matched_awardee_id` and `verification`. **An unmatched application is flagged, not rejected**; awardees often apply from a different address than the one in the directory.
6. Insert the application row.
7. Upload the headshot (after insert, so the id is available for the path), then update the row with `headshot_path`. **A failed upload does not fail the submission** — the application is not lost over a photo.
8. Send email to the admin (summary, verification badge, link to the queue) and a confirmation to the applicant (what happens next, timeline), both via the existing Brevo `sendEmail`.

Headshot validation: MIME sniffed against `image/jpeg`, `image/png`, `image/webp`; 5 MB cap; the client-supplied filename is discarded and the extension derived from the validated MIME type, following the hardening already applied in `app/api/upload-image/route.ts`. Turnstile and rate limiting run before the file is read.

## Admin — `/admin/interviews`

**Interviews tab.** List (thumbnail, title, awardee, cohort, status, featured) with create and edit forms. Pasting a YouTube URL auto-fills title, duration and thumbnail using the oEmbed approach already in `app/api/youtube-info/route.ts`. TipTap editor for the body. Publish toggle, featured toggle, numeric sort order. Slug auto-generates from the title with a numeric suffix on collision, and stays editable.

**Applications tab.** List with a status filter and verification badge; a detail drawer showing every submitted field and the headshot via signed URL; status dropdown; admin notes. A **"Create interview from this application"** action opens a pre-filled draft interview (name, country, cohort, bio, preferred format) with `application_id` set, and moves the application to `published` once that interview is published. Status-change emails to applicants are an explicit admin button, not automatic.

Both tabs sit behind the existing `requireAdmin` check used by other admin API routes.

## Error handling

- Form returns field-level Zod errors; a failed submit preserves entered values.
- Duplicate submission returns a friendly message, not an error.
- Invalid or unparseable YouTube URL is rejected in admin validation, so a broken embed never reaches the public page.
- If the interviews query fails, `/interviews` still renders hero, eligibility, form and FAQ with the empty state in place of the grid. **The apply funnel keeps working even when the content query fails.**
- Unknown detail slug → `notFound()`.
- Missing Supabase credentials or a missing table (fresh environment) is treated as "no interviews yet" rather than a 500, matching the defensive handling in `app/api/youtube/route.ts`.

## Testing

Vitest is already configured (`vitest.config.ts`, `tests/`).

- Application Zod schema: accepts a valid payload; rejects invalid email, missing consent, missing bio, out-of-range cohort year, oversized file, wrong MIME type.
- Awardee matching: email match, name + cohort-year match, no match → `unmatched`.
- Duplicate-submission guard inside and outside the 30-day window.
- Slug generation and collision handling when two awardees share a name.
- Data mappers: YouTube thumbnail fallback when `thumbnail_url` is null; `format = 'written'` rows render without a player; duration formatting.
- RLS: an anon client can select neither `interview_applications` nor draft interviews.

## Code layout

```
lib/interviews/
  schema.ts        Zod schemas for application + interview payloads
  queries.ts       Supabase reads/writes
  mappers.ts       Row → view-model, thumbnail fallback, duration formatting
  matching.ts      Awardee matching + slug generation
app/interviews/
  page.tsx
  [slug]/page.tsx
  _components/     Hero, FeaturedInterview, UpNext, FilterChips, InterviewGrid,
                   InterviewCard, VideoFacade, EligibilityBands, ApplyForm, Faq
app/api/interviews/apply/route.ts
app/api/admin/interviews/route.ts
app/api/admin/interview-applications/route.ts
app/admin/interviews/
  page.tsx, _components/
supabase/migrations/20260727_interviews.sql
```

Keeping queries and mappers in `lib/interviews/` keeps the page components thin and makes the mapping logic directly testable without rendering.

## Out of scope

Third-party nominations, written-format interviews authored in-app by the awardee (admin transcribes into `body`), automated scheduling/calendar integration, video hosting outside YouTube, and public commenting.
