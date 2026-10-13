import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { rejectCrossOriginMutation } from '@/lib/security/same-origin'
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'

// Submit a feature request
export async function POST(request: NextRequest) {
    const originError = rejectCrossOriginMutation(request)
    if (originError) return originError
    const rate = await checkRateLimit({
        ...RATE_LIMITS.CONTACT,
        identifier: `feature-request:${getClientIdentifier(request.headers)}`,
    })
    if (!rate.success) return createRateLimitResponse(rate, 'Too many submissions. Please try later.')
    try {
        const body = await request.json()

        const {
            awardee_id,
            awardee_name,
            has_own_article,
            article_content,
            needs_article_written,
            contact_email,
            whatsapp_number,
        } = body

        // Validate required fields
        if (
            typeof awardee_id !== 'string' || !awardee_id || awardee_id.length > 100 ||
            typeof contact_email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email) || contact_email.length > 254 ||
            typeof whatsapp_number !== 'string' || !/^[+0-9 ()-]{7,24}$/.test(whatsapp_number) ||
            (awardee_name !== undefined && (typeof awardee_name !== 'string' || awardee_name.length > 200)) ||
            (article_content !== undefined && (typeof article_content !== 'string' || article_content.length > 12000))
        ) {
            return Response.json({
                success: false,
                message: 'Missing required fields'
            }, { status: 400 })
        }

        const supabase = createAdminClient()

        // Insert feature request
        const { data, error } = await supabase
            .from('feature_requests')
            .insert({
                awardee_id,
                awardee_name,
                has_own_article: has_own_article || false,
                article_content: article_content || null,
                needs_article_written: needs_article_written || false,
                contact_email,
                whatsapp_number,
                amount: 40000,
                currency: 'NGN',
                status: 'pending',
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating feature request:', error)
            return Response.json({
                success: false,
                message: 'Failed to submit feature request',
                error: error.message
            }, { status: 500 })
        }

        return Response.json({
            success: true,
            message: 'Feature request submitted successfully',
            data
        })
    } catch (error) {
        console.error('Error in feature requests POST:', error)
        return Response.json({
            success: false,
            message: 'Failed to submit feature request'
        }, { status: 500 })
    }
}

// Get all feature requests (for admin)
export async function GET(request: NextRequest) {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error
    try {
        const supabase = createAdminClient()

        const requests = []
        for (let offset = 0; ; offset += 1000) {
            const { data, error } = await supabase
                .from('feature_requests')
                .select('*')
                .order('created_at', { ascending: false })
                .order('id', { ascending: true })
                .range(offset, offset + 999)
            if (error) {
                console.error('Error fetching feature requests:', error)
                return Response.json({ success: false, message: 'Failed to fetch feature requests' }, { status: 500 })
            }
            requests.push(...(data ?? []))
            if ((data ?? []).length < 1000) break
        }

        return Response.json({
            success: true,
            data: requests
        })
    } catch (error) {
        console.error('Error in feature requests GET:', error)
        return Response.json({
            success: false,
            message: 'Failed to fetch feature requests'
        }, { status: 500 })
    }
}

// Update feature request status (for admin)
export async function PUT(request: NextRequest) {
    const originError = rejectCrossOriginMutation(request)
    if (originError) return originError
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error
    try {
        const body = await request.json()
        const { id, status, admin_notes, payment_status } = body

        if (
            typeof id !== 'string' || !id ||
            (status !== undefined && !['pending', 'contacted', 'paid', 'in_progress', 'published', 'cancelled'].includes(status)) ||
            (payment_status !== undefined && !['pending', 'confirmed', 'refunded'].includes(payment_status)) ||
            (admin_notes !== undefined && (typeof admin_notes !== 'string' || admin_notes.length > 4000))
        ) {
            return Response.json({
                success: false,
                message: 'Request ID is required'
            }, { status: 400 })
        }

        const supabase = createAdminClient()

        const updateData: any = { updated_at: new Date().toISOString() }
        if (status !== undefined) updateData.status = status
        if (admin_notes !== undefined) updateData.admin_notes = admin_notes
        if (payment_status !== undefined) updateData.payment_status = payment_status

        const { data, error } = await supabase
            .from('feature_requests')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating feature request:', error)
            return Response.json({
                success: false,
                message: 'Failed to update feature request'
            }, { status: 500 })
        }

        return Response.json({
            success: true,
            message: 'Feature request updated',
            data
        })
    } catch (error) {
        console.error('Error in feature requests PUT:', error)
        return Response.json({
            success: false,
            message: 'Failed to update feature request'
        }, { status: 500 })
    }
}
