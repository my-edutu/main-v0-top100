'use client'

import { useState } from 'react'
import { X, Download, Loader2, CheckCircle, Mail, User } from 'lucide-react'

interface MagazineDownloadModalProps {
    isOpen: boolean
    onClose: () => void
    magazine: {
        year: number
        title: string
        downloadLink: string
    }
}

export default function MagazineDownloadModal({
    isOpen,
    onClose,
    magazine
}: MagazineDownloadModalProps) {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            const controller = new AbortController()
            const id = setTimeout(() => controller.abort(), 8000) // 8 second timeout

            const response = await fetch('/api/magazine-download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    email,
                    magazineYear: magazine.year,
                    magazineTitle: magazine.title,
                    downloadLink: magazine.downloadLink,
                }),
                signal: controller.signal
            })
            clearTimeout(id)

            if (!response.ok) {
                const data = await response.json().catch(() => ({ error: 'Failed to process request' }))
                throw new Error(data.error || 'Failed to process request')
            }

            setIsSuccess(true)

            // Redirect to download link very fast
            setTimeout(() => {
                window.open(magazine.downloadLink, '_blank')
                handleClose()
            }, 600)
        } catch (err) {
            console.error('Download error:', err)
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleClose = () => {
        setName('')
        setEmail('')
        setError('')
        setIsSuccess(false)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 z-10 p-2 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Close modal"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>

                {/* Header */}
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/20 rounded-xl">
                            <Download className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Download Magazine</h2>
                            <p className="text-orange-100 text-sm">{magazine.title}</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {isSuccess ? (
                        <div className="text-center py-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Success!</h3>
                            <p className="text-gray-600">
                                Redirecting you to download the magazine...
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="text-gray-600 mb-6">
                                Please enter your details to download the magazine. We&apos;ll keep you updated on future releases!
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Name Field */}
                                <div>
                                    <label
                                        htmlFor="name"
                                        className="block text-sm font-medium text-gray-700 mb-1.5"
                                    >
                                        Full Name
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            id="name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Enter your full name"
                                            required
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-gray-50 focus:bg-white"
                                        />
                                    </div>
                                </div>

                                {/* Email Field */}
                                <div>
                                    <label
                                        htmlFor="email"
                                        className="block text-sm font-medium text-gray-700 mb-1.5"
                                    >
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="email"
                                            id="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Enter your email address"
                                            required
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-gray-50 focus:bg-white"
                                        />
                                    </div>
                                </div>

                                {/* Error Message */}
                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                                        <p className="text-red-600 text-sm">{error}</p>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-orange-500/25"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-5 h-5" />
                                            Download Magazine
                                        </>
                                    )}
                                </button>

                                <p className="text-xs text-gray-500 text-center">
                                    By downloading, you agree to receive occasional updates about our magazines and events.
                                </p>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
