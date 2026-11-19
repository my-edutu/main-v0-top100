'use client'

import { useEffect, useId, useRef, useState } from 'react'
import {
  ArrowRight,
  Copy,
  Download,
  LoaderCircle,
  Share2,
  Sparkles,
  Check,
  Save,
} from 'lucide-react'
import Image from '@/components/safe-image'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { prepareSocialImage, shareSocialDraft } from '@/lib/admin-social/share'
import {
  SPOTLIGHT_PLATFORMS,
  canRenderSpotlightSource,
  SPOTLIGHT_LABELS,
  CAPTION_LIMITS,
  spotlightImageUrl,
  captionLength,
  validateSpotlightCaption,
  type SpotlightPlatform,
} from '@/lib/admin-social/spotlight'
import {
  EDITORIAL_THRESHOLD,
  editorialIssue,
  type ApprovedStory,
  type EditorialOptions,
  type EditorialReview,
} from '@/lib/admin-social/editorial'
import type { SocialShareDraft } from '@/lib/admin-social/types'
import type { FeatureProfile } from './social-sharing-workspace'
import { readSocialResponse as readResponse } from '@/lib/admin-social/client'

type Props = {
  profile: FeatureProfile
  onDirty: (dirty: boolean) => void
  onSaved: () => void
  onChooseAnother?: () => void
  initialPlatform?: SpotlightPlatform
  initialView?: 'channels' | 'publish'
}
type Captions = Partial<Record<SpotlightPlatform, string>>
export default function SpotlightComposer({
  profile,
  onDirty,
  onSaved,
  onChooseAnother,
  initialPlatform = 'linkedin',
  initialView,
}: Props) {
  const [current, setCurrent] = useState(profile)
  const [platform, setPlatform] = useState<SpotlightPlatform>(initialPlatform)
  const [captions, setCaptions] = useState<Captions>({})
  const [options, setOptions] = useState<EditorialOptions>({
    focus: '',
    angle: 'from-source',
    tone: 'editorial',
    length: 'standard',
  })
  const [master, setMaster] = useState('')
  const [approval, setApproval] = useState<ApprovedStory | null>(null)
  const [masterReview, setMasterReview] = useState<EditorialReview | null>(null)
  const [editingMaster, setEditingMaster] = useState(false)
  const [editingChannels, setEditingChannels] = useState<
    Partial<Record<SpotlightPlatform, boolean>>
  >({})
  const [view, setView] = useState<'story' | 'channels' | 'publish'>(
    initialView ?? 'story',
  )
  const id = useId()
  const viewTitle = useRef<HTMLHeadingElement>(null)
  const [checks, setChecks] = useState<
    Partial<
      Record<
        SpotlightPlatform,
        { story: string; revision: string; review: EditorialReview }
      >
    >
  >({})
  const [useCard, setUseCard] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [drafts, setDrafts] = useState<SocialShareDraft[]>([])
  const [posts, setPosts] = useState<SocialShareDraft[]>([])
  const [postPage, setPostPage] = useState(1)
  const [morePosts, setMorePosts] = useState(false)
  const [prepared, setPrepared] = useState<{
    url: string
    file: File | null
  } | null>(null)
  const [busy, setBusy] = useState('load')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [postUrl, setPostUrl] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [retry, setRetry] = useState(0)
  const caption = captions[platform] ?? ''
  const draft = drafts.find((item) => item.platform === platform)
  const unsaved = SPOTLIGHT_PLATFORMS.some(
    (channel) =>
      (captions[channel] ?? '').trim() !==
      (drafts.find((item) => item.platform === channel)?.caption ?? ''),
  )
  const masterIssue = master.trim()
    ? editorialIssue(master.trim(), current.profileUrl, current.name)
    : null
  const approved =
    !!approval &&
    master.trim() === approval.story &&
    approval.source_signature === current.signature
  const masterDirty = master.trim() !== (approval?.story ?? '')
  const channelCheck = checks[platform]
  const requiresCheck =
    !!channelCheck || caption.trim() !== (draft?.caption ?? '')
  const channelPassed =
    !requiresCheck ||
    (approved &&
      channelCheck?.story === caption &&
      channelCheck.revision === approval?.revision &&
      channelCheck.review.passes)
  const saved = !!draft && caption.trim() === draft.caption
  const issue = validateSpotlightCaption(platform, caption, current.profileUrl)
  const stale = !!draft && draft.snapshotProfileUpdatedAt !== current.updatedAt
  const locked = !!draft && !['ready', 'failed'].includes(draft.publishState)
  const imageSupported =
    !!current.imageUrl && canRenderSpotlightSource(current.imageUrl)
  const cardUrl = imageSupported
    ? new URL(
        spotlightImageUrl(
          current.profileUrl,
          current.awardeeId,
          current.signature,
        ),
      ).pathname + `?v=${current.signature}`
    : null
  const imageUrl = useCard ? cardUrl : current.imageUrl
  const imageFile = prepared?.url === imageUrl ? prepared.file : null

  useEffect(() => {
    onDirty(unsaved || masterDirty)
  }, [unsaved, masterDirty, onDirty])
  useEffect(() => {
    if (!unsaved && !masterDirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [unsaved, masterDirty])
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      fetch(
        `/api/admin/social/drafts?awardeeId=${profile.awardeeId}&status=draft`,
        { signal: controller.signal },
      ).then(readResponse),
      fetch(
        `/api/admin/social/drafts?awardeeId=${profile.awardeeId}&status=marked_posted`,
        { signal: controller.signal },
      ).then(readResponse),
      fetch(`/api/admin/social/editorial?awardeeId=${profile.awardeeId}`, {
        signal: controller.signal,
      }).then(readResponse),
    ])
      .then(([pending, history, editorial]) => {
        if (controller.signal.aborted) return
        setApproval(editorial.approval)
        setMaster(editorial.approval?.story ?? '')
        setDrafts(pending.drafts)
        setCaptions(
          Object.fromEntries(
            pending.drafts.map((item: SocialShareDraft) => [
              item.platform,
              item.caption,
            ]),
          ),
        )
        setPosts(history.drafts)
        setMorePosts(history.hasMore)
        setLoaded(true)
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy('')
      })
    return () => controller.abort()
  }, [profile.awardeeId, retry])
  useEffect(() => {
    let active = true
    if (imageUrl)
      void prepareSocialImage(imageUrl).then((file) => {
        if (active) setPrepared({ url: imageUrl, file })
      })
    return () => {
      active = false
    }
  }, [imageUrl])

  const reloadChannel = async () => {
    if (
      caption.trim() !== (draft?.caption ?? '') &&
      !window.confirm(
        `Replace your unsaved ${SPOTLIGHT_LABELS[platform]} edits with the latest saved draft? Other channel edits will be kept.`,
      )
    )
      return
    setBusy('reload')
    setError('')
    setMessage('')
    try {
      const [pending, history] = await Promise.all([
        fetch(
          `/api/admin/social/drafts?awardeeId=${current.awardeeId}&status=draft`,
        ).then(readResponse),
        fetch(
          `/api/admin/social/drafts?awardeeId=${current.awardeeId}&status=marked_posted`,
        ).then(readResponse),
      ])
      const latest = pending.drafts.find(
        (item: SocialShareDraft) => item.platform === platform,
      ) as SocialShareDraft | undefined
      setDrafts((items) => [
        ...items.filter((item) => item.platform !== platform),
        ...(latest ? [latest] : []),
      ])
      setCaptions((items) => ({ ...items, [platform]: latest?.caption ?? '' }))
      setChecks((items) => ({ ...items, [platform]: undefined }))
      setPosts(history.drafts)
      setPostPage(1)
      setMorePosts(history.hasMore)
      setConfirmed(false)
      setPostUrl('')
      setMessage(
        `Latest saved ${SPOTLIGHT_LABELS[platform]} draft loaded. Other channel edits have been kept.`,
      )
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not reload the saved draft.',
      )
    } finally {
      setBusy('')
    }
  }
  const refreshProfile = async () => {
    setBusy('refresh')
    setError('')
    try {
      const data = await readResponse(
        await fetch(
          `/api/admin/social/awardees?awardeeId=${current.awardeeId}`,
        ),
      )
      if (!data.awardees?.[0])
        throw new Error('This awardee no longer has a public profile.')
      setCurrent(data.awardees[0])
      setMessage(
        'Latest profile loaded. Review the artwork and existing captions before saving. Your edits have been kept.',
      )
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not refresh the profile.',
      )
    } finally {
      setBusy('')
    }
  }
  const editorialRequest = async (payload: object) => {
    const response = await fetch('/api/admin/social/editorial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        awardeeId: current.awardeeId,
        signature: current.signature,
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      if ('review' in data && data.review) setMasterReview(data.review)
      throw new Error(data.message || 'The editorial request failed.')
    }
    return data
  }

  const runEditorial = async (operation: string, run: () => Promise<void>) => {
    setBusy(operation)
    setError('')
    setMessage('')
    try {
      await run()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The editorial request failed.',
      )
    } finally {
      setBusy('')
    }
  }

  const generateMaster = () => {
    if (masterDirty && !window.confirm('Replace your unsaved master story?'))
      return
    return runEditorial('master', async () => {
      const data = await editorialRequest({ action: 'generate', options })
      setMaster(data.story)
      setEditingMaster(true)
      setMasterReview(null)
      setMessage('Master story ready for review.')
    })
  }

  const reloadApproval = () => {
    if (
      masterDirty &&
      !window.confirm('Replace your unsaved story with the latest approval?')
    )
      return
    return runEditorial('reload-master', async () => {
      const data = await readResponse(
        await fetch(
          `/api/admin/social/editorial?awardeeId=${current.awardeeId}`,
        ),
      )
      setApproval(data.approval)
      setMaster(data.approval?.story ?? '')
      setMasterReview(null)
    })
  }

  const approveMaster = () => {
    if (approved || masterIssue || !master.trim()) return
    return runEditorial('approve', async () => {
      const data = await editorialRequest({
        action: 'approve',
        story: master,
        expectedRevision: approval?.revision ?? null,
      })
      setApproval(data.approval)
      setMaster(data.approval.story)
      setMasterReview(data.review)
      setMessage(
        'Master story approved. You can now adapt it for social channels.',
      )
    })
  }

  const adapt = (channels: readonly SpotlightPlatform[]) => {
    if (!approved || !approval) return
    const targets = channels.filter(
      (channel) =>
        !drafts.some(
          (item) =>
            item.platform === channel &&
            !['ready', 'failed'].includes(item.publishState),
        ),
    )
    if (!targets.length) return
    if (
      targets.some(
        (channel) =>
          captions[channel]?.trim() ||
          drafts.some((item) => item.platform === channel),
      ) &&
      !window.confirm(
        'Replace the copies in these channel editors? Saved drafts change only when you save them.',
      )
    )
      return
    return runEditorial('adapt', async () => {
      const results = await Promise.allSettled(
        targets.map(async (channel) => ({
          channel,
          data: await editorialRequest({
            action: 'adapt',
            revision: approval.revision,
            platform: channel,
          }),
        })),
      )
      const failed: string[] = []
      for (const [index, result] of results.entries()) {
        if (result.status === 'rejected') {
          const reason =
            result.reason instanceof Error
              ? result.reason.message
              : 'Try again.'
          failed.push(`${SPOTLIGHT_LABELS[targets[index]]}: ${reason}`)
          continue
        }
        const { channel, data } = result.value
        setCaptions((items) => ({ ...items, [channel]: data.story }))
        setChecks((items) => ({ ...items, [channel]: data }))
      }
      setPreviewing(false)
      if (failed.length) setError(failed.join(' '))
      if (failed.length < targets.length)
        setMessage(
          'Channel copies are ready for review. Open each channel to see its quality check.',
        )
    })
  }

  const checkCaption = () => {
    if (!approved || !approval || !caption.trim()) return
    return runEditorial('check', async () => {
      const data = await editorialRequest({
        action: 'check',
        revision: approval.revision,
        platform,
        story: caption,
      })
      setChecks((items) => ({
        ...items,
        [platform]: { ...data, story: caption },
      }))
      setMessage(
        data.review.passes
          ? 'Quality check passed. Save this draft when ready.'
          : 'Review the feedback and edit the copy.',
      )
    })
  }
  const save = async () => {
    if (!channelPassed) return
    setBusy('save')
    setError('')
    setMessage('')
    try {
      const data = await readResponse(
        await fetch('/api/admin/social/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            awardeeId: current.awardeeId,
            platform,
            caption,
            signature: current.signature,
            expectedUpdatedAt: draft?.updatedAt ?? null,
          }),
        }),
      )
      setDrafts((items) => [
        data.draft,
        ...items.filter((item) => item.platform !== platform),
      ])
      setCaptions((items) => ({ ...items, [platform]: data.draft.caption }))
      onSaved()
      setMessage(
        `${SPOTLIGHT_LABELS[platform]} draft saved. You can now copy or share it.`,
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save draft.')
    } finally {
      setBusy('')
    }
  }
  const share = async () => {
    setBusy('share')
    setError('')
    setMessage('')
    try {
      const outcome = await shareSocialDraft(
        { caption, profileUrl: current.profileUrl, imageUrl },
        navigator,
        fetch,
        imageFile,
      )
      setMessage(
        outcome === 'shared_with_image' || outcome === 'shared'
          ? 'Finish publishing in your chosen app. Return here to record the live post; opening the share sheet does not mark it posted.'
          : outcome === 'cancelled'
            ? 'Sharing cancelled. Your draft is saved.'
            : 'Use Copy caption and Download image, then publish in your social app.',
      )
    } finally {
      setBusy('')
    }
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(caption)
      setMessage(
        'Caption copied. Publish it in your social app, then record the live post below.',
      )
    } catch {
      setError(
        'Could not copy automatically. Select and copy the caption text.',
      )
    }
  }
  const download = () => {
    if (!imageFile) return
    const url = URL.createObjectURL(imageFile)
    const link = document.createElement('a')
    link.href = url
    link.download = `${current.slug}-${useCard ? 'afl-spotlight' : 'profile-image'}.${imageFile.name.split('.').pop()}`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
  const markPosted = async () => {
    if (
      busy ||
      !loaded ||
      !draft ||
      !saved ||
      !confirmed ||
      !postUrl.trim() ||
      draft.publishState === 'publishing'
    )
      return
    setBusy('post')
    setError('')
    setMessage('')
    try {
      const data = await readResponse(
        await fetch(`/api/admin/social/drafts/${draft.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicPostUrl: postUrl.trim(),
            expectedUpdatedAt: draft.updatedAt,
          }),
        }),
      )
      setDrafts((items) => items.filter((item) => item.id !== draft.id))
      setPosts((items) => [data.draft, ...items])
      setCaptions((items) => ({ ...items, [platform]: '' }))
      setChecks((items) => ({ ...items, [platform]: undefined }))
      setPostUrl('')
      setConfirmed(false)
      onSaved()
      setMessage(
        'Live post recorded. This awardee now appears in the Posted tracker.',
      )
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not record post.',
      )
    } finally {
      setBusy('')
    }
  }
  const loadMore = async () => {
    setBusy('history')
    setError('')
    try {
      const data = await readResponse(
        await fetch(
          `/api/admin/social/drafts?awardeeId=${current.awardeeId}&status=marked_posted&page=${postPage + 1}`,
        ),
      )
      setPosts((items) => [
        ...items,
        ...data.drafts.filter(
          (item: SocialShareDraft) =>
            !items.some((previous) => previous.id === item.id),
        ),
      ])
      setPostPage((value) => value + 1)
      setMorePosts(data.hasMore)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not load history.',
      )
    } finally {
      setBusy('')
    }
  }
  const openView = (next: typeof view) => {
    if (next === view) return
    setView(next)
    requestAnimationFrame(() =>
      viewTitle.current?.focus({ preventScroll: true }),
    )
  }
  const selectChannel = (channel: SpotlightPlatform) => {
    if (channel === platform) return
    setPlatform(channel)
    setPostUrl('')
    setConfirmed(false)
    setError('')
    setMessage('')
  }

  const channelStatus = (channel: SpotlightPlatform) => {
    const stored = drafts.find((item) => item.platform === channel)
    const text = captions[channel]?.trim() ?? ''
    if (text && stored?.caption === text) return 'Saved'
    if (text) return 'In review'
    return posts.some((item) => item.platform === channel) ? 'Posted' : ''
  }
  const activity =
    {
      load: 'Loading feature…',
      master: 'Writing master story…',
      approve: 'Checking the master story…',
      adapt: 'Adapting the story…',
      check: 'Checking channel copy…',
      save: 'Saving draft…',
      post: 'Recording the post…',
    }[busy] ?? 'Working…'

  return (
    <section
      className="awardee-feature-composer min-w-0 rounded-xl border border-stone-200 bg-white"
      aria-label="Feature this leader"
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-semibold text-stone-950">
            {current.name}
          </h2>
          <p className="break-words text-sm text-stone-600">
            {[current.fieldOfStudy || current.headline, current.country]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        {onChooseAnother && (
          <Button variant="ghost" onClick={onChooseAnother}>
            Change awardee
          </Button>
        )}
      </header>

      <div
        className="grid grid-cols-3 gap-1 border-y border-stone-200 bg-stone-50 p-1.5 sm:px-4"
        role="group"
        aria-label="Editorial workflow"
      >
        {(
          [
            ['story', 'Story'],
            ['channels', 'Channels'],
            ['publish', 'Publish'],
          ] as const
        ).map(([step, label]) => (
          <button
            key={step}
            type="button"
            aria-pressed={view === step}
            onClick={() => openView(step)}
            className={cn(
              'flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600',
              view === step
                ? 'bg-white text-stone-950 shadow-sm ring-1 ring-stone-200'
                : 'text-stone-600 hover:bg-white/70',
            )}
          >
            {step === 'story' && approved && (
              <Check
                className="size-4 shrink-0 text-emerald-700"
                aria-label="Approved"
              />
            )}
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3 px-4 py-4 sm:px-5">
        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            <span>{error}</span>
            {!loaded && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setError('')
                  setBusy('load')
                  setRetry((value) => value + 1)
                }}
              >
                Retry
              </Button>
            )}
          </div>
        )}
        {(busy || message) && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700"
          >
            {busy && <LoaderCircle className="size-4 shrink-0 animate-spin" />}
            {busy ? activity : message}
          </p>
        )}

        {view === 'story' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <h3
                ref={viewTitle}
                tabIndex={-1}
                className="text-base font-semibold text-stone-950"
              >
                Master story
              </h3>
              {approved && (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-800">
                  <Check className="size-4" />
                  Approved
                </span>
              )}
            </div>
            {!current.bio && (
              <p className="text-sm text-amber-900">
                Add a public bio before generating the story.{' '}
                <a
                  className="underline"
                  href={`/admin/awardees/edit/${current.awardeeId}`}
                >
                  Edit profile
                </a>
              </p>
            )}
            <div className="divide-y divide-stone-200 rounded-lg border border-stone-200 px-3">
              <details>
                <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-stone-800">
                  Source profile
                </summary>
                <div className="space-y-3 pb-3 text-sm text-stone-700">
                  <p
                    className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words leading-6"
                    tabIndex={0}
                    aria-label="Public biography"
                  >
                    {current.bio || 'No public bio.'}
                  </p>
                  {current.achievements.length > 0 && (
                    <div>
                      <h4 className="font-medium">Public achievements</h4>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {current.achievements.map((item, index) => (
                          <li key={index}>
                            {[
                              item.title,
                              item.organization,
                              item.description,
                              item.date,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-stone-600">
                    {[
                      current.cohort && `Cohort: ${current.cohort}`,
                      current.year && `Year: ${current.year}`,
                      current.impactProjects !== null &&
                        `Projects: ${current.impactProjects}`,
                      current.livesImpacted !== null &&
                        `Lives impacted: ${current.livesImpacted}`,
                      current.awardsReceived !== null &&
                        `Awards: ${current.awardsReceived}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      className="inline-flex min-h-11 items-center text-orange-900 underline"
                      href={current.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open public profile
                    </a>
                    <Button
                      variant="ghost"
                      disabled={!!busy}
                      onClick={() => void refreshProfile()}
                    >
                      Refresh source
                    </Button>
                  </div>
                </div>
              </details>
              <details>
                <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-stone-800">
                  Writing options{' '}
                  <span className="font-normal text-stone-500">· Optional</span>
                </summary>
                <div className="pb-3">
                  <fieldset
                    disabled={!!busy}
                    className="grid gap-3 sm:grid-cols-3"
                  >
                    <label className="text-sm">
                      Angle
                      <select
                        className="mt-1 block w-full border bg-white p-2"
                        value={options.angle}
                        onChange={(event) =>
                          setOptions({
                            ...options,
                            angle: event.target
                              .value as EditorialOptions['angle'],
                          })
                        }
                      >
                        <option value="from-source">Choose from source</option>
                        <option value="education">Education</option>
                        <option value="entrepreneurship">
                          Entrepreneurship
                        </option>
                        <option value="technology">Technology</option>
                        <option value="leadership">Leadership</option>
                        <option value="community-impact">
                          Community impact
                        </option>
                      </select>
                    </label>
                    <label className="text-sm">
                      Tone
                      <select
                        className="mt-1 block w-full border bg-white p-2"
                        value={options.tone}
                        onChange={(event) =>
                          setOptions({
                            ...options,
                            tone: event.target
                              .value as EditorialOptions['tone'],
                          })
                        }
                      >
                        <option value="editorial">
                          Professional editorial
                        </option>
                        <option value="celebratory">Celebratory</option>
                        <option value="journalistic">Journalistic</option>
                        <option value="inspirational">Inspirational</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      Length
                      <select
                        className="mt-1 block w-full border bg-white p-2"
                        value={options.length}
                        onChange={(event) =>
                          setOptions({
                            ...options,
                            length: event.target
                              .value as EditorialOptions['length'],
                          })
                        }
                      >
                        <option value="short">Short</option>
                        <option value="standard">Standard</option>
                        <option value="extended">Extended</option>
                      </select>
                    </label>
                    <label className="text-sm sm:col-span-3">
                      Editorial focus (optional)
                      <Textarea
                        className="mt-1"
                        value={options.focus}
                        maxLength={800}
                        onChange={(event) =>
                          setOptions({ ...options, focus: event.target.value })
                        }
                      />
                    </label>
                  </fieldset>
                </div>
              </details>
            </div>

            {master || editingMaster ? (
              <>
                <label className="sr-only" htmlFor={`${id}-master`}>
                  Master story
                </label>
                <Textarea
                  id={`${id}-master`}
                  rows={8}
                  maxLength={6000}
                  value={master}
                  disabled={!!busy || !loaded}
                  className="min-h-[220px] resize-y leading-6"
                  aria-describedby={`${id}-master-help`}
                  onChange={(event) => {
                    setEditingMaster(true)
                    setMaster(event.target.value)
                    setMasterReview(null)
                  }}
                />
                <div id={`${id}-master-help`} className="space-y-1 text-sm">
                  {masterIssue && <p className="text-red-700">{masterIssue}</p>}
                  {approval && !approved && !masterDirty && (
                    <p className="text-amber-900">
                      The public source changed. Review the story and approve it
                      again.
                    </p>
                  )}
                  {masterReview && (
                    <p
                      className={
                        masterReview.passes
                          ? 'text-emerald-800'
                          : 'text-amber-900'
                      }
                    >
                      Quality {masterReview.score}% · {masterReview.feedback}
                    </p>
                  )}
                  {!approved && !masterIssue && (
                    <p className="text-stone-600">
                      Check the facts against the source before approving. The
                      quality check requires {EDITORIAL_THRESHOLD}%.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {approved ? (
                    <Button onClick={() => openView('channels')}>
                      Continue to channels <ArrowRight className="size-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => void approveMaster()}
                      disabled={
                        !!busy || !loaded || !master.trim() || !!masterIssue
                      }
                    >
                      Check and approve
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    disabled={!!busy || !loaded || !current.bio}
                    onClick={() => void generateMaster()}
                  >
                    Rewrite
                  </Button>
                  {(approval || error) && (
                    <Button
                      variant="ghost"
                      disabled={!!busy || !loaded}
                      onClick={() => void reloadApproval()}
                    >
                      Reload approval
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-3 rounded-lg bg-stone-50 p-4">
                <p className="text-sm text-stone-700">
                  Draft an AFL announcement from the public bio, then review it
                  before adapting it for social channels.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!!busy || !loaded || !current.bio}
                    onClick={() => void generateMaster()}
                  >
                    <Sparkles className="size-4" />
                    Generate story
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={!!busy || !loaded}
                    onClick={() => setEditingMaster(true)}
                  >
                    Write manually
                  </Button>
                  {error && (
                    <Button
                      variant="ghost"
                      disabled={!!busy || !loaded}
                      onClick={() => void reloadApproval()}
                    >
                      Reload approval
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {view !== 'story' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3
                ref={viewTitle}
                tabIndex={-1}
                className="text-base font-semibold text-stone-950"
              >
                {view === 'channels' ? 'Channel drafts' : 'Publish and record'}
              </h3>
              {view === 'channels' && approved && (
                <Button
                  variant={caption ? 'outline' : 'default'}
                  onClick={() => void adapt(SPOTLIGHT_PLATFORMS)}
                  disabled={!!busy || !loaded}
                >
                  <Sparkles className="size-4" />
                  {SPOTLIGHT_PLATFORMS.some((channel) =>
                    captions[channel]?.trim(),
                  )
                    ? 'Adapt all channels'
                    : 'Generate all four'}
                </Button>
              )}
            </div>
            <div
              className="grid grid-cols-2 gap-1.5 sm:grid-cols-4"
              role="group"
              aria-label="Feature channel"
            >
              {SPOTLIGHT_PLATFORMS.map((channel) => (
                <button
                  key={channel}
                  type="button"
                  aria-pressed={channel === platform}
                  onClick={() => selectChannel(channel)}
                  disabled={!!busy}
                  className={cn(
                    'min-h-11 min-w-0 rounded-lg border px-2 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600',
                    channel === platform
                      ? 'border-orange-400 bg-orange-50 text-orange-950'
                      : 'border-stone-200 text-stone-700 hover:bg-stone-50',
                  )}
                >
                  {SPOTLIGHT_LABELS[channel]}
                  {channelStatus(channel) && (
                    <span className="block text-[11px] font-normal text-stone-600">
                      {channelStatus(channel)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {view === 'channels' && (
          <>
            {!approved && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
                <p>
                  Approve the master story to generate or check channel copy.
                </p>
                <Button variant="ghost" onClick={() => openView('story')}>
                  Open story
                </Button>
              </div>
            )}
            {caption || draft || channelCheck || editingChannels[platform] ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor={`${id}-caption`}
                    className="text-sm font-medium"
                  >
                    {SPOTLIGHT_LABELS[platform]} copy
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-pressed={previewing}
                    onClick={() => setPreviewing((value) => !value)}
                  >
                    {previewing ? 'Edit copy' : 'Preview'}
                  </Button>
                </div>
                {previewing ? (
                  <article
                    aria-label="Channel preview"
                    className="whitespace-pre-wrap break-words rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm leading-6"
                  >
                    {caption}
                  </article>
                ) : (
                  <Textarea
                    id={`${id}-caption`}
                    rows={6}
                    value={caption}
                    disabled={!!busy || !loaded || locked}
                    onChange={(event) =>
                      setCaptions((items) => ({
                        ...items,
                        [platform]: event.target.value,
                      }))
                    }
                    aria-describedby={`${id}-copy-help`}
                    className="min-h-[170px] resize-y leading-6"
                  />
                )}
              </>
            ) : (
              <div className="rounded-lg bg-stone-50 p-4 text-sm text-stone-600">
                No draft for {SPOTLIGHT_LABELS[platform]} yet.
              </div>
            )}
            <div id={`${id}-copy-help`} className="space-y-1 text-sm">
              {caption && (
                <p className="text-xs tabular-nums text-stone-600">
                  {captionLength(platform, caption)} /{' '}
                  {CAPTION_LIMITS[platform]} characters
                </p>
              )}
              {caption && issue && <p className="text-red-700">{issue}</p>}
              {locked && (
                <p className="text-amber-900">
                  Check the social account to confirm whether this post went
                  live.
                </p>
              )}
              {stale && (
                <p className="text-amber-900">
                  The public source changed. Review the copy and save it again
                  before sharing.
                </p>
              )}
              {channelCheck &&
                channelCheck.story === caption &&
                channelCheck.revision === approval?.revision && (
                  <p
                    className={
                      channelCheck.review.passes
                        ? 'text-emerald-800'
                        : 'text-amber-900'
                    }
                  >
                    Quality {channelCheck.review.score}% ·{' '}
                    {channelCheck.review.feedback}
                  </p>
                )}
              {requiresCheck &&
                !channelPassed &&
                caption &&
                channelCheck?.story !== caption && (
                  <p className="text-stone-600">
                    Check this copy before saving.
                  </p>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {saved && !stale ? (
                <Button onClick={() => openView('publish')}>
                  Continue to publish <ArrowRight className="size-4" />
                </Button>
              ) : caption ? (
                channelPassed ? (
                  <Button
                    disabled={!!busy || !loaded || !!issue || locked}
                    onClick={() => void save()}
                  >
                    <Save className="size-4" />
                    Save draft
                  </Button>
                ) : (
                  <Button
                    disabled={!!busy || !approved || !!issue || locked}
                    onClick={() => void checkCaption()}
                  >
                    Check copy
                  </Button>
                )
              ) : null}
              <Button
                variant={caption ? 'ghost' : 'outline'}
                disabled={!!busy || !approved || locked}
                onClick={() => void adapt([platform])}
              >
                {caption
                  ? 'Rewrite'
                  : `Generate ${SPOTLIGHT_LABELS[platform]} draft`}
              </Button>
              {!caption &&
                !draft &&
                !channelCheck &&
                !editingChannels[platform] && (
                  <Button
                    variant="ghost"
                    disabled={!!busy || !approved || !loaded}
                    onClick={() =>
                      setEditingChannels((items) => ({
                        ...items,
                        [platform]: true,
                      }))
                    }
                  >
                    Write manually
                  </Button>
                )}
              {(draft || error) && (
                <Button
                  variant="ghost"
                  disabled={!!busy || !loaded}
                  onClick={() => void reloadChannel()}
                >
                  Reload draft
                </Button>
              )}
            </div>
          </>
        )}

        {view === 'publish' && (
          <>
            {saved ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    disabled={!!busy || !!issue || locked || stale}
                    onClick={() => void copy()}
                  >
                    <Copy className="size-4" />
                    Copy post
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!!busy || !!issue || locked || stale}
                    onClick={() => void share()}
                  >
                    <Share2 className="size-4" />
                    Share from device
                  </Button>
                </div>
                {(issue || stale || locked) && (
                  <p className="text-sm text-amber-900">
                    {issue ||
                      (stale
                        ? 'Review the updated profile and save the draft again before sharing.'
                        : 'Check the social account for an existing post before trying again.')}
                  </p>
                )}
                <details className="border-t border-stone-200 pt-2">
                  <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-stone-900">
                    Awardee image
                  </summary>
                  <div
                    className="mt-3 flex flex-wrap gap-2"
                    role="group"
                    aria-label="Image format"
                  >
                    <Button
                      variant={!useCard ? 'secondary' : 'outline'}
                      aria-pressed={!useCard}
                      onClick={() => setUseCard(false)}
                    >
                      Existing image
                    </Button>
                    {cardUrl && (
                      <Button
                        variant={useCard ? 'secondary' : 'outline'}
                        aria-pressed={useCard}
                        onClick={() => setUseCard(true)}
                      >
                        Spotlight card
                      </Button>
                    )}
                  </div>
                  <div className="mt-4">
                    <div className="relative aspect-[4/5] max-w-56 overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={`${useCard ? 'Spotlight artwork' : 'Public profile image'} for ${current.name}`}
                          fill
                          sizes="(max-width: 1024px) 90vw, 400px"
                          unoptimized
                          className="object-contain"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-stone-500">
                          No public image is available. Add a profile photo or
                          portfolio cover before featuring this awardee with
                          artwork.
                        </div>
                      )}
                    </div>
                    <Button
                      className="mt-3 min-h-11 w-full"
                      variant="outline"
                      onClick={download}
                      disabled={!imageFile}
                    >
                      <Download className="size-4" />
                      Download image
                    </Button>
                    {imageUrl && !imageFile && (
                      <p className="mt-2 text-xs text-stone-500">
                        If the image cannot be attached or downloaded from here,{' '}
                        <a
                          href={imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          open the image
                        </a>{' '}
                        and save it directly.
                      </p>
                    )}
                    <p className="mt-3 text-xs leading-5 text-stone-500">
                      Use the public image as uploaded, or choose the optional
                      1080 × 1350 AFL Spotlight card.
                    </p>
                  </div>
                </details>

                <form
                  className="space-y-2 border-t border-stone-200 pt-3"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void markPosted()
                  }}
                >
                  <label
                    htmlFor={`${id}-url`}
                    className="block text-sm font-medium"
                  >
                    Live {SPOTLIGHT_LABELS[platform]} post URL
                  </label>
                  <input
                    id={`${id}-url`}
                    type="url"
                    required
                    pattern="https://.*"
                    value={postUrl}
                    onChange={(event) => setPostUrl(event.target.value)}
                    placeholder="https://…"
                    className="h-11 w-full rounded-lg border px-3 text-sm"
                    disabled={!!busy}
                  />
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                      disabled={!!busy}
                    />
                    I confirmed this post is live.
                  </label>
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={
                      !!busy ||
                      !confirmed ||
                      !postUrl.trim() ||
                      draft?.publishState === 'publishing'
                    }
                  >
                    <Check className="size-4" />
                    Mark as posted
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
                <p>Save a {SPOTLIGHT_LABELS[platform]} draft to share it.</p>
                <Button variant="ghost" onClick={() => openView('channels')}>
                  Open channel draft
                </Button>
              </div>
            )}
            <details className="border-t border-stone-200 pt-2">
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
                Posting history ({posts.length}
                {morePosts ? '+' : ''})
              </summary>
              {posts.length === 0 && (
                <p className="pb-2 text-sm text-stone-600">
                  No posts recorded.
                </p>
              )}
              <ul className="divide-y divide-stone-100">
                {posts.map((post) => (
                  <li
                    key={post.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                  >
                    <span>
                      {SPOTLIGHT_LABELS[post.platform]} ·{' '}
                      {new Date(
                        post.markedPostedAt ?? post.updatedAt,
                      ).toLocaleDateString()}
                    </span>
                    {post.publicPostUrl && (
                      <a
                        className="inline-flex min-h-11 items-center text-orange-900 underline"
                        href={post.publicPostUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View live post
                      </a>
                    )}
                  </li>
                ))}
              </ul>
              {morePosts && (
                <Button
                  variant="outline"
                  disabled={!!busy}
                  onClick={() => void loadMore()}
                >
                  Load older posts
                </Button>
              )}
            </details>
          </>
        )}
      </div>
    </section>
  )
}
