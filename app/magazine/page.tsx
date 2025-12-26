import Link from 'next/link'
import Image from 'next/image'
import { Download, BookOpen } from 'lucide-react'
import type { Metadata } from 'next'
import NewsletterForm from '@/app/components/NewsletterForm'

export const metadata: Metadata = {
    title: 'Magazine | Top100 Africa Future Leaders',
    description: 'Download and read the official Top100 Africa Future Leaders magazine editions. Featuring stories, insights, and profiles of Africa\'s brightest young leaders.',
    openGraph: {
        title: 'Magazine | Top100 Africa Future Leaders',
        description: 'Download and read the official Top100 Africa Future Leaders magazine editions.',
        images: ['/top100-africa-future-leaders-2024-magazine-cover-w.jpg'],
    },
}

const magazines = [
    {
        year: 2025,
        title: 'Africa Future Leaders Magazine 2025',
        subtitle: 'The New Generation of Changemakers',
        cover: '/top100 magazine.webp',
        pageLink: '/magazine/afl2025',
        downloadLink: '#',
        isLatest: true,
        description: 'Discover the inspiring stories of the 2025 cohort of Top100 Africa Future Leaders shaping the continent\'s future.',
    },
    {
        year: 2024,
        title: 'Africa Future Leaders Magazine 2024',
        subtitle: 'Celebrating Excellence & Innovation',
        cover: '/top100-africa-future-leaders-2024-magazine-cover-w.jpg',
        pageLink: '/magazine/africa future leaders magazine 2024',
        downloadLink: '#',
        isLatest: false,
        description: 'Explore the achievements and journeys of the 2024 Top100 Africa Future Leaders cohort.',
    },
]

export default function MagazinePage() {
    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section - Clean & Simple */}
            <section className="py-12 sm:py-16 border-b border-gray-100">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-gray-900 leading-tight">
                        Africa Future Leaders
                        <br />
                        <span className="text-orange-500">Magazine</span>
                    </h1>
                    <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
                        Stories, insights, and profiles of Africa's brightest young minds shaping the future of the continent.
                    </p>
                </div>
            </section>

            {/* All Editions */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                <div className="grid sm:grid-cols-2 gap-8">
                    {magazines.map((magazine) => (
                        <div
                            key={magazine.year}
                            className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
                        >
                            {/* Cover - Smaller */}
                            <div className="relative aspect-[4/5] bg-gray-100 overflow-hidden">
                                <Image
                                    src={magazine.cover}
                                    alt={magazine.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    priority={magazine.isLatest}
                                />

                                {/* Badges */}
                                <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                                    {magazine.isLatest && (
                                        <span className="bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow">
                                            Latest
                                        </span>
                                    )}
                                    <span className="bg-white text-gray-900 text-xs font-bold px-2.5 py-1 rounded-full ml-auto shadow">
                                        {magazine.year}
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-5 space-y-4">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 leading-tight">
                                        {magazine.title}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">{magazine.subtitle}</p>
                                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{magazine.description}</p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-2">
                                    <Link
                                        href={magazine.pageLink}
                                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-900 text-xs font-bold uppercase tracking-wider transition-colors rounded-lg border border-gray-200"
                                    >
                                        <BookOpen className="h-4 w-4" />
                                        Read Online
                                    </Link>
                                    <a
                                        href={magazine.downloadLink}
                                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wider transition-colors rounded-lg"
                                    >
                                        <Download className="h-4 w-4" />
                                        Download
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Newsletter Section */}
            <section className="bg-gray-50 py-12 sm:py-16">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
                    <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 mb-3">
                        Never Miss an Edition
                    </h2>
                    <p className="text-gray-600 mb-8">
                        Subscribe to our newsletter to be the first to know when new magazine editions are released.
                    </p>
                    <NewsletterForm />
                </div>
            </section>
        </div>
    )
}
