'use client'

import { useState, useEffect } from 'react'
import { Search, User, ArrowRight, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface Awardee {
    id: string
    name: string
    slug: string
    avatar_url?: string
    country?: string
    headline?: string
    email?: string
}

export default function EditProfilePage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Awardee[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)
    const [featureEnabled, setFeatureEnabled] = useState<boolean | null>(null) // null = loading
    const [checkingFeature, setCheckingFeature] = useState(true)

    // Check if self-service editing is enabled
    useEffect(() => {
        const checkFeatureEnabled = async () => {
            try {
                const response = await fetch('/api/settings/self-service-enabled')
                if (response.ok) {
                    const data = await response.json()
                    setFeatureEnabled(data.enabled)
                } else {
                    setFeatureEnabled(true) // Default to enabled if error
                }
            } catch (error) {
                console.error('Error checking feature:', error)
                setFeatureEnabled(true) // Default to enabled if error
            } finally {
                setCheckingFeature(false)
            }
        }

        checkFeatureEnabled()
    }, [])

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!searchQuery.trim()) return

        setIsSearching(true)
        setHasSearched(true)

        try {
            const response = await fetch(`/api/awardees/search?q=${encodeURIComponent(searchQuery)}`)
            if (response.ok) {
                const data = await response.json()
                setSearchResults(data.awardees || [])
            } else {
                setSearchResults([])
            }
        } catch (error) {
            console.error('Search error:', error)
            setSearchResults([])
        } finally {
            setIsSearching(false)
        }
    }

    // Show loading while checking feature
    if (checkingFeature) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        )
    }

    if (!featureEnabled) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-md text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Editing Unavailable</h1>
                    <p className="text-gray-600 mb-6">
                        Self-service profile editing is currently disabled. Please contact the admin team to update your profile.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
                    >
                        ← Back to Home
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 py-12 px-4">
                <div className="max-w-2xl mx-auto text-center">
                    <Link href="/" className="inline-block mb-6">
                        <Image
                            src="/Top100 Africa Future leaders Logo .png"
                            alt="Top100 Africa Future Leaders"
                            width={180}
                            height={60}
                            className="h-12 w-auto"
                        />
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                        Edit Your Profile
                    </h1>
                    <p className="text-white/90 text-lg">
                        Search for your name to update your awardee profile
                    </p>
                </div>
            </div>

            {/* Search Section */}
            <div className="max-w-2xl mx-auto px-4 py-12">
                <form onSubmit={handleSearch} className="mb-8">
                    <div className="flex flex-col md:relative md:flex-row gap-3 md:gap-0">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Enter your full name..."
                                className="w-full pl-12 pr-4 py-4 text-lg border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSearching || !searchQuery.trim()}
                            className="md:absolute md:right-2 md:top-1/2 md:-translate-y-1/2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-6 py-4 md:py-2 rounded-xl md:rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {isSearching ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    Search
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Search Results */}
                {hasSearched && (
                    <div className="space-y-4">
                        {isSearching ? (
                            <div className="text-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto text-orange-500 mb-4" />
                                <p className="text-gray-600">Searching...</p>
                            </div>
                        ) : searchResults.length > 0 ? (
                            <>
                                <p className="text-sm text-gray-500 mb-4">
                                    Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}. Select your profile to edit:
                                </p>
                                {searchResults.map((awardee) => (
                                    <Link
                                        key={awardee.id}
                                        href={`/edit-profile/${awardee.id}`}
                                        className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-orange-200 transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            {awardee.avatar_url ? (
                                                <img
                                                    src={awardee.avatar_url}
                                                    alt={awardee.name}
                                                    className="h-16 w-16 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center">
                                                    <User className="h-8 w-8 text-white" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                                                    {awardee.name}
                                                </h3>
                                                {awardee.headline && (
                                                    <p className="text-sm text-gray-500 truncate">{awardee.headline}</p>
                                                )}
                                                {awardee.country && (
                                                    <p className="text-xs text-gray-400 mt-1">{awardee.country}</p>
                                                )}
                                            </div>
                                            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                                        </div>
                                    </Link>
                                ))}
                            </>
                        ) : (
                            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                                <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="font-semibold text-gray-900 mb-2">No profiles found</h3>
                                <p className="text-gray-500 text-sm max-w-sm mx-auto">
                                    We couldn't find a profile matching "{searchQuery}". Please check the spelling or contact the admin team.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Instructions */}
                {!hasSearched && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="font-semibold text-gray-900 mb-4">How it works:</h2>
                        <ol className="space-y-3 text-gray-600">
                            <li className="flex gap-3">
                                <span className="h-6 w-6 rounded-full bg-orange-100 text-orange-600 font-semibold text-sm flex items-center justify-center shrink-0">1</span>
                                <span>Search for your name to find your profile</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="h-6 w-6 rounded-full bg-orange-100 text-orange-600 font-semibold text-sm flex items-center justify-center shrink-0">2</span>
                                <span>Verify your identity with your email</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="h-6 w-6 rounded-full bg-orange-100 text-orange-600 font-semibold text-sm flex items-center justify-center shrink-0">3</span>
                                <span>Update your details and save</span>
                            </li>
                        </ol>
                    </div>
                )}
            </div>
        </div>
    )
}
