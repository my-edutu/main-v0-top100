"use client"
import Header from "./components/Header"
import HeroSection from "./components/HeroSection"
import AboutSection from "./components/AboutSection"
import ImpactSection from "./components/ImpactSection"
import MeetPartnersSection from "./components/MeetPartnersSection"
import SelectionProcessSection from "./components/SelectionProcessSection"
import AwardeesSection from "./components/AwardeesSection"
import MagazineSection from "./components/MagazineSection"
import PartnersSection from "./components/PartnersSection"
import GallerySection from "./components/GallerySection"
import BlogSection from "./components/BlogSection"
import ContactSection from "./components/ContactSection"
import Footer from "./components/Footer"
import InteractiveBackground from "./components/InteractiveBackground"
import RecentEventsSection from "./components/RecentEventsSection"

export default function Home() {
  return (
    <div className="min-h-screen text-white relative">
      <InteractiveBackground />
      <div className="relative z-10">
        <Header />
        <main className="container mx-auto px-4">
          <HeroSection />
          <PartnersSection />
          <AboutSection />
          <ImpactSection />
          <MeetPartnersSection />
          <SelectionProcessSection />
          <AwardeesSection />
          <MagazineSection />
          <GallerySection />
          <BlogSection />
          <RecentEventsSection />
          <ContactSection />
        </main>
        <Footer />
      </div>
    </div>
  )
}
