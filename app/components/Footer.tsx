"use client"

import { Facebook, Twitter, Instagram, Linkedin, Mail } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-black py-8 border-t border-orange-400/20">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-6 mb-6">
          {/* Brand Section */}
          <div className="md:col-span-2">
            <h3 className="text-xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-orange-300">
              Top100 Africa Future Leaders
            </h3>
            <p className="text-zinc-400 mb-3 text-sm text-pretty">
              Celebrating and empowering the next generation of African leaders who are transforming ideas into impact
              across the continent.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-zinc-400 hover:text-orange-400 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-zinc-400 hover:text-orange-400 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-zinc-400 hover:text-orange-400 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-zinc-400 hover:text-orange-400 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-base font-semibold mb-3 text-white">Quick Links</h4>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-zinc-400 hover:text-orange-400 transition-colors text-sm"
                >
                  About
                </button>
              </li>
              <li>
                <button
                  onClick={() => document.getElementById("awardees")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-zinc-400 hover:text-orange-400 transition-colors text-sm"
                >
                  Awardees
                </button>
              </li>
              <li>
                <button
                  onClick={() => document.getElementById("magazine")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-zinc-400 hover:text-orange-400 transition-colors text-sm"
                >
                  Magazine
                </button>
              </li>
              <li>
                <button
                  onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-zinc-400 hover:text-orange-400 transition-colors text-sm"
                >
                  Contact
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h4 className="text-base font-semibold mb-3 text-white">Support</h4>
            <ul className="space-y-1">
              <li>
                <a href="#" className="text-zinc-400 hover:text-orange-400 transition-colors text-sm">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-zinc-400 hover:text-orange-400 transition-colors text-sm">
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@top100africa.org"
                  className="text-zinc-400 hover:text-orange-400 transition-colors flex items-center text-sm"
                >
                  <Mail className="w-3 h-3 mr-2" />
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-base font-semibold mb-3 text-white">Contact Info</h4>
            <ul className="space-y-1">
              <li>
                <a
                  href="mailto:patnership@top100Afl.com"
                  className="text-zinc-400 hover:text-orange-400 transition-colors text-sm flex items-center"
                >
                  <Mail className="w-3 h-3 mr-2" />
                  patnership@top100Afl.com
                </a>
              </li>
              <li>
                <a href="tel:+2348169400427" className="text-zinc-400 hover:text-orange-400 transition-colors text-sm">
                  +234 816 940 0427
                </a>
              </li>
              <li>
                <span className="text-zinc-400 text-sm">Lagos, Nigeria</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-zinc-800 pt-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-zinc-400 mb-2 md:mb-0 text-sm">
              &copy; 2025 Top100 Africa Future Leaders. All rights reserved.
            </p>
            <p className="text-zinc-500 text-xs">Made with ❤️ for Africa's future</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
