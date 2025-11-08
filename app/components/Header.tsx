"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

const navItems: Array<{ label: string; href?: string; section?: string }> = [
  { label: "Home", href: "/" },
  { label: "Meet the Awardees", href: "/awardees" },
  { label: "Africa Future Leaders", href: "/initiatives/summit" },
  { label: "Blog", href: "/blog" },
  { label: "Events", href: "/events" },
  { label: "Magazine", href: "/magazine" },
  { label: "Partner", href: "/partners" },
  { label: "Contact", section: "contact" },
]

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 16)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
    setIsMenuOpen(false)
  }

  return (
    <header
      ref={headerRef}
      className={cn(
        "sticky inset-x-0 top-0 z-50 border-b border-transparent transition-all duration-300",
        isScrolled ? "backdrop-blur-lg bg-gradient-to-r from-yellow-500 to-orange-500 border-yellow-600/60" : "bg-gradient-to-r from-yellow-500 to-orange-500"
      )}
    >
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <div className="h-12 w-24">
            <Image 
              src="/Top100 Africa Future leaders Logo .png" 
              alt="Top100 Africa Future Leaders Logo"
              width={96}
              height={48}
              className="h-full w-full object-contain"
            />
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold md:flex">
          {navItems.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-full px-3 py-2 text-white transition-colors hover:bg-yellow-400/50 hover:text-white"
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                onClick={() => scrollToSection(item.section!)}
                className="rounded-full px-3 py-2 text-white transition-colors hover:bg-yellow-400/50 hover:text-white"
              >
                {item.label}
              </button>
            )
          )}
        </nav>

        <div className="flex items-center gap-2">
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="rounded-2xl border border-yellow-600/80 bg-yellow-200/50 text-white shadow-sm"
              aria-label="Toggle navigation menu"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 z-40 bg-gradient-to-br from-orange-500/95 via-yellow-500/90 to-red-500/90 md:hidden"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsMenuOpen(false);
              }
            }}
          >
            <div className="absolute right-4 top-20 w-[calc(100vw-32px)] max-w-sm rounded-3xl border border-yellow-100/40 bg-gradient-to-br from-orange-500/90 via-yellow-400/90 to-orange-400/90 p-5 shadow-xl shadow-orange-500/30 backdrop-blur">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuOpen(false)}
                className="absolute -top-12 right-0 rounded-full bg-white/15 text-white shadow-md hover:bg-white/25"
                aria-label="Close menu"
              >
                <X className="h-6 w-6" />
              </Button>
              <ul className="space-y-2">
                {navItems.map((item) => (
                  <li key={item.label}>
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-base font-semibold text-white transition hover:border-white/30 hover:bg-white/20"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span>{item.label}</span>
                      </Link>
                    ) : (
                      <button
                        onClick={() => {
                          scrollToSection(item.section!);
                          setIsMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left text-base font-semibold text-white transition hover:border-white/30 hover:bg-white/20"
                      >
                        <span>{item.label}</span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
