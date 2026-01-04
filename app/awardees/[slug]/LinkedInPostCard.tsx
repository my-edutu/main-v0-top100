'use client'

import { Linkedin, Globe, ExternalLink, Newspaper, PenSquare, Twitter } from 'lucide-react'

interface FeaturedPostCardProps {
    postUrl: string
    name: string
}

// Detect platform from URL
function detectPlatform(url: string): { name: string; icon: typeof Globe; color: string; bgColor: string } {
    const lowerUrl = url.toLowerCase()

    if (lowerUrl.includes('linkedin.com')) {
        return { name: 'LinkedIn', icon: Linkedin, color: 'text-[#0A66C2]', bgColor: 'bg-[#0A66C2]' }
    }
    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
        return { name: 'X (Twitter)', icon: Twitter, color: 'text-black', bgColor: 'bg-black' }
    }
    if (lowerUrl.includes('medium.com')) {
        return { name: 'Medium', icon: PenSquare, color: 'text-gray-900', bgColor: 'bg-gray-900' }
    }
    if (lowerUrl.includes('forbes.com') || lowerUrl.includes('bbc.com') || lowerUrl.includes('cnn.com') || lowerUrl.includes('theguardian.com') || lowerUrl.includes('news')) {
        return { name: 'News Article', icon: Newspaper, color: 'text-red-600', bgColor: 'bg-red-600' }
    }

    // Default for any other URL (personal blogs, other sites)
    return { name: 'Featured Article', icon: Globe, color: 'text-orange-600', bgColor: 'bg-orange-600' }
}

// Keep the old export name for backwards compatibility
export default function LinkedInPostCard({ postUrl, name }: FeaturedPostCardProps) {
    if (!postUrl) return null

    const firstName = name.split(' ')[0]
    const platform = detectPlatform(postUrl)
    const Icon = platform.icon

    return (
        <section className="mb-12 pb-12 border-b border-gray-100">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4">Featured Post</h2>

            <a
                href={postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
            >
                <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 transition-all duration-300 hover:shadow-lg hover:border-gray-300">
                    {/* Platform Branding */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded ${platform.bgColor} flex items-center justify-center`}>
                                <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 text-sm">{platform.name}</p>
                                <p className="text-xs text-gray-500">by {firstName}</p>
                            </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                    </div>

                    {/* Post Preview Text */}
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                        {firstName} shared a post. Click to read their insights and learn more about their work.
                    </p>

                    {/* CTA Button */}
                    <div className="flex items-center justify-between">
                        <span className={`text-xs ${platform.color} font-semibold uppercase tracking-wider group-hover:underline`}>
                            Read on {platform.name} →
                        </span>
                        <div className="flex -space-x-1">
                            <div className="h-5 w-5 rounded-full bg-blue-100 border-2 border-white" />
                            <div className="h-5 w-5 rounded-full bg-green-100 border-2 border-white" />
                            <div className="h-5 w-5 rounded-full bg-orange-100 border-2 border-white" />
                        </div>
                    </div>
                </div>
            </a>
        </section>
    )
}
