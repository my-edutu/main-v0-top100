# Top100 Africa Future Leaders � Project Overview

Welcome! This document captures the full picture of the Top100 Africa Future Leaders web platform so new contributors can ramp up quickly.

## 1. Product Vision
- **Purpose**: Showcase Africa�s emerging leaders, highlight their achievements, and provide a vibrant content hub (blog, magazine, events) backed by an admin portal for the operations team.
- **Experience**: Public-facing marketing pages + searchable awardee directory + rich event archive, all powered by live data from Supabase.
- **Operations**: A role-gated admin workspace to curate awardees, blog posts, YouTube highlights, and events with real-time synchronisation to the public site.

## 2. Core Stack & Infrastructure
- **Framework**: Next.js 15 (App Router, React 18, server actions) running in Node 18+.
- **Language**: TypeScript throughout.
- **UI / Styling**: Tailwind CSS, shadcn/ui primitives (Radix UI), Lucide icons, Geist font.
- **State & Forms**: React state hooks, `react-hook-form`, `zod` for validation.
- **Realtime Backend**: Supabase (Postgres + Realtime) via `@supabase/supabase-js`.
- **Auth**:
  - Supabase Auth for session management and user authentication.
- **Data Access**: Supabase client + service role utilities, Prisma client available for future relational queries.
- **Tooling**: ESLint (Next.js default prompt pending), Prettier-aligned formatting via editor, Sonner for toasts, Date-fns for formatting.

Required environment variables (never commit secrets):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (+ optional database pool for Better Auth)
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (removed)
- `NEXTAUTH_SECRET`, `GITHUB_ID`, `GITHUB_SECRET` (removed)
- Optional `DEV_BYPASS` cookie for middleware short-circuiting.

## 3. Repository Map
```
app/             # App Router pages (marketing, auth, admin, API routes)
components/      # Global UI blocks (hero, footer, cards, shadcn re-exports)
content/         # Static markdown / rich text sources
hooks/           # Client hooks (e.g., data fetching, viewport tools)
lib/             # Backend clients, service helpers, auth, Supabase wrappers
prisma/          # Prisma schema + migrations (currently light usage)
public/          # Static assets (images, Excel seed files)
styles/          # Tailwind foundations
supabase/        # SQL schema + migration helpers
scripts/         # Data import/export utilities
```

### App Highlights
- `app/page.tsx`: Landing page assembling hero, awardees, magazine, events recap components.
- `app/events/page.tsx`: Public timeline with featured event spotlight, upcoming & past grids, Supabase realtime subscription for instant updates.
- `app/awardees/**`: Directory, profile detail pages, and client components for filtering.
- `app/blog/**`: Blog listing & detail pages.
- `app/magazine/**`: Curated magazine experience (static + dynamic content).
- `app/auth/signin|signup`: Branded authentication forms wired into Better Auth endpoints.
- `app/admin/**`: Auth-gated dashboard for staff operations (see section 6).
- `app/api/**`: Server routes for awardees, posts, YouTube links, events, and dev bypass helpers.

## 4. Data Layer & Supabase Schema
- **Database**: Supabase Postgres. Schema managed via `supabase/schema.sql` (idempotent guards keep re-runs safe).
- **Key tables**:
  - `public.profiles`: Canonical user profile. Auto-provisioned on Supabase auth sign-up. Includes metadata, social links, gallery, role (`user`/`admin`).
  - `public.awardees`: Legacy + curated awardee records. Linked to `profiles` via `profile_id`. Trigger keeps slugs in sync.
  - `public.user_notifications`: Dashboard alerts targeted per profile.
  - `public.events`: **New** events table with slug, schedule, location, registration info, feature flags, JSON metadata, and realtime publication membership.
- **Policy**: RLS is enabled on all tables. Public reads allowed for published data; writes restricted to service role.
- **Triggers**: `handle_profile_updated`, `sync_awardee_profile`, `handle_event_updated` keep `updated_at` columns current and auto-generate slugs.
- **Seed Data**: `public/top100 Africa future Leaders 2025.xlsx` powers initial awardee import (Excel utilities in `lib/excel-utils.ts`).

### Supabase Clients
- `lib/supabase/client.ts`: Browser client with realtime tuned to 10 events/second.
- `lib/supabase/server.ts`: Context-aware server client. Accepts `useServiceRole = true` to run privileged queries (API routes, admin operations).

## 5. Authentication & Authorization
- **Supabase Auth**:
  - Uses Supabase's built-in authentication system for user management.
  - Session handling through Supabase client.
  - User profiles are stored in the `profiles` table with role-based access.
- **Middleware** (`middleware.ts`):
  - Protects `/admin/**`. In dev, checks `dev_bypass=1` cookie.
  - Validates Supabase session ? loads profile ? ensures `role === 'admin'` else redirect to `/`.
- **Dev helpers**: `/api/auth/dev-bypass` sets the bypass cookie to fast-track local testing.

## 6. Admin Portal
Entry: `/admin` (Dashboard).
- **Dashboard (`app/admin/page.tsx`)**: Aggregates counts (awardees, posts, featured posts, YouTube assets), top countries/courses, quick actions. Uses Supabase fetchers and toasts.
- **Awardees (`app/admin/awardees/**`)**: CSV/Excel import, CRUD forms, image upload to Supabase Storage, status toggles.
- **Blog (`app/admin/blog/**`)**: Post creation/editing, featured toggles, live stats cards.
- **YouTube (`app/admin/youtube/page.tsx`)**: Manages video links for the homepage event reel.
- **Events (`app/admin/events/page.tsx`)**: Recently added. Enables create/edit/delete, publish/visibility toggles, feature flag, and immediate Supabase realtime refresh via `admin-events-sync` channel. Modal form handles schedule, location, tags, registration info.
- **Realtime**: Each admin page registers a Supabase channel to keep tables in sync without reloads.

## 7. Public-Facing Experience
- **Landing Page Components** (`app/components/**`):
  - `HeroSection`, `AwardeesSection`, `RecentEventsSection`, `MagazineSection`, etc.
  - `Header.tsx` updates include direct navigation to `/events`, with responsive menu + CTA buttons.
  - `RecentEventsSection.tsx` now links into the full events archive while preserving YouTube CTA.
- **Events Hub** (`app/events/page.tsx`): Featured spotlight card, upcoming grid, past highlights. Uses `supabase.channel("public-events-feed")` to auto-refresh when admin edits land.
- **Awardee Directory**: Searchable filters, detail pages with biography, achievements, gallery.
- **Blog & Magazine**: Story-driven content sections with hero imagery.

## 8. API Surface
- `app/api/awardees/route.ts`: Full CRUD + Excel bootstrap + Supabase Storage uploads (service-role client).
- `app/api/awardees/import/route.ts`: Bulk import pipeline.
- `app/api/posts/route.ts`: Manage blog posts (GET/POST/PUT/PATCH/DELETE) using Supabase.
- `app/api/youtube/route.ts`: Sync homepage reel entries (not shown above but part of dashboard operations).
- **New** `app/api/events/route.ts`: Validates payloads, enforces slug formatting, handles partial updates, scopes GET results based on `scope=admin` query.
- `app/api/better-auth/...`: Provided by Better Auth integration.
- `app/api/auth/dev-bypass`: Developer utility cookie setter.

## 9. Realtime & Notifications
- Supabase realtime channels keep admin views and public site synchronized (`admin-posts-sync`, `admin-awardees-sync`, `admin-events-sync`, `public-events-feed`).
- Postgres publication `supabase_realtime` updated to include the `events` table.
- Notifications table ready for in-app alerts (not yet surfaced in UI).

## 10. UI/UX System
- Tailwind design tokens configured in `tailwind.config.ts` with custom gradients, fonts, breakpoints.
- Shared UI components reside in `components/ui` (shadcn). Wraps Radix primitives with Tailwind classes (dialog, select, table, etc.).
- Iconography via `lucide-react`; `geist` supplies typography.
- Animations and interactions: `framer-motion`, `embla-carousel-react` for carousels, custom CSS effects for parallax backgrounds.

## 11. Development Workflow
1. **Install**: `npm install`
2. **Run locally**: `npm run dev`
3. **Lint**: `npm run lint` (Next.js 15 now prompts to migrate to ESLint CLI�complete the wizard and re-run).
4. **Build**: `npm run build`
5. **Start**: `npm run start`

### Environment Setup
- Copy `.env` / `.env.local`, populate Supabase + auth secrets.
- Provide Postgres `DATABASE_URL` if running Better Auth with persistence; otherwise it falls back to in-memory (sessions reset on restart).
- GitHub OAuth provider has been removed in favor of Supabase Auth only.
- Optional: set `dev_bypass` cookie via `/api/auth/dev-bypass/user` for admin testing without Supabase session flow.

### Database & Supabase
- Apply schema updates: `supabase db push` or run SQL in the Supabase dashboard.
- Storage bucket `awardees` needed for portrait uploads.
- Realtime enabled on `public.events`, `public.awardees`, etc.

## 12. Deployment Notes
- Target platform: Vercel or similar serverless Node environment.
- Ensure environment variables configured for production (`SUPABASE_SERVICE_ROLE_KEY`).
- Supabase service role must be treated as secret (never ship to client).
- Plan migrations: each change in `supabase/schema.sql` should be ported into Supabase migration history.
- Configure Better Auth `BETTER_AUTH_URL` to public domain for email links if enabling providers beyond credentials.

## 13. Testing Strategy
- **Current**: Manual QA via admin portal + realtime checks.
- **Next Steps**: Adopt ESLint CLI, consider Playwright smoke tests for admin flows, add Supabase seed fixtures for ephemeral environments.
- **Type Safety**: `types/` directory houses shared DTOs (e.g., `profile.ts`) to keep front + back aligned.

## 14. Future Enhancements
- Consolidated auth to use only Supabase Auth.
- Add role-based UI (e.g., content editors vs super admins).
- Surface `user_notifications` in dashboard UI.
- Integrate analytics dashboard (placeholder card already on admin home).
- Extend events with assets galleries and session-level breakdowns.

---

**Quick Reference**
- Primary data source: Supabase `public` schema.
- Admin access controlled via Supabase profiles (`role = 'admin'`).
- Real-time updates rely on Supabase channels�any new table must be added to the publication.
- Marketing site pulls from the same tables; admin changes propagate instantly thanks to shared API routes.

This About guide should evolve with the codebase�keep it current when introducing new pages, content types, or infrastructure changes.
