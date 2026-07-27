# Member Uploads and Posts Implementation Plan (Plan B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Awardees can upload a profile photo and post images, and write a post from the dashboard that reaches `/blog` after admin approval.

**Architecture:** A member-scoped upload route mirrors the existing admin-only `/api/uploads` but gates on a member session, validates MIME and size, and namespaces files per member so one member can never overwrite another's. Member posts reuse the existing `posts` table rather than a parallel one: a new `pending` status and a `submitted_by_profile_id` column are all that is needed, so the existing public blog queries (which filter `status = 'published'`) keep pending posts invisible with no change.

**Tech Stack:** Next.js 15.5.20 App Router, TypeScript, Supabase (Postgres + Storage + service-role client), TipTap (already in the repo), Tailwind, Radix/shadcn UI, `zod`, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-26-member-dashboard-awards-and-community-design.md` sections 2 and 3.

## Global Constraints

Every task's requirements implicitly include this section.

- Route handlers declare `export const runtime = 'nodejs'`.
- Member auth: `getCurrentUser()` from `@/lib/auth-server`. On failure return `NextResponse.json({ message: 'Authentication required.' }, { status: 401 })`.
- Admin auth: `requireAdmin(request)` from `@/lib/api/require-admin`, which returns `{ error }` on failure.
- DB access from route handlers uses `createAdminClient()` from `@/lib/supabase/server` (service role — it bypasses RLS, so every query must scope ownership explicitly).
- **Every Supabase call returns `{ data, error }` and does not throw.** An unchecked `error` is invisible and is not caught by a surrounding try/catch. Check it on every call.
- **Every write that changes ownership-sensitive state must carry an ownership predicate** (`.eq('submitted_by_profile_id', user.id)` or equivalent), not rely on a prior read.
- Next 15 dynamic route params are Promises: `{ params }: { params: Promise<{ id: string }> }`, then `const { id } = await params`.
- **Do not use the `text-white` Tailwind utility.** `app/globals.css` rewrites dark utilities with `!important` under `html.light`, breaking it site-wide. Use the literal `text-[#fffaf0]`.
- Match the dashboard's visual language: `rounded-[22px]`–`rounded-[30px]`, `border-orange-100`, `bg-white` cards, primary action `rounded-full bg-orange-500 px-8 py-6 text-[#fffaf0] hover:bg-orange-600`.
- **Commit messages must NOT include a `Co-Authored-By` trailer.**
- Missing-migration errors (`PGRST205`, `42P01`, `/schema cache/i`) return HTTP 503 naming the SQL file to run — copy the shape of `isMissingAwardTable` in `lib/awards/server.ts`.
- **Another developer works in this repo concurrently.** Stage only your own files by explicit path. Never `git add -A` or `git add .`.

## File Structure

**Created**

| File | Responsibility |
| --- | --- |
| `lib/uploads/validate.ts` | Pure MIME/size/extension validation and per-member path building |
| `app/api/member/uploads/route.ts` | Member-gated image upload to Supabase Storage |
| `supabase/migrations/20260727_member_posts.sql` | `pending` status + `submitted_by_profile_id` on `posts` |
| `lib/member-posts.ts` | Client-side types + fetch wrappers for the composer |
| `lib/member-posts-server.ts` | Row ↔ API mapping, ownership-scoped loaders |
| `app/api/member/posts/route.ts` | Member post create / list-own |
| `app/api/member/posts/[id]/route.ts` | Member post read-own / update-own |
| `app/dashboard/posts-section.tsx` | Composer + "my submissions" list (own file — `page.tsx` is already ~2,000 lines) |
| `tests/uploads/validate.test.ts` | Unit tests for the validation module |

**Modified**

| File | Change |
| --- | --- |
| `app/dashboard/page.tsx` | Add `'posts'` to `DashboardSection`, `dashboardNav`, `dashboardCardStyles`; render the section; wire `AvatarUpload` into the Profile section |
| `app/admin/blog/page.tsx` | Add a "Pending from members" filter and an Approve action |
| `app/api/posts/route.ts` | Allow admins to move `pending → published` |

---

### Task 1: Upload validation module

**Files:**
- Create: `lib/uploads/validate.ts`, `tests/uploads/validate.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `ALLOWED_IMAGE_TYPES: readonly string[]`, `MAX_UPLOAD_BYTES: number`, `validateUpload(file: { type: string; size: number; name: string }): { ok: true } | { ok: false; reason: string }`, `memberUploadPath(profileId: string, fileName: string, now: number): string`

- [ ] **Step 1: Write the failing test**

`tests/uploads/validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  memberUploadPath,
  validateUpload,
} from '@/lib/uploads/validate'

const NOW = Date.parse('2026-07-27T12:00:00.000Z')

describe('MAX_UPLOAD_BYTES', () => {
  it('is 5 MB', () => {
    expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024)
  })
})

describe('validateUpload', () => {
  it('accepts a jpeg within the size cap', () => {
    expect(validateUpload({ type: 'image/jpeg', size: 1000, name: 'a.jpg' })).toEqual({ ok: true })
  })

  it('accepts png and webp', () => {
    expect(validateUpload({ type: 'image/png', size: 10, name: 'a.png' }).ok).toBe(true)
    expect(validateUpload({ type: 'image/webp', size: 10, name: 'a.webp' }).ok).toBe(true)
  })

  it('rejects a type that is not on the allowlist', () => {
    const result = validateUpload({ type: 'image/svg+xml', size: 10, name: 'a.svg' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/JPG, PNG or WebP/i)
  })

  it('rejects an executable disguised by name', () => {
    expect(validateUpload({ type: 'application/x-msdownload', size: 10, name: 'a.png' }).ok).toBe(false)
  })

  it('rejects an empty file', () => {
    expect(validateUpload({ type: 'image/png', size: 0, name: 'a.png' }).ok).toBe(false)
  })

  it('rejects a file over the cap', () => {
    const result = validateUpload({ type: 'image/png', size: MAX_UPLOAD_BYTES + 1, name: 'a.png' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/5 ?MB/i)
  })

  it('accepts a file exactly at the cap', () => {
    expect(validateUpload({ type: 'image/png', size: MAX_UPLOAD_BYTES, name: 'a.png' }).ok).toBe(true)
  })

  it('exposes exactly three allowed types', () => {
    expect([...ALLOWED_IMAGE_TYPES].sort()).toEqual(['image/jpeg', 'image/png', 'image/webp'])
  })
})

describe('memberUploadPath', () => {
  it('namespaces the path under the member id', () => {
    expect(memberUploadPath('abc-123', 'Head Shot.JPG', NOW)).toMatch(/^members\/abc-123\//)
  })

  it('strips characters that could escape the prefix', () => {
    const path = memberUploadPath('abc-123', '../../etc/passwd.png', NOW)
    expect(path.startsWith('members/abc-123/')).toBe(true)
    expect(path).not.toContain('..')
    expect(path).not.toContain('/etc/')
  })

  it('preserves a normalised extension', () => {
    expect(memberUploadPath('abc-123', 'Head Shot.JPG', NOW).endsWith('.jpg')).toBe(true)
  })

  it('defaults the extension when the name has none', () => {
    expect(memberUploadPath('abc-123', 'headshot', NOW).endsWith('.jpg')).toBe(true)
  })

  it('produces different paths for different timestamps', () => {
    expect(memberUploadPath('abc-123', 'a.png', NOW)).not.toBe(memberUploadPath('abc-123', 'a.png', NOW + 1))
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- tests/uploads/validate.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/uploads/validate"`

- [ ] **Step 3: Write the implementation**

`lib/uploads/validate.ts`:

```ts
// lib/uploads/validate.ts
// Pure validation for member-supplied uploads. Kept free of Next/Supabase so
// it can be unit-tested and reused by any upload surface.

/**
 * SVG is deliberately excluded: it can carry script and would be served from
 * our own origin, so an allowed SVG upload is a stored-XSS primitive.
 */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function validateUpload(file: { type: string; size: number; name: string }):
  | { ok: true }
  | { ok: false; reason: string } {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, reason: 'Upload a JPG, PNG or WebP image.' }
  }
  if (file.size <= 0) {
    return { ok: false, reason: 'That file is empty.' }
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: 'Images must be 5MB or smaller.' }
  }
  return { ok: true }
}

/**
 * Build the storage key. The member id prefix is what stops one member from
 * overwriting another's file, so the remainder of the name is aggressively
 * sanitised — a caller-supplied name must never be able to escape the prefix.
 */
export function memberUploadPath(profileId: string, fileName: string, now: number = Date.now()): string {
  const rawExtension = fileName.includes('.') ? fileName.split('.').pop() ?? '' : ''
  const extension = /^[a-zA-Z0-9]{1,5}$/.test(rawExtension) ? rawExtension.toLowerCase() : 'jpg'

  const base = fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

  return `members/${profileId}/${base || 'upload'}-${now}.${extension === 'jpeg' ? 'jpg' : extension}`
}

/** The canonical extension for an allowed MIME type. */
export function extensionForType(type: string): string {
  return EXTENSION_BY_TYPE[type] ?? 'jpg'
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test -- tests/uploads/validate.test.ts`
Expected: PASS — 15 tests passed

- [ ] **Step 5: Commit**

```bash
git add lib/uploads/validate.ts tests/uploads/validate.test.ts
git commit -m "feat(uploads): member upload validation and per-member path building"
```

---

### Task 2: Member upload route

**Files:**
- Create: `app/api/member/uploads/route.ts`

**Interfaces:**
- Consumes: `validateUpload`, `memberUploadPath` from `@/lib/uploads/validate`
- Produces: `POST /api/member/uploads` accepting `multipart/form-data` with a `file` field → `{ url: string; path: string }`

- [ ] **Step 1: Write the route**

`app/api/member/uploads/route.ts`:

```ts
// app/api/member/uploads/route.ts
// Member-gated image upload. The existing /api/uploads is admin-only, so
// members need their own surface — with a stricter allowlist and a per-member
// path prefix so one member can never overwrite another's file.
import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import { memberUploadPath, validateUpload } from '@/lib/uploads/validate'

export const runtime = 'nodejs'

const BUCKET_NAME = process.env.SUPABASE_UPLOADS_BUCKET ?? 'uploads'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const rate = checkRateLimit({ ...RATE_LIMITS.UPLOAD, identifier: `member-upload:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many uploads. Please wait a few minutes.')

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ message: 'Invalid upload.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'No file provided.' }, { status: 400 })
  }

  const validation = validateUpload({ type: file.type, size: file.size, name: file.name })
  if (!validation.ok) {
    return NextResponse.json({ message: validation.reason }, { status: 400 })
  }

  const supabase = createAdminClient()
  const path = memberUploadPath(user.id, file.name)

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      cacheControl: '3600',
      // Never upsert: the timestamped path is unique, and allowing overwrite
      // would let a crafted path clobber an existing object.
      upsert: false,
    })

  if (uploadError) {
    console.error('[member-upload] storage upload failed', user.id, uploadError)
    if (/bucket/i.test(uploadError.message ?? '')) {
      return NextResponse.json(
        { message: `Storage bucket "${BUCKET_NAME}" is missing. Ask the admin to create it in Supabase.` },
        { status: 503 },
      )
    }
    return NextResponse.json({ message: 'Could not upload that image.' }, { status: 500 })
  }

  const { data: publicUrl } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)

  return NextResponse.json({ url: publicUrl.publicUrl, path })
}
```

- [ ] **Step 2: Verify types and tests**

Run: `npx tsc --noEmit 2>&1 | grep -E "app/api/member/uploads|lib/uploads"`
Expected: no output

Run: `npm test`
Expected: all passing

- [ ] **Step 3: Commit**

```bash
git add app/api/member/uploads/route.ts
git commit -m "feat(uploads): member-gated image upload route"
```

---

### Task 3: Member posts migration

**Files:**
- Create: `supabase/migrations/20260727_member_posts.sql`

**Interfaces:**
- Consumes: nothing
- Produces: `posts.status` accepts `'pending'`; `posts.submitted_by_profile_id` column

- [ ] **Step 1: Write the migration**

`supabase/migrations/20260727_member_posts.sql`:

```sql
-- Member-authored posts: a pending state and the member who submitted it.
-- Prerequisite: supabase/migrations/004_create_posts_table.sql.

-- Widen the status constraint to admit 'pending'. Public blog queries filter
-- status = 'published', so pending posts stay invisible with no query changes.
alter table public.posts drop constraint if exists posts_status_check;
alter table public.posts add constraint posts_status_check
  check (status in ('draft', 'pending', 'published', 'scheduled', 'archived'));

alter table public.posts
  add column if not exists submitted_by_profile_id uuid references public.profiles(id) on delete set null;

create index if not exists posts_submitted_by_idx on public.posts (submitted_by_profile_id);
create index if not exists posts_pending_idx on public.posts (status) where status = 'pending';

-- Members read their own submissions regardless of status. The existing
-- "published and public" policy already covers everything else.
do $$ begin
  create policy "Members read their own submitted posts" on public.posts
    for select using (auth.uid() = submitted_by_profile_id);
exception when duplicate_object then null; end $$;
```

- [ ] **Step 2: Verify the SQL by reading**

Confirm: the new constraint lists all five statuses; the column is nullable (existing rows have no submitter); both indexes use `if not exists`; the policy block matches the repo's `do $$ ... exception when duplicate_object` idiom used in `supabase/SETUP-MEMBER-HUB.sql`.

**Do not attempt to apply this to a database** — there is no connection available. Applying it is the project owner's step.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260727_member_posts.sql
git commit -m "feat(posts): pending status and submitter column for member posts"
```

---

### Task 4: Member posts API

**Files:**
- Create: `lib/member-posts-server.ts`, `app/api/member/posts/route.ts`, `app/api/member/posts/[id]/route.ts`

**Interfaces:**
- Consumes: `getCurrentUser`, `createAdminClient`
- Produces:
  - `MemberPostView = { id, title, slug, excerpt, contentHtml, coverImage, status, tags, createdAt, updatedAt, publishedAt }`
  - `mapMemberPost(row): MemberPostView`, `isMissingPendingStatus(error): boolean`, `POSTS_SETUP_MESSAGE: string`
  - `POST /api/member/posts` → `{ post }`; `GET /api/member/posts` → `{ posts }`
  - `GET|PATCH /api/member/posts/[id]` → `{ post }`

- [ ] **Step 1: Write the mapping module**

`lib/member-posts-server.ts`:

```ts
// lib/member-posts-server.ts
// Server-only mapping between `posts` rows and the member-facing shape.
// Never import into a client component.
import type { createAdminClient } from '@/lib/supabase/server'

export const POSTS_SETUP_MESSAGE =
  'Member posts are not set up yet. Ask the admin to run supabase/migrations/20260727_member_posts.sql.'

export type MemberPostStatus = 'pending' | 'published' | 'draft' | 'scheduled' | 'archived'

export type MemberPostView = {
  id: string
  title: string
  slug: string
  excerpt: string
  contentHtml: string
  coverImage: string | null
  status: MemberPostStatus
  tags: string[]
  createdAt: string
  updatedAt: string | null
  publishedAt: string | null
}

export function mapMemberPost(row: any): MemberPostView {
  return {
    id: row.id,
    title: row.title ?? '',
    slug: row.slug ?? '',
    excerpt: row.excerpt ?? '',
    contentHtml: row.content ?? '',
    coverImage: row.cover_image ?? null,
    status: (row.status ?? 'pending') as MemberPostStatus,
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
    publishedAt: row.published_at ?? null,
  }
}

/** True when the failure is "the member-posts migration has not been run". */
export function isMissingPendingStatus(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === 'PGRST205' || error.code === '42P01') return true
  return /posts_status_check|submitted_by_profile_id|schema cache/i.test(error.message ?? '')
}

/** Build a URL-safe slug, suffixed for uniqueness by the caller. */
export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'post'
  )
}

export async function loadOwnPost(
  supabase: ReturnType<typeof createAdminClient>,
  postId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .eq('submitted_by_profile_id', userId)
    .maybeSingle()

  return { post: data ?? null, error }
}
```

- [ ] **Step 2: Write the collection route**

`app/api/member/posts/route.ts`:

```ts
// app/api/member/posts/route.ts
//   GET  -> the member's own submissions, any status
//   POST -> submit a new post for admin review (always status 'pending')
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import {
  POSTS_SETUP_MESSAGE,
  isMissingPendingStatus,
  mapMemberPost,
  slugify,
} from '@/lib/member-posts-server'

export const runtime = 'nodejs'

const postSchema = z.object({
  title: z.string().trim().min(4, 'Give your post a title.').max(180),
  excerpt: z.string().trim().max(400).optional().default(''),
  contentHtml: z.string().trim().min(40, 'Write a little more before submitting.').max(120_000),
  coverImage: z.string().trim().url('That cover image link is not valid.').optional().or(z.literal('')),
  tags: z.array(z.string().trim().min(1).max(40)).max(6).optional().default([]),
})

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('submitted_by_profile_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    if (isMissingPendingStatus(error)) return NextResponse.json({ message: POSTS_SETUP_MESSAGE }, { status: 503 })
    console.error('[member-posts] list failed', user.id, error)
    return NextResponse.json({ message: 'Could not load your posts.' }, { status: 500 })
  }

  return NextResponse.json({ posts: (data ?? []).map(mapMemberPost) })
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const rate = checkRateLimit({ ...RATE_LIMITS.CONTACT, identifier: `member-post:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many submissions. Please wait a few minutes.')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? 'Check your post.' }, { status: 400 })
  }
  const input = parsed.data

  const supabase = createAdminClient()

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()

  // Slug must be unique across the whole posts table, so suffix it.
  const slug = `${slugify(input.title)}-${Date.now().toString(36)}`

  const { data, error } = await supabase
    .from('posts')
    .insert({
      title: input.title,
      slug,
      content: input.contentHtml,
      excerpt: input.excerpt || null,
      cover_image: input.coverImage || null,
      tags: input.tags,
      author: profile?.full_name ?? 'Africa Future Leader',
      author_id: user.id,
      submitted_by_profile_id: user.id,
      // Members can only ever create pending posts. Publication is an admin act.
      status: 'pending',
      visibility: 'public',
    })
    .select('*')
    .single()

  if (error) {
    if (isMissingPendingStatus(error)) return NextResponse.json({ message: POSTS_SETUP_MESSAGE }, { status: 503 })
    console.error('[member-posts] create failed', user.id, error)
    return NextResponse.json({ message: 'Could not submit your post.' }, { status: 500 })
  }

  return NextResponse.json({ post: mapMemberPost(data) })
}
```

- [ ] **Step 3: Write the item route**

`app/api/member/posts/[id]/route.ts`:

```ts
// app/api/member/posts/[id]/route.ts
//   GET   -> one of the member's own posts
//   PATCH -> edit it. Editing a published post returns it to review.
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { POSTS_SETUP_MESSAGE, isMissingPendingStatus, loadOwnPost, mapMemberPost } from '@/lib/member-posts-server'

export const runtime = 'nodejs'

const patchSchema = z.object({
  title: z.string().trim().min(4).max(180).optional(),
  excerpt: z.string().trim().max(400).optional(),
  contentHtml: z.string().trim().min(40).max(120_000).optional(),
  coverImage: z.string().trim().url().optional().or(z.literal('')),
  tags: z.array(z.string().trim().min(1).max(40)).max(6).optional(),
})

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const { id } = await params
  const supabase = createAdminClient()
  const { post, error } = await loadOwnPost(supabase, id, user.id)

  if (error) {
    if (isMissingPendingStatus(error)) return NextResponse.json({ message: POSTS_SETUP_MESSAGE }, { status: 503 })
    console.error('[member-posts] read failed', id, error)
    return NextResponse.json({ message: 'Could not load that post.' }, { status: 500 })
  }
  if (!post) return NextResponse.json({ message: 'Post not found.' }, { status: 404 })

  return NextResponse.json({ post: mapMemberPost(post) })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? 'Check your post.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { post, error: loadError } = await loadOwnPost(supabase, id, user.id)

  if (loadError) {
    if (isMissingPendingStatus(loadError)) return NextResponse.json({ message: POSTS_SETUP_MESSAGE }, { status: 503 })
    return NextResponse.json({ message: 'Could not load that post.' }, { status: 500 })
  }
  if (!post) return NextResponse.json({ message: 'Post not found.' }, { status: 404 })
  if (post.status === 'archived') {
    return NextResponse.json({ message: 'This post has been archived and cannot be edited.' }, { status: 409 })
  }

  const columns: Record<string, unknown> = {}
  if (parsed.data.title !== undefined) columns.title = parsed.data.title
  if (parsed.data.excerpt !== undefined) columns.excerpt = parsed.data.excerpt || null
  if (parsed.data.contentHtml !== undefined) columns.content = parsed.data.contentHtml
  if (parsed.data.coverImage !== undefined) columns.cover_image = parsed.data.coverImage || null
  if (parsed.data.tags !== undefined) columns.tags = parsed.data.tags

  if (Object.keys(columns).length === 0) {
    return NextResponse.json({ message: 'Nothing to update.' }, { status: 400 })
  }

  // An edit to live content goes back through review — otherwise a member could
  // publish anything by editing an already-approved post.
  columns.status = 'pending'

  const { data, error } = await supabase
    .from('posts')
    .update(columns)
    .eq('id', id)
    .eq('submitted_by_profile_id', user.id)
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('[member-posts] update failed', id, error)
    return NextResponse.json({ message: 'Could not save your changes.' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ message: 'Post not found.' }, { status: 404 })

  return NextResponse.json({ post: mapMemberPost(data) })
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -E "app/api/member/posts|lib/member-posts"`
Expected: no output

Run: `npm test`
Expected: all passing

- [ ] **Step 5: Commit**

```bash
git add lib/member-posts-server.ts app/api/member/posts
git commit -m "feat(posts): member post submission and edit API"
```

---

### Task 5: Admin approval of member posts

**Files:**
- Modify: `app/api/posts/route.ts`, `app/admin/blog/page.tsx`

**Interfaces:**
- Consumes: the `pending` status from Task 3
- Produces: admins can list and approve pending member posts

- [ ] **Step 1: Confirm the admin posts API accepts `pending`**

Read `app/api/posts/route.ts`. It already accepts a `status` field on PATCH. Confirm that `'pending'` passes whatever validation exists, and that setting `status: 'published'` works on a row whose current status is `pending`. If the route hard-codes an allowed-status list that omits `pending`, add it — that is the only change needed here.

- [ ] **Step 2: Add the pending queue to the admin blog page**

In `app/admin/blog/page.tsx`:
- Add `'pending'` to whatever status filter control exists, labelled **"Pending from members"**, and show a count badge when non-zero.
- Extend `statusBadgeClass` (around line 91) with a `pending` case using amber tones consistent with the existing `scheduled` case.
- On each pending row, add an **Approve** action that PATCHes `{ id, status: 'published' }` and refreshes the list, and a **Reject** action that PATCHes `{ id, status: 'archived' }`. Use the page's existing toast and loading conventions.
- Show the submitting member's name (the row's `author`) so an admin can see whose work it is.

Follow the file's existing patterns exactly — do not introduce a new admin design idiom.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -E "app/admin/blog|app/api/posts"`
Expected: no output

Run: `npx next build`
Expected: completes, `/admin/blog` in the route table

- [ ] **Step 4: Commit**

```bash
git add app/admin/blog/page.tsx app/api/posts/route.ts
git commit -m "feat(posts): admin queue for member-submitted posts"
```

---

### Task 6: Member composer UI

**Files:**
- Create: `lib/member-posts.ts`, `app/dashboard/posts-section.tsx`

**Interfaces:**
- Consumes: `/api/member/posts`, `/api/member/uploads`
- Produces: default export `PostsSection` taking `{ member: MemberProfile }`; client helpers `fetchMyPosts`, `submitPost`, `updatePost`, `uploadMemberImage`

- [ ] **Step 1: Write the client data module**

`lib/member-posts.ts` — mirrors the fetch-wrapper style of `lib/awards.ts`:

```ts
// lib/member-posts.ts
// Client-side wrappers around /api/member/posts and /api/member/uploads.
// Safe to import into client components — no server-only imports, no secrets.

export type MemberPost = {
  id: string
  title: string
  slug: string
  excerpt: string
  contentHtml: string
  coverImage: string | null
  status: 'pending' | 'published' | 'draft' | 'scheduled' | 'archived'
  tags: string[]
  createdAt: string
  updatedAt: string | null
  publishedAt: string | null
}

export type PostDraft = {
  title: string
  excerpt?: string
  contentHtml: string
  coverImage?: string
  tags?: string[]
}

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.message || 'Request failed. Please try again.')
  return data
}

export async function fetchMyPosts(): Promise<MemberPost[]> {
  const res = await fetch('/api/member/posts', { cache: 'no-store' })
  const data = await jsonOrThrow(res)
  return (data.posts ?? []) as MemberPost[]
}

export async function submitPost(draft: PostDraft): Promise<MemberPost> {
  const res = await fetch('/api/member/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  })
  const data = await jsonOrThrow(res)
  return data.post as MemberPost
}

export async function updatePost(id: string, patch: Partial<PostDraft>): Promise<MemberPost> {
  const res = await fetch(`/api/member/posts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  const data = await jsonOrThrow(res)
  return data.post as MemberPost
}

/** Upload an image and return its public URL. */
export async function uploadMemberImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/member/uploads', { method: 'POST', body: formData })
  const data = await jsonOrThrow(res)
  return data.url as string
}
```

- [ ] **Step 2: Write the composer section**

Create `app/dashboard/posts-section.tsx` as a `'use client'` component. It must:

- Load the member's submissions with `fetchMyPosts()` on mount, using the same spinner treatment as `app/dashboard/awards-section.tsx`.
- Render a composer: title input, excerpt textarea, cover-image upload (calling `uploadMemberImage`, showing a preview and the file-size/type rules up front), a tags input capped at 6, and the rich-text body.
- **Reuse the existing TipTap editor** already in `components/editor` rather than adding a new one. Read that directory and use its exported component; if it is admin-coupled, use it as-is without modifying it and note that in your report.
- Submit via `submitPost`, then refresh the list, clear the composer, and `toast.success('Sent to the editorial team for review.')`.
- List existing submissions with a status badge — pending (amber), published (orange, linking to `/blog/<slug>`), archived (slate) — and an Edit action that loads the post back into the composer and saves via `updatePost`.
- Show plain copy explaining that every post is reviewed before it appears on the blog, and that editing a published post returns it to review.
- Use `toast.error` for failures. Disable the submit button while in flight.
- Be mobile-first: single column below `sm:`, nothing overflowing at 375px.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -E "lib/member-posts|app/dashboard/posts-section"`
Expected: no output

- [ ] **Step 4: Commit**

```bash
git add lib/member-posts.ts app/dashboard/posts-section.tsx
git commit -m "feat(posts): member post composer and submissions list"
```

---

### Task 7: Dashboard wiring — avatar upload and posts section

> **Serialized task.** This file is also touched by Plan C. Do not run this task concurrently with Plan C's dashboard task.

**Files:**
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `PostsSection` from `./posts-section`; `AvatarUpload` from `@/components/AvatarUpload`; `uploadMemberImage` from `@/lib/member-posts`

- [ ] **Step 1: Add the posts section to the dashboard**

Locate each anchor **by content, not line number** — this file is ~2,000 lines and drifts as you edit.

- Add `'posts'` to the `DashboardSection` union.
- Add a `dashboardNav` entry after `featured`: `{ id: 'posts', title: 'Write', label: 'Post to the blog', icon: Newspaper, tone: 'paper' }`. `Newspaper` is already imported.
- Add a `dashboardCardStyles.posts` entry — the map is typed `Record<DashboardSection, …>` and will not compile without it. Use `bg-[#eef7f0] text-black border border-emerald-100` with `text-emerald-600` icon/arrow and `text-black/50` detail.
- Import `PostsSection` next to the existing `MessagesSection`/`AwardsSection` imports.
- Render it alongside the other sections: `{activeSection === 'posts' && <PostsSection member={member} />}`.

- [ ] **Step 2: Wire avatar upload into the Profile section**

`components/AvatarUpload.tsx` exists but is unused. Read it first and check what props it takes and whether it does its own uploading.

- If it accepts an upload callback, pass `uploadMemberImage` from `@/lib/member-posts`.
- If it uploads internally to an admin-only endpoint, change only its endpoint to `/api/member/uploads` — do not restructure the component.

Place it at the top of the `ProfileSection` form, above the headline/field inputs, with a short label ("Profile photo"). On a successful upload, persist the returned URL by including it in the existing profile PATCH (`updateMemberProfile`) so it survives a reload; if the `profiles` table has no avatar column, report that rather than inventing one.

- [ ] **Step 3: Verify the build**

Run: `npx next build`
Expected: completes, `/dashboard` in the route table

Run: `npx tsc --noEmit 2>&1 | grep -E "app/dashboard"`
Expected: no output

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx components/AvatarUpload.tsx
git commit -m "feat(dashboard): member posts section and profile photo upload"
```

---

## Verification

- **Unit tests** cover the upload validation module, which is where a path-traversal or type-confusion bug would live.
- **Typecheck and build** gate every task.
- **Manual, required before shipping** (impossible in this environment — no database, storage bucket, or session): upload an avatar and confirm it persists; submit a post and confirm it does *not* appear on `/blog`; approve it in `/admin/blog` and confirm it does; edit the published post and confirm it returns to pending; confirm a 6MB file and an SVG are both rejected with clear messages.

## Assumptions

1. Members may submit unlimited posts; there is no per-member cap. Rate limiting (5 per 5 minutes) is the only brake.
2. Editing any post returns it to `pending`, including one already published.
3. Slugs are `slugify(title)-<base36 timestamp>`, so two posts with the same title never collide.
4. Rejection is `archived`, not deletion — the member keeps a record and an admin can revisit.
5. SVG uploads are refused deliberately: served from our own origin they are a stored-XSS vector.
