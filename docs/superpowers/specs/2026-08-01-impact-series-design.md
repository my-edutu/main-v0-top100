# Top100 Africa Future Leaders Impact Series — Design

**Date:** 2026-08-01
**Status:** Approved for implementation

## Purpose

A public series documenting what Top100 awardees go on to achieve — scholarships, appointments, businesses, research, community work — fed by a submission form in the member dashboard and curated by admins before it goes public.

The award is a moment; the series is the follow-through. It gives awardees a reason to stay engaged after their cohort year, gives partners and universities evidence that investing in young leaders pays off, and gives the next applicant cohort something concrete to aspire to.

## Decisions

| Decision | Choice |
|---|---|
| Relationship to "Get featured" | Replaces it. New `impact_stories` table; `member_features` retained read-only, dashboard entry point removed |
| Editorial model | Awardee submits structured milestone → admin reviews, edits, publishes. Nothing goes public unreviewed |
| Public route | `/impact` (singular), detail pages at `/impact/[slug]` |
| Intro write-up | Hardcoded manifesto at the top of `/impact`; condensed version greets awardees in the dashboard section |
| Impact Interviews | Sibling under a new "Impact" nav group. No route or code changes to `/interviews` |
| Categories | Four broad buckets — Education, Career, Enterprise, Community |
| Submission fields | Structured + story body, photo optional |
| Build order | Full vertical slice — migration, dashboard form, admin console, public pages |
| Extra placements | Awardee public profile strip, homepage band, dashboard home prompt |

Rejected:

- **Reusing `feature_requests`** — that table is the paid ₦40,000 news-feature product. Its status enum is payment-shaped (`paid`, `payment_status`) and mixing a free editorial pipeline into it would make "who pays for this row" depend on a nullable column.
- **Reusing `member_features`** — three columns (title, category, summary) and a status enum with no editorial states. Every field the series needs would be an addition, and the existing rows mean something different.
- **Awardee-written published bodies** (the `member_posts` model) — `/impact` is a brand surface shown to partners and universities; variable copy quality there costs more than the editorial time saved.
- **Auto-publish with after-the-fact moderation** — same reason.
- **Merging interviews into `/impact`** — the interviews pages are already built and video-shaped. Nav grouping gets the association at none of the cost.

## Context in the existing codebase

Three story pipelines already exist. The series must not become a fourth:

| Existing | What it is | What happens to it |
|---|---|---|
| `member_features` + dashboard "Get featured" | Title/category/summary pitch for magazine or homepage | **Superseded.** Table and rows retained, admin can still read them; the dashboard entry point is removed |
| `feature_requests` + `/api/feature-requests` | Paid ₦40,000 news-feature product | Untouched |
| `member_posts` + `/awardees/[slug]/posts/[slug]` | Awardee-authored markdown on their own profile | Untouched. Distinct purpose: self-published writing vs. curated milestone |
| `interviews` + `/interviews` | Video / written Q&A series, awardee-only | Untouched. Becomes a sibling under the Impact nav group |

## Architecture

Four units with clean boundaries:

| Unit | Responsibility | Depends on |
|---|---|---|
| `lib/impact/` (`types.ts`, `server.ts`, `client.ts`) | Row ↔ domain mapping, slug generation, status-transition rules, validation bounds | Supabase admin client |
| `app/api/member/impact-stories/*` | Awardee submit, list-own, edit-while-editable, photo upload | `lib/impact`, `lib/auth-server`, `lib/rate-limit`, `lib/security`, `lib/image-processing` |
| `app/api/admin/impact-stories/*` + `app/admin/impact/` | Review queue, copy editing, publish/decline | `lib/impact`, `lib/api/require-admin` |
| `app/impact/*` | Public manifesto, grid, detail pages | `lib/impact` server reads only |

Validation bounds and the category list live in `lib/impact/types.ts` and are imported by the form, both API layers, and the tests, so client and server can never disagree about what a valid submission is. The database check constraints mirror them as the last line of defence.

The public pages read published rows only and never import anything from the member or admin API layers.

## Data model

Migration: `supabase/migrations/20260801_impact_stories.sql`. Applied to the live project via the Supabase MCP `apply_migration` tool, following the convention established for the earlier migrations in this tree.

### `impact_stories`

```
id             uuid primary key default gen_random_uuid()
profile_id     uuid not null references public.profiles(id) on delete cascade
awardee_id     uuid references public.awardees(id) on delete set null
slug           text unique                        -- assigned at publish, not at submit
category       text not null check (category in ('education','career','enterprise','community'))
headline       text not null check (char_length(headline) between 6 and 160)
organisation   text                               -- institution, employer or company
achieved_on    date
story          text not null check (char_length(story) between 150 and 2000)
body           text                               -- admin's published version; falls back to story
pull_quote     text                               -- admin-chosen
photo_url      text
proof_url      text                               -- announcement, offer letter, press link
linkedin_url   text
advice         text                               -- "what would you tell another member"
author_name    text not null
country        text
cohort_year    integer
status         text not null default 'submitted'
               check (status in ('submitted','changes_requested','approved','published','declined'))
featured       boolean not null default false
admin_note     text                               -- surfaced to the submitter on decline / changes_requested
reviewed_by    uuid references public.profiles(id) on delete set null
published_at   timestamptz
view_count     integer not null default 0 check (view_count >= 0)
created_at     timestamptz not null default now()
updated_at     timestamptz not null default now()
```

`profile_id` cascades: an impact story carries no payment or courier record, so nothing has to outlive the profile that submitted it. `awardee_id` links to the directory for the photo and profile link; `author_name`, `country` and `cohort_year` are denormalised onto the row so a published story does not break if the directory row is renamed or removed.

`story` is written once by the awardee and never overwritten. Admin edits land in `body`, which the public pages prefer and fall back from. The original submission is always recoverable — the same principle `member_posts` applies to its raw markdown.

**Constraints:**

```
constraint impact_stories_published_needs_slug check (
  status <> 'published' or (slug is not null and published_at is not null)
)
```

Without this, the public list could order by a null `published_at` and silently drop rows.

**Indexes:** `slug`; `(status, published_at desc)`; `profile_id`; `awardee_id`; `category`; `featured`.

**RLS:**

- public `select` where `status = 'published'`
- authenticated `select` where `profile_id = auth.uid()`
- authenticated `insert` where `profile_id = auth.uid()`
- authenticated `update` where `profile_id = auth.uid()` and `status in ('submitted','changes_requested')`
- service role full access

`updated_at` maintained by a trigger, following `handle_awardee_updated`.

### Categories

Four buckets. The eight groups named in the launch letter appear as helper copy under each, and the buckets double as the filter chips on `/impact`.

| Value | Label | Helper copy |
|---|---|---|
| `education` | Education | Scholarships, fellowships, research, academic milestones |
| `career` | Career | Leadership appointments, promotions, professional milestones |
| `enterprise` | Enterprise | Startups, businesses, products, jobs created |
| `community` | Community | Social impact, advocacy, community leadership, recognitions |

## Routes

| Route | Method | Purpose |
|---|---|---|
| `/impact` | — | Manifesto, featured story, filter chips, grid |
| `/impact/[slug]` | — | One story |
| `/api/member/impact-stories` | GET | The caller's own submissions with status |
| `/api/member/impact-stories` | POST | Submit a milestone |
| `/api/member/impact-stories/[id]` | PATCH | Edit while `submitted` or `changes_requested` |
| `/api/member/impact-stories/photo` | POST | Member photo upload |
| `/api/admin/impact-stories` | GET | Review queue, filterable by status |
| `/api/admin/impact-stories/[id]` | PATCH | Edit copy, set status, feature, publish |
| `/admin/impact` | — | Admin console — Queue and Published tabs |

The member photo route exists because `/api/uploads` is admin-gated and members currently paste a URL for post covers. Requiring an awardee to self-host a photo is where submissions are lost. It reuses `processUpload` with `PHOTO_PRESET` and writes to the uploads bucket under `impact/`, with the same size and type guards.

**Navigation:** a new **Impact** group in `app/components/Header.tsx` (desktop and mobile) holding *Impact Series* (`/impact`) and *Impact Interviews* (`/interviews`); a footer Quick Links entry in `app/components/Footer.tsx`; entries in `app/sitemap.ts` for `/impact` and every published slug.

## Public page — `/impact`

Server component, ISR `revalidate = 300`. Top to bottom:

1. **Dark hero** — `#05060f` with the orange radial wash used on `/interviews`. Eyebrow "Impact Series", headline *"Because Recognition Is Only the Beginning"*, one line of subcopy, two CTAs: *Share your milestone* (→ `/dashboard`, or `/login` when signed out) and *Read the stories* (→ the grid).
2. **Manifesto** — the launch letter in full, typeset as an editorial prose column rather than a wall of body text. The "Behind every achievement / opportunity / success" triad and the closing "This is just the beginning" break out as pull-quotes. The copy lives in `app/impact/_content/manifesto.tsx` as a component, not in the database: it is a founding statement, and it should not be possible to unpublish or let drift.
3. **Featured story** — large card with photo, pull-quote, headline, and awardee name · country · cohort. Chosen by `featured = true`, falling back to the most recently published.
4. **Filter chips** — All / Education / Career / Enterprise / Community. Client-side filtering over the already-fetched list; no extra requests.
5. **Grid** — 3 columns desktop, 2 tablet, 1 mobile. Card: photo, category badge, headline, name · country · cohort, date achieved. Whole card links to the detail page.
6. **Empty state** — the page launches with zero published stories, so this is the state most first visitors see. The grid is replaced by *"The first stories are being collected. If you've achieved something, tell us."* with the submit CTA.
7. **"What we're looking for"** — the eight groups from the letter as a checklist, in warm `orange-50` cards with `orange-100` hairline borders.
8. **Closing CTA band** — submit prompt plus a cross-link to Impact Interviews.

## Detail page — `/impact/[slug]`

Breadcrumb → category badge and headline → photo → author card linking to `/awardees/[slug]` → pull-quote → body (falling back to `story`) → *In their words* advice block → proof and LinkedIn links → share row → three related stories in the same category → submit CTA.

`generateMetadata` sets title, description (first 160 characters of `body`/`story`), and the OG image through the existing `/og` share-card system. `generateStaticParams` pre-renders published slugs. Unknown slug → `notFound()`.

## Dashboard — "Share your impact"

The section id `featured` becomes `impact` in `DashboardSection`, labelled **Share your impact**. The component moves out of `app/dashboard/page.tsx` into `app/dashboard/impact-section.tsx`, matching `posts-section.tsx`, `groups-section.tsx` and `awards-section.tsx`. `page.tsx` is already past 1,200 lines; adding a richer section inline would make it harder to work in, and the existing sections establish the pattern.

Contents:

1. **Greeting** — a condensed version of the manifesto (opening, the three "behind every" lines, the invitation to share) so the ask has its context attached.
2. **Form** — category (four options with helper copy), headline, organisation, date achieved, story (150–2000 chars with a live counter), then an optional block: photo upload, proof link, LinkedIn, advice.
3. **Your submissions** — each with live status: *Submitted*, *In review*, *Changes requested* (with the admin's `admin_note` and an edit button), *Published* (linking to the live story), *Declined* (with the note).

The existing `FeaturedPreviewModal` is retargeted to introduce this section on first open. A prompt card on dashboard home reads *"Achieved something recently? Share it."* and deep-links here.

`FeaturedSection` and the `member_features` client call are removed from `page.tsx`; the API route and table remain for the historical rows.

## Admin console — `/admin/impact`

Two tabs, following `/admin/interviews`:

- **Queue** — `submitted` and `changes_requested` rows, newest first. Opening one shows the submission verbatim alongside an editor for `body`, `pull_quote`, `headline`, `photo_url` and the directory link (`awardee_id`). Actions: *Request changes* (requires a note), *Decline* (requires a note), *Publish*.
- **Published** — published and approved rows. Toggle `featured`, edit copy, unpublish back to `approved`.

Publishing generates the slug from the headline, sets `published_at`, and stamps `reviewed_by`.

## Other placements

- **`/awardees/[slug]`** — an *Impact* strip listing that member's published stories. This is the payoff that makes submitting worth doing.
- **Homepage** — a *Latest impact* band with the three most recent published stories, linking to `/impact`.
- **Dashboard home** — the submission prompt card described above.

## Error handling and edge cases

- Inline field errors plus the existing toast pattern on the dashboard form; bounds enforced in `lib/impact/types.ts`, in both API layers, and by database check constraints.
- `sanitizeInput` on every text field; `lib/rate-limit` on submit and on photo upload.
- A member PATCHing a story that is already `approved` or `published` gets a 409. At that point it is edited editorial content; changes go through the admin.
- Photo upload rejects non-images and oversized files through `processUpload`'s existing guards.
- Slug collisions resolve with a numeric suffix.
- Profile deletion cascades stories away. A cleared `awardee_id` degrades to the denormalised `author_name` and `country`, so the story still renders — without a profile link.
- Every list surface has an explicit empty state.
- Unknown slug → `notFound()`.

## Testing

Vitest, following the existing suite layout under `tests/`:

- **Validation** — headline and story length bounds, category enum, required fields, at each of the three layers.
- **Status transitions** — publish requires a slug and `published_at`; a member cannot PATCH an `approved` or `published` row; `changes_requested` and `declined` require a note.
- **Slug generation** — headline → slug, and collision suffixing.
- **Public reads** — the public fetch returns published rows only, for every other status value.
- **Mapping** — row ↔ domain round-trip, including the `body` → `story` fallback and the null-`awardee_id` degradation.

## Out of scope

Email notification to the submitter on publish or decline (the in-dashboard status is the first pass), analytics beyond `view_count`, awardee-facing story analytics, and any change to the paid `feature_requests` product.
