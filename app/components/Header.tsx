"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, Menu } from "lucide-react"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type NavItem = {
  label: string
  href: string
}

type NavGroup = {
  label: string
  items: NavItem[]
  tone?: "default" | "cta"
}

const summitItems: NavItem[] = [
  {
    label: "2024 Archive",
    href: "/initiatives/summit/2024",
  },
  {
    label: "2025 Summit",
    href: "/initiatives/summit/2025",
  },
  {
    label: "2026 Summit",
    href: "/afl2026",
  },
  {
    label: "All Initiatives",
    href: "/initiatives",
  },
]

const eventItems: NavItem[] = [
  {
    label: "Events Hub",
    href: "/events",
  },
  {
    label: "Talk100 Live",
    href: "/initiatives/talk100-live",
  },
  {
    label: "Opportunities Hub",
    href: "/initiatives/opportunities",
  },
]

const magazineItems: NavItem[] = [
  {
    label: "2024 Edition",
    href: "/magazine/africa future leaders magazine 2024",
  },
  {
    label: "2025 Edition",
    href: "/magazine/afl2025",
  },
  {
    label: "All Editions",
    href: "/magazine",
  },
]

const partnerItems: NavItem[] = [
  {
    label: "Become a Partner",
    href: "/partnership",
  },
  {
    label: "Join the Network",
    href: "/join",
  },
  {
    label: "Contact Us",
    href: "/#contact",
  },
]

const isActivePath = (pathname: string, href: string) => {
  if (href === "/") {
    return pathname === "/"
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

const groupHasActiveItem = (pathname: string, items: NavItem[]) =>
  items.some((item) => isActivePath(pathname, item.href))

function DesktopLink({ label, href, pathname }: { label: string; href: string; pathname: string }) {
  const active = isActivePath(pathname, href)

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center rounded-full px-3.5 py-2 text-sm font-medium tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-500",
        active
          ? "bg-white/18 text-white"
          : "text-white/90 hover:bg-white/12 hover:text-white",
      )}
    >
      {label}
    </Link>
  )
}

function DesktopDropdown({
  group,
  pathname,
}: {
  group: NavGroup
  pathname: string
}) {
  const active = groupHasActiveItem(pathname, group.items)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "group inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-500",
            active
              ? "bg-white/18 text-white"
              : "text-white/90 hover:bg-white/12 hover:text-white",
          )}
        >
          {group.label}
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180",
              "text-current",
            )}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={10}
        className="w-52 rounded-[22px] border border-orange-100 bg-white/95 p-1 shadow-[0_20px_45px_-24px_rgba(15,23,42,0.35)] backdrop-blur-md"
      >
        {group.items.map((item) => (
          <DropdownMenuItem key={item.href} asChild className="rounded-xl px-0 py-0 focus:bg-orange-50">
            <Link href={item.href} className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-900">
              <span>{item.label}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MobileLink({
  label,
  href,
  pathname,
  onNavigate,
}: {
  label: string
  href: string
  pathname: string
  onNavigate: () => void
}) {
  const active = isActivePath(pathname, href)

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "block rounded-xl px-4 py-3 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
        active ? "bg-orange-100 text-orange-700" : "text-slate-800 hover:bg-orange-50 hover:text-orange-700",
      )}
    >
      {label}
    </Link>
  )
}

function MobileAccordionGroup({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup
  pathname: string
  onNavigate: () => void
}) {
  const active = groupHasActiveItem(pathname, group.items)

  return (
    <AccordionItem value={group.label.toLowerCase()}>
      <AccordionTrigger
        className={cn(
          "px-4 py-4 text-base font-medium no-underline hover:no-underline",
          active ? "text-orange-700" : "text-slate-900",
        )}
      >
        {group.label}
      </AccordionTrigger>
      <AccordionContent className="px-2">
        <div className="space-y-1">
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="block rounded-xl px-4 py-3 transition-colors hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
            >
              <div className="text-sm font-medium text-slate-900">{item.label}</div>
            </Link>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

export default function Header() {
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const pathname = usePathname()

  const closeSheet = () => setIsSheetOpen(false)

  const desktopGroups: NavGroup[] = [
    { label: "Summit", items: summitItems },
    { label: "Events", items: eventItems },
    { label: "Magazine", items: magazineItems },
    { label: "Partner", items: partnerItems, tone: "cta" },
  ]

  const mobileGroups: NavGroup[] = [
    { label: "Summit", items: summitItems },
    { label: "Events", items: eventItems },
    { label: "Magazine", items: magazineItems },
    { label: "Partner", items: partnerItems },
  ]

  return (
    <header className="sticky inset-x-0 top-0 z-50 border-b border-orange-200/50 bg-[linear-gradient(90deg,#f97316_0%,#fb923c_52%,#f59e0b_100%)] text-white shadow-[0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-white/20" />
      <div className="container grid h-[4.5rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <div className="h-12 w-[9.25rem] sm:w-[10.75rem]">
            <Image
              src="/Top100 Africa Future leaders Logo .png"
              alt="Top100 Africa Future Leaders Logo"
              width={180}
              height={60}
              className="h-full w-full object-contain"
              priority
            />
          </div>
        </Link>

        <nav className="hidden min-w-0 items-center justify-center gap-1 lg:flex">
          <DesktopLink label="Home" href="/" pathname={pathname} />
          <DesktopLink label="Awardees" href="/awardees" pathname={pathname} />
          {desktopGroups.map((group) => (
            <DesktopDropdown key={group.label} group={group} pathname={pathname} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button
            asChild
            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-orange-700 shadow-none hover:bg-orange-50 sm:px-5 sm:text-sm"
          >
            <Link href="/get-started">Get Started</Link>
          </Button>
          <div className="lg:hidden">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-2xl border border-white/20 bg-white/15 text-white shadow-none hover:bg-white/20"
                  aria-label="Open site navigation"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[320px] border-orange-100 bg-white p-0 sm:w-[380px]">
                <SheetTitle className="sr-only">Site Navigation</SheetTitle>
                <SheetDescription className="sr-only">
                  Browse the Top100 Africa Future Leaders website sections.
                </SheetDescription>
                <div className="flex h-full flex-col">
                  <div className="border-b border-orange-100 bg-gradient-to-r from-orange-50 to-white px-5 py-5">
                    <div className="h-12 w-44">
                      <Image
                        src="/Top100 Africa Future leaders Logo .png"
                        alt="Top100 Africa Future Leaders Logo"
                        width={180}
                        height={60}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <Button asChild className="mt-4 w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-none hover:opacity-95">
                      <Link href="/get-started" onClick={closeSheet}>
                        Get Started
                      </Link>
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-3 py-4">
                    <div className="space-y-2">
                      <MobileLink label="Home" href="/" pathname={pathname} onNavigate={closeSheet} />
                      <MobileLink label="Awardees" href="/awardees" pathname={pathname} onNavigate={closeSheet} />

                      <Accordion type="multiple" className="w-full">
                        {mobileGroups.map((group) => (
                          <MobileAccordionGroup
                            key={group.label}
                            group={group}
                            pathname={pathname}
                            onNavigate={closeSheet}
                          />
                        ))}
                      </Accordion>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
