"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { MapPin, Award } from "lucide-react"

export default function AwardeesSection() {
  const [activeFilter, setActiveFilter] = useState("All")

  const categories = ["All", "Technology", "Healthcare", "Education", "Environment", "Social Impact", "Business"]
  const countries = ["All", "Nigeria", "Kenya", "South Africa", "Ghana", "Egypt", "Morocco", "Ethiopia"]

  const awardees = [
    {
      id: 1,
      name: "nwosu paul",
      country: "Nigeria",
      bio: "Developing AI solutions for agricultural optimization",
      image: "/young-african-woman-technology-leader-smiling.jpg",
    },
    {
      id: 2,
      name: "Kwame Asante",
      country: "Ghana",
      bio: "Creating mobile health platforms for rural communities",
      image: "/young-african-man-healthcare-innovator.jpg",
    },
    {
      id: 3,
      name: "Zara Hassan",
      country: "Egypt",
      bio: "Building digital literacy programs for underserved youth",
      image: "/young-african-woman-education-leader.jpg",
    },
    {
      id: 4,
      name: "Thabo Mthembu",
      country: "South Africa",
      bio: "Leading renewable energy initiatives in townships",
      image: "/young-african-man-environmental-activist.jpg",
    },
    {
      id: 5,
      name: "Fatima Kone",
      country: "Morocco",
      bio: "Empowering women entrepreneurs through microfinance",
      image: "/young-african-woman-social-entrepreneur.jpg",
    },
    {
      id: 6,
      name: "Samuel Tadesse",
      country: "Ethiopia",
      bio: "Revolutionizing supply chains for small farmers",
      image: "/young-african-man-business-leader.jpg",
    },
    {
      id: 7,
      name: "Aisha Mwangi",
      country: "Kenya",
      bio: "Developing fintech solutions for financial inclusion",
      image: "/young-african-woman-fintech-entrepreneur.jpg",
    },
    {
      id: 8,
      name: "Omar Benali",
      country: "Morocco",
      bio: "Creating telemedicine platforms for remote areas",
      image: "/young-african-man-telemedicine-innovator.jpg",
    },
  ]

  const filteredAwardees =
    activeFilter === "All" ? awardees : awardees.filter((awardee) => awardee.category === activeFilter)

  return (
    <section id="awardees" className="py-20 bg-zinc-900/30 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-orange-300">
            Meet Our Awardees
          </h2>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto text-balance">
            Discover the inspiring stories of Africa's future leaders making impact across the continent
          </p>
        </motion.div>

        {/* Filter Chips */}
        

        {/* Awardees Grid */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-12">
          {filteredAwardees.map((awardee, index) => (
            <motion.div
              key={awardee.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ y: -5 }}
              className="bg-black/50 rounded-2xl overflow-hidden backdrop-blur-lg border border-orange-400/20 hover:border-orange-400/40 transition-all duration-300"
            >
              <div className="relative">
                <Image
                  src={awardee.image || "/placeholder.svg"}
                  alt={awardee.name}
                  width={300}
                  height={300}
                  className="w-full h-64 object-cover"
                />
                <div className="absolute top-4 right-4">
                  <Badge className="bg-orange-500 text-white">{awardee.category}</Badge>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2 text-white">{awardee.name}</h3>
                <div className="flex items-center mb-3 text-orange-400">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span className="text-sm">{awardee.country}</span>
                </div>
                <p className="text-sm text-zinc-300 text-pretty">{awardee.bio}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Button size="lg" className="bg-orange-500 text-white hover:bg-orange-600 px-8 py-6 rounded-full text-lg">
            <Award className="w-5 h-5 mr-2" />
            View All Awardees
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
