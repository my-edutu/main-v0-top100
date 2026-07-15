import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getAwardeeSession } from '@/lib/api/awardee-session'
import {
    checkRateLimit,
    createRateLimitResponse,
    getClientIdentifier,
    RATE_LIMITS,
} from '@/lib/rate-limit'

const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// Derived from the validated MIME type rather than the client-supplied
// filename, which must never reach a storage path.
const EXTENSION_BY_TYPE: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
}

// Self-service image upload - for awardees editing their own profiles.
//
// Requires the signed session cookie issued by /api/awardees/verify-email. The
// awardee id comes from that token, never from the form data, so an awardee can
// only ever write to their own profile's image.
export async function POST(request: NextRequest) {
    try {
        const awardeeId = getAwardeeSession(request)
        if (!awardeeId) {
            return NextResponse.json(
                { success: false, message: 'Please verify your email before uploading an image.' },
                { status: 401 }
            )
        }

        // This route writes to storage with the service-role client, so cap how
        // fast one client can fill the bucket.
        const identifier = getClientIdentifier(request.headers)
        const rateLimitResult = checkRateLimit({
            ...RATE_LIMITS.UPLOAD,
            identifier: `awardee-upload:${awardeeId}:${identifier}`,
        })

        if (!rateLimitResult.success) {
            return createRateLimitResponse(
                rateLimitResult,
                'Too many uploads. Please wait a few minutes and try again.',
            )
        }

        const formData = await request.formData()
        const image = formData.get('image') as File

        if (!image) {
            return NextResponse.json(
                { success: false, message: 'No image provided' },
                { status: 400 }
            )
        }

        // Validate file type
        if (!VALID_TYPES.includes(image.type)) {
            return NextResponse.json(
                { success: false, message: 'Invalid file type. Please upload JPG, PNG, WebP, or GIF.' },
                { status: 400 }
            )
        }

        // Validate file size (max 5MB)
        if (image.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { success: false, message: 'File too large. Maximum size is 5MB.' },
                { status: 400 }
            )
        }

        const supabase = createAdminClient()

        // Verify awardee exists
        const { data: awardee, error: awardeeError } = await supabase
            .from('awardees')
            .select('id')
            .eq('id', awardeeId)
            .single()

        if (awardeeError || !awardee) {
            return NextResponse.json(
                { success: false, message: 'Awardee not found' },
                { status: 404 }
            )
        }

        // Both parts are server-controlled: the id came from the signed token
        // and the extension from the validated MIME type.
        const fileName = `${awardeeId}-${Date.now()}.${EXTENSION_BY_TYPE[image.type]}`

        // Upload to Supabase storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('awardees')
            .upload(fileName, image, {
                cacheControl: '3600',
                // Timestamped names are unique, so an upsert would only ever
                // mean overwriting something we didn't intend to.
                upsert: false
            })

        if (uploadError) {
            console.error('Error uploading image:', uploadError)
            return NextResponse.json(
                { success: false, message: 'Failed to upload image', error: uploadError.message },
                { status: 500 }
            )
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
            .from('awardees')
            .getPublicUrl(uploadData.path)

        return NextResponse.json({
            success: true,
            message: 'Image uploaded successfully',
            imageUrl: publicUrlData.publicUrl
        })
    } catch (error) {
        console.error('Error in self-service image upload:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to upload image' },
            { status: 500 }
        )
    }
}
