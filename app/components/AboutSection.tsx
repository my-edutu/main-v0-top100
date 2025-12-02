"use client"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Users, Target, Lightbulb } from "lucide-react"

export default function AboutSection() {
  const router = useRouter()

  const handleJoinClick = () => {
    router.push('/join')
  }

  return (
    <section id="about" className="py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <h2 className="mb-6 text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-orange-500 dark:from-white dark:to-orange-300 md:text-4xl">
              About Top100 Africa Future Leaders
            </h2>
            <p className="mb-4 text-pretty text-base text-slate-600 dark:text-zinc-300">
              Top100 Africa Future Leaders is a prestigious recognition program celebrating exceptional students across
              the African continent who are transforming ideas into meaningful impact within their communities.
            </p>
            <p className="mb-4 text-pretty text-base text-slate-600 dark:text-zinc-300">
              Our vision is to spotlight and support the next generation of African leaders who are driving innovation,
              fostering positive change, and building a brighter future for the continent through their dedication and
              vision.
            </p>
            <p className="mb-6 text-pretty text-base text-slate-600 dark:text-zinc-300">
              The Top100 program exists to bridge the gap between potential and opportunity, connecting outstanding
              students with resources, mentorship, and platforms that amplify their impact across Africa and beyond.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleJoinClick}
                className="transform rounded-lg border border-orange-400/30 bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-3 font-semibold text-white shadow-lg shadow-orange-500/20 transition-all duration-300 hover:scale-105 hover:from-orange-600 hover:to-orange-700"
              >
                Join Top100
              </button>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="bg-white/10 dark:bg-slate-800/30 rounded-2xl p-4">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
                <Image
                  src="/african-students-celebrating-achievement-at-gradua.jpg"
                  alt="Top100 Africa Future Leaders celebration"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
