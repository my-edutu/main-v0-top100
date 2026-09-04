# AI Portfolio Cover and Top100 Dashboard Theme Implementation Plan

> **Status:** Approved for implementation on 2026-09-04.
> **Design source:** `docs/superpowers/specs/2026-09-04-ai-portfolio-cover-design.md`
> **Launch posture:** The feature must remain disabled in production until the migration, storage policies, environment variables, and one consented real-provider smoke test have passed.

## Outcome

Members can upload one portrait, select only **Male** or **Female** tailoring, optionally enter the facts they want displayed, receive two vertical Top100 magazine-cover options, select/download/share one cover, or reject both. The original avatar is never changed. The dashboard keeps its existing information architecture while adopting a consistent Top100 yellow-gradient and white visual system.

## Non-negotiable constraints

- The AI may change clothing and supporting studio treatment only. It must not intentionally alter facial identity, skin tone, hair, age, body shape, or facial features.
- User facts are rendered by our application, never generated into the image by the model. Empty optional fields are omitted.
- Tailoring accepts exactly `male` or `female`; it is explicitly selected by the member and never inferred.
- Output is vertical 4:5 at 1600×2000. Two fixed variants are generated: Executive Charcoal and Leadership Ivory.
- A member gets one successful two-option set and one provider/quality-failure retry. Admin reset is explicit and audited.
- Source photos and unselected options are private. Only a selected final cover is copied to a public delivery bucket. The profile avatar remains untouched.
- Production fails closed when the flag or required provider/storage configuration is missing.
- No user-authored image prompt, biometric model, face embedding, or identity classifier is introduced.

## Task 1: Domain contract, validation, and generation policy

**Files**

- Create `lib/portfolio-cover/types.ts`
- Create `lib/portfolio-cover/validation.ts`
- Create `lib/portfolio-cover/policy.ts`
- Create `tests/portfolio-cover/validation.test.ts`
- Create `tests/portfolio-cover/policy.test.ts`

**Contracts**

```ts
type PortfolioTailoring = 'male' | 'female'
type PortfolioVariant = 'executive-charcoal' | 'leadership-ivory'
type PortfolioGenerationStatus =
  | 'queued' | 'processing' | 'ready' | 'selected'
  | 'failed' | 'rejected' | 'expired'

type PortfolioCoverFields = {
  name?: string
  school?: string
  cgpa?: string
  degreeClass?: string
  fieldOfStudy?: string
  country?: string
  cohort?: string
  headline?: string
  impactStatement?: string
}
```

**Steps**

1. Write failing tests for strict gender selection, trimmed/omitted blank fields, bounded strings, valid CGPA formats/scales, image size/type rules, and unknown-key rejection.
2. Implement Zod schemas and a normalization function that never invents missing values.
3. Write failing tests for one active job, one successful set, failure-retry eligibility, rejection behavior, and admin reset eligibility.
4. Implement pure policy helpers and error codes suitable for HTTP mapping.
5. Run `npx vitest run tests/portfolio-cover/validation.test.ts tests/portfolio-cover/policy.test.ts`.

## Task 2: Database, storage, and repository boundary

**Files**

- Create `supabase/migrations/20260904_portfolio_covers.sql`
- Create `lib/portfolio-cover/repository.ts`
- Create `tests/portfolio-cover/repository-contract.test.ts`

**Migration**

- Add nullable `portfolio_cover_url text` to `profiles`.
- Create `portfolio_cover_generations` with member id, status, tailoring, normalized display fields JSONB, consent timestamp/version, source path, two option paths, selected variant/path, provider request ids, attempt count, failure code/message, expiry, audit timestamps, and admin reset metadata.
- Add foreign keys, member/status indexes, a partial uniqueness constraint preventing concurrent active jobs, timestamp update trigger, and RLS denying direct client mutation while allowing a member to read their own rows.
- Create or document three buckets: private source, private option, public selected cover. Policies permit server-owned writes; public reads apply only to selected-cover objects.

**Repository behavior**

- Centralize all service-role table/storage operations and stable row-to-domain mapping.
- Use opaque generation ids and member-scoped paths; never trust client-supplied paths.
- Selection copies the chosen private artifact to a stable public key and updates `profiles.portfolio_cover_url` atomically as far as Supabase permits, with compensating cleanup on failure.

**Steps**

1. Add migration-contract tests for required constraints/policies/buckets.
2. Add a repository interface whose methods are injectable in orchestration/API tests.
3. Implement the Supabase repository and typed error normalization.
4. Run `npx vitest run tests/portfolio-cover/repository-contract.test.ts`.

## Task 3: Safe portrait preparation and deterministic magazine renderer

**Files**

- Create `lib/portfolio-cover/image.ts`
- Create `lib/portfolio-cover/render-cover.ts`
- Create `tests/portfolio-cover/image.test.ts`
- Create `tests/portfolio-cover/render-cover.test.ts`

**Steps**

1. Write tests proving that decoded JPEG/PNG/WebP files up to 8 MB are accepted, misleading MIME/extensions and animated/oversized/invalid inputs are rejected, metadata is stripped, EXIF orientation is honored, and portrait preparation emits 1024×1536 PNG.
2. Implement Sharp-based normalization and a fixed lower-clothing edit mask. Keep the head/face safe region protected; do not attempt biometric analysis.
3. Write renderer tests for exact 1600×2000 output, both variants, XML escaping, optional-field omission, bounded text wrapping, and no accidental `undefined`/empty labels.
4. Implement a deterministic SVG-over-photo renderer with Top100 masthead, member name, optional facts, member-supplied headline/impact text, and a subtle `AI-assisted wardrobe edit` disclosure. Use fixed generic font stacks to avoid environment-dependent remote font loading.
5. Run `npx vitest run tests/portfolio-cover/image.test.ts tests/portfolio-cover/render-cover.test.ts`.

## Task 4: OpenAI image-edit adapter and generation orchestration

**Files**

- Create `lib/portfolio-cover/providers/types.ts`
- Create `lib/portfolio-cover/providers/openai.ts`
- Create `lib/portfolio-cover/generate.ts`
- Create `tests/portfolio-cover/openai-provider.test.ts`
- Create `tests/portfolio-cover/generate.test.ts`

**Provider requirements**

- Server-side multipart calls to `POST https://api.openai.com/v1/images/edits` using `gpt-image-2`, `1024x1536`, medium quality, one result per explicit fixed-variant call.
- Include normalized source and mask. The server-owned prompt names the exact suit variant and identity-preservation restrictions.
- Never send member profile/display fields to the provider.
- Apply a bounded timeout, validate base64 output, capture `x-request-id`, and classify retryable provider/quality errors without logging photos or secrets.

**Steps**

1. Write mocked-fetch tests for request shape, two distinct variants, prompt privacy, abort/timeout behavior, provider errors, malformed output, and request-id capture.
2. Implement the provider behind an injectable `PortfolioImageEditor` interface.
3. Write orchestration tests for atomic status transitions, two-option rendering/upload, partial-provider failure cleanup, one retry, idempotence, and fail-closed production configuration.
4. Implement the processor. A development-only deterministic editor may be selected only by `PORTFOLIO_IMAGE_GENERATION_DEMO=true` and must throw if `NODE_ENV=production`.
5. Run `npx vitest run tests/portfolio-cover/openai-provider.test.ts tests/portfolio-cover/generate.test.ts`.

Official implementation references:

- https://developers.openai.com/api/docs/guides/image-generation
- https://developers.openai.com/api/reference/resources/images

## Task 5: Authenticated member APIs

**Files**

- Create `app/api/member/portfolio-cover/generations/route.ts`
- Create `app/api/member/portfolio-cover/generations/current/route.ts`
- Create `app/api/member/portfolio-cover/generations/[id]/select/route.ts`
- Create `app/api/member/portfolio-cover/generations/[id]/reject/route.ts`
- Create `tests/portfolio-cover/member-api.test.ts`

**Endpoints**

- `POST /api/member/portfolio-cover/generations`: multipart source + normalized form payload + consent, returns `202` with current job.
- `GET /api/member/portfolio-cover/generations/current`: returns current entitlement/job/selected-cover state.
- `POST /api/member/portfolio-cover/generations/:id/select`: chooses one server-known variant and publishes it.
- `POST /api/member/portfolio-cover/generations/:id/reject`: marks both unsuitable without changing avatar.

**Steps**

1. Write failing route tests for authentication, same-origin mutation checks, ownership, supported content types, size enforcement, rate limiting, duplicate/parallel creation, invalid variant selection, and safe error responses.
2. Implement thin Node-runtime routes using existing auth/security helpers and injected domain services.
3. Use Next `after()` only after the durable row is created; the processor must remain safe if invoked again. Set an explicit serverless duration appropriate to image processing.
4. Ensure option URLs are short-lived signed URLs and never expose private object paths unnecessarily.
5. Run `npx vitest run tests/portfolio-cover/member-api.test.ts`.

## Task 6: Member wizard, selection, download, and durable state

**Files**

- Create `app/dashboard/me/portfolio-cover/page.tsx`
- Create `app/dashboard/me/portfolio-cover/_components/portfolio-cover-wizard.tsx`
- Create `app/dashboard/me/portfolio-cover/_components/portfolio-cover-form.tsx`
- Create `app/dashboard/me/portfolio-cover/_components/portfolio-cover-options.tsx`
- Create `lib/portfolio-cover/client.ts`
- Modify `app/dashboard/_lib/navigation.ts`
- Modify `app/dashboard/_sections/profile-section.tsx`
- Create `tests/portfolio-cover/client-state.test.ts`
- Create `tests/dashboard/portfolio-cover-navigation.test.ts`

**UX states**

- Explain identity/privacy constraints and require explicit photo-edit consent.
- Show vertical crop preview and portrait-quality guidance before submission.
- Form fields are optional except portrait, Male/Female selection, and consent.
- Show queued/processing progress that survives refresh; poll with bounded backoff.
- Show two large vertical previews, `Choose this cover`, `Neither looks like me`, and clear disclosure.
- Selected state offers view, download, native share where available, and copy-link fallback. It never presents `Set as avatar`.
- Disabled/configuration state is friendly and non-destructive.

**Steps**

1. Write client-state and navigation tests first.
2. Implement typed client calls and resilient polling.
3. Build accessible keyboard/touch UI with labels, error focus, mobile stacking, 4:5 preview ratios, and loading skeletons.
4. Add `Portfolio cover` to the Me navigation and profile action area.
5. Run the focused tests and `npm run typecheck`.

## Task 7: Admin reset, feature gate, and production-readiness checks

**Files**

- Modify `app/api/admin/members/[id]/route.ts`
- Modify the matching admin member UI action file discovered during implementation
- Modify `lib/production-readiness.ts`
- Modify `scripts/check-production-readiness.ts`
- Modify `package.json`
- Modify `.env.example` or the repository’s active environment template
- Create `tests/portfolio-cover/admin-reset.test.ts`
- Modify `tests/security/production-readiness.test.ts`

**Required configuration when enabled**

- `PORTFOLIO_IMAGE_GENERATION_ENABLED=true`
- `OPENAI_API_KEY`
- `PORTFOLIO_SOURCE_BUCKET`
- `PORTFOLIO_OPTION_BUCKET`
- `PORTFOLIO_COVER_BUCKET`

**Steps**

1. Add failing tests for admin-only reset, reset audit data, and reset notification.
2. Add `reset-portfolio-cover` without weakening existing member status/BIO actions.
3. Extend readiness evaluation with `requirePortfolioImages` and automatically validate configuration whenever the feature flag is enabled.
4. Add `npm run check:portfolio-images` and document migration/bucket/provider prerequisites without placing secrets in source control.
5. Run `npx vitest run tests/portfolio-cover/admin-reset.test.ts tests/security/production-readiness.test.ts`.

## Task 8: Top100 yellow-gradient and white dashboard visual refresh

**Files**

- Modify `app/dashboard/_components/dashboard-shell.tsx`
- Modify `app/dashboard/_components/dashboard-app-bar.tsx`
- Modify the shared dashboard navigation/card components discovered from the shell
- Create `lib/dashboard/theme.ts`
- Create `tests/dashboard/top100-theme.test.ts`

**Visual system**

- Preserve the current routes, content hierarchy, component structure, and semantic status colors.
- Page canvas: warm white with restrained yellow/amber radial and vertical gradients.
- Navigation/app bar: white translucent surfaces, fine amber borders, dark readable text.
- Active navigation and primary highlights: yellow-to-amber gradient with near-black text.
- Content cards: white, subtle warm shadow/border, consistent radius/focus ring; remove unrelated pastel surface drift.
- Maintain WCAG AA text contrast, visible focus, reduced-motion behavior, and current mobile bottom navigation.

**Steps**

1. Add a test for exported theme tokens and shared shell adoption.
2. Implement centralized tokens/classes and update shared dashboard chrome before touching section-level surfaces.
3. Normalize only shared card primitives/section wrappers needed for consistency; retain error/success/warning semantics.
4. Verify dashboard home, profile, BIO/feature, opportunities, award, and portfolio-cover pages at desktop and mobile widths.

## Task 9: Verification, production smoke, and handoff

**Automated gates**

1. `npm test`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run build`
5. `npm run check:production`
6. `npm run check:portfolio-images`

**Browser journey**

1. Start the development server and use the existing safe demo member login.
2. Confirm onboarding/profile/BIO/updates/opportunities/Impact application/award handoff still work.
3. Confirm the portfolio wizard on desktop and mobile: upload, only Male/Female, optional-field omission, two vertical previews, selection, download/share, rejection, refresh persistence, and no avatar mutation.
4. Confirm dashboard shell consistently uses the Top100 yellow-gradient/white theme without layout regression.
5. Inspect console/network errors and accessibility basics.

**Real-provider launch gate**

With `OPENAI_API_KEY`, verified OpenAI image access, migrated production Supabase storage, and a portrait whose owner consented to the smoke test:

1. Generate both variants once.
2. Visually confirm facial identity, skin tone, hair, and age are preserved; only wardrobe/background treatment changes.
3. Confirm source/options remain private and signed links expire.
4. Select one cover and confirm only that cover becomes publicly accessible and `profiles.portfolio_cover_url` updates.
5. Confirm generation fields and photos are absent from logs.
6. Keep the production flag off if this gate cannot be completed.

## Delivery rule

The implementation may be described as code-complete only after all local automated/browser gates pass. It may be described as production-enabled only after the real-provider launch gate passes with production configuration. Report any remaining external configuration as a launch blocker, not as completed functionality.
