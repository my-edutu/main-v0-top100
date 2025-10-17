"use client"
import HeroSection from "../components/HeroSection"
import AboutSection from "../components/AboutSection"
import SelectionProcessSection from "../components/SelectionProcessSection"
import AwardeesSection from "../components/AwardeesSection"
import MagazineSection from "../components/MagazineSection"
import PartnersSection from "../components/PartnersSection"
import GallerySection from "../components/GallerySection"
import BlogSection from "../components/BlogSection"
import ContactSection from "../components/ContactSection"
import InteractiveBackground from "../components/InteractiveBackground"
import RecentEventsSection from "../components/RecentEventsSection"
import { AnimatedImpactSection, InfiniteScrollStyle } from "../components/AnimatedImpactSection"
import { AnimatedPartnersSection, PartnerScrollStyle } from "../components/AnimatedPartnersSection"

export default function AfricaFutureLeadersPage() {
  return (
    <div className="relative min-h-screen bg-slate-100 text-slate-900 dark:bg-zinc-950 dark:text-white transition-colors duration-300">
      <InfiniteScrollStyle />
      <PartnerScrollStyle />
      <InteractiveBackground />
      <div className="relative z-10">
        <main className="container mx-auto px-4 pb-16 lg:pb-24">
          <HeroSection />
          <PartnersSection />
          <AboutSection />
          <AnimatedImpactSection />
          <AnimatedPartnersSection />
          <SelectionProcessSection />
          <AwardeesSection />
          <MagazineSection />
          <GallerySection />
          <BlogSection />
          <RecentEventsSection />
          <ContactSection />
        </main>
      </div>
    </div>
  )
}
