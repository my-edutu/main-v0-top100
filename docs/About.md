# Top100 Africa Future Leaders — Project Handbook

This handbook captures the current state of the Top100 Africa Future Leaders platform so contributors, partners, and stakeholders can track progress and onboard quickly.

---

## 1. Where We Are Today (October 2025)

**Public experience**
- Reimagined homepage featuring hero spotlight carousel, featured stories, awardee highlights, vertical impact marquee, initiatives grid, FAQ accordion, partner CTA, and theme-aware styling.
- `/africa-future-leaders` route preserves the legacy landing experience for archive visitors.
- New `/initiatives/summit` deep-dive for the Future Leaders Summit with agenda, speakers, partner offerings, FAQ, and showcase CTA.
- Magazine hub refreshed at `/magazine` with dedicated copy, purchase flows for the 2024 digital & print editions, reader testimonials, and newsletter capture.
- Navigation updated with responsive header (mobile drawer with X toggle) and new “Top100 Africa Future Leaders” menu item.
- Footer now ships with a light/dark mode switch powered by `next-themes`.

**Key focus areas**
- Story-first marketing site that still reads well without live data thanks to curated mock content.
- Clear pathways into initiatives: Project100 Scholarship, Talk100 Live, Future Leaders Summit, Opportunities Hub.
- Consistent CTA language around “Register Interest”, “Become a Partner”, “Volunteer”, and “Apply to Showcase”.
- Theme support (light & dark) applied globally via CSS variables and Tailwind utilities.

---

## 2. Product Vision

- **Purpose:** Celebrate emerging African leaders, highlight their initiatives, and funnel partners into tangible collaborations.
- **Experience:** Public-facing marketing (home, awardees, blog, events, magazine, initiatives) plus private admin tooling.
- **Operations:** Authenticated workspace for the core team to manage awardees, editorial content, events, and partner campaigns.

---

## 3. Stack Summary

| Layer | Details |
| ----- | ------- |
| Framework | Next.js App Router, React 18 |
| Language | TypeScript end-to-end |
| Styling | Tailwind CSS, shadcn/ui, Lucide icons |
| State & Forms | React hooks, `react-hook-form`, `zod` |
| Data & Auth | Supabase (Postgres + Realtime, Auth) |
| Tooling | ESLint (Next defaults), Prettier formatting, Sonner toasts, date-fns |

**Environment variables** (never commit secrets):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- (Better Auth removed - using only Supabase Auth)

---

## 4. Repository Map

```
app/                  Next.js routes (marketing + authenticated)
│  ├─ components/     Section composites used on the homepage
│  ├─ initiatives/    Project100, Summit, Opportunities landing pages
│  ├─ magazine/       Magazine hub + edition archives (2024, 2025)
│  ├─ awardees/       Public directory + detail profiles
│  ├─ blog/           Articles listing & detail pages
│  ├─ events/         Event timelines and spotlight details
│  ├─ auth/           Sign-in / sign-up flows (Supabase Auth)
│  ├─ admin/          Staff dashboard (role-gated)
│  └─ api/            Route handlers (sessions, profiles, awardees, blog, events)
components/           Global UI primitives and shared shadcn exports
content/              Static markdown & long-form copy blocks
hooks/                Client hooks (auth guards, viewport helpers)
lib/                  Supabase clients, auth helpers, utilities
supabase/             SQL schema + migration scripts
prisma/               Schema placeholder for advanced relational queries
public/               Static assets (covers, partner logos, Excel seeds)
scripts/              Seed/import helpers (Excel processing)
```

---

## 5. Data Architecture

- **Database:** Supabase Postgres (schema managed in `supabase/schema.sql`).
- **Core tables:**
  - `profiles` — canonical user record with role (`user` / `admin`), social links, and metadata.
  - `awardees` — curated awardee entries linked to profiles; triggers keep slugs in sync.
  - `events` — public program events with schedules, locations, registration CTAs, JSON metadata.
  - `user_notifications` — queued dashboard alerts.
- **RLS:** Enabled across tables. Public read access is limited to published fields; writes require service role keys.
- **Triggers:** Maintain `updated_at`, generate slugs, and sync awardee/profile updates.
- **Realtime:** Publications configured for `awardees`, `events`, etc., allowing live updates in admin/dashboard.

---

## 6. Authentication & Authorization

- **Supabase Auth**:
  - Session management through Supabase client
  - User profiles and roles stored in the `profiles` table
- Role gating: Admin-only routes and dashboards rely on Supabase profile role checks.

---

## 7. Notable Features (Current Progress)

1. **Homepage 2.0**
   - Rotating hero spotlight with CTA buttons and mobile-first image treatment.
   - Featured stories cards with images and tags.
   - Awardee highlight list with compact cards.
   - Initiatives section now linking to live routes (`/initiatives/project100`, `/initiatives/talk100-live`, `/initiatives/summit`, `/initiatives/opportunities`).
   - Impact marquee (horizontal, looping) showing key stats.
   - Partner CTA, FAQ accordion, Newsletter capture, and themed call-to-action panel.

2. **Future Leaders Summit Page**
   - Dedicated summit narrative, why-attend cards, program tracks, day-by-day agenda.
   - Speaker & mentor grid, partner benefits, showcase application CTA.
   - Venue overview, impact metrics, FAQ, multi-CTA footer, and newsletter signup.

3. **Magazine Hub Overhaul**
   - Compelling hero copy and imagery.
   - Coverage highlights, testimonials, purchase options for 2024 digital/print editions.
   - Feature breakdown, reader community CTA, and upcoming edition teaser.

4. **Navigation & Theme**
   - Header redesigned for better mobile UX with toggling icon (Menu ↔ X).
   - Footer theme switch enabling light/dark palettes, with global CSS variable support.
   - Light-mode overrides ensure cards and gradients remain legible.

5. **Team & Partnership Storytelling**
   - Summit page now showcases the core team (Nwosu Paul Chibuike, Emmanuella Igboafu, Chinedu Daniel) with Join Top100 CTA.
   - Multiple routes close with partner and volunteer invitations.

---

## 8. Admin Dashboard (High-Level)

- Landing metrics widget, quick actions for awardee/blog/event creation.
- Reusable form patterns with `react-hook-form` + `zod`.
- Realtime updates on awardees and events.
- Future work: granular role-based UI (editors vs. super admins) and richer analytics.

---

## 9. Supabase & API Utilities

- `lib/supabase/client.ts` — browser client; realtime tuned for moderate event volumes.
- `lib/supabase/server.ts` — server client with optional service-role flag.
- `lib/api/` utilities standardize error handling and response patterns.
- Data import/export scripts rely on Excel templates for awardee seed data.

---

## 10. Testing & QA

- Current: manual QA across marketing pages and admin flows.
- Planned:
  - Extend ESLint coverage and enforce pre-commit formatting.
  - Add Playwright smoke tests for sign-in, awardee publish, and event creation.
  - Seed Supabase fixtures for preview deployments.

---

## 11. Deployment Checklist

1. Provision environment variables in Vercel (or chosen platform).
2. Run Supabase migrations (`supabase/schema.sql`) or apply equivalent SQL migrations.
3. (Better Auth removed - using only Supabase Auth)
4. Harden security: never expose `SUPABASE_SERVICE_ROLE_KEY` client-side.
5. Configure storage bucket (`awardees`) for media uploads if not already present.

---

## 12. Roadmap Highlights

- Build Talk100 Live standalone initiative page.
- Enrich Opportunities Hub with dynamic filters and submission forms.
- Integrate analytics dashboard into the admin home.
- Automate role promotion tooling for Supabase Auth users.
- Expand light/dark mode support across all inner routes (admin, blog detail, etc.).
- Add localized experiences (multi-language copy toggles).

---

## 13. Quick Reference

- **Primary datastore:** Supabase `public` schema.
- **Auth gate:** Supabase Auth + Supabase profile roles.
- **Realtime footprint:** Awardees, events, and future expansions.
- **Marketing alignment:** All marketing pages consume the same datasets the admin team curates—changes propagate instantly.
- **Theme readiness:** Light & dark palettes already wired; new components should stick to `bg-*` and `text-*` classes derived from CSS variables.

---

This document should evolve alongside the product. When shipping new pages, features, or infrastructure changes, update the relevant sections so the entire team stays aligned on scope and progress.+
