# AI Portfolio Cover Design

**Date:** September 4, 2026  
**Status:** Approved in conversation; awaiting written-spec review  
**Product:** Top100 Africa Future Leaders member dashboard

## Purpose

Give each authenticated member one guided way to create a premium, vertical Africa Future Leaders magazine cover from a real portrait. The member uploads one image, supplies the optional facts they want displayed, chooses Male or Female tailoring, receives two corporate portrait options, and selects one downloadable portfolio cover.

The feature must preserve the member's identity. It may change clothing, controlled lighting, and permitted background areas, but it must not intentionally change the face, skin tone, facial structure, age, expression, hair, or body identity.

## Product boundaries

- The output is a vertical 4:5 portfolio cover.
- The selected cover is stored separately from the member avatar. Selecting a cover never replaces `avatar_url`.
- The first release does not generate square, landscape, video, or print-bleed variants.
- Tailoring has exactly two member-selected values: `male` and `female`.
- The application never infers gender from the portrait or profile.
- Each member receives one generation set containing two options.
- A failed set may receive one failure retry. Admins can reset the allowance.
- The product does not initiate payment, shipment, or public publishing as part of generation.

## Member journey

1. The member opens `/dashboard/me/portfolio-cover` from the profile/BIO area.
2. The introduction explains what will and will not change, the two-option allowance, expected processing time, and how the uploaded image is handled.
3. The member uploads a JPG, PNG, or WebP portrait. The interface requires one visible person in a clear, chest-up composition and shows a fixed 4:5 crop guide.
4. The member explicitly selects `Male` or `Female` tailoring.
5. The member completes the optional cover form:
   - Name
   - School
   - CGPA
   - CGPA scale, defaulting to `5.0`
   - Degree class, such as `First Class`
   - Course or field
   - Country
   - Cohort or year
   - Professional headline
   - Short impact statement
6. Empty optional fields are omitted. They are not replaced with invented text.
7. The member confirms that they own or may use the photo, consent to AI processing, and understand that they must reject any result that does not look like them.
8. The system creates one generation job and shows durable progress that survives refresh.
9. Two portrait options appear side by side on desktop and in a vertical comparison on mobile. Each is already composed as a complete cover.
10. The member selects one option. The selected cover becomes their portfolio cover and can be downloaded as a PNG. The other option remains available until expiry but is never published automatically.

## Visual system

The reference is the visual hierarchy of a premium business magazine cover, not a copy of Forbes, Empire, or another publication's protected masthead.

Every member receives the same Top100-owned system:

- Vertical 4:5 canvas, exported at 1600 × 2000 pixels.
- `AFRICA FUTURE LEADERS` masthead using the existing Top100 brand rather than a third-party magazine name.
- High-contrast editorial portrait with a restrained charcoal, warm ivory, and Top100 orange palette.
- Member portrait remains the dominant element.
- A fixed typographic grid controls name, school, CGPA, degree class, field, country, cohort, headline, and impact statement.
- A layout engine collapses unused rows and rebalances spacing when fields are blank.
- The AI is never asked to render words, logos, credentials, or the masthead.
- The application composites all text and brand artwork after portrait generation, ensuring correct spelling and consistent placement.
- A standardized Top100 lapel badge may be composited only when it can be placed without covering the face, hands, or key clothing detail. The masthead remains the primary branding if badge placement is unsafe.

The two options are controlled variants rather than unrelated random covers:

- **Option A — Executive Charcoal:** dark corporate suit, neutral editorial lighting, understated orange accent.
- **Option B — Leadership Ivory:** warm neutral corporate suit, darker editorial backdrop, understated orange accent.

Both variants use the same crop, typography, information hierarchy, and identity-preservation rules.

## Architecture

### UI

- Add a portfolio-cover entry point to the existing dashboard profile/BIO section.
- Add `/dashboard/me/portfolio-cover` as a focused wizard with upload, details, generation status, option comparison, and selected-cover states.
- Reuse the existing warm-neutral dashboard system, rounded surfaces, high-contrast controls, accessible labels, reduced-motion behavior, and mobile navigation patterns.
- Keep the form state locally until generation begins. Once submitted, the persisted job becomes the source of truth.

### Server routes

- `POST /api/member/portfolio-cover/generations`
  - Authenticates the member.
  - Enforces same-origin mutation protection, feature flag, rate limit, allowance, consent, file constraints, and form constraints.
  - Creates the private source object and generation record.
  - Starts the configured image-edit provider.
- `GET /api/member/portfolio-cover/generations/current`
  - Returns the member's current generation, status, two signed option URLs, expiry, and selected cover.
- `POST /api/member/portfolio-cover/generations/[id]/select`
  - Verifies generation ownership and option membership.
  - Produces the final public cover asset, records it on the member profile, and schedules source/unselected cleanup.
- `POST /api/admin/portfolio-cover/generations/[id]/reset`
  - Requires an authenticated administrator and records who reset the allowance and why.

The member cannot provide another user's ID, storage path, output URL, or provider prompt.

### Provider boundary

Define a narrow server-only adapter:

```ts
type PortfolioPortraitProvider = {
  generateOptions(input: {
    source: Buffer
    tailoring: 'male' | 'female'
  }): Promise<[GeneratedPortrait, GeneratedPortrait]>
}
```

The first implementation uses OpenAI image editing behind this interface. Provider names, request IDs, and failure codes may be recorded for operations, but prompts, keys, and private signed URLs are never returned to the browser.

The provider receives a fixed, server-owned instruction. Members cannot add free-form appearance prompts. The only appearance control is Male or Female tailoring. Cover text is not included in the provider prompt.

### Deterministic composition

The AI produces portrait pixels only. A server-side renderer uses Sharp and bundled brand assets/fonts to produce both 1600 × 2000 PNG covers.

The renderer:

- applies the fixed crop and safe zones;
- draws the Top100 masthead and editorial accents;
- wraps and truncates user text within defined character limits;
- omits blank fields;
- prevents text from covering the protected face area;
- adds a subtle `Member supplied` marker to academic facts that were entered for the cover and not sourced from verified profile fields;
- stores the exact normalized form payload used to render the cover.

## Identity preservation

No generative model can guarantee perfect identity retention, so the product uses layered controls:

1. The upload guide requires a clear, front-facing, chest-up portrait with one person.
2. The server normalizes orientation, strips metadata, validates actual image bytes, and rejects images below the minimum usable resolution.
3. The provider call is an image edit, not text-to-image generation.
4. The server-owned instruction prohibits changes to face, skin tone, age, expression, hair, and body identity.
5. Where provider masking supports it reliably, the protected face/head area is excluded from editable pixels.
6. The application never performs biometric identification or stores a face embedding.
7. Members must explicitly select a result and are told to reject an altered face.
8. A `Neither looks like me` action records a quality failure and unlocks the one failure retry without publishing either result.

Face-preservation failure is a product failure, not a successful generation. It must not consume the member's successful-generation allowance.

## Data model

Add `portfolio_cover_url text` to `profiles` and a private operational table:

```text
portfolio_cover_generations
  id uuid primary key
  user_id uuid references profiles(id)
  status queued | processing | ready | selected | failed | rejected | expired
  tailoring male | female
  fields jsonb
  consented_at timestamptz
  source_path text
  option_paths jsonb
  selected_option integer nullable
  selected_cover_url text nullable
  provider text nullable
  provider_request_ids jsonb
  attempt_number smallint
  failure_code text nullable
  failure_message text nullable
  expires_at timestamptz
  created_at timestamptz
  updated_at timestamptz
```

Database constraints enforce valid statuses, tailoring values, option numbers, and attempt bounds. A partial unique constraint prevents more than one active job per member. Row-level security denies direct member writes; server routes use authenticated ownership checks and the service role.

## Storage and retention

- `portfolio-sources`: private bucket for normalized uploads.
- `portfolio-options`: private bucket for generated portraits and composed previews.
- `portfolio-covers`: public or CDN-readable bucket for the member-selected final cover only.
- Signed preview URLs are short lived.
- Original uploads, rejected sets, failed partial outputs, and unselected options are deleted after selection or within 24 hours.
- Operational generation rows retain status, normalized form facts, timestamps, and provider identifiers but not image bytes.
- Replacing a selected cover uses a new immutable object path. Old public covers are deleted only after the profile points to the new object.

## Validation and safety

- Accept only decoded JPEG, PNG, or WebP files, at most 8 MiB, with minimum dimensions appropriate for a 1600 × 2000 output.
- Strip EXIF and GPS metadata before storage or provider transmission.
- Enforce field lengths and normalize whitespace server-side.
- CGPA and scale are numeric strings with sensible ranges; the UI does not calculate or assert a degree class.
- Escape and render text as text; user values never become HTML, file paths, or provider prompts.
- Apply member and IP rate limits before expensive work.
- Reject concurrent jobs and replayed selection requests safely.
- Use generic member-facing provider errors and structured server logs without image contents or secrets.
- Run provider safety checks. Disallowed uploads fail before public output is created.
- Require explicit consent for sending the normalized portrait to the configured AI provider.

## Configuration and cost controls

Required when the feature is enabled:

- `PORTFOLIO_IMAGE_GENERATION_ENABLED=true`
- `OPENAI_API_KEY`
- `SUPABASE_PORTFOLIO_SOURCES_BUCKET`
- `SUPABASE_PORTFOLIO_OPTIONS_BUCKET`
- `SUPABASE_PORTFOLIO_COVERS_BUCKET`

Production readiness fails closed if the feature flag is enabled without its provider or storage configuration.

Cost controls:

- one active job per member;
- one successful two-option set per member;
- one quality-failure retry;
- admin reset with audit reason;
- fixed output size and quality;
- no member-authored visual prompts;
- provider request IDs for reconciliation;
- explicit timeout and retry classification so ambiguous failures do not silently create duplicate billable jobs.

## Failure behavior

- Unconfigured feature: show `Portfolio cover generation is not available yet`; do not display an enabled submit button.
- Invalid upload or form: keep the entered form and show the exact correctable field error.
- Provider unavailable or timed out: mark the job failed, preserve allowance, and offer retry when the failure is known not to have produced billable outputs.
- Refresh during processing: reload the persisted job and resume status polling.
- One option fails: do not present an incomplete set as the promised two-option generation. Retry the missing option internally within the bounded provider policy or fail the set.
- Storage failure after generation: mark the job failed and clean up partial objects; do not consume the successful allowance.
- Selection replay: return the already-selected cover idempotently.
- Neither option preserves identity: reject the set, delete outputs on schedule, and unlock the single quality retry.

## Accessibility and responsive behavior

- Every input has a visible label and helper/error association.
- Upload supports pointer, keyboard, and mobile photo selection.
- Generation status uses text and `aria-live`; progress is not communicated by animation alone.
- Options have descriptive selection controls rather than image-only click targets.
- The selected state is visible through label, border, icon, and screen-reader text.
- On mobile, the form and options remain single-column with the primary action above any fixed cookie notice.
- Reduced-motion users see static progress states.

## Testing and acceptance

### Automated

- Form normalization, optional-field omission, numeric CGPA validation, and text layout limits.
- Prompt construction permits only the two fixed tailoring values and never includes cover facts.
- Authentication, same-origin, feature-flag, rate-limit, quota, ownership, consent, and idempotency route tests.
- Provider adapter contract tests with mocked two-option, partial, timeout, and safety failures.
- Storage lifecycle tests for private sources/options and selected public cover cleanup.
- Renderer snapshot/dimension tests for full, partial, and minimal field sets.
- Production-readiness tests for feature-disabled and feature-enabled configurations.

### Browser

- Desktop and mobile upload/form journey.
- Refresh while processing.
- Two-option comparison and `Neither looks like me` retry.
- Selection, portfolio display, and PNG download.
- Empty optional fields produce a balanced cover with no placeholder copy.
- Existing avatar remains unchanged.
- Keyboard and screen-reader semantics for the complete wizard.

### Real-provider smoke test

Run only with an approved test portrait and test member. Verify:

- both results contain the same recognizable person;
- face, skin tone, age, expression, and hair are not intentionally changed;
- clothing is corporate and matches the selected Male or Female tailoring;
- no generated text or malformed branding appears in the portrait pixels;
- the deterministic overlay is spelled correctly and consistent across both options;
- source and rejected-option retention behaves as documented.

No real member portrait is transmitted during automated tests.

## Launch and rollback

1. Apply the migration and create all three buckets with the documented access policies.
2. Configure the OpenAI key and buckets in preview.
3. Keep `PORTFOLIO_IMAGE_GENERATION_ENABLED=false` in production.
4. Run automated gates and the approved real-provider preview smoke test.
5. Enable the feature for an internal/test allowlist first.
6. Confirm cost, latency, storage cleanup, and identity quality.
7. Enable production generation.

Rollback is the feature flag. Disabling it immediately blocks new expensive work while preserving already selected covers. In-flight jobs are allowed to settle into `ready` or `failed`; they are not automatically restarted. Existing avatars and BIO data are independent and remain unaffected.

## Definition of done

The feature is complete only when:

- the migration, storage policies, provider adapter, deterministic renderer, APIs, UI, admin reset, and readiness gate are implemented;
- automated tests, typecheck, lint, and production build pass;
- desktop and mobile browser journeys pass;
- a real-provider preview smoke test produces two identity-preserving options from an approved test portrait;
- selecting one cover updates the portfolio without changing the avatar;
- unused private images expire as specified;
- production remains disabled until the operator explicitly enables the feature.
