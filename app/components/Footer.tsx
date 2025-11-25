"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useTheme } from "next-themes"
import { Facebook, Twitter, Instagram, Linkedin, Mail, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Footer() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === "dark"

  return (
    <footer className="mt-4 border-t border-yellow-600/20 bg-gradient-to-r from-yellow-500 to-orange-500 pb-6 pt-8 text-white">
      <div className="container">
        {/* Logo and Description - Full width at the top */}
        <div className="text-center mb-8">
          <div className="h-20 w-[184px] mx-auto mb-4">
            <Image
              src="/Top100 Africa Future leaders Logo .png"
              alt="Top100 Africa Future Leaders Logo"
              width={230}
              height={100}
              className="h-full w-full object-contain"
            />
          </div>
          <p className="text-sm leading-relaxed text-white/90 max-w-2xl mx-auto">
            We spotlight undergraduates and young professionals building Africa&apos;s future, connecting them to mentorship,
            funding, and a lifelong community of peers.
          </p>
        </div>

        {/* Mobile: 2 columns, Desktop: 4 columns */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-8">
          {/* Initiatives Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3 tracking-tight">Initiatives</h3>
            <ul className="space-y-2">
              <li><Link href="/initiatives/project100" className="text-white/80 hover:text-white transition text-sm block">Project100 Scholarship</Link></li>
              <li><Link href="/initiatives/talk100-live" className="text-white/80 hover:text-white transition text-sm block">Talk100 Live</Link></li>
              <li><Link href="/initiatives/summit" className="text-white/80 hover:text-white transition text-sm block">Future Leaders Summit</Link></li>
              <li><Link href="/initiatives/opportunities" className="text-white/80 hover:text-white transition text-sm block">Opportunities Hub</Link></li>
            </ul>
          </div>

          {/* Quick Links Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3 tracking-tight">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/" className="text-white/80 hover:text-white transition text-sm block">Home</Link></li>
              <li><Link href="/awardees" className="text-white/80 hover:text-white transition text-sm block">Meet Awardees</Link></li>
              <li><Link href="/blog" className="text-white/80 hover:text-white transition text-sm block">Blog</Link></li>
              <li><Link href="/events" className="text-white/80 hover:text-white transition text-sm block">Events</Link></li>
              <li><Link href="/magazine" className="text-white/80 hover:text-white transition text-sm block">Magazine</Link></li>
            </ul>
          </div>

          {/* Connect Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3 tracking-tight">Connect</h3>
            <ul className="space-y-2 mb-4">
              <li><Link href="/contact" className="text-white/80 hover:text-white transition text-sm block">Contact</Link></li>
              <li><Link href="/africa-future-leaders" className="text-white/80 hover:text-white transition text-sm block">About Us</Link></li>
              <li><Link href="/join" className="text-white/80 hover:text-white transition text-sm block">Partner With Us</Link></li>
            </ul>

            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white mb-2">Let's connect</p>
              <a
                href="mailto:patnership@top100Afl.com"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1.5 text-xs text-white transition hover:border-white hover:bg-white/20 w-full max-w-[200px]"
              >
                <Mail className="h-3 w-3" strokeWidth={1.6} />
                <span className="truncate">patnership@top100Afl.com</span>
              </a>
            </div>
          </div>

          {/* Follow Us Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3 tracking-tight">Follow Us</h3>
            <div className="flex items-center gap-2 mb-6">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 text-white transition hover:-translate-y-0.5 hover:border-white hover:bg-white/20"
                >
                  <Icon className="h-4 w-4" strokeWidth={1.6} />
                </a>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/auth/signin?from=/admin"
                className="text-white/80 hover:text-white transition text-sm font-medium hover:underline"
              >
                Admin Login
              </Link>
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="flex items-center justify-start gap-1.5 text-white/80 hover:text-white transition text-sm font-medium w-fit"
              >
                {mounted ? (
                  isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4 opacity-0" />
                )}
                <span>{mounted ? (isDark ? "Light Mode" : "Dark Mode") : "Toggle theme"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-6 border-t border-white/20 text-center">
          <p className="text-xs text-white/80">&copy; {new Date().getFullYear()} Top100 Africa Future Leaders. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}