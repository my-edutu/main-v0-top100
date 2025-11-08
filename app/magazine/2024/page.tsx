"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Download, FileText } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import InteractiveBackground from "../../components/InteractiveBackground";

export default function Magazine2024Page() {
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
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-orange-600">
              Top100 Africa Future Leaders
            </h1>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-orange-300">
              2024 Magazine
            </h2>
            <p className="text-xl text-zinc-400 max-w-3xl mx-auto text-balance">
              Discover inspiring stories of innovation, leadership, and impact from Africa's most promising young leaders
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
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-orange-600/10 rounded-2xl transform rotate-3"></div>
              <Image
                src="/top100-africa-future-leaders-2024-magazine-cover-w.jpg"
                alt="Top100 Africa Future Leaders 2024 Magazine Cover"
                width={450}
                height={600}
                className="rounded-2xl relative z-10 shadow-2xl w-full"
              />
            </motion.div>

            {/* Right Column - Information and Download */}
            <div>
              <h3 className="text-3xl font-bold mb-6 text-white">Download 2024 Edition</h3>
              
              <p className="text-lg text-zinc-300 mb-8 text-pretty">
                Our comprehensive 2024 magazine features in-depth profiles of all 100 awardees, showcasing their
                innovative projects, community impact, and vision for Africa's future.
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

              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mb-12"
              >
                <Button
                  size="lg"
                  className="bg-orange-500 text-white hover:bg-orange-600 px-8 py-6 rounded-full text-lg w-full"
                  asChild
                >
                  <a href="https://drive.google.com/file/d/1WDdJnROclQ57fUm_g6Eeu0enKC_DJELS/view?usp=sharing" target="_blank" rel="noopener noreferrer">
                    <Download className="w-5 h-5 mr-2" />
                    Download the 2024 Magazine (PDF)
                  </a>
                </Button>
                <p className="text-center text-sm text-zinc-500 mt-3">File size: 12 MB</p>
              </motion.div>

              {/* 2025 Magazine Section */}
              <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-xl p-8 border border-purple-500/30">
                <h3 className="text-2xl font-bold mb-4 text-white">Looking Ahead: 2025 Edition</h3>
                <p className="text-lg text-zinc-300 mb-6">
                  The 2025 magazine will showcase this year's Top100 Africa Future Leaders. Pre-order now to be among the first to receive it.
                </p>
                
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 px-8 py-4 rounded-full text-lg w-full"
                  asChild
                >
                  <Link href="/magazine/2025">
                    Pre-order 2025 Magazine
                  </Link>
                </Button>
                
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-white mb-3">Stay Updated</h4>
                  <Button
                    variant="outline"
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-700/50 w-full py-4"
                    asChild
                  >
                    <Link href="/#contact">
                      Subscribe to Newsletter
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}