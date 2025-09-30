"use client"
import { useState } from "react"
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
    <section className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white font-sans">Recent Events</h2>
          <p className="text-xl text-zinc-300 max-w-3xl mx-auto leading-relaxed">
            Watch highlights from our latest events, workshops, and community gatherings that bring together young
            African leaders.
          </p>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {videos.map((video) => (
            <div key={video.id} className="group cursor-pointer" onClick={() => handleVideoClick(video.id)}>
              <div className="bg-black/50 rounded-2xl overflow-hidden backdrop-blur-lg border border-orange-400/20 hover:border-orange-400/40 transition-all duration-300 hover:scale-105 hover:-translate-y-1">
                {/* Video Thumbnail */}
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={getYouTubeThumbnail(video.id) || "/placeholder.svg"}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-300" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-orange-400 rounded-full p-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <Play className="w-8 h-8 text-black fill-current" />
                    </div>
                  </div>
                </div>

                {/* Video Info */}
                <div className="p-6">
                  <div className="flex items-center gap-2 text-orange-400 text-sm mb-2">
                    <Calendar className="w-4 h-4" />
                    <span>{video.date}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-orange-400 transition-colors duration-300">
                    {video.title}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{video.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Watch More button */}
        <div className="text-center mt-12">
          <a
            href="https://youtube.com/@top100afl?si=CPlKQkvP_34uYW0h"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-orange-400 hover:bg-orange-500 text-black font-semibold px-8 py-4 rounded-full transition-all duration-300 hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-xl"
          >
            <span>Watch More</span>
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>

        {/* Video Modal */}
        {selectedVideo && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-4xl aspect-video">
              <button
                onClick={closeVideo}
                className="absolute -top-12 right-0 text-white hover:text-orange-400 transition-colors duration-300 text-xl font-bold"
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
