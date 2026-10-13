# WhatsApp Member Groups Design

**Status:** Approved in chat; awaiting written-spec review  
**Date:** 2026-10-13

## Goal

Replace the member dashboard's in-app group chat experience with a simple way for approved Africa Future Leaders to discover and join one of three exclusive WhatsApp groups. Let members know about the groups through the dashboard notification bell.

The three destinations supplied by the user are:

1. `https://chat.whatsapp.com/CBxGOfyMbCP3YzceNrHLkm?mode=gi_t`
2. `https://chat.whatsapp.com/F8p9rErOr6VAYGZbhaske8?mode=gi_t`
3. `https://chat.whatsapp.com/FyQZI3OJ0OJJJpHW71lGeR?mode=gi_t`

## Member experience

- The existing Groups destination opens a WhatsApp group assignment page instead of the in-app group list and chat.
- The first time an approved member opens the page, the app randomly selects one of the three invite links, saves the assignment to that member's profile, and plays a short reveal animation.
- The reveal presents the member's assigned group and a **Join your WhatsApp group** action. The action opens the saved invite link in a new tab; joining remains a deliberate action in WhatsApp.
- Returning to Groups loads the saved assignment without re-randomizing. If assignment creation fails, show an error and a retry action; do not reveal a local-only or unsaved selection.
- Respect reduced-motion preferences and provide a clear, accessible text announcement of the result.
- Only authenticated, approved members can receive an assignment or see an invite link. Other membership states use the existing locked/access-denied experience.

No group-size balancing is required. Selection is a simple random draw among the three links, and group sizes may differ.

## Notification

- Add a one-time in-app notification for the approved member audience using the existing dashboard notification system.
- Suggested copy:
  - **Title:** Your AFL WhatsApp community is here
  - **Message:** Connect with fellow Africa Future Leaders. Open Groups to discover your assigned WhatsApp group.
  - **CTA:** Discover your group
  - **Destination:** `/dashboard/discover/groups`
- Use a stable campaign identifier so rerunning delivery cannot create duplicate announcements for a member.
- The announcement CTA stays inside the dashboard. The external WhatsApp link is only shown after the member's assignment is resolved.

## Assignment and persistence

- Add a small assignment table keyed uniquely by the member profile ID, with a constrained group key and assignment timestamp. Keep invite URLs in server-owned configuration and return only the assigned destination to the authenticated member.
- Add an authenticated member endpoint that validates approved membership, creates the random assignment on first request, and returns the existing assignment on later requests.
- Make assignment creation concurrency-safe: simultaneous first visits for one profile must converge on one saved row and one group key. A database uniqueness constraint is the final guard against duplicate assignment rows.
- Create the assignment on the member's first visit, as approved in chat.
- Keep assignment separate from membership in WhatsApp. The app cannot verify whether a member joined the external group.

## Route and implementation boundaries

- Replace the user-facing Groups route and its group-detail route behavior with the WhatsApp assignment experience; the Groups entry remains in dashboard navigation.
- The current in-app `GroupsSection` chat interface is no longer the member-facing Groups experience.
- Keep the feature focused on invite assignment, reveal, external join action, and the one-time announcement. Do not add group chat, group-size administration, or a group picker.
- Use the repository's existing Supabase server-client, authenticated member API, notification, and dashboard UI patterns.

## Failure and security behavior

- Never accept a member ID or invite URL from the browser as authoritative. Resolve the signed-in member server-side and select from the three fixed destinations.
- Do not expose all three invite links in the page payload or notification.
- If the database migration has not been applied or assignment persistence is unavailable, show a retryable setup/error state without choosing a different group in the browser.
- Escape or validate all stored group keys against the fixed three-key allowlist before resolving an invite URL.

## Assumptions

- “Users” means authenticated dashboard members with approved membership status, matching the current community access policy.
- Each member gets one random assignment, saved permanently unless a future explicit reassignment workflow is designed.
- The three links have no human-readable names supplied yet, so the reveal can identify them as Group 1, Group 2, or Group 3 unless product copy is provided before implementation.
- The initial announcement targets members approved when the one-time campaign is delivered. Newly approved members can still access Groups from dashboard navigation.

## Review checklist

- [ ] Groups opens the WhatsApp assignment flow rather than in-app chat.
- [ ] A member's first visit generates exactly one server-persisted random assignment.
- [ ] Repeat visits return the same assignment and link.
- [ ] The three supplied links are the only possible destinations, with no balance logic.
- [ ] The animation reveals the assigned group and respects reduced-motion preferences.
- [ ] The CTA opens only the assigned WhatsApp invite after a deliberate click.
- [ ] The bell announcement links to the Groups route and is deduplicated per member.
- [ ] Unapproved members cannot obtain assignments or invite links.
