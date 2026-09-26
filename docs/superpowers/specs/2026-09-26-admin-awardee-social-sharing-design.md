# Admin Awardee Social Sharing Design

## Intent

Give Africa Future Leaders administrators a friendly way to spotlight awardees on the organisation's social channels. Admins select an awardee, use the awardee's existing public profile details and available portfolio cover, generate platform-appropriate copy with the existing OpenAI API key, edit and preview the result, and share it through the device/browser share sheet or manual download/copy fallbacks.

## Confirmed constraints

- Do not connect LinkedIn, Facebook, or Instagram accounts to the application.
- Do not publish, schedule, or claim a post was published through an API.
- An admin explicitly initiates every share. The device's share sheet may hand content to another app, but the application cannot verify that it was posted.
- Reuse the already configured OpenAI API key. Keep it server-only and do not change credentials.
- Use public awardee information only: name, public BIO, public profile URL, and public profile/portfolio cover image. Never send email, internal notes, payment details, or account metadata to OpenAI.
- Preserve existing admin authorization and existing profile/media ownership rules.
- Do not modify the separate portfolio-cover generator as part of this feature. Consume the currently persisted cover/profile image and make missing-media states explicit.

## Product flow

1. Admin opens a new Social Sharing workspace and searches/selects an awardee.
2. The workspace previews the public name, BIO, profile URL, and current portfolio cover. If a cover is unavailable, it clearly labels the available profile photo fallback; it does not invent or silently fabricate artwork.
3. Admin selects LinkedIn, Facebook, or Instagram and asks OpenAI for a draft tailored to that platform. The output is editable before saving or sharing. The prompt may improve clarity and fit but must preserve supplied facts, avoid unsupported claims, and not invent achievements.
4. Admin previews the selected image, caption, and profile link, then saves a draft or chooses Share.
5. Where supported, Share uses the Web Share API and includes the image file, caption, and profile URL. If sharing files is unsupported or unavailable, the interface offers Copy caption, Download image, and Copy profile link. It explains that the admin must finish publishing in the chosen social app.
6. After publishing externally, the admin may manually mark the share as posted and optionally save the public post URL. Opening or completing the share sheet is not itself recorded as proof of publication.

## Admin experience

- Add `/admin/social` as a focused Social Sharing destination in the existing admin shell.
- Use a search-first awardee selector and a clear empty state when profile details or imagery are missing.
- Keep the primary hierarchy task-first: select awardee, choose platform, edit caption, review image, then share/save.
- Show each platform's draft in an accessible tab or selector; preserve independent copy per platform.
- Keep pending, retry, unavailable, and saved states explicit. Prevent duplicate generation/share actions while an operation is in flight.
- Add a saved-drafts/history list with awardee, platform, updated date, and truthful status (`draft` or manually `marked posted`). A manually added public post URL is a reference, not verified API evidence.
- Use responsive admin primitives and accessible keyboard/focus behavior. No social-account connection settings are added.

## Backend and persistence

- Add an additive Supabase migration for an admin-owned social-share draft record. Store an immutable awardee/profile association where available, a safe snapshot of public name/BIO/profile URL/image URL, platform-specific captions, status, creator/updater admin IDs, timestamps, and optional manually supplied post URL/time.
- Restrict reads and writes to the server-side admin API using the existing `requireAdmin` guard. Browser clients must not write rows directly; enable RLS and deny anon/authenticated mutation access unless a narrower read policy is justified by the implementation.
- Add admin endpoints for listing awardees/drafts, generating a caption, saving/updating a draft, and manually recording that an admin posted externally. Derive admin identity server-side and validate IDs, platform enums, input lengths, URLs, and status transitions.
- OpenAI calls run server-side with bounded input/output, timeout, and safe user-facing error messages. Return plain validated caption content only; do not expose the API key, provider payload, or internal prompt data to the client.
- Keep social share delivery out of backend persistence: the backend stores drafts and manual admin confirmations only. There are no tokens, OAuth callbacks, posting jobs, cron tasks, or social webhook handlers in this scope.

## Sharing semantics and failure handling

- Treat `navigator.share` fulfillment as “share sheet completed,” never “published.” Cancellation is neutral and should not create a published state.
- Check file-sharing support before attaching the image. If unsupported, preserve the caption and offer separate copy/download controls.
- Use only public, fetchable media URLs. Handle failed image fetch/share by keeping caption and profile-link actions available.
- “Mark as posted” is a deliberate admin action and stores `marked_posted_by`, `marked_posted_at`, and an optional validated public URL. The UI labels it “Marked posted by admin” to distinguish self-report from verified delivery.
- AI output remains a draft until an admin edits/saves or shares it. Generation failure must preserve any existing user edits.

## Not in scope

- Connecting or storing Meta/LinkedIn credentials.
- API-based publishing, scheduled delivery, automatic retries to social platforms, engagement analytics, or platform post verification.
- Generating new images with AI or replacing the portfolio-cover generation workflow.
- Editing awardee source profiles from the Social Sharing workspace.

## Acceptance criteria

- An authorized admin can find an awardee, see their public data/image, generate/edit platform-specific copy, save/reopen a draft, and share or use manual fallback actions.
- Unauthenticated and non-admin requests cannot list or mutate drafts or trigger OpenAI generation.
- OpenAI receives only public profile fields and cannot write invented facts into persistence without admin review.
- Share-sheet success/cancel/failure states are truthful and do not fabricate external publication.
- Manual post tracking is explicitly labeled as admin-reported and can include an optional public URL.
- No platform credentials, direct-posting calls, scheduled jobs, or posting claims are introduced.
- The mobile and desktop admin experiences keep the awardee, image, caption, and primary actions usable and accessible.

## Open implementation detail

The implementation plan should confirm the canonical awardee/media query and available profile URL builder in the active checkout, then select migration/RLS details and the exact OpenAI text endpoint/model configuration. It must not assume all awardees have a generated portfolio cover.
