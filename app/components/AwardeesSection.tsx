"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import { MapPin, Award } from "lucide-react"

export default function AwardeesSection() {
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

  return (
    <section id="awardees">
      <div className="container space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.4 }}
          className="text-center"
        >

          <h2 className="mt-3 text-3xl font-semibold sm:text-[2.5rem]">
            Meet the bold minds shaping Africa&apos;s tomorrow
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm text-muted-foreground sm:text-base">
            Discover the inspiring stories of Africa&apos;s future leaders making impact across the continent.
          </p>
        </motion.div>

        <motion.div
          layout
          className="grid grid-cols-2 gap-3 sm:grid-cols-2"
        >
          {awardees.map((awardee, index) => (
            <motion.article
              key={awardee.id}
              layout
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: index * 0.05, ease: "easeOut" }}
              viewport={{ once: true, amount: 0.35 }}
              className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm shadow-primary/5 transition hover:border-primary/40"
            >
              <div className="relative h-32 w-full overflow-hidden">
                <Image
                  src={awardee.image || "/placeholder.svg"}
                  alt={awardee.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute left-3 top-3">
                  <Badge variant="secondary" className="text-xs">
                    {awardee.category}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div>
                  <h3 className="text-lg font-semibold">{awardee.name}</h3>
                  <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                    <MapPin className="h-2.5 w-2.5" />
                    <span>{awardee.country}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {awardee.bio}
                </p>
                <div className="mt-2">
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-lg text-xs"
                  >
                    <Link href={`/awardees/${awardee.id}`}>
                      View profile
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.3 }}
          className="flex justify-center"
        >
          <Button asChild size="lg" className="bg-yellow-500 text-black hover:bg-yellow-400">
            <Link href="/awardees">
              <Award className="h-5 w-5" />
              View all awardees
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
