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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-start justify-between mb-3">
              <div className="h-16 w-40">
                <Image 
                  src="/Top100 Africa Future leaders Logo .png" 
                  alt="Top100 Africa Future Leaders Logo"
                  width={230}
                  height={100}
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-white mb-2 text-right">Let's connect</p>
                <a
                  href="mailto:patnership@top100Afl.com"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1.5 text-[0.6rem] text-white transition hover:border-white hover:text-white/90 block ml-auto"
                >
                  <Mail className="h-2.5 w-2.5" strokeWidth={1.6} />
                  patnership@top100Afl.com
                </a>
              </div>
            </div>
            <p className="text-sm leading-tight text-white/90 mt-1">
              We spotlight undergraduates and young professionals building Africa&apos;s future, connecting them to mentorship,
              funding, and a lifelong community of peers.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold mb-2 tracking-tight">Initiatives</h3>
              <ul className="space-y-1">
                <li><Link href="/initiatives/project100" className="text-white/80 hover:text-white transition text-xs">Project100 Scholarship</Link></li>
                <li><Link href="/initiatives/talk100-live" className="text-white/80 hover:text-white transition text-xs">Talk100 Live</Link></li>
                <li><Link href="/initiatives/summit" className="text-white/80 hover:text-white transition text-xs">Future Leaders Summit</Link></li>
                <li><Link href="/initiatives/opportunities" className="text-white/80 hover:text-white transition text-xs">Opportunities Hub</Link></li>
              </ul>
              
              <h3 className="text-sm font-semibold mb-2 mt-3 tracking-tight">Information</h3>
              <ul className="space-y-1">
                <li><Link href="/" className="text-white/80 hover:text-white transition text-xs">Home</Link></li>
                <li><Link href="/awardees" className="text-white/80 hover:text-white transition text-xs">Meet Awardees</Link></li>
                <li><Link href="/blog" className="text-white/80 hover:text-white transition text-xs">Blog</Link></li>
                <li><Link href="/events" className="text-white/80 hover:text-white transition text-xs">Events</Link></li>
                <li><Link href="/magazine" className="text-white/80 hover:text-white transition text-xs">Magazine</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold mb-2 tracking-tight">Connect</h3>
              <ul className="space-y-1">
                <li><Link href="/contact" className="text-white/80 hover:text-white transition text-xs">Contact</Link></li>
                <li><Link href="/africa-future-leaders" className="text-white/80 hover:text-white transition text-xs">About Us</Link></li>
                <li><Link href="/join" className="text-white/80 hover:text-white transition text-xs">Partner With Us</Link></li>
              </ul>
              
              <div className="mt-3">
                <p className="text-sm font-semibold text-white mb-1.5">connect with us on</p>
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {[Facebook, Twitter, Instagram, Linkedin].map((Icon, index) => (
                    <a
                      key={index}
                      href="#"
                      className="flex h-7 w-7 items-center justify-center rounded-xl border border-white/40 text-white transition hover:-translate-y-1 hover:border-white hover:text-white/90 bg-white/10"
                    >
                      <Icon className="h-3 w-3" strokeWidth={1.6} />
                    </a>
                  ))}
                </div>

                <div className="mt-2 pt-2 flex flex-col gap-1 text-[0.6rem] text-white/90">
                  <button
                    onClick={() => setTheme(isDark ? "light" : "dark")}
                    className="flex items-center justify-start gap-0.5 text-[0.6rem] text-white hover:text-white/90 font-medium"
                  >
                    {mounted ? (
                      isDark ? <Sun className="h-2 w-2 text-zinc-900 mr-1" /> : <Moon className="h-2 w-2 text-zinc-900 mr-1" />
                    ) : (
                      <Sun className="h-2 w-2 text-zinc-900 opacity-0 mr-1" />
                    )}
                    <span className="text-[0.6rem]">{mounted ? (isDark ? "Switch to light" : "Switch to dark") : "Toggle theme"}</span>
                  </button>
                  <div className="flex flex-col gap-1">
                    <p>&copy; {new Date().getFullYear()} Top100 Africa Future Leaders. All rights reserved.</p>
                    <Link href="/admin" className="text-[0.6rem] text-white/90 hover:text-white/70">Login</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}