'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CalendarDays,
  Clock3,
  ExternalLink,
  Loader2,
  Play,
  Trash2,
  Youtube as YoutubeIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import { Skeleton } from '@/components/ui/skeleton'
import { summarizeAdminVideos } from '@/lib/youtube/admin-summary'
import PageHeader from '../components/PageHeader'

interface YouTubeVideo {
  id: string
  title: string
  description: string
  date: string
  videoId: string
}

const getYouTubeThumbnail = (videoId: string) =>
  `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`

const extractVideoId = (url: string): string | null => {
  const value = url.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value

  const match = value.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/)
  return match?.[2]?.length === 11 ? match[2] : null
}

export default function YouTubeManagement() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [newVideo, setNewVideo] = useState({ title: '', description: '', date: '', videoId: '' })
  const [isAdding, setIsAdding] = useState(false)
  const [videoToDelete, setVideoToDelete] = useState<YouTubeVideo | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const stats = useMemo(() => summarizeAdminVideos(videos), [videos])

  const fetchYouTubeVideos = useCallback(async ({ announce = true }: { announce?: boolean } = {}) => {
    if (announce) {
      setLoading(true)
      toast.loading('Loading channel videos…', { id: 'loading-youtube' })
    }

    try {
      const response = await fetch('/api/youtube')
      if (!response.ok) throw new Error('Failed to fetch videos')
      const data: unknown = await response.json()
      setVideos(Array.isArray(data) ? data as YouTubeVideo[] : [])
      if (announce) toast.success('Channel videos loaded', { id: 'loading-youtube' })
    } catch (error) {
      console.error('Error fetching YouTube videos:', error)
      toast.error('Failed to fetch channel videos', { id: 'loading-youtube' })
    } finally {
      if (announce) setLoading(false)
    }
  }, [])

  useEffect(() => {
    // This memoized loader owns the asynchronous state transitions for the external API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchYouTubeVideos()
  }, [fetchYouTubeVideos])

  const handleAddVideo = async () => {
    if (!newVideo.title.trim() || !newVideo.videoId.trim()) {
      toast.error('Title and YouTube URL are required')
      return
    }

    const videoId = extractVideoId(newVideo.videoId)
    if (!videoId) {
      toast.error('Enter a valid YouTube URL or 11-character video ID')
      return
    }

    try {
      setIsAdding(true)
      toast.loading('Adding video…', { id: 'add-youtube' })
      const response = await fetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newVideo.title.trim(),
          description: newVideo.description.trim(),
          date: newVideo.date.trim(),
          videoId,
        }),
      })
      if (!response.ok) throw new Error('Failed to add video')

      const result = await response.json()
      if (!result.success) throw new Error(result.message)

      await fetchYouTubeVideos({ announce: false })
      setNewVideo({ title: '', description: '', date: '', videoId: '' })
      toast.success(result.message, { id: 'add-youtube' })
    } catch (error) {
      console.error('Error adding YouTube video:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to add video', { id: 'add-youtube' })
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id)
      toast.loading('Removing video…', { id: `delete-${id}` })
      const response = await fetch(`/api/youtube?id=${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete video')

      const result = await response.json()
      if (!result.success) throw new Error(result.message)

      await fetchYouTubeVideos({ announce: false })
      toast.success(result.message, { id: `delete-${id}` })
    } catch (error) {
      console.error('Error deleting YouTube video:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete video', { id: `delete-${id}` })
    } finally {
      setDeletingId(null)
      setVideoToDelete(null)
    }
  }

  return (
    <div className="youtube-admin-page space-y-6 pb-4">
      <PageHeader
        eyebrow="Video channel"
        title="Channel"
        description="Manage the YouTube videos shown in the Recent Events section."
        actions={(
          <Button className="admin-primary" asChild>
            <a href="#add-video"><Play className="h-4 w-4" /> Add video</a>
          </Button>
        )}
      />

      <section className="space-y-3" aria-labelledby="youtube-overview-heading">
        <div className="youtube-section-heading">
          <div><p className="admin-kicker">Library health</p><h2 id="youtube-overview-heading">Channel overview</h2></div>
          <p>Only saved channel data is shown here.</p>
        </div>
        <div className="youtube-metrics">
          <article className="youtube-metric"><span><Play aria-hidden="true" /></span><div><strong>{loading ? '—' : stats.total}</strong><p>All videos</p><small>Saved to the channel</small></div></article>
          <article className="youtube-metric"><span><CalendarDays aria-hidden="true" /></span><div><strong>{loading ? '—' : stats.dated}</strong><p>Dated</p><small>With event context</small></div></article>
          <article className="youtube-metric"><span><Clock3 aria-hidden="true" /></span><div><strong>{loading ? '—' : stats.recent}</strong><p>Recent</p><small>Within the last 3 months</small></div></article>
          <article className="youtube-metric"><span><AlertCircle aria-hidden="true" /></span><div><strong>{loading ? '—' : stats.missingDate}</strong><p>Missing date</p><small>Needs timeline context</small></div></article>
        </div>
      </section>

      <div className="youtube-workspace">
        <Card className="youtube-library admin-panel">
          <CardHeader className="youtube-panel-header">
            <div>
              <p className="admin-kicker">Published collection</p>
              <CardTitle>Video library</CardTitle>
              <p>{loading ? 'Loading videos…' : `${videos.length} ${videos.length === 1 ? 'video' : 'videos'} shown on the site`}</p>
            </div>
          </CardHeader>
          <CardContent className="youtube-library-content">
            {loading ? (
              <div className="youtube-loading-list">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index}><Skeleton className="h-16 w-28 shrink-0 rounded-xl" /><div><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/3" /></div></div>
                ))}
              </div>
            ) : videos.length === 0 ? (
              <div className="youtube-empty-state">
                <span><YoutubeIcon aria-hidden="true" /></span>
                <p className="admin-kicker">Library empty</p>
                <h3>Add the first channel video</h3>
                <p>Use the publishing form to add a YouTube link to the site.</p>
                <Button variant="outline" asChild><a href="#add-video">Open publishing form</a></Button>
              </div>
            ) : (
              <ResponsiveTable
                data={videos}
                breakpoint="xl"
                getRowKey={(video) => video.id}
                className="youtube-video-table"
                columns={[
                  {
                    key: 'thumbnail', header: 'Video',
                    cell: (video) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getYouTubeThumbnail(video.videoId)} alt="" loading="lazy" width={80} height={54} className="youtube-thumbnail" />
                    ),
                  },
                  { key: 'title', header: 'Title', className: 'font-medium max-w-[340px]', cell: (video) => <span className="line-clamp-2">{video.title}</span> },
                  { key: 'date', header: 'Event date', cell: (video) => <Badge variant="secondary">{video.date || 'Not set'}</Badge> },
                  {
                    key: 'actions', header: 'Actions', className: 'text-right',
                    cell: (video) => (
                      <div className="youtube-row-actions">
                        <Button variant="outline" size="sm" aria-label={`Open ${video.title} on YouTube`} onClick={() => window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank', 'noopener,noreferrer')}><ExternalLink className="h-4 w-4" /> Open</Button>
                        <Button variant="outline" size="icon" aria-label={`Delete ${video.title}`} disabled={deletingId === video.id} onClick={() => setVideoToDelete(video)}>{deletingId === video.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button>
                      </div>
                    ),
                  },
                ]}
                renderCard={(video) => (
                  <article className="youtube-video-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={getYouTubeThumbnail(video.videoId)} alt="" loading="lazy" width={160} height={90} />
                    <div>
                      <div><h3>{video.title}</h3><Badge variant="secondary">{video.date || 'Date not set'}</Badge></div>
                      {video.description ? <p>{video.description}</p> : null}
                      <div className="youtube-card-actions">
                        <Button variant="outline" onClick={() => window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank', 'noopener,noreferrer')}><ExternalLink className="h-4 w-4" /> Open video</Button>
                        <Button variant="outline" size="icon" aria-label={`Delete ${video.title}`} disabled={deletingId === video.id} onClick={() => setVideoToDelete(video)}>{deletingId === video.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button>
                      </div>
                    </div>
                  </article>
                )}
              />
            )}
          </CardContent>
        </Card>

        <Card id="add-video" className="youtube-publisher admin-panel scroll-mt-24">
          <CardHeader className="youtube-panel-header">
            <div><p className="admin-kicker">Publish to site</p><CardTitle>Add a video</CardTitle><p>Paste a YouTube link and add the context visitors should see.</p></div>
          </CardHeader>
          <CardContent className="youtube-form">
            <div><Label htmlFor="yt-title">Video title <span aria-hidden="true">*</span></Label><Input id="yt-title" value={newVideo.title} onChange={(event) => setNewVideo({ ...newVideo, title: event.target.value })} placeholder="e.g. AFL Summit highlights" /></div>
            <div><Label htmlFor="yt-videoId">YouTube URL or video ID <span aria-hidden="true">*</span></Label><Input id="yt-videoId" value={newVideo.videoId} onChange={(event) => setNewVideo({ ...newVideo, videoId: event.target.value })} placeholder="youtube.com/watch?v=…" aria-describedby="yt-video-help" /><p id="yt-video-help">Use a full YouTube URL or its 11-character video ID.</p></div>
            <div><Label htmlFor="yt-date">Event date</Label><Input id="yt-date" value={newVideo.date} onChange={(event) => setNewVideo({ ...newVideo, date: event.target.value })} placeholder="e.g. March 2026" /></div>
            <div><Label htmlFor="yt-description">Description</Label><Input id="yt-description" value={newVideo.description} onChange={(event) => setNewVideo({ ...newVideo, description: event.target.value })} placeholder="A short description for visitors" /></div>
          </CardContent>
          <CardFooter className="youtube-form-footer">
            <Button className="admin-primary w-full" onClick={handleAddVideo} disabled={isAdding || !newVideo.title.trim() || !newVideo.videoId.trim()}>
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isAdding ? 'Adding video…' : 'Add video'}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <AlertDialog open={Boolean(videoToDelete)} onOpenChange={(open) => { if (!open) setVideoToDelete(null) }}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this video?</AlertDialogTitle>
            <AlertDialogDescription>{videoToDelete ? `“${videoToDelete.title}” will be removed from the site. This action cannot be undone.` : 'This action cannot be undone.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (videoToDelete) handleDelete(videoToDelete.id) }} disabled={Boolean(deletingId)} className="bg-red-600 text-white hover:bg-red-700">
              {deletingId ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Delete video
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
