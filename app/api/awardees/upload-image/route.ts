import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { uploadMedia } from '@/lib/media/storage'
import { PHOTO_PRESET, processUpload } from '@/lib/image-processing'
import { getAwardeeSession } from '@/lib/api/awardee-session'
import { legacySelfServiceEnabled } from '@/lib/legacy-self-service'
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

        const supabase = createAdminClient()
        if (!(await legacySelfServiceEnabled(supabase))) {
            return NextResponse.json(
                { success: false, message: 'Profile editing has moved to the member dashboard.' },
                { status: 404 },
            )
        }

        // This route writes to storage with the service-role client, so cap how
        // fast one client can fill the bucket.
        const identifier = getClientIdentifier(request.headers)
        const rateLimitResult = await checkRateLimit({
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
        const processed = await processUpload(await image.arrayBuffer(), PHOTO_PRESET, image.type)
        const extension = processed.extension || EXTENSION_BY_TYPE[image.type]
        const fileName = `${awardeeId}-${Date.now()}.${extension}`

        const uploaded = await uploadMedia({
            bucket: 'awardees',
            path: fileName,
            body: processed.data,
            contentType: processed.contentType,
            cacheControl: String(60 * 60 * 24 * 365),
            upsert: false,
        })

        return NextResponse.json({
            success: true,
            message: 'Image uploaded successfully',
            imageUrl: uploaded.publicUrl
        })
    } catch (error) {
        console.error('Error in self-service image upload:', error)
        return NextResponse.json(
            { success: false, message: 'Failed to upload image' },
            { status: 500 }
        )
    }
}
