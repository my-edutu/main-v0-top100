import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Submit a feature request
export async function POST(request: NextRequest) {
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
            amount,
            currency,
            status
        } = body

        // Validate required fields
        if (!awardee_id || !contact_email || !whatsapp_number) {
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
                amount: amount || 40000,
                currency: currency || 'NGN',
                status: status || 'pending',
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
    try {
        const supabase = createAdminClient()

        const { data, error } = await supabase
            .from('feature_requests')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching feature requests:', error)
            return Response.json({
                success: false,
                message: 'Failed to fetch feature requests'
            }, { status: 500 })
        }

        return Response.json({
            success: true,
            data
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
    try {
        const body = await request.json()
        const { id, status, admin_notes, payment_status } = body

        if (!id) {
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
