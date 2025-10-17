"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Download, FileText } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import InteractiveBackground from "../../components/InteractiveBackground";

export default function Magazine2025Page() {
  return (
    <div className="min-h-screen text-white relative">
      <InteractiveBackground />
      <div className="relative z-10">
        <div className="container mx-auto px-4 py-16">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-600">
              Top100 Africa Future Leaders
            </h1>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-300">
              2025 Magazine
            </h2>
            <p className="text-xl text-zinc-400 max-w-3xl mx-auto text-balance">
              Featuring the inspiring stories of innovation, leadership, and impact from Africa's most promising young leaders
            </p>
          </motion.div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Left Column - Magazine Cover */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-indigo-600/10 rounded-2xl transform rotate-3"></div>
              <Image
                src="/top100-africa-future-leaders-2025-magazine-cover-w.jpg" // Placeholder image
                alt="Top100 Africa Future Leaders 2025 Magazine Cover"
                width={450}
                height={600}
                className="rounded-2xl relative z-10 shadow-2xl w-full"
              />
            </motion.div>

            {/* Right Column - Information and Download */}
            <div>
              <h3 className="text-3xl font-bold mb-6 text-white">Pre-order 2025 Edition</h3>
              
              <p className="text-lg text-zinc-300 mb-8 text-pretty">
                The 2025 magazine will showcase this year's Top100 Africa Future Leaders. Pre-order now to be among the first to receive it when it launches.
              </p>

              <div className="bg-zinc-900/50 rounded-xl p-6 border border-purple-400/20 mb-8">
                <div className="flex items-center mb-4">
                  <FileText className="w-6 h-6 text-purple-400 mr-3" />
                  <div>
                    <h4 className="text-xl font-semibold text-white">What's Included</h4>
                    <p className="text-sm text-zinc-400">Profiles of the 2025 cohort</p>
                  </div>
                </div>
                <ul className="space-y-2 text-zinc-300">
                  <li>• 100 detailed awardee profiles</li>
                  <li>• Emerging trends in African leadership</li>
                  <li>• Impact analysis and future projections</li>
                  <li>• Exclusive interviews with industry leaders</li>
                </ul>
              </div>

              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mb-12"
              >
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 px-8 py-6 rounded-full text-lg w-full"
                >
                  Pre-order the 2025 Magazine
                </Button>
                <p className="text-center text-sm text-zinc-500 mt-3">Available for pre-order now</p>
              </motion.div>

              {/* Link back to main magazine page */}
              <div className="mt-8 pt-8 border-t border-zinc-700">
                <h4 className="text-xl font-semibold text-white mb-4">More from our Archive</h4>
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-700/50 w-full py-4"
                  asChild
                >
                  <Link href="/magazine">
                    Browse All Magazines
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}