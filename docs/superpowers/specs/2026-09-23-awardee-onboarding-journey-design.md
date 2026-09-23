# Africa Future Leaders Awardee Onboarding Journey

**Date:** 2026-09-23  
**Status:** Design approved in conversation; awaiting written-spec review  
**Audience:** Authenticated Africa Future Leaders awardees

## 1. Objective

Replace the dashboard's short-lived `Your award is ready` prompt with a persistent, welcoming checklist that helps an awardee make the most of the programme. It should live near the top of the dashboard, in the space currently used by that prompt, and remain available until the awardee completes or intentionally dismisses individual optional steps. The experience is a self-paced guide, not a blocking onboarding wizard.

The journey brings together the founder's welcome, profile completion, a shareable member introduction, opportunities, an optional paid magazine feature application, and the existing award/certificate path. Progress must survive reloads and sign-ins, and each step must deep-link to the real existing product workflow.

## 2. Existing Product Surfaces and Constraints

- The dashboard home is `app/dashboard/_components/dashboard-home.tsx`. It currently combines the `AwardReadyWelcome` prompt, dashboard greeting, award callout, upcoming events, and shortcuts.
- `AwardReadyWelcome` is session-dismissed. It is not a suitable progress store for this persistent journey.
- `app/dashboard/_providers/dashboard-member.tsx` supports the initial profile-claim onboarding. This post-claim awardee journey is a separate experience and must not re-open or interfere with that flow on every login.
- Profile editing and avatar upload already exist in `app/dashboard/_sections/profile-section.tsx` and `/api/member/avatar`.
- Member posts are handled by `app/dashboard/posts-section.tsx` and its existing publish workflow.
- Opportunities are available at `/dashboard/discover/opportunities`.
- The magazine feature flow is at `/dashboard/me/feature` and currently gates submission on confirmed award payment. That gate must be replaced for this product: magazine application has its own separate payment, while award payment remains independent.
- Award payment is implemented separately in `lib/awards/payment-server.ts` and the member award checkout/webhook routes. Do not combine magazine fees with the award order or delivery flow.
- The user's planned Canva flyer is not yet supplied. The initial implementation needs a polished branded fallback and a replaceable, admin-managed flyer asset; it must not block the journey on receiving the Canva file.

## 3. Goals

1. Give every awardee a warm, polished, revisitable founder welcome.
2. Make useful next actions obvious without overwhelming the dashboard.
3. Make checklist completion reflect persisted product state rather than clicks or page visits.
4. Reuse existing profile, avatar, post, opportunities, magazine, and award workflows where possible.
5. Make the member's portrait usable in a branded, downloadable/shareable introduction graphic once the approved Canva template is available.
6. Guide members to share across LinkedIn, Facebook, and Instagram with the correct official AFL account/tag, while being honest about the limits of external social apps.
7. Charge and confirm the magazine feature fee independently before accepting an editorial application.
8. Provide accessible, responsive UI and admin-editable content/configuration for copy, social accounts, and flyer artwork.

## 4. Non-goals

- Replacing the existing initial account/profile-claim wizard.
- Automatically publishing posts to third-party social networks or claiming a social post was published when only a share window was opened.
- Requiring members to apply for a magazine feature, share publicly, or buy an award in order to use the rest of the dashboard.
- Changing award price, award checkout, delivery fee, certificate eligibility, or award fulfillment rules.
- Implementing the Canva flyer before its source design/approved assets are available. The implementation should provide a branded fallback and an admin configuration point.
- Assuming third-party payment redirects prove payment.
- Guessing official Instagram or Facebook account URLs. They remain unset until an administrator verifies and configures them.

## 5. Member Experience

### 5.1 Dashboard journey card

Place a compact journey panel at the top of the dashboard in the current award-prompt area. The card shows a human title such as `Your Africa Future Leaders journey`, a one-line description, core progress (`2 of 3 complete`), a visual progress indicator, and the next recommended action. The founder's welcome is the first step and can be reopened from the panel at any time. Progress counts only the welcome, profile, and introduction-post steps; optional opportunities, magazine application, and award/certificate milestones are visible as separate recommended actions and never hold core progress hostage.

On small screens, the panel must show the current action and progress before any expandable details. On larger screens it can show the checklist steps directly. Opening a step should not force a route change if a focused modal/drawer is clearer, but existing complex workflows should use deep links rather than duplicating forms.

Core onboarding steps, in order:

1. **A welcome from Paul Light** — read the welcome note and follow Paul on LinkedIn (the follow action is optional and not a completion requirement).
2. **Make your profile yours** — complete core profile fields and upload a profile image.
3. **Introduce yourself** — create and publish a member introduction post using the member's uploaded image and branded AFL artwork/template when available.

Recommended next actions, separate from core progress:

1. **Discover opportunities** — link to the existing discovery flow. Browsing is optional; do not mark complete merely because its route was opened. If a durable saved/applied action exists, show that activity as status, not as a prerequisite.
2. **Apply to be featured in the magazine** — explain the optional editorial opportunity, collect the independent feature fee, then unlock the application form only after verified payment.
3. **Get your award and certificate** — link to the existing Awards flow and show its true status. Completing core onboarding or magazine steps must not imply award payment or certificate fulfillment.

The dashboard can also include a separate `Keep exploring` group for programme events and community actions; these are not prerequisites in the three-step core journey.

### 5.2 Founder welcome note

The welcome opens as a full, readable letter page or modal with a clear close/back action and is always revisitable from the first checklist item. The content should be warm, specific, and substantial enough to feel like a personal welcome, not a tooltip. Proposed initial copy:

> **Welcome to Africa Future Leaders.**
>
> Dear Africa Future Leader,
>
> Congratulations on earning your place in this community. Your recognition is an important milestone, but I hope you will see it as the beginning of a larger journey: the work of becoming more intentional about the people you serve, the ideas you contribute, and the change you help make possible.
>
> Africa does not lack talent or ambition. We need more leaders who can turn both into enduring value—leaders who keep learning, build with others, make room for new voices, and stay with difficult problems long enough to create solutions that last. That is the standard this community invites each of us to pursue.
>
> Use this space to make your profile reflect who you are and what you are working toward. Share your ideas in your own voice. Explore opportunities with curiosity. Meet the other awardees, join the conversations, and offer the kind of help you would hope to receive. You do not need to have everything figured out before you begin; show up honestly, keep your commitments, and let your work speak over time.
>
> I am proud to welcome you. I look forward to seeing what you build, who you bring along, and how your leadership grows from here.
>
> With belief in what we can make possible together,
>
> **PAULLIGHT**  
> *Founder, Africa Future Leaders*

The signature must use a legible handwriting/script font already bundled with the app or a properly licensed local font added during implementation. It should be rendered as text, not baked into an image, and include an accessible text equivalent. Use the verified founder LinkedIn URL `https://www.linkedin.com/in/paul-light-/` for a `Follow Paul on LinkedIn` link that opens safely in a new tab. Welcome copy and signature/title should be manageable by an administrator or centralized editable content rather than repeated in components.

### 5.3 Profile step

Link to the existing profile editor. Show a concise list of the fields that matter to a strong awardee profile and its current completion state. Profile completion must be derived from server/member data and must not create a second copy of profile data. Avatar completion means a valid persisted avatar URL, not merely selecting a local file.

### 5.4 Introduction post and social sharing

The post step helps the member draft/publish a short introduction using their name, role, location/interest (where present), and optional member-written text. It may prefill a caption, but the member must be able to edit it before posting. Reuse the existing posts workflow and ensure the member explicitly submits/publishes.

Once the portrait-to-flyer template is provided and approved, render/download a personalized cutout flyer using that template. Until then, use a well-designed fallback card that does not pretend to contain a cutout portrait. Provide:

- `Copy caption` and `Download image` actions;
- share/open actions for configured LinkedIn, Facebook, and Instagram destinations where supported;
- the correct organization profile reference/URL in prepared copy and explicit instructions to select/tag the official `Africa Future Leaders` page in the third-party composer;
- an accessible reminder that Instagram may require saving the image and publishing from its app.

Verified social destination available now: Africa Future Leaders LinkedIn, `https://www.linkedin.com/company/top100africa/`. Instagram/Facebook links are admin-configurable and stay hidden until verified. Opening a social app or copying caption is not proof of publication. Mark the step complete only when the app's own post is published through the first-party workflow, or when the member explicitly confirms they shared externally; externally confirmed progress must be labeled `Marked complete by you`, not platform-verified.

### 5.5 Opportunities step

Deep-link to `/dashboard/discover/opportunities`. Preserve opportunity browsing as optional. If there is no durable saved/applied event suitable for progress, keep the step as an uncounted suggestion and do not invent completion state based on route views.

### 5.6 Magazine feature application and fee

The magazine feature is optional and has its own fee before the application form is submitted:

- NGN price: **₦10,000** (canonical minor units: **1,000,000 kobo**).
- USD price: **$10** (**1,000 cents**).

Use a country/currency decision consistent with the existing award checkout or ask the member to select NGN/USD; the server owns the canonical amounts. The browser sends only the allowed currency, never an amount.

Flow:

1. Show what the magazine feature includes and state clearly that editorial review/selection is not guaranteed by payment.
2. Select currency and begin a magazine-specific checkout.
3. Return to a truthful `Confirming payment` state; redirect alone is not proof.
4. After the signed/verified payment webhook confirms the exact amount, currency, member, and attempt, unlock the feature application.
5. Store the submitted application as a separate editorial application linked to the confirmed magazine payment, and show its review status.

Keep this ledger, checkout reference, webhook processing, idempotency, and application relationship isolated from `award_orders`, award payments, and delivery payments. Use a separate migration/schema entity (for example, `magazine_feature_orders` and `magazine_feature_applications`, naming to follow repository conventions), with member-scoped access and server-only payment mutations. Enforce one valid paid application entitlement per member unless product policy explicitly supports multiple magazine issues; make issue/campaign configurable for future editions. Do not reuse `hasConfirmedAwardPayment` for magazine feature access. Preserve the existing award-paid status and existing award fulfillment unchanged.

Currency amounts are fixed on the server: NGN `1000000` minor units and USD `1000` minor units. Persist the currency and amount charged on each payment attempt so future price changes do not rewrite history. Payment provider must match the existing approved provider integration pattern, with signature verification, amount/currency/reference checks, idempotent webhook handling, retry-safe state transitions, and no client-controlled payment confirmation.

### 5.7 Award and certificate step

Link to the existing Awards section. Show the actual state returned by the existing award flow (e.g. award fee unpaid/paid, delivery pending/in progress/completed, certificate unavailable/available) without changing rules. A member who has not yet paid can still complete the other onboarding steps. Journey progress reflects whichever award milestone is appropriate, while clearly distinguishing optional profile journey completion from official award/certificate eligibility.

## 6. Progress, Persistence, and Access Control

- Progress is member-specific and persists across browser sessions/devices. Do not use `sessionStorage` as the source of truth.
- Derive completion from existing persisted profile/avatar/post/opportunity/award data wherever possible.
- Store only journey-specific states that cannot be derived (welcome acknowledged, externally shared confirmation, editorial application state), with timestamps and provenance where appropriate.
- Any self-attestation is visibly labeled and can be changed/reset where practical.
- Core completion is the welcome, profile, and introduction-post steps only. Do not make optional follow/share/application/purchase actions, opportunity browsing, award payment, or certificate fulfillment prerequisites for core completion. Show their actual status separately.
- Enforce row-level security so an awardee can read/update only their own onboarding progress and applications. Admin/service-role writes remain server-side.
- Preserve state during retries and avoid duplicate payments, applications, or posts from repeated clicks.
- If profile or payment state cannot load, show an honest retryable unknown state; never default to complete.

## 7. Admin and Content Management

The welcome and social/flyer experience should not require a deployment to change routine content:

- Welcome heading, long-form content, founder display name/title, signature text, and founder LinkedIn URL.
- Step labels, descriptions, order, enabled state, and CTA destination, while preserving code-owned authorization and completion semantics.
- Magazine issue/campaign label, feature description, fixed NGN/USD prices (admin may update prices only through validated server configuration with historical attempts immutable), application fields, and application open/closed state.
- Official LinkedIn/Facebook/Instagram page URLs, with validation and preview. Unverified values remain unset.
- Approved flyer/template asset URL and version, with preview; fallback artwork remains available.

Payment prices and callback/webhook security settings must not be editable through unconstrained rich text or client state. If a suitable admin content surface does not exist, implement a narrowly scoped admin form or typed server configuration with documented migration/backfill rather than introducing a generic CMS.

## 8. Visual and Interaction Direction

- Refined, editorial welcome and journey card aligned with the existing orange/amber Africa Future Leaders brand and the dashboard's restored card styles.
- Clear hierarchy: greeting → current next step → compact progress → optional expanded checklist.
- Keep the dashboard useful while the journey is incomplete; do not obscure events, shortcuts, notifications, or bottom navigation.
- On mobile, make progress/action visible above the fold where practical, support safe-area padding, and avoid dialogs that exceed viewport height.
- Use meaningful focus order, accessible labels, keyboard controls, reduced-motion support, and sufficient contrast. Script typography is limited to the signature.
- Empty, loading, error, payment-pending, paid, application-submitted, and journey-complete states all receive designed treatments.

## 9. Data and API Boundaries

Prefer existing member/profile/post/opportunity/award sources for derived progress. Add a small member-owned journey progress table only for acknowledgement/self-attested states that have no canonical source. Use a distinct editorial application/payment schema for magazine applications and payment attempts.

All member reads/writes go through authenticated server routes/actions consistent with repository patterns. Payment creation, amount calculation, verification, application unlock, and webhook processing are server-side. Public settings expose only safe, approved URLs and published copy. Never expose payment secrets or provider credentials to the browser.

Before implementation, inspect the existing schema, RLS policies, payment provider configuration, admin settings/content patterns, and tests. Migration design must be additive, safely deployable, and include rollback considerations. This specification does not authorize applying migrations to the user's Supabase project.

## 10. Acceptance Criteria

1. A returning awardee sees the same persistent onboarding journey and real progress after reload/sign-in; the initial profile-claim wizard does not repeat after completion.
2. The founder welcome is substantial, readable on mobile and desktop, signed in a proper handwriting font, and has a working safe LinkedIn CTA.
3. Profile and avatar progress update from persisted profile state and deep-link to the existing editor.
4. A member can create/publish an introduction post, prepare/download the share asset, and use guided LinkedIn/Facebook/Instagram actions without any false claim of automatic tagging or publication.
5. Unverified Facebook/Instagram destinations are not shown as official destinations.
6. Magazine feature payment is separate from award payment at ₦10,000 or $10; no application can be submitted until a verified payment is associated with it.
7. Payment callbacks/redirects alone cannot unlock the application; webhook verification is signature-checked, amount/currency/reference-checked, and idempotent.
8. Magazine fee payment does not mark the award paid, trigger award fulfillment, or alter delivery state. Award payment and certificate rules continue to use their existing canonical state.
9. Admins can update the welcome/social/flyer/editorial campaign content without editing React components, and unverified assets/URLs can remain unset safely.
10. Journey, dialogs, sharing actions, form errors, and payment states work with keyboard, screen readers, reduced motion, and common mobile viewport widths.
11. Existing dashboard, profile, posts, opportunities, award payments, and event flows pass regression tests.

## 11. Implementation Sequence (for the subsequent plan)

1. Inspect current dashboard, member data, posts, opportunity interactions, feature workflow, admin settings, and payment architecture; map existing canonical completion signals.
2. Add migration(s), typed server-side models, and RLS for journey-only progress and isolated magazine payment/application state.
3. Implement and test magazine checkout/webhook/access gate independently from award payments.
4. Implement editable welcome/configuration and accessible, responsive journey UI in the current dashboard prompt location.
5. Connect existing profile, avatar, post, opportunities, magazine, award, and certificate routes/state to checklist actions.
6. Add guided share caption/image fallback and configuration for approved Canva asset and verified social URLs.
7. Validate desktop/mobile visual behavior, authenticated ownership, payment edge cases, and regression suite; document required provider/admin setup.

## 12. Open Implementation Dependencies

- Canva source design / cutout flyer template and any licensing/brand constraints (use fallback until delivered).
- Verified official Instagram and Facebook page URLs (keep those destinations unconfigured until supplied/confirmed).
- Confirm whether the magazine feature fee is one-time per member or per magazine issue. The initial design defaults to one paid entitlement per member for the current feature campaign, represented with an issue/campaign ID so future per-issue purchase policy can be enabled without conflating payment records.
- Confirm payment provider and USD settlement configuration during implementation inspection. Follow the existing approved payment provider unless its current integration cannot support the required currencies; do not silently switch providers.
