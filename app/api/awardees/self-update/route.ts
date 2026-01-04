import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
            .select('id, slug')
            .eq('id', id)
            .single()

        if (checkError || !existing) {
            return Response.json({
                success: false,
                message: 'Awardee not found'
            }, { status: 404 })
        }

        // Only allow updating specific fields (not visibility, featured status, etc.)
        const updateData: any = {}

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
        if (existing.slug) {
            revalidatePath(`/awardees/${existing.slug}`)
        }
        revalidatePath('/awardees')

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
