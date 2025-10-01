"use client"
import Image from "next/image"
import { Users, Target, Lightbulb } from "lucide-react"

export default function AboutSection() {
  const highlights = [
    {
      icon: <Users className="w-6 h-6" />,
      label: "Student Leadership",
      description: "Empowering young leaders across Africa",
    },
    {
      icon: <Target className="w-6 h-6" />,
      label: "Community Impact",
      description: "Creating lasting change in communities",
    },
    {
      icon: <Lightbulb className="w-6 h-6" />,
      label: "Innovation & Mentorship",
      description: "Fostering innovation through guidance",
    },
  ]

  return (
    <section id="about" className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-orange-600/10 rounded-3xl transform -rotate-6"></div>
            <Image
              src="/african-students-celebrating-achievement-at-gradua.jpg"
              alt="Top100 Africa Future Leaders celebration"
              width={600}
              height={600}
              className="rounded-3xl relative z-10"
            />
          </div>
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-orange-300">
              About Top100 Africa Future Leaders
            </h2>
            <p className="text-lg mb-6 text-zinc-300 text-pretty">
              Top100 Africa Future Leaders is a prestigious recognition program celebrating exceptional students across
              the African continent who are transforming ideas into meaningful impact within their communities.
            </p>
            <p className="text-lg mb-6 text-zinc-300 text-pretty">
              Our vision is to spotlight and support the next generation of African leaders who are driving innovation,
              fostering positive change, and building a brighter future for the continent through their dedication and
              vision.
            </p>
            <p className="text-lg mb-8 text-zinc-300 text-pretty">
              The Top100 program exists to bridge the gap between potential and opportunity, connecting outstanding
              students with resources, mentorship, and platforms that amplify their impact across Africa and beyond.
            </p>
            <div className="space-y-4">
              {highlights.map((highlight, index) => (
                <div
                  key={highlight.label}
                  className="bg-zinc-900/50 rounded-lg p-4 border border-orange-400/20 hover:border-orange-400/40 transition-colors"
                >
                  <div className="flex items-start">
                    <div className="mr-4 text-orange-400 mt-1">{highlight.icon}</div>
                    <div>
                      <div className="text-lg font-semibold mb-1">{highlight.label}</div>
                      <div className="text-sm text-zinc-400">{highlight.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
