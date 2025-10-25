"use client"

import { useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Play, Calendar, ExternalLink } from "lucide-react"

interface VideoData {
  id: string
  title: string
  description: string
  date: string
}

const RecentEventsSection = () => {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)

  const videos: VideoData[] = [
    {
      id: "-gbPMU40-LQ",
      title: "Leadership Summit 2024",
      description: "Annual gathering of young African leaders discussing innovation and impact",
      date: "March 2024",
    },
    {
      id: "abSGdFZ3URU",
      title: "Innovation Workshop",
      description: "Interactive session on entrepreneurship and technology solutions",
      date: "February 2024",
    },
    {
      id: "dcKQs726FLI",
      title: "Community Impact Forum",
      description: "Showcasing community-driven projects across Africa",
      date: "January 2024",
    },
    {
      id: "AJjsyO9ff8g",
      title: "Awards Ceremony Highlights",
      description: "Celebrating outstanding achievements of young African leaders",
      date: "December 2023",
    },
  ]

  const getYouTubeThumbnail = (videoId: string) => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  }

  const handleVideoClick = (videoId: string) => {
    setSelectedVideo(videoId)
  }

  const closeVideo = () => {
    setSelectedVideo(null)
  }

  return (
    <section className="py-16">
      <div className="container space-y-8">
        <div className="text-center space-y-3">

          <h2 className="text-3xl font-semibold sm:text-4xl">Recent events &amp; highlights</h2>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed sm:text-base">
            Watch highlights from our latest events, workshops, and community gatherings that bring together young
            African leaders.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          {videos.map((video) => (
            <div key={video.id} className="group cursor-pointer" onClick={() => handleVideoClick(video.id)}>
              <div className="overflow-hidden rounded-[24px] border border-border/60 bg-card shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={getYouTubeThumbnail(video.id) || "/placeholder.svg"}
                    alt={video.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(transparent,rgba(0,0,0,0.3))] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-full bg-primary p-3 text-background shadow-lg shadow-primary/30 transition-transform duration-300 group-hover:scale-105">
                      <Play className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 p-4">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    <Calendar className="w-3 h-3" />
                    <span>{video.date}</span>
                  </div>
                  <h3 className="text-base font-semibold transition-colors group-hover:text-primary">
                    {video.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{video.description}</p>
                </div>
              </div>
            </div>
          ))}
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