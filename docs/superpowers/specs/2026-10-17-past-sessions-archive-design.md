# Past Sessions Archive Design

## Goal

Create a public Sessions area where visitors can revisit learning materials from previous Top100 Africa Future Leaders sessions. The archive should foreground this year's sessions, beginning with Day 1 and Onboarding, while retaining a path to older years such as 2024.

## Agreed scope

- Add a Sessions card as the first card in the homepage initiative card row, making the row five cards wide.
- Add a Sessions landing page that organizes sessions by year and gives this year's sessions visual priority.
- Add a course-style page for each session, with clear sections for videos, presentations/slides, workshop resources, and written meeting recaps.
- Seed the archive with 2026 Day 1 and Onboarding session entries, plus a 2024 year group that can be populated with past sessions.
- Keep content editable through a typed in-repository content catalog. The site provides the presentation and links; the user supplies media and copy.

## Out of scope for the first release

- Admin dashboard, CMS, or in-app media upload workflow.
- Accounts, enrollment, progress tracking, quizzes, or certificates.
- Fabricated recordings or session notes. Empty resource sections should have a clear, restrained “materials coming soon” state until real content is supplied.

## Experience and routes

- `/sessions` is the archive landing page. It introduces the archive, highlights 2026, shows Day 1 and Onboarding first, and makes older years such as 2024 discoverable below.
- `/sessions/[slug]` is a session detail page styled like a compact course. It includes session title, year/date and description when known, a main video area when a video exists, and grouped resource sections for presentations, workshop materials, and write-ups.
- When a resource category has no supplied content, omit the empty section or show the agreed coming-soon state; do not imply that media is already available.
- Unknown session slugs return the site's normal not-found experience.
- The section and its pages are public and do not require login.

## Content model and updates

Store sessions in a typed data module, with stable slugs and fields for year, title, date (optional), summary, featured status, and resource arrays. Each resource has a title, type/category, and URL or local public asset path; optional descriptions and presenter/host labels can be added when known. The detail page renders only the resource types that are present.

Adding a future course consists of adding a session entry and its resource links/assets to this catalog. Use external video URLs or supported embed URLs for recordings and ordinary links for downloads and write-ups. No content should be invented to fill the initial Day 1 or Onboarding entries.

## Implementation boundaries

- Update the existing homepage initiative-card data/rendering so Sessions is first and the responsive grid accommodates five cards.
- Add the `/sessions` route and a dynamic session detail route, backed by the shared typed catalog.
- Use the repository's existing site shell, typography, colors, and navigation conventions. Keep the archive visually distinct as a learning library while remaining cohesive with Top100 Africa Future Leaders.
- Use Next.js App Router pages and `next/link` for internal navigation; dynamic route parameters follow the installed Next.js version's async `params` convention.
- Keep static archive data server-rendered unless an interaction specifically requires client-side behavior.

## Risks and decisions

- Real asset URLs and exact session dates/titles are not yet supplied. The first content entries should use only the known labels “Day 1” and “Onboarding” and leave unknown metadata blank or clearly provisional.
- Large videos should be hosted by an appropriate video provider or existing media storage rather than embedded as oversized application assets.
- A future request for non-technical content editing would require a separate CMS or admin-upload design; it is not part of this first release.

## Acceptance criteria

1. The homepage initiative row displays Sessions first and all five cards remain usable responsively.
2. The Sessions page makes 2026 the primary year and lists Day 1 and Onboarding before older sessions, with 2024 represented as an archive year.
3. Selecting a session opens a dedicated course-style page.
4. Session detail pages can present video, slide/presentation, workshop, and text recap resources from the content catalog, while handling absent categories cleanly.
5. Unknown slugs use the site's normal not-found behavior, and the pages are public and indexable.
