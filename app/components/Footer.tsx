"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
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
    <footer className="border-t border-orange-400/20 bg-slate-50 py-6 text-slate-900 transition-colors duration-300 dark:bg-black dark:text-white">
      <div className="container mx-auto px-4">
        <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
          <div className="sm:col-span-2">
            <h3 className="mb-2 text-lg font-bold bg-gradient-to-r from-slate-900 to-orange-400 bg-clip-text text-transparent dark:from-white dark:to-orange-300">
              Top100 Africa Future Leaders
            </h3>
            <p className="mb-3 text-sm text-slate-600 dark:text-zinc-400">
              Celebrating and empowering the next generation of African leaders who are transforming ideas into impact
              across the continent.
            </p>
            <div className="flex space-x-3">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, index) => (
                <a key={index} href="#" className="text-slate-500 transition-colors hover:text-orange-400 dark:text-zinc-400">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Quick Links</h4>
            <ul className="space-y-1 text-sm">
              {[
                { label: "Home", href: "/" },
                { label: "Awardees", href: "/awardees" },
                { label: "Blog", href: "/blog" },
                { label: "Contact", href: "/#contact" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-slate-600 transition-colors hover:text-orange-400 dark:text-zinc-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Support</h4>
            <ul className="space-y-1 text-sm">
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-slate-600 transition-colors hover:text-orange-400 dark:text-zinc-400"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-slate-600 transition-colors hover:text-orange-400 dark:text-zinc-400">
                  Terms of Service
                </Link>
              </li>
              <li>
                <a
                  href="mailto:info@top100africa.org"
                  className="flex items-center text-slate-600 transition-colors hover:text-orange-400 dark:text-zinc-400"
                >
                  <Mail className="mr-1.5 h-2.5 w-2.5" />
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
          <div className="sm:col-span-2 md:col-span-1">
            <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Contact Info</h4>
            <ul className="space-y-1 text-sm">
              <li>
                <a
                  href="mailto:patnership@top100Afl.com"
                  className="flex items-center text-slate-600 transition-colors hover:text-orange-400 dark:text-zinc-400"
                >
                  <Mail className="mr-1.5 h-2.5 w-2.5" />
                  patnership@top100Afl.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+2348169400427"
                  className="text-slate-600 transition-colors hover:text-orange-400 dark:text-zinc-400"
                >
                  +234 816 940 0427
                </a>
              </li>
              <li>
                <span className="text-slate-600 dark:text-zinc-400">Lagos, Nigeria</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-200 pt-3 dark:border-zinc-800">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              &copy; 2025 Top100 Africa Future Leaders. All rights reserved.
            </p>
            <div className="flex items-center gap-2">
              <p className="text-[0.6rem] text-slate-500 dark:text-zinc-500">Made with heart for Africa&apos;s future</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="flex items-center gap-2 rounded-full border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {mounted ? (
                  isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4 opacity-0" />
                )}
                <span>{mounted ? (isDark ? "Light mode" : "Dark mode") : "Theme"}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
