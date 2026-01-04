import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Simple email matching verification
// Awardee must enter the exact email associated with their profile
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { awardeeId, email } = body

        if (!awardeeId || !email) {
            return Response.json({
                success: false,
                message: 'Awardee ID and email are required'
            }, { status: 400 })
        }

        const supabase = createAdminClient()

        // Fetch the awardee to verify email matches
        const { data: awardee, error } = await supabase
            .from('awardees')
            .select('id, email, name')
            .eq('id', awardeeId)
            .single()

        if (error || !awardee) {
            return Response.json({
                success: false,
                message: 'Awardee not found'
            }, { status: 404 })
        }

        // Check if the email matches the awardee's email (case-insensitive)
        const awardeeEmail = awardee.email?.toLowerCase().trim()
        const inputEmail = email.toLowerCase().trim()

        if (!awardeeEmail) {
            // If no email on file, verification not possible
            return Response.json({
                success: false,
                message: 'No email on file for this profile. Please contact the admin team.'
            }, { status: 403 })
        }

        if (awardeeEmail !== inputEmail) {
            return Response.json({
                success: false,
                message: 'Email does not match the profile. Please use the email associated with your awardee profile.'
            }, { status: 403 })
        }

        // Email matches - return success with a verification token
        return Response.json({
            success: true,
            verified: true,
            message: 'Email verified successfully',
            name: awardee.name
        })
    } catch (error) {
        console.error('Error verifying email:', error)
        return Response.json({
            success: false,
            message: 'Verification failed'
        }, { status: 500 })
    }
}
