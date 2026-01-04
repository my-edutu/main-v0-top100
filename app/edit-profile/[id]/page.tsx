'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { ArrowLeft, ArrowRight, Loader2, Save, CheckCircle, Mail, Lock, Eye, EyeOff, Camera, Upload, Newspaper, Phone, MessageSquare, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'

interface Awardee {
    id: string
    name: string
    slug: string
    email?: string
    country?: string
    headline?: string
    tagline?: string
    bio?: string
    avatar_url?: string
    social_links?: {
        linkedin?: string
        twitter?: string
        github?: string
        website?: string
    }
    linkedin_post_url?: string
}

interface FormData {
    headline: string
    tagline: string
    bio: string
    linkedin: string
    twitter: string
    github: string
    website: string
    linkedin_post_url: string
}

interface FeatureRequestData {
    wantsFeatured: 'no' | 'yes'
    hasArticle: boolean
    articleContent: string
    contactEmail: string
    whatsappNumber: string
}

export default function EditProfileDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const [awardee, setAwardee] = useState<Awardee | null>(null)
    const [loading, setLoading] = useState(true)
    const [isVerified, setIsVerified] = useState(false)
    const [verificationEmail, setVerificationEmail] = useState('')
    const [verifying, setVerifying] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showEmail, setShowEmail] = useState(false)

    // Multi-step flow
    const [currentStep, setCurrentStep] = useState(1) // 1 = Profile, 2 = Feature Request

    // Profile image
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [uploadingImage, setUploadingImage] = useState(false)

    // Feature request
    const [featureRequest, setFeatureRequest] = useState<FeatureRequestData>({
        wantsFeatured: 'no',
        hasArticle: false,
        articleContent: '',
        contactEmail: '',
        whatsappNumber: ''
    })
    const [submittingFeatureRequest, setSubmittingFeatureRequest] = useState(false)

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>()

    useEffect(() => {
        const fetchAwardee = async () => {
            try {
                const { id } = await params
                const response = await fetch(`/api/awardees/${id}`)
                if (response.ok) {
                    const data = await response.json()
                    setAwardee(data)
                    setImagePreview(data.avatar_url || null)

                    // Pre-fill form
                    setValue('headline', data.headline || '')
                    setValue('tagline', data.tagline || '')
                    setValue('bio', data.bio || '')
                    setValue('linkedin', data.social_links?.linkedin || '')
                    setValue('twitter', data.social_links?.twitter || '')
                    setValue('github', data.social_links?.github || '')
                    setValue('website', data.social_links?.website || '')
                    setValue('linkedin_post_url', data.linkedin_post_url || '')
                } else {
                    toast.error('Profile not found')
                    router.push('/edit-profile')
                }
            } catch (error) {
                console.error('Error fetching awardee:', error)
                toast.error('Failed to load profile')
            } finally {
                setLoading(false)
            }
        }

        fetchAwardee()
    }, [params, router, setValue])

    const handleVerifyEmail = async () => {
        if (!verificationEmail.trim()) {
            toast.error('Please enter your email')
            return
        }

        if (!verificationEmail.includes('@')) {
            toast.error('Please enter a valid email')
            return
        }

        setVerifying(true)

        try {
            const response = await fetch('/api/awardees/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    awardeeId: awardee?.id,
                    email: verificationEmail
                })
            })

            const data = await response.json()

            if (response.ok && data.verified) {
                setIsVerified(true)
                toast.success('Email verified! You can now edit your profile.')
            } else {
                toast.error(data.message || 'Email verification failed')
            }
        } catch (error) {
            toast.error('Verification failed')
        } finally {
            setVerifying(false)
        }
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image must be less than 5MB')
                return
            }

            setImageFile(file)
            setImagePreview(URL.createObjectURL(file))
        }
    }

    const onSubmitProfile = async (data: FormData) => {
        if (!isVerified) {
            toast.error('Please verify your email first')
            return
        }

        setIsSubmitting(true)

        try {
            // Upload image if changed
            let imageUrl = awardee?.avatar_url
            if (imageFile) {
                setUploadingImage(true)
                const formData = new FormData()
                formData.append('image', imageFile)
                formData.append('awardee_id', awardee?.id || '')

                const uploadResponse = await fetch('/api/awardees/upload-image', {
                    method: 'POST',
                    body: formData,
                })

                if (uploadResponse.ok) {
                    const uploadResult = await uploadResponse.json()
                    imageUrl = uploadResult.imageUrl
                } else {
                    console.error('Image upload failed')
                }
                setUploadingImage(false)
            }

            const response = await fetch('/api/awardees/self-update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: awardee?.id,
                    headline: data.headline || null,
                    tagline: data.tagline || null,
                    bio: data.bio || null,
                    linkedin_post_url: data.linkedin_post_url || null,
                    avatar_url: imageUrl || null,
                    image_url: imageUrl || null,
                    social_links: {
                        linkedin: data.linkedin || '',
                        twitter: data.twitter || '',
                        github: data.github || '',
                        website: data.website || '',
                    }
                })
            })

            const result = await response.json()

            if (response.ok) {
                toast.success('Profile updated successfully!')
                // Move to step 2 (Feature Request)
                setCurrentStep(2)
            } else {
                toast.error(result.message || 'Failed to update profile')
            }
        } catch (error) {
            toast.error('Failed to update profile')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSubmitFeatureRequest = async () => {
        if (featureRequest.wantsFeatured !== 'yes') {
            // Skip - go to profile
            if (awardee?.slug) {
                router.push(`/awardees/${awardee.slug}`)
            }
            return
        }

        // Validate
        if (!featureRequest.contactEmail || !featureRequest.whatsappNumber) {
            toast.error('Please provide your email and WhatsApp number')
            return
        }

        if (!featureRequest.hasArticle && !featureRequest.articleContent.trim()) {
            // They want us to write the article, which is fine
        }

        setSubmittingFeatureRequest(true)

        try {
            const response = await fetch('/api/feature-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    awardee_id: awardee?.id,
                    awardee_name: awardee?.name,
                    has_own_article: featureRequest.hasArticle,
                    article_content: featureRequest.hasArticle ? featureRequest.articleContent : null,
                    needs_article_written: !featureRequest.hasArticle,
                    contact_email: featureRequest.contactEmail,
                    whatsapp_number: featureRequest.whatsappNumber,
                    amount: 40000,
                    currency: 'NGN',
                    status: 'pending'
                })
            })

            if (response.ok) {
                toast.success('Feature request submitted! Our team will contact you shortly.')
                if (awardee?.slug) {
                    router.push(`/awardees/${awardee.slug}`)
                }
            } else {
                toast.error('Failed to submit request. Please try again.')
            }
        } catch (error) {
            toast.error('Failed to submit request')
        } finally {
            setSubmittingFeatureRequest(false)
        }
    }

    // Mask email for display
    const maskEmail = (email: string) => {
        if (!email) return 'No email on file'
        const [name, domain] = email.split('@')
        if (name.length <= 2) return email
        return `${name.substring(0, 2)}${'*'.repeat(Math.min(name.length - 2, 5))}@${domain}`
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
                    <p className="text-gray-600">Loading your profile...</p>
                </div>
            </div>
        )
    }

    if (!awardee) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <p className="text-gray-900 font-semibold mb-2">Profile not found</p>
                    <Link href="/edit-profile" className="text-orange-600 hover:underline">
                        ← Back to search
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 py-8 px-4">
                <div className="max-w-2xl mx-auto">
                    <Link
                        href="/edit-profile"
                        className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 text-sm"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to search
                    </Link>

                    {/* Only show profile details after verification */}
                    {isVerified ? (
                        <div className="flex items-center gap-4">
                            {imagePreview || awardee.avatar_url ? (
                                <img
                                    src={imagePreview || awardee.avatar_url}
                                    alt={awardee.name}
                                    className="h-16 w-16 rounded-full object-cover border-2 border-white/30"
                                />
                            ) : (
                                <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold">
                                    {awardee.name.charAt(0)}
                                </div>
                            )}
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-white">{awardee.name}</h1>
                                <p className="text-white/80 text-sm">{awardee.country}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
                                <Lock className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Edit Your Profile</h1>
                                <p className="text-white/80 text-sm font-medium">Verify your identity to continue</p>
                            </div>
                        </div>
                    )}

                    {/* Step Indicator - only show after verification */}
                    {isVerified && (
                        <div className="flex items-center gap-2 mt-6">
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${currentStep === 1 ? 'bg-white text-orange-600' : 'bg-white/20 text-white'}`}>
                                <span>1</span> Edit Profile
                            </div>
                            <div className="h-px w-4 bg-white/40" />
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${currentStep === 2 ? 'bg-white text-orange-600' : 'bg-white/20 text-white'}`}>
                                <span>2</span> Get Featured (Optional)
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-8">
                {/* STEP 1: Profile Editing */}
                {currentStep === 1 && (
                    <>
                        {/* Verification Section */}
                        {!isVerified && (
                            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                                        <Lock className="h-5 w-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <h2 className="font-semibold text-gray-900">Verify Your Identity</h2>
                                        <p className="text-sm text-gray-500">
                                            Enter the email address associated with your Top100 AFL profile
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                                    <p className="text-sm text-gray-600">
                                        <strong>Privacy Notice:</strong> For security, we don&apos;t display email hints.
                                        Please enter the email you used when your profile was created.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Email</label>
                                        <input
                                            type="email"
                                            value={verificationEmail}
                                            onChange={(e) => setVerificationEmail(e.target.value)}
                                            placeholder="Enter the email associated with your profile"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            onKeyDown={(e) => e.key === 'Enter' && handleVerifyEmail()}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleVerifyEmail}
                                        disabled={verifying}
                                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        {verifying ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <CheckCircle className="h-4 w-4" />
                                                Verify & Continue
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Verified Badge */}
                        {isVerified && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8 flex items-center gap-3">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <p className="text-green-700 font-medium">Email verified! You can now edit your profile.</p>
                            </div>
                        )}

                        {/* Edit Form - Only show after verification */}
                        {isVerified && (
                            <form onSubmit={handleSubmit(onSubmitProfile)} className="space-y-6">
                                {/* Profile Picture */}
                                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                    <h3 className="font-semibold text-gray-900 mb-4">Profile Picture</h3>

                                    <div className="flex items-center gap-6">
                                        <div className="relative">
                                            {imagePreview ? (
                                                <img
                                                    src={imagePreview}
                                                    alt="Profile preview"
                                                    className="h-24 w-24 rounded-full object-cover border-2 border-gray-200"
                                                />
                                            ) : (
                                                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white text-2xl font-bold">
                                                    {awardee.name.charAt(0)}
                                                </div>
                                            )}
                                            <label className="absolute bottom-0 right-0 h-8 w-8 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center cursor-pointer transition-colors">
                                                <Camera className="h-4 w-4 text-white" />
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageChange}
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Upload a new profile picture</p>
                                            <p className="text-xs text-gray-400 mt-1">JPG, PNG. Max 5MB.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                    <h3 className="font-semibold text-gray-900 mb-4">Profile Details</h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
                                            <input
                                                {...register('headline')}
                                                placeholder="e.g., Software Engineer & Community Builder"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">A brief professional title or role</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
                                            <textarea
                                                {...register('tagline')}
                                                placeholder="e.g., Building technology solutions for African communities"
                                                rows={2}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">A short inspiring statement or mission</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                                            <textarea
                                                {...register('bio')}
                                                placeholder="Tell your story - your achievements, leadership experiences, and vision..."
                                                rows={6}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                    <h3 className="font-semibold text-gray-900 mb-4">Social Links</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                                            <input
                                                {...register('linkedin')}
                                                placeholder="https://linkedin.com/in/username"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Twitter/X</label>
                                            <input
                                                {...register('twitter')}
                                                placeholder="https://twitter.com/username"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">GitHub</label>
                                            <input
                                                {...register('github')}
                                                placeholder="https://github.com/username"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                                            <input
                                                {...register('website')}
                                                placeholder="https://yourwebsite.com"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                    <h3 className="font-semibold text-gray-900 mb-4">Featured Post</h3>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Post URL</label>
                                        <input
                                            {...register('linkedin_post_url')}
                                            placeholder="https://linkedin.com/posts/... or https://medium.com/..."
                                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Link to a post from LinkedIn, Medium, Twitter, or any other platform
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting || !isVerified}
                                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white py-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 text-lg shadow-lg"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            {uploadingImage ? 'Uploading image...' : 'Saving...'}
                                        </>
                                    ) : (
                                        <>
                                            Save & Continue
                                            <ArrowRight className="h-5 w-5" />
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </>
                )}

                {/* STEP 2: Feature Request (Optional) */}
                {currentStep === 2 && (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
                            <div className="flex items-center gap-3 mb-3">
                                <Newspaper className="h-8 w-8" />
                                <h2 className="text-xl font-bold">Get Featured in Major News Outlets!</h2>
                            </div>
                            <p className="text-white/90 text-sm">
                                Boost your visibility by getting featured in reputable local and international news channels
                                like Vanguard, Punch, Guardian, and more.
                            </p>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <h3 className="font-semibold text-gray-900 mb-4">Would you like to be featured in news channels?</h3>

                            <div className="space-y-3">
                                <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input
                                        type="radio"
                                        name="wantsFeatured"
                                        value="no"
                                        checked={featureRequest.wantsFeatured === 'no'}
                                        onChange={() => setFeatureRequest(prev => ({ ...prev, wantsFeatured: 'no' }))}
                                        className="h-4 w-4 text-orange-500 focus:ring-orange-500"
                                    />
                                    <div>
                                        <p className="font-medium text-gray-900">No, not at this time</p>
                                        <p className="text-sm text-gray-500">Skip and go to my profile</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input
                                        type="radio"
                                        name="wantsFeatured"
                                        value="yes"
                                        checked={featureRequest.wantsFeatured === 'yes'}
                                        onChange={() => setFeatureRequest(prev => ({ ...prev, wantsFeatured: 'yes' }))}
                                        className="h-4 w-4 text-orange-500 focus:ring-orange-500"
                                    />
                                    <div>
                                        <p className="font-medium text-gray-900">Yes, I want to be featured!</p>
                                        <p className="text-sm text-gray-500">Get published in Vanguard, Punch, and more</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Feature Request Form - Only show if Yes */}
                        {featureRequest.wantsFeatured === 'yes' && (
                            <>
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-amber-800 font-medium">Feature Cost: ₦40,000</p>
                                        <p className="text-amber-700 text-sm mt-1">
                                            This covers processing and publication in local and international news channels.
                                            Payment details will be shared upon submission.
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                    <h3 className="font-semibold text-gray-900 mb-4">Article for Feature</h3>

                                    <div className="space-y-4">
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                                <input
                                                    type="radio"
                                                    name="hasArticle"
                                                    checked={featureRequest.hasArticle}
                                                    onChange={() => setFeatureRequest(prev => ({ ...prev, hasArticle: true }))}
                                                    className="h-4 w-4 text-orange-500 focus:ring-orange-500"
                                                />
                                                <div>
                                                    <p className="font-medium text-gray-900">I have my own article</p>
                                                    <p className="text-sm text-gray-500">I'll provide the content for publication</p>
                                                </div>
                                            </label>

                                            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                                <input
                                                    type="radio"
                                                    name="hasArticle"
                                                    checked={!featureRequest.hasArticle}
                                                    onChange={() => setFeatureRequest(prev => ({ ...prev, hasArticle: false }))}
                                                    className="h-4 w-4 text-orange-500 focus:ring-orange-500"
                                                />
                                                <div>
                                                    <p className="font-medium text-gray-900">Help me write one</p>
                                                    <p className="text-sm text-gray-500">Our team will help craft your feature story</p>
                                                </div>
                                            </label>
                                        </div>

                                        {featureRequest.hasArticle && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Your Article</label>
                                                <textarea
                                                    value={featureRequest.articleContent}
                                                    onChange={(e) => setFeatureRequest(prev => ({ ...prev, articleContent: e.target.value }))}
                                                    placeholder="Paste or write your article here..."
                                                    rows={8}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Include your story, achievements, and key highlights
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                    <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                <Mail className="h-4 w-4 inline mr-1" />
                                                Email Address *
                                            </label>
                                            <input
                                                type="email"
                                                value={featureRequest.contactEmail}
                                                onChange={(e) => setFeatureRequest(prev => ({ ...prev, contactEmail: e.target.value }))}
                                                placeholder="your.email@example.com"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                <Phone className="h-4 w-4 inline mr-1" />
                                                WhatsApp Number *
                                            </label>
                                            <input
                                                type="tel"
                                                value={featureRequest.whatsappNumber}
                                                onChange={(e) => setFeatureRequest(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                                                placeholder="+234 801 234 5678"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                We'll contact you via WhatsApp for payment and processing
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setCurrentStep(1)}
                                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4 inline mr-2" />
                                Back
                            </button>

                            <button
                                type="button"
                                onClick={handleSubmitFeatureRequest}
                                disabled={submittingFeatureRequest}
                                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                                {submittingFeatureRequest ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : featureRequest.wantsFeatured === 'yes' ? (
                                    <>
                                        Submit Feature Request
                                        <ArrowRight className="h-5 w-5" />
                                    </>
                                ) : (
                                    <>
                                        Skip & View Profile
                                        <ArrowRight className="h-5 w-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Help Text */}
                <p className="text-center text-sm text-gray-500 mt-6">
                    Need help? Contact the admin team for assistance.
                </p>
            </div>
        </div>
    )
}
