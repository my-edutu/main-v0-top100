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
    <section id="about" className="relative overflow-hidden py-20">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="relative">
            <div className="absolute inset-0 -rotate-6 rounded-3xl bg-orange-500/10"></div>
            <Image
              src="/african-students-celebrating-achievement-at-gradua.jpg"
              alt="Top100 Africa Future Leaders celebration"
              width={600}
              height={600}
              className="relative z-10 rounded-3xl shadow-xl"
            />
          </div>
          <div>
            <h2 className="mb-6 text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-orange-500 dark:from-white dark:to-orange-300 md:text-5xl">
              About Top100 Africa Future Leaders
            </h2>
            <p className="mb-6 text-pretty text-lg text-slate-600 dark:text-zinc-300">
              Top100 Africa Future Leaders is a prestigious recognition program celebrating exceptional students across
              the African continent who are transforming ideas into meaningful impact within their communities.
            </p>
            <p className="mb-6 text-pretty text-lg text-slate-600 dark:text-zinc-300">
              Our vision is to spotlight and support the next generation of African leaders who are driving innovation,
              fostering positive change, and building a brighter future for the continent through their dedication and
              vision.
            </p>
            <p className="mb-8 text-pretty text-lg text-slate-600 dark:text-zinc-300">
              The Top100 program exists to bridge the gap between potential and opportunity, connecting outstanding
              students with resources, mentorship, and platforms that amplify their impact across Africa and beyond.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <button 
                onClick={() => window.location.href = '/join'}
                className="transform rounded-lg border border-orange-400/30 bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-3 font-semibold text-white shadow-lg shadow-orange-500/20 transition-all duration-300 hover:scale-105 hover:from-orange-600 hover:to-orange-700"
              >
                Join Top100
              </button>
            </div>
            <div className="space-y-4">
              {highlights.map((highlight, index) => (
                <div
                  key={highlight.label}
                  className="rounded-lg border border-orange-400/20 bg-white/85 p-4 text-slate-700 transition-colors hover:border-orange-400/40 dark:bg-zinc-900/50 dark:text-zinc-100"
                >
                  <div className="flex items-start">
                    <div className="mr-4 mt-1 text-orange-400">{highlight.icon}</div>
                    <div>
                      <div className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">{highlight.label}</div>
                      <div className="text-sm text-slate-600 dark:text-zinc-400">{highlight.description}</div>
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
