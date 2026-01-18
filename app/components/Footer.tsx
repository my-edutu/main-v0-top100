"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useTheme } from "next-themes"
import { Facebook, Twitter, Instagram, Linkedin, Mail, Sun, Moon } from "lucide-react"

export default function Footer() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === "dark"

  return (
    <footer className="mt-12 border-t border-gray-200 bg-white py-12 text-gray-600">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-12">
          <div className="flex flex-col items-start text-left">
            <Link href="/" className="mb-6">
              <Image
                src="/Top100 Africa Future leaders Logo .png"
                alt="Top100 Africa Future Leaders Logo"
                width={180}
                height={60}
                className="h-12 w-auto object-contain"
              />
            </Link>
            <p className="text-base max-w-sm text-gray-500 leading-relaxed">
              Spotlighting undergraduates and young professionals building Africa's future.
            </p>
          </div>

          <div className="w-full md:w-auto grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-10">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-5">Platform</h3>
              <ul className="space-y-3 text-sm">
                <li><Link href="/awardees" className="hover:text-orange-500 transition">Awardees</Link></li>
                <li><Link href="/blog" className="hover:text-orange-500 transition">Blog</Link></li>
                <li><Link href="/events" className="hover:text-orange-500 transition">Events</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-5">Company</h3>
              <ul className="space-y-3 text-sm">
                <li><Link href="/africa-future-leaders" className="hover:text-orange-500 transition">About</Link></li>
                <li><Link href="/contact" className="hover:text-orange-500 transition">Contact</Link></li>
                <li><Link href="/partners" className="hover:text-orange-500 transition">Partner</Link></li>
              </ul>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-5">Follow</h3>
              <div className="flex gap-5">
                <a href="#" className="text-gray-400 hover:text-orange-500 transition p-2 bg-gray-50 rounded-full hover:bg-orange-50"><Instagram className="h-5 w-5" /></a>
                <a href="#" className="text-gray-400 hover:text-orange-500 transition p-2 bg-gray-50 rounded-full hover:bg-orange-50"><Twitter className="h-5 w-5" /></a>
                <a href="#" className="text-gray-400 hover:text-orange-500 transition p-2 bg-gray-50 rounded-full hover:bg-orange-50"><Linkedin className="h-5 w-5" /></a>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <p className="text-sm text-gray-400">
            &copy; 2025 Top100 Africa Future Leaders. All rights reserved.
          </p>
          <div className="flex items-center gap-8">
            <Link href="/auth/signin?from=/admin" className="text-sm text-gray-400 hover:text-gray-600 transition">Admin Login</Link>
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="text-gray-400 hover:text-gray-600 transition p-2 bg-gray-50 rounded-full hover:bg-gray-200 transition-all"
              aria-label="Toggle theme"
            >
              {mounted && (isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}