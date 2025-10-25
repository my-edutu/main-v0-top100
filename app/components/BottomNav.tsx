"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { Home, Users, Newspaper, MessageCircle } from "lucide-react"

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/awardees", label: "Awardees", icon: Users },
  { href: "/blog", label: "Stories", icon: Newspaper },
  { href: "/#contact", label: "Contact", icon: MessageCircle },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <motion.nav
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="fixed inset-x-0 bottom-4 z-40 mx-auto flex max-w-md items-center justify-between rounded-3xl border border-border/80 bg-surface/95 px-3 py-2 shadow-lg shadow-primary/10 backdrop-blur-xl md:hidden"
    >
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive =
          item.href === "/#contact"
            ? pathname === "/" // anchor is on the homepage
            : pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-1 text-[0.7rem] font-semibold tracking-wide text-muted-foreground transition-colors hover:text-primary"
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm transition-colors ${
                isActive ? "bg-primary/12 text-primary" : ""
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            {item.label}
          </Link>
        )
      })}
    </motion.nav>
  )
}
