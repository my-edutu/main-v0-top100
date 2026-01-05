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
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <Link href="/" className="mb-4">
              <Image
                src="/Top100 Africa Future leaders Logo .png"
                alt="Top100 Africa Future Leaders Logo"
                width={150}
                height={50}
                className="h-10 w-auto object-contain"
              />
            </Link>
            <p className="text-sm max-w-xs text-gray-500">
              Spotlighting undergraduates and young professionals building Africa's future.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-4">Platform</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/awardees" className="hover:text-orange-500 transition">Awardees</Link></li>
                <li><Link href="/blog" className="hover:text-orange-500 transition">Blog</Link></li>
                <li><Link href="/events" className="hover:text-orange-500 transition">Events</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/africa-future-leaders" className="hover:text-orange-500 transition">About</Link></li>
                <li><Link href="/contact" className="hover:text-orange-500 transition">Contact</Link></li>
                <li><Link href="/partners" className="hover:text-orange-500 transition">Partner</Link></li>
              </ul>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-4">Follow</h3>
              <div className="flex gap-4">
                <a href="#" className="text-gray-400 hover:text-orange-500 transition"><Instagram className="h-5 w-5" /></a>
                <a href="#" className="text-gray-400 hover:text-orange-500 transition"><Twitter className="h-5 w-5" /></a>
                <a href="#" className="text-gray-400 hover:text-orange-500 transition"><Linkedin className="h-5 w-5" /></a>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Top100 Africa Future Leaders. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/auth/signin?from=/admin" className="text-xs text-gray-400 hover:text-gray-600 transition">Admin Login</Link>
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="text-gray-400 hover:text-gray-600 transition"
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