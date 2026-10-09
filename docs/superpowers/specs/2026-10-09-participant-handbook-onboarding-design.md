# 2026 Participant Handbook Onboarding Design

## Goal

Make the 2026 Africa Future Leaders Participant Onboarding & Programme Handbook easy to find in the member inbox, a one-time dashboard popup, and the awardee onboarding checklist, with a distinct message and purpose in each place.

## Audience and success

The initial audience is current approved 2026 awardees. Do not target pending claims, applicants, or unrelated members. The existing profile cohort field and linked awardee year must be checked against production values before resolving or sending to recipients. The rollout should expose the intended recipient count before any one-time broadcast is sent.

Success means an eligible member can open the same branded PDF link from any surface, dismiss the popup without losing dashboard access, and separately acknowledge reading the handbook in the checklist. Notification read state, popup dismissal, and handbook acknowledgement are distinct states.

## Handbook asset

Use the supplied 10-page PDF as the source document. Publish it as a versioned, same-origin static asset at `/handbooks/2026-participant-handbook.pdf`, preserving its visual layout. The current file is approximately 10.8 MB; assess whether it can be safely optimized for mobile download without changing its content or legibility. Keep the stable path in one shared handbook configuration so the notification, popup, and checklist cannot drift to different files.

The handbook includes programme dates and award information. Present it as a guide and retain its statement that dates and arrangements may change with official programme updates. Do not restate payment or attendance conditions as new application rules.

## Three surfaces and UX writing

Each surface uses the same PDF destination, but the copy serves a different job.

### In-app notification

- **Title:** Your 2026 participant handbook is ready
- **Message:** Find your first steps, programme information, and key dates in one guide.
- **CTA:** Open handbook
- **Purpose:** A concise announcement that remains in the member's notification inbox. Marking it read does not complete the handbook checklist item.

Use the existing member notification inbox and `user_notifications` table. Extend the existing broadcast flow to store a validated CTA label and URL. The notification CTA opens the branded static PDF path. Browser push may mirror the short announcement for opted-in recipients; the in-app inbox remains the durable copy.

### Dashboard popup

- **Eyebrow:** START HERE
- **Title:** Your next steps are in one place.
- **Message:** Your selection is the beginning. The 2026 handbook explains how to get oriented, build your profile, stay connected, and prepare for what’s ahead.
- **Primary action:** Read the handbook
- **Secondary action:** Read later
- **Purpose:** A warm, one-time introduction that gives context before linking to the document. It never blocks dashboard access.

Show it after the existing Top100 Moment welcome has completed or been dismissed, so two dialogs never overlap. Persist that the prompt was shown or dismissed separately from handbook completion. Members who already completed the existing welcome still receive the handbook prompt once.

### Onboarding checklist

- **Task:** Read the 2026 participant handbook
- **Supporting text:** Review the first steps, programme timeline, and where to find help.
- **Action:** Open guide
- **Completion action:** I’ve read it
- **Purpose:** A practical, trackable next step. Opening the PDF alone does not claim that the member read it.

Add this as a core checklist item and update the progress total. Keep the completion action explicit and persist it independently from popup dismissal and notification status.

## Architecture and state

- Store the PDF as a versioned public asset in the existing app; use a branded same-origin URL. Do not create another database, Supabase project, or storage service.
- Extend the existing `awardee_onboarding_progress` table with nullable `handbook_prompt_seen_at` and `handbook_read_at` timestamps. Set the prompt timestamp when the dialog is presented; dismissing it must not mark the handbook read. Do not modify awardee or applicant records to make them eligible.
- Extend the existing journey RPC and authenticated member API to read and save the new progress fields, preserving its current service-role boundary and validation.
- Extend the existing admin broadcast flow only as needed to support a CTA and the approved 2026 cohort. Validate the URL as a local handbook path, resolve the audience server-side, and return the resolved count before delivery.
- Keep the one-time broadcast and repeat prevention explicit. A migration or page load must not silently fan out notifications. Use an admin-triggered send after the target count is reviewed; include a stable campaign key and enforce per-member deduplication in the existing notifications table so retrying cannot create duplicate member notifications.
- Use the existing checklist and dashboard welcome components. Add a small handbook prompt gate that queues after the Top100 Moment gate rather than creating a competing modal system.

## Failure handling and access

- If the PDF fails to load, keep the dashboard usable, show a retryable message, and preserve the checklist state.
- If progress saving fails, do not show a completed checklist state; explain that the acknowledgement was not saved and offer retry.
- If a cohort value is missing or ambiguous, exclude that profile from the broadcast rather than widening the audience.
- The PDF is public programme material. Do not include personal member data in the asset URL or notification metadata.

## Out of scope

- Rewriting or redesigning the handbook itself.
- Sending email or changing email preferences.
- Gating access to the dashboard on reading the handbook.
- Creating new user records, awardee records, databases, or a new notification subsystem.
- Changing award payment, festival attendance, or eligibility rules described in the handbook.

## Open implementation check

Before rollout, inspect actual production values for `profiles.cohort` and linked `awardees.year`; confirm the server-side cohort filter resolves only the approved 2026 awardees and show the recipient count to the admin before the one-time send.
