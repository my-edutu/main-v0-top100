"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Download, FileText } from "lucide-react"

export default function MagazineSection() {
  return (
    <section id="magazine" className="py-20 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-orange-300">
            Africa Future Leaders Magazine
          </h2>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto text-balance">
            Get the complete story of the Top100 Africa Future Leaders magazine and their inspiring journeys
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-orange-600/10 rounded-2xl transform rotate-3"></div>
            <Image
              src="/top100-africa-future-leaders-2024-magazine-cover-w.jpg"
              alt="Top100 Africa Future Leaders 2024 Magazine Cover"
              width={450}
              height={600}
              className="rounded-2xl relative z-10 shadow-2xl"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h3 className="text-3xl font-bold mb-6 text-white">Discover Their Stories</h3>
            <p className="text-lg text-zinc-300 mb-6 text-pretty">
              Our comprehensive 2024 magazine features in-depth profiles of all 100 awardees, showcasing their
              innovative projects, community impact, and vision for Africa's future.
            </p>
            <p className="text-lg text-zinc-300 mb-8 text-pretty">
              From groundbreaking technology solutions to transformative social initiatives, explore how these young
              leaders are shaping the continent's tomorrow.
            </p>

            <div className="bg-zinc-900/50 rounded-xl p-6 border border-orange-400/20 mb-8">
              <div className="flex items-center mb-4">
                <FileText className="w-6 h-6 text-orange-400 mr-3" />
                <div>
                  <h4 className="text-xl font-semibold text-white">What's Inside</h4>
                  <p className="text-sm text-zinc-400">Complete profiles and impact stories</p>
                </div>
              </div>
              <ul className="space-y-2 text-zinc-300">
                <li>• 100 detailed awardee profiles</li>
                <li>• Behind-the-scenes selection process</li>
                <li>• Impact measurement and outcomes</li>
                <li>• Future opportunities and partnerships</li>
              </ul>
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                className="bg-orange-500 text-white hover:bg-orange-600 px-8 py-6 rounded-full text-lg w-full sm:w-auto"
                asChild
              >
                <a href="/pdf/top100-2024-magazine.pdf" target="_blank" rel="noopener noreferrer">
                  <Download className="w-5 h-5 mr-2" />
                  Download the 2024 Magazine (PDF)
                </a>
              </Button>
            </motion.div>
            <p className="text-sm text-zinc-500 mt-3">File size: 12 MB</p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
