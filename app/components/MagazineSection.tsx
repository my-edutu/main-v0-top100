"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Download, FileText } from "lucide-react"

export default function MagazineSection() {
  return (
    <section id="magazine" className="py-20 relative">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">
            Africa Future Leaders Magazine
          </h2>
          <p className="text-sm text-muted-foreground max-w-3xl mx-auto sm:text-base">
            Get the complete story of the Top100 Africa Future Leaders magazine and discover the journeys shaping Africa&apos;s next decade.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >

            <div className="rounded-[24px] border border-border/60 bg-card p-6 mb-8 shadow-sm">
              <div className="flex items-center mb-4">
                <FileText className="w-6 h-6 text-primary mr-3" />
                <div>
                  <h4 className="text-lg font-semibold">What&apos;s inside</h4>
                  <p className="text-sm text-muted-foreground">Complete profiles and impact stories</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• 100 detailed awardee profiles</li>
                <li>• Behind-the-scenes selection process</li>
                <li>• Impact measurement and outcomes</li>
                <li>• Future opportunities and partnerships</li>
              </ul>
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                className="w-full sm:w-auto"
                asChild
              >
                <a href="/pdf/top100-2024-magazine.pdf" target="_blank" rel="noopener noreferrer">
                  <Download className="w-5 h-5 mr-2" />
                  Download the 2024 Magazine (PDF)
                </a>
              </Button>
            </motion.div>
            <p className="text-xs text-muted-foreground mt-3">File size: 12 MB</p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
