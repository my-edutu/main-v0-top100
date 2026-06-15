import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'

type ExistingAwardee = {
    id: string
    slug: string | null
    headline: string | null
    tagline: string | null
    bio: string | null
    linkedin_post_url?: string | null
    avatar_url: string | null
    image_url: string | null
    social_links: Record<string, unknown> | null
    metadata: Record<string, unknown> | null
}

const BIO_UPDATE_LIMIT = 2

function getBioUpdateCount(metadata: Record<string, unknown> | null) {
    const rawCount = metadata?.bioUpdateCount
    return typeof rawCount === 'number' && Number.isFinite(rawCount) ? rawCount : 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Self-service update endpoint - allows awardees to update their own profiles
// Only specific fields are allowed to be updated
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, headline, tagline, bio, social_links, linkedin_post_url, avatar_url, image_url } = body

        if (!id) {
            return Response.json({
                success: false,
                message: 'Awardee ID is required'
            }, { status: 400 })
        }

        const supabase = createAdminClient()

        // First verify the awardee exists
        const { data: existing, error: checkError } = await supabase
            .from('awardees')
            .select('id, slug, headline, tagline, bio, linkedin_post_url, avatar_url, image_url, social_links, metadata')
            .eq('id', id)
            .single()

        if (checkError || !existing) {
            return Response.json({
                success: false,
                message: 'Awardee not found'
            }, { status: 404 })
        }

        const currentAwardee = existing as ExistingAwardee
        const hasProfileChange = [
            headline !== undefined && headline !== currentAwardee.headline,
            tagline !== undefined && tagline !== currentAwardee.tagline,
            bio !== undefined && bio !== currentAwardee.bio,
            linkedin_post_url !== undefined && linkedin_post_url !== currentAwardee.linkedin_post_url,
            avatar_url !== undefined && avatar_url !== currentAwardee.avatar_url,
            image_url !== undefined && image_url !== currentAwardee.image_url,
            social_links !== undefined && JSON.stringify(social_links || {}) !== JSON.stringify(currentAwardee.social_links || {}),
        ].some(Boolean)

        const existingMetadata = isRecord(currentAwardee.metadata) ? currentAwardee.metadata : {}
        const bioUpdateCount = getBioUpdateCount(existingMetadata)

        if (hasProfileChange && bioUpdateCount >= BIO_UPDATE_LIMIT) {
            return Response.json({
                success: false,
                message: 'BIO update limit reached. Ask admin to reset your update access.',
                limit: BIO_UPDATE_LIMIT,
                used: bioUpdateCount,
            }, { status: 429 })
        }

        // Only allow updating specific fields (not visibility, featured status, etc.)
        const updateData: Record<string, unknown> = {}

        if (headline !== undefined) updateData.headline = headline
        if (tagline !== undefined) updateData.tagline = tagline
        if (bio !== undefined) updateData.bio = bio
        if (linkedin_post_url !== undefined) updateData.linkedin_post_url = linkedin_post_url
        if (avatar_url !== undefined) updateData.avatar_url = avatar_url
        if (image_url !== undefined) updateData.image_url = image_url
        if (social_links !== undefined) {
            // Only allow specific social link fields
            updateData.social_links = {
                linkedin: social_links.linkedin || '',
                twitter: social_links.twitter || '',
                github: social_links.github || '',
                website: social_links.website || '',
            }
        }

        // Add updated_at timestamp
        updateData.updated_at = new Date().toISOString()
        updateData.metadata = {
            ...existingMetadata,
            bioUpdateCount: hasProfileChange ? bioUpdateCount + 1 : bioUpdateCount,
            bioUpdateLimit: BIO_UPDATE_LIMIT,
            bioUpdateLastAt: hasProfileChange ? updateData.updated_at : existingMetadata.bioUpdateLastAt,
        }

        // Perform the update
        const { data: updatedAwardee, error: updateError } = await supabase
            .from('awardees')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (updateError) {
            console.error('Error updating awardee:', updateError)
            return Response.json({
                success: false,
                message: 'Failed to update profile'
            }, { status: 500 })
        }

        // Revalidate the awardee's profile page
        if (currentAwardee.slug) {
            revalidatePath(`/awardees/${currentAwardee.slug}`)
        }
        revalidatePath('/awardees')
        revalidateTag('awardees')

        return Response.json({
            success: true,
            message: 'Profile updated successfully',
            awardee: updatedAwardee
        })
    } catch (error) {
        console.error('Error in self-update:', error)
        return Response.json({
            success: false,
            message: 'Failed to update profile'
        }, { status: 500 })
    }
}
