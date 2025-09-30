"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { Camera, Users, Award, Mic, X } from "lucide-react"

export default function GallerySection() {
  const [activeCategory, setActiveCategory] = useState("All")
  const [selectedImage, setSelectedImage] = useState<any>(null)

  const categories = ["All", "Ceremony", "Backstage", "Community", "Media"]

  const galleryImages = [
    {
      id: 1,
      src: "/img_0671.jpg?height=200&width=300&key=gallery1",
      alt: "Award ceremony main stage",
      category: "Ceremony",
      caption: "Main stage during the awards ceremony",
      credit: "Photo by John Doe",
    },
    {
      id: 2,
      src: "/IMG_0672.jpg?height=200&width=300&key=gallery2",
      alt: "Awardees networking backstage",
      category: "Backstage",
      caption: "Awardees connecting backstage",
      credit: "Photo by Jane Smith",
    },
    {
      id: 3,
      src: "/IMG_0673.jpg?height=200&width=300&key=gallery3",
      alt: "Community celebration",
      category: "Community",
      caption: "Local community celebrating with awardees",
      credit: "Photo by Mike Johnson",
    },
    {
      id: 4,
      src: "/IMG_0674.jpg?height=200&width=300&key=gallery4",
      alt: "Media interviews",
      category: "Media",
      caption: "Press interviews with top awardees",
      credit: "Photo by Sarah Wilson",
    },
    {
      id: 5,
      src: "/IMG_0675.jpg?height=200&width=300&key=gallery5",
      alt: "Award presentation moment",
      category: "Ceremony",
      caption: "Moment of award presentation",
      credit: "Photo by David Brown",
    },
    {
      id: 6,
      src: "/IMG_0676.jpg?height=200&width=300&key=gallery6",
      alt: "Behind the scenes preparation",
      category: "Backstage",
      caption: "Final preparations before the ceremony",
      credit: "Photo by Lisa Davis",
    },
    {
      id: 7,
      src: "/IMG_0677.jpg?height=200&width=300&key=gallery7",
      alt: "Community impact showcase",
      category: "Community",
      caption: "Showcasing community impact projects",
      credit: "Photo by Tom Anderson",
    },
    {
      id: 8,
      src: "/IMG_0678.jpg?height=200&width=300&key=gallery8",
      alt: "Live broadcast setup",
      category: "Media",
      caption: "Live broadcast setup and coverage",
      credit: "Photo by Emma Taylor",
    },
    {
      id: 9,
      src: "/IMG_0679.jpg?height=200&width=300&key=gallery9",
      alt: "Group photo of all awardees",
      category: "Ceremony",
      caption: "Group photo of all 100 awardees",
      credit: "Photo by Alex Chen",
    },
    {
      id: 10,
      src: "/IMG_0680.jpg?height=200&width=300&key=gallery10",
      alt: "Mentorship session",
      category: "Backstage",
      caption: "Mentorship session with industry leaders",
      credit: "Photo by Maria Garcia",
    },
    {
      id: 11,
      src: "/IMG_0681.jpg?height=200&width=300&key=gallery11",
      alt: "Local youth engagement",
      category: "Community",
      caption: "Engaging with local youth leaders",
      credit: "Photo by James Wilson",
    },
    {
      id: 12,
      src: "/IMG_0682.jpg?height=200&width=300&key=gallery12",
      alt: "Documentary filming",
      category: "Media",
      caption: "Documentary crew capturing stories",
      credit: "Photo by Rachel Green",
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
        

        <motion.div layout className="grid grid-cols-3 gap-4 max-w-4xl mx-auto">
          {filteredImages.slice(0, 12).map((image, index) => (
            <motion.div
              key={image.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              className="bg-black/50 rounded-lg overflow-hidden backdrop-blur-lg border border-orange-400/20 hover:border-orange-400/40 transition-all duration-300 cursor-pointer group aspect-[4/3]"
              onClick={() => openModal(image)}
            >
              <div className="relative h-full overflow-hidden">
                <Image
                  src={image.src || "/IMG_0682.jpg"}
                  alt={image.alt}
                  width={300}
                  height={200}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2">
                  <Badge className="bg-orange-500/90 text-white backdrop-blur-sm text-xs px-2 py-1">
                    {image.category}
                  </Badge>
                </div>
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
                  src={selectedImage.src.replace("height=200&width=300", "height=600&width=800") || "/placeholder.svg"}
                  alt={selectedImage.alt}
                  width={800}
                  height={600}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              </div>

              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Badge className="bg-orange-500 text-white">{selectedImage.category}</Badge>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{selectedImage.caption}</h3>
                <p className="text-zinc-400 text-sm">{selectedImage.credit}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
