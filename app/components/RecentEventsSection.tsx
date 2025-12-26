"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Camera, ExternalLink, X } from "lucide-react"
import { galleryImages } from "@/lib/gallery-data"

const RecentEventsSection = () => {
  const [selectedImage, setSelectedImage] = useState<typeof galleryImages[number] | null>(null)

  const openModal = (image: typeof galleryImages[number]) => {
    setSelectedImage(image)
  }

  const closeModal = () => {
    setSelectedImage(null)
  }

  return (
    <section className="section-padding">
      <div className="container space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-semibold sm:text-4xl">Event Gallery</h2>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed sm:text-base">
            Capturing moments from our latest events, workshops, and community gatherings celebrating Africa's future leaders.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {galleryImages.slice(0, 8).map((image) => (
            <div
              key={image.id}
              className="group cursor-pointer"
              onClick={() => openModal(image)}
            >
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={image.thumb || image.src}
                    alt={image.alt}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="rounded-full bg-white/90 p-2.5 shadow-lg">
                      <Camera className="w-4 h-4 text-zinc-900" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button variant="soft" asChild>
            <Link href="/initiatives/summit">
              View full gallery
              <ExternalLink className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button asChild>
            <Link href="/events">
              Explore events
              <ExternalLink className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Image Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <div
              className="relative max-w-4xl max-h-[90vh] bg-black/80 rounded-2xl overflow-hidden backdrop-blur-lg border border-primary/40"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors duration-200"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="relative">
                <Image
                  src={selectedImage.src}
                  alt={selectedImage.alt}
                  width={1200}
                  height={900}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              </div>

              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-2">{selectedImage.caption}</h3>
                <p className="text-zinc-400 text-sm">{selectedImage.credit}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default RecentEventsSection
