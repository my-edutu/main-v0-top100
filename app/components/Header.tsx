"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"

const navItems: Array<{ label: string; href?: string; section?: string }> = [
  { label: "Home", href: "/" },
  { label: "Meet the Awardees", href: "/awardees" },
  { label: "Africa Future Leaders", href: "/initiatives/summit" },
  { label: "Blog", href: "/blog" },
  { label: "Events", href: "/events" },
  { label: "Magazine", href: "/magazine" },
  { label: "Become a Partner", href: "/partners" },
  { label: "Contact", section: "contact" },
]

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 16)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
    setIsSheetOpen(false)
  }

  const handleNavigation = (href?: string, section?: string) => {
    if (section) {
      scrollToSection(section)
    }
    setIsSheetOpen(false)
  }

  return (
    <header
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

        <nav className="hidden items-center gap-4 text-base font-semibold md:gap-6 md:flex">
          {navItems.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-full px-3 py-2 text-white transition-colors hover:bg-yellow-400/50 hover:text-white text-sm md:text-base"
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                onClick={() => scrollToSection(item.section!)}
                className="rounded-full px-3 py-2 text-white transition-colors hover:bg-yellow-400/50 hover:text-white text-sm md:text-base"
              >
                {item.label}
              </button>
            )
          )}
        </nav>

        <div className="flex items-center gap-2">
          <div className="md:hidden">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-2xl border border-yellow-600/80 bg-yellow-200/50 text-white shadow-sm"
                  aria-label="Toggle navigation menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 bg-gradient-to-b from-yellow-500 to-orange-500 p-0">
                <div className="flex flex-col h-full pt-6">
                  {/* Logo in Sheet */}
                  <div className="px-6 pb-6 flex items-center justify-center border-b border-white/20">
                    <div className="h-12 w-20">
                      <Image
                        src="/Top100 Africa Future leaders Logo .png"
                        alt="Top100 Africa Future Leaders Logo"
                        width={80}
                        height={48}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>

                  {/* Navigation Items */}
                  <nav className="flex flex-col space-y-2 px-4 py-6 flex-grow">
                    {navItems.map((item) => (
                      item.href ? (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => handleNavigation(item.href, item.section)}
                          className="flex items-center px-4 py-3 rounded-lg text-base md:text-lg font-medium text-white hover:bg-white/20 transition-all"
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <button
                          key={item.label}
                          onClick={() => handleNavigation(item.href, item.section)}
                          className="flex items-center px-4 py-3 rounded-lg text-base md:text-lg font-medium text-white hover:bg-white/20 transition-all text-left"
                        >
                          {item.label}
                        </button>
                      )
                    ))}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
