"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { Camera, Users, Award, Mic, X } from "lucide-react"

export default function GallerySection() {
  const [activeCategory, setActiveCategory] = useState("All")
  const [selectedImage, setSelectedImage] = useState<any>(null)

  const categories = ["All", "Ceremony", "Backstage", "Community", "Media"]

  const galleryImages = [
    {
      id: 1,
      thumb: "/thumbs/IMG_0672.jpg",
      src: "/IMG_0672.jpg",
      alt: "Awardees networking backstage",
      category: "Backstage",
      caption: "Awardees connecting backstage",
      credit: "Photo by Jane Smith",
    },
    {
      id: 2,
      thumb: "/thumbs/IMG_0673.jpg",
      src: "/IMG_0673.jpg",
      alt: "Community celebration",
      category: "Community",
      caption: "Local community celebrating with awardees",
      credit: "Photo by Mike Johnson",
    },
    {
      id: 3,
      thumb: "/thumbs/IMG_0674.jpg",
      src: "/IMG_0674.jpg",
      alt: "Media interviews",
      category: "Media",
      caption: "Press interviews with top awardees",
      credit: "Photo by Sarah Wilson",
    },
    {
      id: 4,
      thumb: "/thumbs/IMG_0675.jpg",
      src: "/IMG_0675.jpg",
      alt: "Award presentation moment",
      category: "Ceremony",
      caption: "Moment of award presentation",
      credit: "Photo by David Brown",
    },
    {
      id: 5,
      thumb: "/thumbs/IMG_0676.jpg",
      src: "/IMG_0676.jpg",
      alt: "Behind the scenes preparation",
      category: "Backstage",
      caption: "Final preparations before the ceremony",
      credit: "Photo by Lisa Davis",
    },
    {
      id: 6,
      thumb: "/thumbs/IMG_0677.jpg",
      src: "/IMG_0677.jpg",
      alt: "Community impact showcase",
      category: "Community",
      caption: "Showcasing community impact projects",
      credit: "Photo by Tom Anderson",
    },
    {
      id: 7,
      thumb: "/thumbs/IMG_0678.jpg",
      src: "/IMG_0678.jpg",
      alt: "Live broadcast setup",
      category: "Media",
      caption: "Live broadcast setup and coverage",
      credit: "Photo by Emma Taylor",
    },
    {
      id: 8,
      thumb: "/thumbs/IMG_0679.jpg",
      src: "/IMG_0679.jpg",
      alt: "Group photo of all awardees",
      category: "Ceremony",
      caption: "Group photo of all 100 awardees",
      credit: "Photo by Alex Chen",
    },
    {
      id: 9,
      thumb: "/thumbs/IMG_0680.jpg",
      src: "/IMG_0680.jpg",
      alt: "Mentorship session",
      category: "Backstage",
      caption: "Mentorship session with industry leaders",
      credit: "Photo by Maria Garcia",
    },
    {
      id: 10,
      thumb: "/thumbs/IMG_0681.jpg",
      src: "/IMG_0681.jpg",
      alt: "Local youth engagement",
      category: "Community",
      caption: "Engaging with local youth leaders",
      credit: "Photo by James Wilson",
    },
    {
      id: 11,
      thumb: "/thumbs/IMG_0682.jpg",
      src: "/IMG_0682.jpg",
      alt: "Documentary filming",
      category: "Media",
      caption: "Documentary crew capturing stories",
      credit: "Photo by Rachel Green",
    },
    {
      id: 12,
      thumb: "/thumbs/IMG_0683.jpg",
      src: "/IMG_0683.jpg",
      alt: "Leadership workshop",
      category: "Ceremony",
      caption: "Interactive leadership workshop",
      credit: "Photo by Michael Brown",
    },
    {
      id: 13,
      thumb: "/thumbs/IMG_0684.jpg",
      src: "/IMG_0684.jpg",
      alt: "Networking session",
      category: "Backstage",
      caption: "Awardees networking at the event",
      credit: "Photo by Sarah Lee",
    },
    {
      id: 14,
      thumb: "/thumbs/IMG_0685.jpg",
      src: "/IMG_0685.jpg",
      alt: "Community engagement",
      category: "Community",
      caption: "Community members engaging with leaders",
      credit: "Photo by David Kim",
    },
  ]

  const filteredImages =
    activeCategory === "All" ? galleryImages : galleryImages.filter((image) => image.category === activeCategory)

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Ceremony":
        return <Award className="w-4 h-4" />
      case "Backstage":
        return <Users className="w-4 h-4" />
      case "Community":
        return <Users className="w-4 h-4" />
      case "Media":
        return <Mic className="w-4 h-4" />
      default:
        return <Camera className="w-4 h-4" />
    }
  }

  const openModal = (image: any) => {
    setSelectedImage(image)
  }

  const closeModal = () => {
    setSelectedImage(null)
  }

  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-orange-300">
            Event Gallery
          </h2>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto text-balance">
            Capturing the moments that celebrate Africa's future leaders
          </p>
        </motion.div>

        {/* Category Filter */}
        

        <motion.div layout className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {filteredImages.slice(0, 12).map((image, index) => (
            <motion.div
              key={image.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              className="bg-black/50 rounded-lg overflow-hidden backdrop-blur-lg border border-orange-400/20 hover:border-orange-400/40 transition-all duration-300 cursor-pointer group aspect-[3/2]"
              onClick={() => openModal(image)}
            >
              <div className="relative h-full overflow-hidden">
                <Image
                  src={image.thumb || image.src || "/IMG_0682.jpg"}
                  alt={image.alt}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* View More Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-zinc-400 mb-4">
            Showing {Math.min(filteredImages.length, 12)} of {galleryImages.length} images
          </p>
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh] bg-black/80 rounded-2xl overflow-hidden backdrop-blur-lg border border-orange-400/40"
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
                  src={selectedImage.src || "/placeholder.svg"}
                  alt={selectedImage.alt}
                  width={1200}
                  height={900}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              </div>

              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-2">Africa Future Leaders Festival 2025</h3>
                <p className="text-zinc-400 text-sm">Celebrating Africa's brightest young innovators and changemakers</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
