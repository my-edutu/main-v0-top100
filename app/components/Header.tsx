"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, LogOut, User, X } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"

const navItems: Array<{ label: string; href?: string; section?: string }> = [
  { label: "Meet the Awardees", href: "/awardees" },
  { label: "Top100 Africa Future Leaders", href: "/africa-future-leaders" },
  { label: "Blog", href: "/blog" },
  { label: "Events", href: "/events" },
  { label: "Magazine", href: "/magazine" },
  { label: "Contact", section: "contact" },
]

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)
  const { user, isLoading, logout } = useAuth()

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

  const handleLogout = async () => {
    await logout()
    setIsMenuOpen(false)
  }

  return (
    <header
      ref={headerRef}
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex h-16 items-center border-b border-transparent transition-all duration-300",
        "backdrop-blur-lg",
        isScrolled
          ? "bg-white/85 text-slate-900 shadow-sm dark:border-zinc-800 dark:bg-black/90 dark:text-white"
          : "bg-white/70 text-slate-900 dark:bg-black/70 dark:text-white lg:dark:bg-transparent lg:dark:backdrop-blur-0"
      )}
    >
      <div className="container mx-auto flex max-w-7xl items-center justify-between px-4 lg:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight md:text-xl lg:text-2xl">
          <span className="bg-gradient-to-r from-slate-900 to-orange-500 bg-clip-text text-transparent dark:from-white dark:to-zinc-400">
            Top100 Africa Future Leaders
          </span>
        </Link>

        <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="rounded-full border border-slate-200 bg-white/80 text-slate-900 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/15"
            aria-label="Toggle navigation menu"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <nav className="hidden items-center space-x-6 md:flex">
          {navItems.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-slate-800 transition-colors hover:text-orange-500 dark:text-zinc-200 dark:hover:text-orange-300"
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                onClick={() => scrollToSection(item.section!)}
                className="text-sm font-medium text-slate-800 transition-colors hover:text-orange-500 dark:text-zinc-200 dark:hover:text-orange-300"
              >
                {item.label}
              </button>
            )
          )}
        </nav>

        {isMenuOpen && (
          <nav className="absolute left-0 top-full w-full border-t border-slate-200 bg-white/95 text-slate-900 shadow-lg dark:border-zinc-800 dark:bg-black/95 dark:text-white md:hidden">
            <ul className="flex flex-col space-y-2 p-4">
              {navItems.map((item) => (
                <li key={item.label}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="block w-full rounded-lg px-2 py-3 text-left text-base font-semibold transition-colors hover:text-orange-500 dark:hover:text-orange-300"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      onClick={() => scrollToSection(item.section!)}
                      className="block w-full rounded-lg px-2 py-3 text-left text-base font-semibold transition-colors hover:text-orange-500 dark:hover:text-orange-300"
                    >
                      {item.label}
                    </button>
                  )}
                </li>
              ))}
              <li className="mt-4 border-t border-slate-200 pt-4 dark:border-zinc-800">
                {isLoading ? (
                  <Button disabled className="w-full bg-slate-200 py-6 text-slate-500 dark:bg-zinc-800 dark:text-white">
                    Loading...
                  </Button>
                ) : user ? (
                  <div className="flex flex-col space-y-3">
                    <Button asChild className="w-full bg-orange-500 py-6 text-black hover:bg-orange-400">
                      <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                        <User className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </Button>
                    <Button
                      onClick={handleLogout}
                      className="flex w-full items-center justify-center bg-slate-200 py-6 text-slate-700 hover:bg-slate-300 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </Button>
                  </div>
                ) : (
                  <Button asChild className="w-full bg-orange-500 py-6 text-black hover:bg-orange-400">
                    <Link href="/auth/signin" onClick={() => setIsMenuOpen(false)}>
                      Log in
                    </Link>
                  </Button>
                )}
              </li>
            </ul>
          </nav>
        )}

        <div className="hidden items-center space-x-3 md:flex">
          {isLoading ? (
            <Button disabled className="bg-slate-200 text-slate-500 dark:bg-zinc-800 dark:text-white">
              Loading...
            </Button>
          ) : user ? (
            <>
              <Button className="bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700" asChild>
                <Link href="/dashboard">
                  <User className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <Button
                onClick={handleLogout}
                className="flex items-center bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Button>
            </>
          ) : (
            <Button asChild className="bg-orange-500 text-black hover:bg-orange-400">
              <Link href="/auth/signin">Log in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
