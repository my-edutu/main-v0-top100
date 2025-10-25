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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <div className="md:col-span-2">
            <div className="h-24 w-56 mb-4">
              <Image 
                src="/Top100 Africa Future leaders Logo .png" 
                alt="Top100 Africa Future Leaders Logo"
                width={230}
                height={100}
                className="h-full w-full object-contain"
              />
            </div>
            <p className="text-sm text-white/90 mb-4">
              We spotlight undergraduates and young professionals building Africa&apos;s future, connecting them to mentorship,
              funding, and a lifelong community of peers.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/40 text-white transition hover:-translate-y-1 hover:border-white hover:text-white/90 bg-white/10"
                >
                  <Icon className="h-3 w-3" strokeWidth={1.6} />
                </a>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Initiatives</h3>
            <ul className="space-y-2">
              <li><Link href="/initiatives/project100" className="text-white/90 hover:text-white transition">Project100 Scholarship</Link></li>
              <li><Link href="/initiatives/talk100-live" className="text-white/90 hover:text-white transition">Talk100 Live</Link></li>
              <li><Link href="/initiatives/summit" className="text-white/90 hover:text-white transition">Future Leaders Summit</Link></li>
              <li><Link href="/initiatives/opportunities" className="text-white/90 hover:text-white transition">Opportunities Hub</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Information</h3>
            <ul className="space-y-2">
              <li><Link href="/" className="text-white/90 hover:text-white transition">Home</Link></li>
              <li><Link href="/awardees" className="text-white/90 hover:text-white transition">Meet Awardees</Link></li>
              <li><Link href="/blog" className="text-white/90 hover:text-white transition">Blog</Link></li>
              <li><Link href="/events" className="text-white/90 hover:text-white transition">Events</Link></li>
              <li><Link href="/magazine" className="text-white/90 hover:text-white transition">Magazine</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Connect</h3>
            <ul className="space-y-2">
              <li><Link href="/contact" className="text-white/90 hover:text-white transition">Contact</Link></li>
              <li><Link href="/africa-future-leaders" className="text-white/90 hover:text-white transition">About Us</Link></li>
              <li><Link href="/join" className="text-white/90 hover:text-white transition">Partner With Us</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="space-y-3 mt-8 md:mt-0 md:col-span-5">
          <h4 className="text-xs font-semibold uppercase tracking-[0.32em] text-white">Let&apos;s collaborate</h4>
          <div className="space-y-3">
            <a
              href="mailto:patnership@top100Afl.com"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-3 py-1.5 text-xs text-white transition hover:border-white hover:text-white/90"
            >
              <Mail className="h-3 w-3" strokeWidth={1.6} />
              patnership@top100Afl.com
            </a>
            <a
              href="tel:+2348169400427"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-3 py-1.5 text-xs text-white transition hover:border-white hover:text-white/90"
            >
              <span className="h-3 w-3 rounded-full bg-white" /> {/* Using a simple indicator instead of a specific phone icon */}
              +234 816 940 0427
            </a>
            <p className="text-xs text-white/90">Lagos, Nigeria</p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex w-full items-center justify-center gap-1 rounded-xl text-xs border-white/40 text-white hover:bg-white/10 hover:text-white/90"
          >
            {mounted ? (
              isDark ? <Sun className="h-3 w-3 text-zinc-900" /> : <Moon className="h-3 w-3 text-zinc-900" />
            ) : (
              <Sun className="h-3 w-3 text-zinc-900 opacity-0" />
            )}
            <span className="text-xs">{mounted ? (isDark ? "Switch to light" : "Switch to dark") : "Toggle theme"}</span>
          </Button>
        </div>

        <div className="mt-6 flex flex-col justify-between gap-2 border-t border-white/40 pt-3 text-[0.6rem] text-white/90 sm:flex-row sm:items-center">
          <p>&copy; {new Date().getFullYear()} Top100 Africa Future Leaders. All rights reserved.</p>
          <p className="text-[0.6rem] uppercase tracking-[0.25em] text-white/90">
            Bold dreams for a thriving continent
          </p>
        </div>
      </div>
    </footer>
  )
}
