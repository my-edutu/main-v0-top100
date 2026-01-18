import { NextRequest } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

const toJsonResponse = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })

export async function GET(req: NextRequest) {
    const supabase = createAdminClient()
    const searchParams = req.nextUrl.searchParams
    const scope = searchParams.get('scope')

    let query = supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })

    if (scope !== 'admin') {
        // For public requests, only show published and active announcements
        // that are either not scheduled or scheduled for the past
        query = query
            .eq('status', 'published')
            .eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching announcements:', error)
        return toJsonResponse({ message: 'Failed to fetch announcements', error: error.message }, 500)
    }

    // For non-admin scope, filter out future-scheduled announcements
    let result = data ?? []
    if (scope !== 'admin') {
        const now = new Date()
        result = result.filter(a => {
            if (!a.scheduled_at) return true // No schedule = show immediately
            return new Date(a.scheduled_at) <= now
        })
    }

    return toJsonResponse(result)
}

export async function POST(req: NextRequest) {
    const adminCheck = await requireAdmin(req);
    if ('error' in adminCheck) {
        return adminCheck.error;
    }

    try {
        const body = await req.json()
        const supabase = createAdminClient()

        const { data, error } = await supabase
            .from('announcements')
            .insert([{
                title: body.title,
                content: body.content,
                image_url: body.image_url,
                cta_label: body.cta_label,
                cta_url: body.cta_url,
                status: body.status || 'draft',
                is_active: body.is_active ?? true,
                scheduled_at: body.scheduled_at,
                slug: body.slug || null
            }])
            .select()
            .single()

        if (error) throw error

        try {
            revalidatePath('/')
            revalidatePath('/events')
            revalidateTag('homepage')
        } catch (e) {
            console.warn('Revalidation failed', e)
        }

        return toJsonResponse(data, 201)
    } catch (error) {
        return toJsonResponse({ message: 'Failed to create announcement', error: (error as Error).message }, 400)
    }
}

export async function PUT(req: NextRequest) {
    const adminCheck = await requireAdmin(req);
    if ('error' in adminCheck) {
        return adminCheck.error;
    }

    try {
        const body = await req.json()
        const { id, ...updates } = body
        if (!id) return toJsonResponse({ message: 'ID is required' }, 400)

        // Handle empty scheduled_at - convert to null for database
        if (updates.scheduled_at === '' || updates.scheduled_at === undefined) {
            updates.scheduled_at = null
        }

        const supabase = createAdminClient()

        const { data, error } = await supabase
            .from('announcements')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        try {
            revalidatePath('/')
            revalidatePath('/events')
            revalidateTag('homepage')
        } catch (e) {
            console.warn('Revalidation failed', e)
        }

        return toJsonResponse(data)
    } catch (error) {
        console.error('PUT announcements error:', error)
        return toJsonResponse({ message: 'Failed to update announcement', error: (error as Error).message }, 400)
    }
}

export async function PATCH(req: NextRequest) {
    const adminCheck = await requireAdmin(req);
    if ('error' in adminCheck) {
        return adminCheck.error;
    }

    try {
        const body = await req.json()
        const { id, ...updates } = body
        if (!id) return toJsonResponse({ message: 'ID is required' }, 400)

        const supabase = createAdminClient()

        const { data, error } = await supabase
            .from('announcements')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        try {
            revalidatePath('/')
            revalidatePath('/events')
            revalidateTag('homepage')
        } catch (e) {
            console.warn('Revalidation failed', e)
        }

        return toJsonResponse(data)
    } catch (error) {
        return toJsonResponse({ message: 'Failed to patch announcement', error: (error as Error).message }, 400)
    }
}

export async function DELETE(req: NextRequest) {
    const adminCheck = await requireAdmin(req);
    if ('error' in adminCheck) {
        return adminCheck.error;
    }

    try {
        const { id } = await req.json()
        if (!id) return toJsonResponse({ message: 'ID is required' }, 400)

        const supabase = createAdminClient()

        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', id)

        if (error) throw error

        try {
            revalidatePath('/')
            revalidatePath('/events')
            revalidateTag('homepage')
        } catch (e) {
            console.warn('Revalidation failed', e)
        }

        return new Response(null, { status: 204 })
    } catch (error) {
        return toJsonResponse({ message: 'Failed to delete announcement', error: (error as Error).message }, 400)
    }
}
