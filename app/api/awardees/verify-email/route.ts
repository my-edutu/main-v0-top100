import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { setAwardeeSessionCookie } from '@/lib/api/awardee-session'
import {
    checkRateLimit,
    createRateLimitResponse,
    getClientIdentifier,
    RATE_LIMITS,
} from '@/lib/rate-limit'

// Simple email matching verification
// Awardee must enter the exact email associated with their profile.
//
// On success this issues a short-lived, signed, httpOnly session cookie scoped
// to that one awardee. The self-service endpoints verify that cookie rather
// than trusting the client to report that it verified.
// See lib/api/awardee-session.ts.
export async function POST(request: NextRequest) {
    try {
        // This confirms whether a given email belongs to a given awardee, so
        // it's an oracle: unthrottled, it can be used to guess awardees' email
        // addresses one request at a time.
        const identifier = getClientIdentifier(request.headers)
        const rateLimitResult = checkRateLimit({
            ...RATE_LIMITS.AUTH,
            identifier: `awardee-verify:${identifier}`,
        })

        if (!rateLimitResult.success) {
            return createRateLimitResponse(
                rateLimitResult,
                'Too many verification attempts. Please wait a moment and try again.',
            )
        }

        const body = await request.json()
        const { awardeeId, email } = body

        if (!awardeeId || !email) {
            return NextResponse.json({
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
            return NextResponse.json({
                success: false,
                message: 'Awardee not found'
            }, { status: 404 })
        }

        // Check if the email matches the awardee's email (case-insensitive)
        const awardeeEmail = awardee.email?.toLowerCase().trim()
        const inputEmail = typeof email === 'string' ? email.toLowerCase().trim() : ''

        if (!awardeeEmail) {
            // If no email on file, verification not possible
            return NextResponse.json({
                success: false,
                message: 'No email on file for this profile. Please contact the admin team.'
            }, { status: 403 })
        }

        if (awardeeEmail !== inputEmail) {
            return NextResponse.json({
                success: false,
                message: 'Email does not match the profile. Please use the email associated with your awardee profile.'
            }, { status: 403 })
        }

        // Email matches — issue the session the self-service routes require.
        const response = NextResponse.json({
            success: true,
            verified: true,
            message: 'Email verified successfully',
            name: awardee.name
        })
        setAwardeeSessionCookie(response, awardee.id)
        return response
    } catch (error) {
        console.error('Error verifying email:', error)
        return NextResponse.json({
            success: false,
            message: 'Verification failed'
        }, { status: 500 })
    }
}
