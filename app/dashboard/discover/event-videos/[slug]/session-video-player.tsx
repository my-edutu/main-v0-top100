'use client'

import { useState } from 'react'
import { ArrowUpRight, Play } from 'lucide-react'

type SessionVideoPlayerProps = {
  title: string
  embedUrl?: string
  recordingUrl?: string
  coverImage?: string
}

export function SessionVideoPlayer({ title, embedUrl, recordingUrl, coverImage }: SessionVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  if (embedUrl && isPlaying) {
    return (
      <iframe
        src={embedUrl}
        title={`${title} recording`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="eager"
      />
    )
  }

  const posterStyle = coverImage
    ? { backgroundImage: `linear-gradient(120deg,rgba(23,20,18,.38),rgba(23,20,18,.18)),url("${coverImage}")` }
    : undefined

  return (
    <div className="event-session-video-placeholder" style={posterStyle}>
      {embedUrl ? (
        <button
          className="event-session-video-placeholder__play-button"
          type="button"
          aria-label={`Play ${title} recording`}
          onClick={() => setIsPlaying(true)}
        >
          <span className="event-session-video-placeholder__play" aria-hidden="true"><Play size={23} fill="currentColor" /></span>
          <span className="event-session-video-placeholder__play-label">Play session recording</span>
        </button>
      ) : recordingUrl ? (
        <>
          <span className="event-session-video-placeholder__play" aria-hidden="true"><Play size={23} fill="currentColor" /></span>
          <a className="event-session-video-placeholder__link" href={recordingUrl} target="_blank" rel="noopener noreferrer">
            Open session recording <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </>
      ) : (
        <>
          <span className="event-session-video-placeholder__play" aria-hidden="true"><Play size={23} fill="currentColor" /></span>
          <p>Session recording coming soon</p>
        </>
      )}
    </div>
  )
}
