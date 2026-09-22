# SDD ledger — plan: docs/superpowers/plans/2026-09-22-afl-virtual-programme-events.md

Pre-flight: Task 1 produces programme schedule and calendar interfaces consumed by Tasks 2, 3, 4, and 6; Task 2 produces member event shapes consumed by Tasks 4 and 5; Task 3 consumes Task 1 validation and Task 2 admin APIs; Task 5 consumes Task 1 session numbering and Task 4 cover props; Task 6 consumes Task 1 schedule and Task 2 projections. No interface conflicts found against the approved spec.

Ruling: Execute natively in the current workspace — the user explicitly requested implementation here, and no subagent runner is available as a callable tool.

Task 1: in_progress

Ruling: Update `supabase/schema.sql` alongside the forward migration — it is the repository's setup baseline and omitting the new programme fields would make fresh environments diverge from migrated environments.

Task 1: complete — 39 event tests pass; programme schedule, one-hour validation, WAT calendar serialization, migration, and setup baseline are committed.

Task 2: in_progress

Task 2: complete — 42 event tests and TypeScript typecheck pass; public/admin projections, slug detail route, calendar route, and speaker admin routes are committed.

Task 3: in_progress

Ruling: Replace the deprecated `add-to-calendar-button-react` wrapper with maintained `add-to-calendar-button` v3 — npm explicitly marks the wrapper deprecated and the direct package supports current React/Next usage.

Task 3: complete — 44 admin tests and TypeScript typecheck pass; maintained calendar dependency, clock-style WAT scheduling fields, one-hour validation, reminder controls, and editable speaker form are committed.

Task 4: complete — 25 dashboard/event test files pass; member timeline cards, programme detail route, speaker profile route, responsive styles, placeholder speaker state, and calendar actions are implemented.

Task 5: in_progress
