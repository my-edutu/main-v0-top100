'use client'

import { Linkedin, Globe, ExternalLink, Newspaper, PenSquare, Twitter } from 'lucide-react'

interface FeaturedPostCardProps {
    postUrl: string
    name: string
}

// Detect platform from URL
function detectPlatform(url: string): { name: string; icon: typeof Globe } {
    const lowerUrl = url.toLowerCase()

    if (lowerUrl.includes('linkedin.com')) {
        return { name: 'LinkedIn', icon: Linkedin }
    }
    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
        return { name: 'X (Twitter)', icon: Twitter }
    }
    if (lowerUrl.includes('medium.com')) {
        return { name: 'Medium', icon: PenSquare }
    }
    if (lowerUrl.includes('forbes.com') || lowerUrl.includes('bbc.com') || lowerUrl.includes('cnn.com') || lowerUrl.includes('theguardian.com') || lowerUrl.includes('news')) {
        return { name: 'News article', icon: Newspaper }
    }

    // Default for any other URL (personal blogs, other sites)
    return { name: 'Featured article', icon: Globe }
}

// Keep the old export name for backwards compatibility
export default function LinkedInPostCard({ postUrl, name }: FeaturedPostCardProps) {
    if (!postUrl) return null

    const firstName = name.split(' ')[0]
    const platform = detectPlatform(postUrl)
    const Icon = platform.icon

    return (
        <section className="mb-10 border-t border-stone-200 pt-8">
            <h2 className="text-xl font-semibold tracking-tight text-[#171412]">Featured post</h2>
            <a href={postUrl} target="_blank" rel="noopener noreferrer" className="group mt-4 flex min-h-16 items-center gap-3 rounded-xl border border-stone-200 p-4 transition-colors hover:border-[#E9A879] hover:bg-[#FFFCF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412]">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#FFF7EF] text-[#A94412]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#25211D]">{platform.name}</span><span className="mt-0.5 block text-xs text-stone-600">View {firstName}&apos;s featured post</span></span>
                <ExternalLink className="h-4 w-4 shrink-0 text-[#A94412]" aria-hidden="true" />
            </a>
        </section>
    )
}
