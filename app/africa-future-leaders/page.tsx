"use client"
import AboutSection from "../components/AboutSection"
import SelectionProcessSection from "../components/SelectionProcessSection"
import PartnersSection from "../components/PartnersSection"
import GallerySection from "../components/GallerySection"
import ContactSection from "../components/ContactSection"
import InteractiveBackground from "../components/InteractiveBackground"
import ImpactSection from "../components/ImpactSection"
import { AnimatedPartnersSection, PartnerScrollStyle } from "../components/AnimatedPartnersSection"

export default function AfricaFutureLeadersPage() {
  return (
    <div className="relative min-h-screen bg-slate-100 text-slate-900 dark:bg-zinc-950 dark:text-white transition-colors duration-300">
      <PartnerScrollStyle />
      <InteractiveBackground />
      <div className="relative z-10">
        <main className="container mx-auto px-4 pb-16 lg:pb-24">
          <section className="relative py-20">
            <div className="max-w-4xl mx-auto text-center px-4">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="text-sm font-medium text-orange-600 dark:text-orange-400 uppercase tracking-[0.2em]">SUMMIT</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-slate-800 via-orange-600 to-emerald-600 dark:from-white dark:via-orange-400 dark:to-emerald-400">
                Africa Future Leaders Summit
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
                Join us for the signature gathering connecting awardees, partners, and investors to accelerate leadership and impact across Africa’s innovation ecosystem.
              </p>
              <a 
                href="/initiatives/summit"
                className="inline-block bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full px-8 py-4 text-lg font-semibold transition-all duration-300 transform hover:scale-105"
              >
                Learn More About the Summit
              </a>
            </div>
          </section>
          <AboutSection />
          <AnimatedPartnersSection />
          <SelectionProcessSection />
          <ContactSection />
        </main>
      </div>
    </div>
  )
}
