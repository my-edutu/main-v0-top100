# Past Sessions Archive Design

## Goal

Create a private learning library inside the awardee dashboard where approved members can revisit learning materials from previous Top100 Africa Future Leaders sessions. The archive should foreground this year's sessions, beginning with Day 1 and Onboarding, while retaining a path to older years such as 2024.

## Agreed scope

- Use the existing dashboard Event videos entry point; do not add a public homepage card.
- Add a Sessions landing page that organizes sessions by year and gives this year's sessions visual priority.
- Add a course-style page for each session, with clear sections for videos, presentations/slides, workshop resources, and written meeting recaps.
- Seed the archive with 2026 Day 1 and Onboarding session entries, plus a 2024 year group that can be populated with past sessions.
- Keep content editable through a typed in-repository content catalog. The site provides the presentation and links; the user supplies media and copy.

## Out of scope for the first release

- Admin dashboard, CMS, or in-app media upload workflow.
- Accounts, enrollment, progress tracking, quizzes, or certificates.
- Fabricated recordings or session notes. Empty resource sections should have a clear, restrained “materials coming soon” state until real content is supplied.

## Experience and routes

- `/dashboard/discover/event-videos` is the archive landing page. It uses the dashboard theme and generated workshop photography, highlights 2026, shows Day 1 and Onboarding first, and makes older years such as 2024 discoverable below.
- `/dashboard/discover/event-videos/[slug]` is a session detail page styled like a compact course. It includes session title, year/date and description when known, a main video area when a video exists, and grouped resource sections for presentations, workshop materials, and write-ups.
- When a resource category has no supplied content, omit the empty section or show the agreed coming-soon state; do not imply that media is already available.
- Unknown session slugs return the site's normal not-found experience.
- Both archive and detail routes verify the signed-in user's approved membership on the server. Client-side dashboard state is not an authorization boundary.
- Legacy `/sessions` URLs redirect into the dashboard and never render session data publicly. Dashboard shortcuts and promotions show the library to approved members only.

## Content model and updates

Store sessions in a typed data module, with stable slugs and fields for year, title, date (optional), summary, featured status, and resource arrays. Each resource has a title, type/category, and URL or local public asset path; optional descriptions and presenter/host labels can be added when known. The detail page renders only the resource types that are present.

Adding a future course consists of adding a session entry and its resource links/assets to this catalog. Use external video URLs or supported embed URLs for recordings and ordinary links for downloads and write-ups. Keep uploaded resources in private storage or use access-controlled links if the materials themselves must remain private; protecting the dashboard page does not change permissions on third-party URLs. No content should be invented to fill the initial Day 1 or Onboarding entries.

## Implementation boundaries

- Reuse and populate the dashboard's existing Event videos route and add an authenticated dynamic session detail route, backed by the shared typed catalog.
- Remove the public homepage initiative-card entry. Use the dashboard's existing cream, gold, and orange theme with a generated workshop photograph at the top.
- Use Next.js App Router pages and `next/link` for internal navigation; dynamic route parameters follow the installed Next.js version's async `params` convention.
- Keep static archive data server-rendered unless an interaction specifically requires client-side behavior.

## Risks and decisions

- Real asset URLs and exact session dates/titles are not yet supplied. The first content entries should use only the known labels “Day 1” and “Onboarding” and leave unknown metadata blank or clearly provisional.
- Large videos should be hosted by an appropriate video provider or existing media storage rather than embedded as oversized application assets.
- A future request for non-technical content editing would require a separate CMS or admin-upload design; it is not part of this first release.

## Acceptance criteria

1. The public homepage does not expose the session library.
2. Approved members can open the library from the dashboard; unauthenticated and unapproved visitors cannot render archive or session data.
3. The dashboard library makes 2026 the primary year and lists Day 1 and Onboarding before older sessions, with 2024 represented as an archive year.
4. Selecting a session opens a dashboard course-style page that can present video, slide/presentation, workshop, and text recap resources from the content catalog, while handling absent categories cleanly.
5. Unknown slugs use the site's normal not-found behavior, and metadata does not expose private session titles before authorization.
