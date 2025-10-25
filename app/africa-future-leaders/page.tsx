"use client"
import HeroSection from "../components/HeroSection"
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
          <HeroSection />
          <PartnersSection />
          <AboutSection />
          <ImpactSection />
          <AnimatedPartnersSection />
          <SelectionProcessSection />
          <GallerySection />
          <ContactSection />
        </main>
      </div>
    </div>
  )
}
