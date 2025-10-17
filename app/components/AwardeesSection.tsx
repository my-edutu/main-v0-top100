"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
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
      category: "Technology",
    },
    {
      id: 2,
      name: "Kwame Asante",
      country: "Ghana",
      bio: "Creating mobile health platforms for rural communities",
      image: "/young-african-man-healthcare-innovator.jpg",
      category: "Healthcare",
    },
    {
      id: 3,
      name: "Zara Hassan",
      country: "Egypt",
      bio: "Building digital literacy programs for underserved youth",
      image: "/young-african-woman-education-leader.jpg",
      category: "Education",
    },
    {
      id: 4,
      name: "Thabo Mthembu",
      country: "South Africa",
      bio: "Leading renewable energy initiatives in townships",
      image: "/young-african-man-environmental-activist.jpg",
      category: "Environment",
    },
    {
      id: 5,
      name: "Fatima Kone",
      country: "Morocco",
      bio: "Empowering women entrepreneurs through microfinance",
      image: "/young-african-woman-social-entrepreneur.jpg",
      category: "Social Impact",
    },
    {
      id: 6,
      name: "Samuel Tadesse",
      country: "Ethiopia",
      bio: "Revolutionizing supply chains for small farmers",
      image: "/young-african-man-business-leader.jpg",
      category: "Business",
    },
    {
      id: 7,
      name: "Aisha Mwangi",
      country: "Kenya",
      bio: "Developing fintech solutions for financial inclusion",
      image: "/young-african-woman-fintech-entrepreneur.jpg",
      category: "Technology",
    },
    {
      id: 8,
      name: "Omar Benali",
      country: "Morocco",
      bio: "Creating telemedicine platforms for remote areas",
      image: "/young-african-man-telemedicine-innovator.jpg",
      category: "Healthcare",
    },
  ]

  const filteredAwardees =
    activeFilter === "All" 
      ? awardees 
      : awardees.filter((awardee) => awardee.category && awardee.category === activeFilter)

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
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((category) => (
            <Button
              key={category}
              variant={activeFilter === category ? "secondary" : "ghost"}
              onClick={() => setActiveFilter(category)}
              className={`${
                activeFilter === category
                  ? "bg-orange-500 text-black hover:bg-orange-400"
                  : "border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Awardees Grid */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {filteredAwardees.map((awardee, index) => (
            <motion.div
              key={awardee.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ y: -5 }}
              className="bg-black/50 rounded-xl overflow-hidden backdrop-blur-lg border border-orange-400/20 hover:border-orange-400/40 transition-all duration-300 flex flex-row"
            >
              <div className="w-1/3 relative">
                <Image
                  src={awardee.image || "/placeholder.svg"}
                  alt={awardee.name}
                  width={200}
                  height={200}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Badge className="bg-orange-500 text-white text-xs">{awardee.category}</Badge>
                </div>
              </div>
              <div className="w-2/3 p-4">
                <h3 className="text-lg font-bold mb-1 text-white">{awardee.name}</h3>
                <div className="flex items-center mb-2 text-orange-400">
                  <MapPin className="w-3 h-3 mr-1" />
                  <span className="text-xs">{awardee.country}</span>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-3">{awardee.bio}</p>
                <div className="mt-2">
                  <Button 
                    asChild
                    size="sm" 
                    variant="ghost"
                    className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 px-2 py-1 text-xs"
                  >
                    <Link href={`/awardees/${awardee.id}`}>
                      View Profile
                    </Link>
                  </Button>
                </div>
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
          <Button 
            asChild
            size="lg" 
            className="bg-orange-500 text-white hover:bg-orange-600 px-8 py-6 rounded-full text-lg"
          >
            <Link href="/awardees">
              <Award className="w-5 h-5 mr-2" />
              View All Awardees
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
