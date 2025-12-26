"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { Camera, Users, Award, Mic, X } from "lucide-react"
import { galleryImages } from "@/lib/gallery-data"

export default function GallerySection() {
  const [activeCategory, setActiveCategory] = useState("All")
  const [selectedImage, setSelectedImage] = useState<typeof galleryImages[number] | null>(null)

  const categories = ["All", "Ceremony", "Backstage", "Community", "Media"]

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
