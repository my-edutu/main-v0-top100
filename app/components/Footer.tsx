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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo and Description - One column */}
          <div>
            <div className="h-16 w-40 mb-4">
              <Image
                src="/Top100 Africa Future leaders Logo .png"
                alt="Top100 Africa Future Leaders Logo"
                width={230}
                height={100}
                className="h-full w-full object-contain"
              />
            </div>
            <p className="text-sm leading-relaxed text-white/90">
              We spotlight undergraduates and young professionals building Africa&apos;s future, connecting them to mentorship,
              funding, and a lifelong community of peers.
            </p>
          </div>

          {/* Initiatives, Information, and Connect - Three columns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Initiatives */}
            <div>
              <h3 className="text-sm font-semibold mb-3 tracking-tight">Initiatives</h3>
              <ul className="space-y-2">
                <li><Link href="/initiatives/project100" className="text-white/80 hover:text-white transition text-sm">Project100 Scholarship</Link></li>
                <li><Link href="/initiatives/talk100-live" className="text-white/80 hover:text-white transition text-sm">Talk100 Live</Link></li>
                <li><Link href="/initiatives/summit" className="text-white/80 hover:text-white transition text-sm">Future Leaders Summit</Link></li>
                <li><Link href="/initiatives/opportunities" className="text-white/80 hover:text-white transition text-sm">Opportunities Hub</Link></li>
              </ul>
            </div>

            {/* Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3 tracking-tight">Information</h3>
              <ul className="space-y-2">
                <li><Link href="/" className="text-white/80 hover:text-white transition text-sm">Home</Link></li>
                <li><Link href="/awardees" className="text-white/80 hover:text-white transition text-sm">Meet Awardees</Link></li>
                <li><Link href="/blog" className="text-white/80 hover:text-white transition text-sm">Blog</Link></li>
                <li><Link href="/events" className="text-white/80 hover:text-white transition text-sm">Events</Link></li>
                <li><Link href="/magazine" className="text-white/80 hover:text-white transition text-sm">Magazine</Link></li>
              </ul>
            </div>

            {/* Connect section */}
            <div>
              <h3 className="text-sm font-semibold mb-3 tracking-tight">Connect</h3>
              <ul className="space-y-2 mb-4">
                <li><Link href="/contact" className="text-white/80 hover:text-white transition text-sm">Contact</Link></li>
                <li><Link href="/africa-future-leaders" className="text-white/80 hover:text-white transition text-sm">About Us</Link></li>
                <li><Link href="/join" className="text-white/80 hover:text-white transition text-sm">Partner With Us</Link></li>
              </ul>

              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white mb-2">Let's connect</p>
                <a
                  href="mailto:patnership@top100Afl.com"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1.5 text-xs text-white transition hover:border-white hover:bg-white/20"
                >
                  <Mail className="h-3 w-3" strokeWidth={1.6} />
                  patnership@top100Afl.com
                </a>
              </div>

              <div>
                <p className="text-xs font-semibold text-white mb-2">Follow us</p>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {[Facebook, Twitter, Instagram, Linkedin].map((Icon, index) => (
                    <a
                      key={index}
                      href="#"
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/40 text-white transition hover:-translate-y-1 hover:border-white hover:bg-white/20 bg-white/10"
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.6} />
                    </a>
                  ))}
                </div>

                <div className="flex flex-col gap-2 text-xs text-white/90 border-t border-white/20 pt-3">
                  <Link href="/admin" className="text-xs text-white/80 hover:text-white transition">Admin Login</Link>
                  <button
                    onClick={() => setTheme(isDark ? "light" : "dark")}
                    className="flex items-center justify-start gap-1.5 text-xs text-white/80 hover:text-white transition font-medium"
                  >
                    {mounted ? (
                      isDark ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />
                    ) : (
                      <Sun className="h-3 w-3 opacity-0" />
                    )}
                    <span>{mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-white/20 text-center">
          <p className="text-xs text-white/80">&copy; {new Date().getFullYear()} Top100 Africa Future Leaders. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}