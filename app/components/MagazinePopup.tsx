'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, ArrowRight } from 'lucide-react'

const POPUP_STORAGE_KEY = 'magazine_popup_shown'

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
                className="absolute inset-0 bg-black/50"
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

                    {/* Magazine Cover Image */}
                    <div className="relative w-full md:w-2/5 lg:w-1/3 aspect-[2/3] md:aspect-auto md:min-h-[280px] lg:min-h-[320px] bg-gray-100 flex-shrink-0">
                        <Image
                            src="/magazine-cover-2025.jpg"
                            alt="Africa Future Leaders Magazine 2025"
                            fill
                            className="object-cover"
                            priority
                        />
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/10" />

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
                                ✨ Just Released
                            </span>
                        </div>

                        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
                            2025 Magazine is Here
                        </h2>

                        <p className="mt-2 md:mt-3 text-sm md:text-base text-gray-600 leading-relaxed">
                            Discover the inspiring stories of Africa&apos;s Top100 Future Leaders shaping the continent.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-2.5 mt-4 md:mt-6">
                            <Link
                                href="/magazine"
                                onClick={handleLearnMore}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 md:py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm md:text-base rounded-xl transition-colors"
                            >
                                Learn More
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
