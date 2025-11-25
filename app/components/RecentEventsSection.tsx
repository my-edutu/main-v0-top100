"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Play, Calendar, ExternalLink } from "lucide-react"

interface VideoData {
  id: string
  title: string
  description: string
  date: string
}

interface YouTubeInfo {
  id: string
  title: string
  author_name: string
  thumbnail_url: string
}

const RecentEventsSection = () => {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)
  const [videos, setVideos] = useState<VideoData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await fetch('/api/youtube')
        if (response.ok) {
          const data = await response.json()
          // Map the API response to match our expected structure
          const mappedVideos = data.map((video: any) => ({
            id: video.video_id,
            title: video.title, // This might be the manually entered title
            description: video.description,
            date: video.date
          }))

          // Update titles with actual YouTube titles if possible
          const updatedVideos = await updateVideoTitlesWithYouTube(mappedVideos)
          setVideos(updatedVideos)
        } else {
          console.error('Failed to fetch YouTube videos:', response.status)
          setVideos([])
        }
      } catch (error) {
        console.error('Error fetching YouTube videos:', error)
        setVideos([])
      } finally {
        setLoading(false)
      }
    }

    fetchVideos()
  }, [])

  // Function to update video titles with actual YouTube titles using oEmbed
  const updateVideoTitlesWithYouTube = async (videos: VideoData[]): Promise<VideoData[]> => {
    if (!videos || videos.length === 0) return videos;

    try {
      // Extract just the video IDs
      const videoIds = videos.map(v => v.id);
      
      // Fetch actual YouTube titles using our server-side proxy
      const response = await fetch('/api/youtube-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds })
      });

      if (!response.ok) {
        console.error('Failed to fetch YouTube info:', response.status);
        // Fallback to original videos
        return videos;
      }

      const result = await response.json();
      
      if (result.success && result.videos) {
        // Create a map of video ID to actual YouTube info
        const youTubeInfoMap: Record<string, YouTubeInfo> = {};
        result.videos.forEach((info: YouTubeInfo) => {
          youTubeInfoMap[info.id] = info;
        });

        // Update the videos with actual titles from YouTube
        return videos.map(video => {
          const actualInfo = youTubeInfoMap[video.id];
          if (actualInfo) {
            return {
              ...video,
              title: actualInfo.title,
            };
          }
          return video;
        });
      }

      // If the API call failed for some reason, return original videos
      return videos;
    } catch (error) {
      console.error('Error updating YouTube video titles:', error);
      return videos;
    }
  }

  // State to track failed thumbnail URLs for fallback
  const [failedThumbnails, setFailedThumbnails] = useState<Record<string, boolean>>({});

  const getYouTubeThumbnail = (videoId: string) => {
    // If we know this thumbnail has failed, use a fallback
    if (failedThumbnails[videoId]) {
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`; // fallback to hq if maxres fails
    }
    // Try the high quality thumbnail first
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };

  const handleThumbnailError = (videoId: string) => {
    // Mark this thumbnail as failed so we use the fallback from now on
    setFailedThumbnails(prev => ({
      ...prev,
      [videoId]: true
    }));
  };

  const handleVideoClick = (videoId: string) => {
    setSelectedVideo(videoId)
  }

  const closeVideo = () => {
    setSelectedVideo(null)
  }

  return (
    <section className="section-padding">
      <div className="container space-y-8">
        <div className="text-center space-y-3">

          <h2 className="text-3xl font-semibold sm:text-4xl">Event Gallery</h2>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed sm:text-base">
            Watch highlights from our latest events, workshops, and community gatherings that bring together young
            African leaders.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {loading ? (
            // Loading state - show placeholders while fetching
            Array.from({ length: 4 }).map((_, index) => (
              <div key={`loading-${index}`} className="group cursor-pointer">
                <div className="overflow-hidden rounded-[24px] border border-border/60 bg-card shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                  <div className="relative aspect-video overflow-hidden bg-muted animate-pulse">
                    <div className="w-full h-full" />
                  </div>
                  <div className="space-y-1 p-2 sm:p-3">
                    <div className="inline-flex items-center gap-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-primary">
                      <div className="h-2 w-12 bg-muted rounded animate-pulse"></div>
                    </div>
                    <div className="h-3 bg-muted rounded animate-pulse w-4/5"></div>
                    <div className="h-2 bg-muted rounded animate-pulse w-full"></div>
                    <div className="h-2 bg-muted rounded animate-pulse w-3/4"></div>
                  </div>
                </div>
              </div>
            ))
          ) : videos.length > 0 ? (
            videos.map((video) => (
              <div key={video.id} className="group cursor-pointer" onClick={() => handleVideoClick(video.id)}>
                <div className="overflow-hidden rounded-[24px] border border-border/60 bg-card shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={getYouTubeThumbnail(video.id)}
                      alt={video.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={() => handleThumbnailError(video.id)}
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(transparent,rgba(0,0,0,0.3))] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full bg-primary p-2 text-background shadow-lg shadow-primary/30 transition-transform duration-300 group-hover:scale-105">
                        <Play className="w-3 h-3" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 p-2 sm:p-3">
                    <div className="inline-flex items-center gap-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-primary">
                      <Calendar className="w-2 h-2" />
                      <span className="text-[0.6rem]">{video.date}</span>
                    </div>
                    <h3 className="text-sm font-semibold transition-colors group-hover:text-primary line-clamp-1">
                      {video.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{video.description}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            // No videos available
            <div className="col-span-full text-center py-8">
              <p className="text-muted-foreground">No recent events videos available at the moment.</p>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button variant="soft" asChild>
            <Link href="/events">
              Explore events
              <ExternalLink className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button asChild>
            <a href="https://youtube.com/@top100afl?si=CPlKQkvP_34uYW0h" target="_blank" rel="noopener noreferrer">
              Watch more
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </div>

        {/* Video Modal */}
        {selectedVideo && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-1 md:p-2">
            <div className="relative w-full max-w-xl aspect-video">
              <button
                onClick={closeVideo}
                className="absolute -top-6 right-0 text-white hover:text-orange-400 transition-colors duration-300 text-base font-bold"
              >
                ✕ Close
              </button>
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full rounded-lg"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default RecentEventsSection
