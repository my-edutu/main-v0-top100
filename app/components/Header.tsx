"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
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
      className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? "bg-black/90 backdrop-blur-lg" : "bg-transparent"}`}
    >
      <div className="container mx-auto px-4 lg:px-6 py-4 flex justify-between items-center max-w-7xl">
        <Link href="/" className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tighter">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            Top100 Africa Future Leaders
          </span>
        </Link>
        <div className="md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <Menu />
          </Button>
        </div>
        <nav
          className={`${isMenuOpen ? "block" : "hidden"} md:block absolute md:relative top-full left-0 w-full md:w-auto bg-black/95 md:bg-transparent backdrop-blur-lg md:backdrop-blur-none`}
        >
          <ul className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-8 p-6 md:p-0">
            <li>
              <button
                onClick={() => scrollToSection("about")}
                className="text-lg md:text-base font-semibold md:font-normal hover:text-orange-400 transition-colors"
              >
                About
              </button>
            </li>
            <li>
              <button
                onClick={() => scrollToSection("awardees")}
                className="text-lg md:text-base font-semibold md:font-normal hover:text-orange-400 transition-colors"
              >
                Awardees
              </button>
            </li>
            <li>
              <button
                onClick={() => scrollToSection("magazine")}
                className="text-lg md:text-base font-semibold md:font-normal hover:text-orange-400 transition-colors"
              >
                Magazine
              </button>
            </li>
            <li>
              <button
                onClick={() => scrollToSection("contact")}
                className="text-lg md:text-base font-semibold md:font-normal hover:text-orange-400 transition-colors"
              >
                Contact
              </button>
            </li>
          </ul>
        </nav>
        <Button
          onClick={() => scrollToSection("awardees")}
          variant="outline"
          className="hidden md:block border-orange-400 text-orange-400"
        >
          Meet the Awardees
        </Button>
      </div>
    </header>
  )
}
