'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Maximize2, Minimize2, Play } from 'lucide-react'

type SessionVideoPlayerProps = {
  title: string
  embedUrl?: string
  recordingUrl?: string
  coverImage?: string
}

export function SessionVideoPlayer({ title, embedUrl, recordingUrl, coverImage }: SessionVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const playerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(document.fullscreenElement === playerRef.current)
    document.addEventListener('fullscreenchange', syncFullscreenState)
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState)
  }, [])

  const toggleFullscreen = async () => {
    const player = playerRef.current
    if (!player) return
    try {
      if (document.fullscreenElement === player) {
        await document.exitFullscreen()
        return
      }
      await player.requestFullscreen()
    } catch {
      // Fullscreen may be unavailable in an embedded browser or denied by policy.
    }
  }

  if (embedUrl && isPlaying) {
    return (
      <div className="event-session-video-embed" ref={playerRef}>
        <iframe
          src={embedUrl}
          title={`${title} recording`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="eager"
        />
        <div className="event-session-video-controls" aria-label="Video actions">
          {recordingUrl ? <a href={recordingUrl} target="_blank" rel="noopener noreferrer" aria-label="Open recording in a new tab" title="Open recording in a new tab">
            <ArrowUpRight aria-hidden="true" size={19} />
          </a> : null}
          <button type="button" onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
            {isFullscreen ? <Minimize2 aria-hidden="true" size={19} /> : <Maximize2 aria-hidden="true" size={19} />}
          </button>
        </div>
      </div>
    )
  }

  const posterStyle = coverImage
    ? {
        backgroundImage: `url("${coverImage}")`,
        backgroundSize: recordingUrl ? 'cover' : 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundColor: '#f5f2e9',
      }
    : undefined

  if (coverImage && !recordingUrl) {
    return (
      <div
        className="event-session-video-placeholder event-session-video-placeholder--poster"
        style={posterStyle}
        role="img"
        aria-label={`${title} session poster. Session recording coming soon.`}
      />
    )
  }

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
