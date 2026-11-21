import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { loadPublicAwardee } from '@/lib/admin-social/server'
import { spotlightSignature } from '@/lib/admin-social/spotlight-snapshot'
import { createAdminClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/site'
import { SPOTLIGHT_PLATFORMS } from '@/lib/admin-social/spotlight'
import {
  editorialIssue,
  formatEditorialMaster,
  editorialOptions,
  EDITORIAL_THRESHOLD,
  scoreEditorialReview,
  withEditorialLink,
} from '@/lib/admin-social/editorial'
import {
  adaptEditorialMaster,
  editorialStory,
  generateEditorialMaster,
  reviewEditorial,
} from '@/lib/admin-social/editorial-provider'
import { SocialCaptionProviderError } from '@/lib/admin-social/openai-caption'

export const runtime = 'nodejs'
const table = 'admin_awardee_editorial_approvals'
const columns = 'revision,source_signature,story,approved_at'
const noStore = { 'Cache-Control': 'no-store' }
const fail = (message: string, status: number) =>
  NextResponse.json({ message }, { status })
const awardeeId = z.guid()
const revision = z.guid()
const signature = z.string().regex(/^[a-f0-9]{64}$/)
const platform = z.enum(SPOTLIGHT_PLATFORMS)
const action = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('generate'),
      awardeeId,
      signature,
      options: editorialOptions,
    })
    .strict(),
  z
    .object({
      action: z.literal('approve'),
      awardeeId,
      signature,
      story: editorialStory,
      expectedRevision: revision.nullable(),
    })
    .strict(),
  z
    .object({
      action: z.literal('adapt'),
      awardeeId,
      signature,
      revision,
      platform,
    })
    .strict(),
  z
    .object({
      action: z.literal('check'),
      awardeeId,
      signature,
      revision,
      platform,
      story: editorialStory,
    })
    .strict(),
])

export async function GET(request: NextRequest) {
  const access = await requireAdmin(request)
  if ('error' in access) return access.error
  const id = awardeeId.safeParse(request.nextUrl.searchParams.get('awardeeId'))
  if (!id.success) return fail('Choose a public awardee.', 400)
  const { data, error } = await createAdminClient()
    .from(table)
    .select(columns)
    .eq('awardee_id', id.data)
    .maybeSingle()
  if (error) return fail('Could not load the master story approval.', 503)
  return NextResponse.json({ approval: data }, { headers: noStore })
}

export async function POST(request: NextRequest) {
  const access = await requireAdmin(request)
  if ('error' in access) return access.error
  const input = action.safeParse(await request.json().catch(() => null))
  if (!input.success)
    return fail('Check the editorial request and story length.', 400)
  const values = input.data
  try {
    const profile = await loadPublicAwardee(values.awardeeId, SITE_URL)
    if (!profile?.bio)
      return fail('A public profile with a bio is required.', 422)
    if (spotlightSignature(profile) !== values.signature)
      return fail(
        'The public source changed. Refresh the source and review the story again.',
        409,
      )

    if (values.action === 'generate') {
      const story = formatEditorialMaster(
        await generateEditorialMaster(profile, values.options),
        profile.profileUrl,
        profile.name,
      )
      if (!editorialStory.safeParse(story).success)
        return fail(
          'The generated master story was too long. Try a shorter length.',
          422,
        )
      return NextResponse.json(
        {
          story,
          issue: editorialIssue(story, profile.profileUrl, profile.name),
        },
        { headers: noStore },
      )
    }

    const db = createAdminClient()
    const { data: approval, error } = await db
      .from(table)
      .select(columns)
      .eq('awardee_id', values.awardeeId)
      .maybeSingle()
    if (error) return fail('Could not load the master story approval.', 503)
    const changed = () =>
      fail(
        'The approved story changed. Reload the approval before continuing.',
        409,
      )

    if (values.action === 'approve') {
      if ((approval?.revision ?? null) !== values.expectedRevision)
        return changed()
      const issue = editorialIssue(
        values.story,
        profile.profileUrl,
        profile.name,
      )
      if (issue) return fail(issue, 422)
      const review = await reviewEditorial(profile, values.story)
      const score = scoreEditorialReview(review)
      if (
        score < EDITORIAL_THRESHOLD ||
        !review.announcement ||
        !review.factualAccuracy ||
        !review.mission ||
        !review.profileCta
      ) {
        return NextResponse.json(
          {
            message: 'The master story needs revision before approval.',
            review: { score, passes: false, feedback: review.feedback },
          },
          { status: 422 },
        )
      }
      const row = {
        revision: randomUUID(),
        source_signature: values.signature,
        story: values.story,
        approved_by: access.user.id,
        approved_at: new Date().toISOString(),
      }
      const result = approval
        ? await db
            .from(table)
            .update(row)
            .eq('awardee_id', values.awardeeId)
            .eq('revision', approval.revision)
            .select(columns)
            .maybeSingle()
        : await db
            .from(table)
            .insert({ ...row, awardee_id: values.awardeeId })
            .select(columns)
            .single()
      if (result.error?.code === '23505' || (!result.error && !result.data))
        return changed()
      if (result.error) return fail('Could not save the approval.', 503)
      return NextResponse.json(
        {
          approval: result.data,
          review: { score, passes: true, feedback: review.feedback },
        },
        { headers: noStore },
      )
    }

    if (
      !approval ||
      approval.revision !== values.revision ||
      approval.source_signature !== values.signature
    ) {
      return fail(
        'Approve the current master story before adapting or checking platform copy.',
        409,
      )
    }
    const story =
      values.action === 'check'
        ? values.story
        : withEditorialLink(
            await adaptEditorialMaster(
              profile,
              approval.story,
              values.platform,
            ),
            profile.profileUrl,
            values.platform === 'x',
          )
    const issue = editorialIssue(
      story,
      profile.profileUrl,
      profile.name,
      values.platform,
    )
    const review = issue
      ? null
      : await reviewEditorial(profile, story, values.platform, approval.story)
    const score = review ? scoreEditorialReview(review) : 0
    const passes =
      !!review &&
      score >= EDITORIAL_THRESHOLD &&
      review.announcement &&
      review.factualAccuracy &&
      review.mission &&
      review.profileCta
    const { data: latest, error: revisionError } = await db
      .from(table)
      .select('revision')
      .eq('awardee_id', values.awardeeId)
      .maybeSingle()
    if (revisionError)
      return fail('Could not verify the master story approval.', 503)
    if (latest?.revision !== approval.revision) return changed()
    return NextResponse.json(
      {
        story,
        revision: approval.revision,
        review: { score, passes, feedback: issue ?? review?.feedback },
      },
      { headers: noStore },
    )
  } catch (error) {
    if (
      error instanceof SocialCaptionProviderError &&
      error.code === 'provider_credentials'
    ) {
      return fail('The AI connection needs a valid OpenAI API key.', 503)
    }
    return fail('The editorial request could not be completed. Try again.', 503)
  }
}
