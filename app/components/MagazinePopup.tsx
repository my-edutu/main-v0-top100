'use client'

import { useState, useEffect } from 'react'
import Image from '@/components/safe-image'
import Link from 'next/link'
import { X, ArrowRight } from 'lucide-react'

const POPUP_STORAGE_KEY = 'magazine_popup_shown_2026'

export default function MagazinePopup() {
    const [isVisible, setIsVisible] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)

    useEffect(() => {
        // Check if popup has been shown before
        const hasSeenPopup = localStorage.getItem(POPUP_STORAGE_KEY)

        if (!hasSeenPopup) {
            // Show popup after a short delay for better UX
            const timer = setTimeout(() => {
                setIsVisible(true)
                setIsAnimating(true)
            }, 2000) // 2 second delay

            return () => clearTimeout(timer)
        }
    }, [])

    const handleClose = () => {
        setIsAnimating(false)
        // Mark popup as shown
        localStorage.setItem(POPUP_STORAGE_KEY, 'true')

        // Wait for animation to complete before hiding
        setTimeout(() => {
            setIsVisible(false)
        }, 300)
    }

    const handleLearnMore = () => {
        localStorage.setItem(POPUP_STORAGE_KEY, 'true')
        setIsAnimating(false)
        setTimeout(() => {
            setIsVisible(false)
        }, 300)
    }

    if (!isVisible) return null

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'
                }`}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-transparent backdrop-blur-md"
                onClick={handleClose}
            />

            {/* Popup Content - Mobile: Vertical/Taller | Desktop: Horizontal/Landscape */}
            <div
                className={`relative bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 ${isAnimating ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
                    } w-full max-w-[340px] md:max-w-2xl lg:max-w-3xl`}
            >
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
                    aria-label="Close popup"
                >
                    <X className="w-4 h-4 text-white" />
                </button>

                {/* Layout Container - Flex column on mobile, row on desktop */}
                <div className="flex flex-col md:flex-row">

                    {/* 2026 campaign artwork */}
                    <div className="relative aspect-[4/5] w-full flex-shrink-0 overflow-hidden md:w-2/5 lg:w-1/3">
                        <Image
                            src="/magazine-cover-2026-feature.png"
                            alt="2026 Africa Future Leaders magazine feature cover artwork"
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 340px, 320px"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#291C27]/95 via-[#291C27]/10 to-[#291C27]/15" aria-hidden="true" />
                        <div className="absolute inset-x-6 bottom-6 text-white">
                            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white">Africa Future Leaders</p>
                            <p className="mt-1 text-6xl font-bold leading-none tracking-tight text-white">2026</p>
                            <p className="mt-3 max-w-[12rem] text-sm leading-5 text-white/90">Share the story behind your leadership.</p>
                        </div>

                        {/* Badge - Mobile only */}
                        <div className="absolute top-3 left-3 md:hidden">
                            <span className="px-2.5 py-1 bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                                New
                            </span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-5 md:p-6 lg:p-8 flex flex-col justify-center">
                        {/* Badge - Desktop only */}
                        <div className="hidden md:block mb-3">
                            <span className="inline-flex px-2.5 py-1 bg-orange-50 text-orange-600 text-xs font-semibold rounded-full">
                                ✨ 2026 Feature Applications Open
                            </span>
                        </div>

                        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
                            2026 Magazine Feature Applications Are Open
                        </h2>

                        <p className="mt-2 md:mt-3 text-sm md:text-base text-gray-600 leading-relaxed">
                            Apply to share your work and impact in the 2026 Africa Future Leaders magazine. Payment is required for editorial consideration; it does not guarantee publication.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-2.5 mt-4 md:mt-6">
                            <Link
                                href="/magazine/feature"
                                onClick={handleLearnMore}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 md:py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm md:text-base rounded-xl transition-colors"
                            >
                                Apply to be featured
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <button
                                onClick={handleClose}
                                className="px-5 py-2.5 md:py-3 text-gray-500 hover:text-gray-700 font-medium text-sm md:text-base transition-colors"
                            >
                                Not Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
