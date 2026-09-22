# Africa Future Leaders October 2026 Virtual Programme Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the editable, responsive October 2026 Africa Future Leaders virtual programme in the member dashboard and admin console, including one-hour sessions, one-speaker profiles, artwork, calendar export, and seeded schedule data.

**Architecture:** Keep the existing `events` and invitation system as the source of truth, add validated programme fields plus a normalized `programme_speakers` table, and expose a slug-based member detail route. Put calendar serialization and schedule validation in pure libraries, keep provider-specific UI client-side, and keep database/admin mutations behind the existing service-role/admin boundaries.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase/Postgres, Vitest, Tailwind CSS, `react-time-picker`, `react-clock`, and `add-to-calendar-button-react`.

**Spec:** `docs/superpowers/specs/2026-09-22-afl-virtual-programme-events-design.md`

## Global Constraints

- All seeded events use `Africa/Lagos` and run for exactly 60 minutes.
- The onboarding event is Saturday 10 October 2026; topic sessions run Sunday 11 October through Saturday 31 October 2026.
- One event supports zero or one speaker; unpublished speakers render as `Speaker to be unveiled`.
- Calendar entries are snapshots; the UI must not promise automatic updates to previously saved calendar copies.
- The existing events, invitations, RSVP, public events, admin authorization, and non-programme event behavior remain compatible.
- Member UI must work at 360px, 390px, 430px, tablet, and desktop widths with 44px touch targets and visible focus states.
- AI-generated artwork must be title-free background art with exact text added deterministically by code.
- Preserve unrelated user changes, including the existing `next-env.d.ts` modification.

## Review Focus

- A timestamp built from a WAT wall-clock value must not shift the session to the wrong UTC instant; test DST-free `Africa/Lagos` conversion and viewer-local formatting.
- Draft or unpublished speakers must never leak biography or profile data to member responses; test public/admin projections separately.
- An event card's navigation link and calendar control must remain independent on mobile; test click targets and accessible names.
- Calendar content must escape commas, semicolons, line breaks, URLs, stable UIDs, end times, and reminder alarms; test a title and description containing all of these characters.
- Existing invitations and non-programme events must continue to render when programme fields are null; test backward-compatible projections and ordering.

---

### Task 1: Programme domain, database migration, and calendar serialization

**Files:**
- Create: `supabase/migrations/20260922090000_afl_virtual_programme_events.sql`
- Create: `lib/events/programme.ts`
- Create: `lib/events/calendar.ts`
- Create: `tests/events/programme.test.ts`
- Create: `tests/events/calendar.test.ts`

**Interfaces:**
- Produces `PROGRAMME_SCHEDULE`, `PROGRAMME_SESSION_MINUTES`, `REMINDER_MINUTES`, `validateProgrammeEventInput`, `formatProgrammeDate`, `buildCalendarEvent`, and `toICS` for later API and UI tasks.
- Each `PROGRAMME_SCHEDULE` item includes `{ sessionNumber, slug, title, date, time, startAt, endAt, durationMinutes }`.
- `buildCalendarEvent(input)` accepts `{ id, title, summary, description, startAt, endAt, timezone, meetingUrl, speakerName, reminderMinutes }` and returns `{ uid, startAt, endAt, alarmTrigger, ics }`.

- [ ] **Step 1: Write failing schedule tests**

```ts
it('contains the onboarding and ten October sessions at approved times', () => {
  expect(PROGRAMME_SCHEDULE).toHaveLength(11)
  expect(PROGRAMME_SCHEDULE[0]).toMatchObject({ sessionNumber: 0, date: '2026-10-10', time: '16:00' })
  expect(PROGRAMME_SCHEDULE.at(-1)).toMatchObject({ sessionNumber: 10, date: '2026-10-31', time: '16:00' })
  expect(PROGRAMME_SCHEDULE.every((item) => item.durationMinutes === 60)).toBe(true)
})

it('rejects programme events longer than one hour', () => {
  expect(() => validateProgrammeEventInput({ startAt: '2026-10-11T16:00', endAt: '2026-10-11T17:01' })).toThrow('60 minutes')
})
```

- [ ] **Step 2: Run the focused tests and verify the expected missing-export failures**

Run: `npx vitest run tests/events/programme.test.ts`

Expected: FAIL because the programme module and schedule exports do not exist yet.

- [ ] **Step 3: Write the migration and minimal programme domain**

Add the `programme_label`, `session_number`, `learning_outcomes`, `timezone`, `reminder_minutes`, and nullable `speaker_id` columns to `public.events`; create `public.programme_speakers` with slug, identity, profile, URLs, status, timestamps, update trigger, RLS, and service-role policy. Add check constraints for programme duration metadata and reminder values. Implement the exact 11-item schedule, WAT formatting, and validation helpers.

- [ ] **Step 4: Write failing ICS tests, then implement the serializer**

```ts
it('serializes a stable UID, WAT event, escaped text, and one reminder alarm', () => {
  const result = buildCalendarEvent({
    id: 'event-1', title: 'Ideas, growth; and\nscale', summary: 'Line 1\nLine 2',
    description: 'Open https://example.test?a=1&b=2',
    startAt: '2026-10-11T15:00:00.000Z', endAt: '2026-10-11T16:00:00.000Z',
    timezone: 'Africa/Lagos', meetingUrl: 'https://meet.example.test/room',
    speakerName: null, reminderMinutes: 1440,
  })
  expect(result.uid).toBe('event-1@top100afl.com')
  expect(result.ics).toContain('DTSTART:20261011T160000')
  expect(result.ics).toContain('TRIGGER:-P1D')
  expect(result.ics).toContain('SUMMARY:Ideas\\, growth\\; and\\nscale')
})
```

Run: `npx vitest run tests/events/calendar.test.ts`

Expected: FAIL because `buildCalendarEvent` and `toICS` do not exist yet. Implement RFC-style escaping, stable UID, WAT display timezone, one `VALARM`, and a download-safe `text/calendar` payload without relying on browser APIs.

- [ ] **Step 5: Run the focused tests, then commit**

Run: `npx vitest run tests/events/programme.test.ts tests/events/calendar.test.ts`

Expected: PASS. Commit with `feat: add programme schedule and calendar domain`.

### Task 2: Event/speaker APIs, member projections, and calendar route

**Files:**
- Modify: `app/api/events/route.ts`
- Create: `app/api/events/[slug]/route.ts`
- Create: `app/api/events/[id]/calendar.ics/route.ts`
- Create: `app/api/admin/programme-speakers/route.ts`
- Create: `app/api/admin/programme-speakers/[id]/route.ts`
- Create: `lib/events/programme-api.ts`
- Modify: `lib/events/invitations.ts`
- Modify: `lib/events/invitations-client.ts`
- Create: `tests/events/programme-api.test.ts`

**Interfaces:**
- `toMemberProgrammeEvent(row)` returns the public event shape with `speaker: null | PublishedProgrammeSpeaker`, `programmeLabel`, `sessionNumber`, `learningOutcomes`, `timezone`, `reminderMinutes`, and `calendarUrl`.
- `toAdminProgrammeEvent(row)` returns all editable event and speaker fields for `/admin/events`.
- `GET /api/events/[slug]` returns one published public event or 404.
- `GET /api/events/[id]/calendar.ics` returns an accessible published event's ICS with `Content-Type: text/calendar; charset=utf-8`.

- [ ] **Step 1: Write failing projection tests**

```ts
it('hides a draft speaker from the member projection', () => {
  const result = toMemberProgrammeEvent({ id: 'e1', status: 'published', visibility: 'public', speaker: { status: 'draft', name: 'Hidden' } })
  expect(result.speaker).toBeNull()
})

it('keeps legacy events valid when programme columns are null', () => {
  expect(toMemberProgrammeEvent({ id: 'legacy', title: 'Legacy', speaker_id: null })).toMatchObject({ sessionNumber: null, speaker: null })
})
```

Run: `npx vitest run tests/events/programme-api.test.ts`

Expected: FAIL because the projection functions do not exist.

- [ ] **Step 2: Implement projections and extend existing events/invitations queries**

Keep `/api/events` public/admin filtering intact, select the new fields and the published-speaker relationship, and preserve the existing fallback to homepage events. Enrich invitation event rows with programme fields without changing RSVP mutation semantics.

- [ ] **Step 3: Implement member detail, calendar, and admin speaker route handlers**

Use Next.js App Router route handlers with `Response`/`NextRequest`, `requireAdmin` for mutations, and the existing Supabase server client. The calendar route must reject draft/private events and avoid leaking draft speaker data. Admin speaker routes must validate slug, URLs, status, biography, and portrait URL.

- [ ] **Step 4: Run focused plus existing event tests and commit**

Run: `npx vitest run tests/events`

Expected: PASS. Commit with `feat: expose programme event and speaker APIs`.

### Task 3: Admin programme editor and time-picker workflow

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `app/admin/events/page.tsx`
- Create: `app/admin/events/programme-speaker-form.tsx`
- Create: `app/admin/events/event-time-fields.tsx`
- Modify: `app/admin/admin.css`
- Create: `tests/admin/programme-event-form.test.ts`

**Interfaces:**
- `EventTimeFields` accepts `{ dateValue, timeValue, durationMinutes, timezone, onDateChange, onTimeChange, onDurationChange }` and emits browser-independent strings that `buildPayload` converts to the canonical timestamp.
- `ProgrammeSpeakerForm` accepts optional speaker data plus `onSaved(speaker)` and `onCancel()` callbacks.

- [ ] **Step 1: Add dependencies and write failing form validation tests**

Install `react-time-picker`, `react-clock`, and `add-to-calendar-button-react` using the existing package manager. Add tests for a 60-minute valid session, a 61-minute rejection, and a time change that retains the selected date.

```ts
it('allows exactly 60 minutes and rejects 61 minutes', () => {
  expect(validateProgrammeForm({ startAt: '2026-10-11T16:00', endAt: '2026-10-11T17:00' })).toEqual({ ok: true })
  expect(validateProgrammeForm({ startAt: '2026-10-11T16:00', endAt: '2026-10-11T17:01' })).toMatchObject({ ok: false })
})
```

Run: `npx vitest run tests/admin/programme-event-form.test.ts`

Expected: FAIL because the form helpers do not exist.

- [ ] **Step 2: Implement the clock-style field and admin validation**

Use `react-time-picker` with its clock UI, a native date input consistent with the current admin form, an explicit WAT label, duration display, reminder select, and inline validation. Preserve all existing event fields and invitation controls. Keep the time picker keyboard-accessible and avoid a horizontal overflow at narrow admin widths.

- [ ] **Step 3: Add speaker management and event selection**

Add a compact speaker editor/selector with portrait preview, draft/published state, biography fields, and a clear `Speaker to be unveiled` preview when no published speaker is selected. Save speakers through the admin endpoints before updating the event relationship.

- [ ] **Step 4: Run admin-focused tests, typecheck, and commit**

Run: `npx vitest run tests/admin/programme-event-form.test.ts && npm run typecheck`

Expected: PASS. Commit with `feat: add editable programme scheduling and speakers`.

### Task 4: Member programme timeline, detail, speaker profile, and calendar UI

**Files:**
- Modify: `app/dashboard/discover/events/page.tsx`
- Modify: `app/dashboard/event-invitations-section.tsx`
- Create: `app/dashboard/discover/events/[slug]/page.tsx`
- Create: `app/dashboard/discover/events/[slug]/loading.tsx`
- Create: `app/dashboard/discover/events/[slug]/not-found.tsx`
- Create: `app/dashboard/discover/speakers/[slug]/page.tsx`
- Create: `app/dashboard/discover/events/_components/programme-header.tsx`
- Create: `app/dashboard/discover/events/_components/programme-event-card.tsx`
- Create: `app/dashboard/discover/events/_components/calendar-action.tsx`
- Create: `app/dashboard/discover/events/_components/speaker-block.tsx`
- Modify: `app/dashboard/dashboard.css`
- Create: `tests/dashboard/programme-events.test.tsx`

**Interfaces:**
- `ProgrammeEventCard` accepts the member programme event shape and renders a separate `Link` plus calendar action.
- `CalendarAction` accepts `{ eventId, title, startAt, endAt, timezone, meetingUrl }` and opens the provider chooser or first-party ICS URL.
- `SpeakerBlock` accepts `speaker: PublishedProgrammeSpeaker | null` and owns the placeholder/published states.

- [ ] **Step 1: Write failing render tests**

```tsx
it('renders the speaker placeholder and keeps calendar action separate from event navigation', () => {
  const markup = renderToStaticMarkup(<ProgrammeEventCard event={fixtureWithoutSpeaker} />)
  expect(markup).toContain('Speaker to be unveiled')
  expect(markup).toContain('Add to calendar')
  expect(markup).toContain('/dashboard/discover/events/global-talent-playbook')
})
```

Run: `npx vitest run tests/dashboard/programme-events.test.tsx`

Expected: FAIL because the programme components do not exist.

- [ ] **Step 2: Implement the mobile-first timeline and cards**

Replace the empty-state-only composition with a programme hero, next-session panel, upcoming chronological list, completed section, and invitation-aware event cards. Use the existing dashboard shell and tokens, maintain the bottom navigation safe-area padding, and keep card links separate from the calendar control.

- [ ] **Step 3: Implement server-rendered event and speaker detail routes**

Use async App Router pages and `Link` navigation. Add loading and not-found states. Keep interactive calendar/RSVP elements in small client components rather than turning the full detail page into a client module. Show WAT plus viewer-local time where browser capability permits.

- [ ] **Step 4: Add provider calendar action and run tests**

Use `add-to-calendar-button-react` for provider options, with the first-party ICS endpoint as the deterministic fallback. Show the snapshot limitation in a small accessible hint. Run `npx vitest run tests/dashboard/programme-events.test.tsx tests/events` and commit with `feat: build member programme events experience`.

### Task 5: Generate and wire the coordinated programme artwork

**Files:**
- Create: `public/programme/afl-october-2026/` (eleven background assets)
- Create: `lib/events/programme-artwork.ts`
- Create: `app/dashboard/discover/events/_components/programme-cover.tsx`
- Create: `tests/events/programme-artwork.test.ts`

**Interfaces:**
- `PROGRAMME_ARTWORK` maps stable session numbers to project-local asset paths and alt text.
- `ProgrammeCover` accepts `{ sessionNumber, title, date, className }` and renders the image with deterministic text overlay.

- [ ] **Step 1: Write the artwork mapping test**

```ts
it('has one local cover and exact title metadata for onboarding and all ten sessions', () => {
  expect(Object.keys(PROGRAMME_ARTWORK)).toHaveLength(11)
  expect(PROGRAMME_ARTWORK[1].title).toBe('The Global Talent Playbook: How to Become Competitive Beyond Africa')
  expect(PROGRAMME_ARTWORK[10].path).toMatch(/^\/programme\/afl-october-2026\//)
})
```

Run: `npx vitest run tests/events/programme-artwork.test.ts`

Expected: FAIL because the mapping does not exist.

- [ ] **Step 2: Generate title-free orange-gradient background art with the built-in image tool**

Generate eleven project-bound raster backgrounds, one prompt per distinct motif, with no embedded text, no logos, no watermark, safe negative space for the deterministic overlay, and a unified 16:9 editorial style. Inspect each output, copy final assets into `public/programme/afl-october-2026/`, and retain only the selected final assets.

- [ ] **Step 3: Implement deterministic cover overlays and run the mapping test**

Use the project’s existing font stack and CSS overlay for exact session number, title, date, and `Virtual · 60 minutes`. Ensure the image has a meaningful alt label and the decorative background is not the sole carrier of event information.

- [ ] **Step 4: Run the artwork test and commit**

Run: `npx vitest run tests/events/programme-artwork.test.ts`

Expected: PASS. Commit with `feat: add October programme artwork system`.

### Task 6: Seed programme records and finish integration verification

**Files:**
- Create: `supabase/seed/20260922_afl_october_programme.sql`
- Modify: `docs/EVENTS_SETUP_GUIDE.md`
- Create: `tests/events/afl-october-seed.test.ts`
- Modify: `app/events/EventsPageClient.tsx` only if the enriched public projection requires a compatibility adjustment.

**Interfaces:**
- The seed is idempotent by event slug and sets all 11 events to `draft` until an administrator verifies meeting links, artwork, and speakers.
- The seed uses the exact schedule and one-hour end times from `PROGRAMME_SCHEDULE`.

- [ ] **Step 1: Write the failing seed-contract test**

```ts
it('defines eleven unique October programme slugs and one-hour UTC ranges', () => {
  const sql = readFileSync('supabase/seed/20260922_afl_october_programme.sql', 'utf8')
  const seeds = PROGRAMME_SCHEDULE.map((item) => ({
    slug: item.slug,
    start_at: item.startAt,
    end_at: item.endAt,
  }))
  expect(seeds).toHaveLength(11)
  expect(new Set(seeds.map((seed) => seed.slug)).size).toBe(11)
  expect(seeds.every((seed) => Date.parse(seed.end_at) - Date.parse(seed.start_at) === 60 * 60 * 1000)).toBe(true)
  expect(sql).toContain('afl-october-2026')
})
```

Run: `npx vitest run tests/events/afl-october-seed.test.ts`

Expected: FAIL because the seed contract does not exist.

- [ ] **Step 2: Add the idempotent seed and setup documentation**

Seed exact titles, descriptions, summaries, session numbers, dates, WAT timezone, one-hour end times, default 24-hour reminder, programme artwork paths, virtual status, draft status, public visibility, and empty speaker relationships. Document how an admin publishes the records after adding meeting links and speakers.

- [ ] **Step 3: Run focused and full verification**

Run: `npx vitest run tests/events tests/dashboard tests/admin && npm run typecheck && npm run lint && npm run build`

Expected: all commands exit 0. If the existing suite exposes an unrelated failure, record its exact test and preserve unrelated changes while fixing only regressions introduced by this feature.

- [ ] **Step 4: Browser-verify the running dashboard and admin UI**

Open `/dashboard/discover/events` and `/admin/events` at narrow phone, tablet, and desktop widths. Verify event navigation, speaker placeholder, calendar action, admin date/time picker, one-hour validation, no horizontal overflow, keyboard focus, and safe-area spacing. Commit with `feat: seed October virtual programme events`.

## Execution Notes

- Use the existing workspace and do not reset or discard `next-env.d.ts`.
- Before each production-code step, write and run the corresponding failing test; generated binary artwork is the only non-code exception.
- Keep the dev server available on port 3000 when browser verification begins; restart only the exact stale process if necessary.
- After all tasks, run a fresh full verification before claiming completion.
