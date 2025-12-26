import { NextRequest } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'


const ALLOWED_STATUSES = new Set(['draft', 'published', 'archived'])
const ALLOWED_VISIBILITY = new Set(['public', 'private'])

type RawEventPayload = Record<string, unknown>

type SanitizedEventPayload = {
  title: string
  slug: string
  subtitle: string | null
  summary: string | null
  description: string | null
  location: string | null
  city: string | null
  country: string | null
  is_virtual: boolean
  start_at: string
  end_at: string | null
  registration_url: string | null
  registration_label: string
  featured_image_url: string | null
  gallery: unknown[]
  tags: string[]
  capacity: number | null
  status: string
  visibility: string
  is_featured: boolean
  metadata: Record<string, unknown>
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

const isoOrNull = (value: unknown) => {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const toBoolean = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true
    if (['false', '0', 'no', 'n'].includes(normalized)) return false
  }
  if (typeof value === 'number') return value !== 0
  return fallback
}

const sanitizePayload = (raw: RawEventPayload, opts: { isUpdate?: boolean } = {}): SanitizedEventPayload => {
  const { isUpdate = false } = opts
  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  if (!title && !isUpdate) {
    throw new Error('Event title is required')
  }

  const slugSource = typeof raw.slug === 'string' && raw.slug.trim().length > 0 ? raw.slug : title
  const slug = slugSource ? slugify(slugSource) : ''
  if (!slug && !isUpdate) {
    throw new Error('Event slug is required')
  }

  const startAt = isoOrNull(raw.start_at ?? raw.startAt ?? raw.date ?? raw.starts_at)
  if (!startAt && !isUpdate) {
    throw new Error('Event start date/time is required')
  }

  const normalizedStatus = typeof raw.status === 'string' && ALLOWED_STATUSES.has(raw.status.trim().toLowerCase())
    ? raw.status.trim().toLowerCase()
    : 'draft'
  const normalizedVisibility = typeof raw.visibility === 'string' && ALLOWED_VISIBILITY.has(raw.visibility.trim().toLowerCase())
    ? raw.visibility.trim().toLowerCase()
    : 'public'

  return {
    title,
    slug,
    subtitle: typeof raw.subtitle === 'string' && raw.subtitle.trim().length > 0 ? raw.subtitle.trim() : null,
    summary: typeof raw.summary === 'string' && raw.summary.trim().length > 0 ? raw.summary.trim() : null,
    description: typeof raw.description === 'string' && raw.description.trim().length > 0 ? raw.description.trim() : null,
    location: typeof raw.location === 'string' && raw.location.trim().length > 0 ? raw.location.trim() : null,
    city: typeof raw.city === 'string' && raw.city.trim().length > 0 ? raw.city.trim() : null,
    country: typeof raw.country === 'string' && raw.country.trim().length > 0 ? raw.country.trim() : null,
    is_virtual: toBoolean(raw.is_virtual ?? raw.isVirtual ?? raw.virtual, false),
    start_at: startAt ?? new Date().toISOString(),
    end_at: isoOrNull(raw.end_at ?? raw.endAt ?? raw.ends_at),
    registration_url: typeof raw.registration_url === 'string' && raw.registration_url.trim().length > 0
      ? raw.registration_url.trim()
      : typeof raw.registrationUrl === 'string' && raw.registrationUrl.trim().length > 0
        ? raw.registrationUrl.trim()
        : null,
    registration_label: typeof raw.registration_label === 'string' && raw.registration_label.trim().length > 0
      ? raw.registration_label.trim()
      : 'Register',
    featured_image_url: typeof raw.featured_image_url === 'string' && raw.featured_image_url.trim().length > 0
      ? raw.featured_image_url.trim()
      : typeof raw.featuredImageUrl === 'string' && raw.featuredImageUrl.trim().length > 0
        ? raw.featuredImageUrl.trim()
        : null,
    gallery: Array.isArray(raw.gallery) ? raw.gallery : [],
    tags: Array.isArray(raw.tags) ? raw.tags.filter(tag => typeof tag === 'string').map(tag => tag.trim()).filter(Boolean) : [],
    capacity: typeof raw.capacity === 'number' && Number.isFinite(raw.capacity)
      ? Math.trunc(raw.capacity)
      : typeof raw.capacity === 'string' && raw.capacity.trim().length > 0 && !Number.isNaN(Number(raw.capacity))
        ? Math.trunc(Number(raw.capacity))
        : null,
    status: normalizedStatus,
    visibility: normalizedVisibility,
    is_featured: toBoolean(raw.is_featured ?? raw.isFeatured, false),
    metadata: typeof raw.metadata === 'object' && raw.metadata !== null && !Array.isArray(raw.metadata)
      ? (raw.metadata as Record<string, unknown>)
      : {},
  }
}

const toJsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const searchParams = req.nextUrl.searchParams
  const scope = searchParams.get('scope')

  const query = supabase
    .from('events')
    .select('*')
    .order('start_at', { ascending: false })

  if (scope !== 'admin') {
    query.eq('status', 'published').eq('visibility', 'public')
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching events:', error)
    return toJsonResponse({ message: 'Failed to fetch events', error: error.message }, 500)
  }

  return toJsonResponse(data ?? [])
}

export async function POST(req: NextRequest) {
  const adminCheck = await requireAdmin(req);
  if ('error' in adminCheck) {
    return adminCheck.error;
  }

  try {
    const body = (await req.json()) as RawEventPayload
    const payload = sanitizePayload(body)
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('events')
      .insert([{ ...payload }])
      .select()
      .single()

    if (error) {
      console.error('Error creating event:', error)
      return toJsonResponse({ message: 'Failed to create event', error: error.message }, 500)
    }

    return toJsonResponse(data, 201)
  } catch (error) {
    console.error('Error in events POST:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return toJsonResponse({ message: 'Failed to create event', error: message }, 400)
  }
}

export async function PUT(req: NextRequest) {
  const adminCheck = await requireAdmin(req);
  if ('error' in adminCheck) {
    return adminCheck.error;
  }

  try {
    const body = (await req.json()) as RawEventPayload
    const id = typeof body.id === 'string' ? body.id : undefined
    if (!id) {
      return toJsonResponse({ message: 'Event id is required for update' }, 400)
    }

    const payload = sanitizePayload(body, { isUpdate: true })
    const supabase = createAdminClient()

    // First check if the event exists
    const { data: existingEvent, error: checkError } = await supabase
      .from('events')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking event:', checkError)
      return toJsonResponse({ message: 'Failed to check event', error: checkError.message }, 500)
    }

    if (!existingEvent) {
      return toJsonResponse({ message: 'Event not found' }, 404)
    }

    // Now update the event
    const { data, error } = await supabase
      .from('events')
      .update({ ...payload })
      .eq('id', id)
      .select()

    if (error) {
      console.error('Error updating event:', error)
      return toJsonResponse({ message: 'Failed to update event', error: error.message }, 500)
    }

    return toJsonResponse(data?.[0] || payload)
  } catch (error) {
    console.error('Error in events PUT:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return toJsonResponse({ message: 'Failed to update event', error: message }, 400)
  }
}


export async function PATCH(req: NextRequest) {
  const adminCheck = await requireAdmin(req);
  if ('error' in adminCheck) {
    return adminCheck.error;
  }

  try {
    const body = (await req.json()) as RawEventPayload
    const id = typeof body.id === 'string' ? body.id : undefined
    if (!id) {
      return toJsonResponse({ message: 'Event id is required for partial update' }, 400)
    }

    const supabase = createAdminClient()

    const updates: Record<string, unknown> = {}

    if (typeof body.status === 'string' && ALLOWED_STATUSES.has(body.status.trim().toLowerCase())) {
      updates.status = body.status.trim().toLowerCase()
    }

    if (typeof body.visibility === 'string' && ALLOWED_VISIBILITY.has(body.visibility.trim().toLowerCase())) {
      updates.visibility = body.visibility.trim().toLowerCase()
    }

    if (Object.prototype.hasOwnProperty.call(body, 'is_featured')) {
      updates.is_featured = toBoolean(body.is_featured, false)
    }

    if (Object.prototype.hasOwnProperty.call(body, 'start_at')) {
      const startAt = isoOrNull(body.start_at)
      if (startAt) updates.start_at = startAt
    }

    if (Object.prototype.hasOwnProperty.call(body, 'end_at')) {
      updates.end_at = isoOrNull(body.end_at)
    }

    if (Object.prototype.hasOwnProperty.call(body, 'registration_url')) {
      updates.registration_url = typeof body.registration_url === 'string' && body.registration_url.trim().length > 0
        ? body.registration_url.trim()
        : null
    }

    if (Object.prototype.hasOwnProperty.call(body, 'registration_label')) {
      updates.registration_label = typeof body.registration_label === 'string' && body.registration_label.trim().length > 0
        ? body.registration_label.trim()
        : 'Register'
    }

    if (Object.keys(updates).length === 0) {
      return toJsonResponse({ message: 'No valid fields provided for partial update' }, 400)
    }

    // First check if the event exists
    const { data: existingEvent, error: checkError } = await supabase
      .from('events')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking event:', checkError)
      return toJsonResponse({ message: 'Failed to check event', error: checkError.message }, 500)
    }

    if (!existingEvent) {
      return toJsonResponse({ message: 'Event not found' }, 404)
    }

    // Now perform the update
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()

    if (error) {
      console.error('Error patching event:', error)
      return toJsonResponse({ message: 'Failed to update event', error: error.message }, 500)
    }

    // Return the first (and should be only) result
    return toJsonResponse(data?.[0] || { id, ...updates })
  } catch (error) {
    console.error('Error in events PATCH:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return toJsonResponse({ message: 'Failed to update event', error: message }, 400)
  }
}


export async function DELETE(req: NextRequest) {
  const adminCheck = await requireAdmin(req);
  if ('error' in adminCheck) {
    return adminCheck.error;
  }

  try {
    const body = (await req.json()) as RawEventPayload
    const id = typeof body.id === 'string' ? body.id : undefined
    if (!id) {
      return toJsonResponse({ message: 'Event id is required for deletion' }, 400)
    }

    const supabase = createAdminClient()

    // First check if the event exists
    const { data: existingEvent, error: checkError } = await supabase
      .from('events')
      .select('id, title')
      .eq('id', id)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking event for deletion:', checkError)
      return toJsonResponse({ message: 'Failed to check event', error: checkError.message }, 500)
    }

    if (!existingEvent) {
      return toJsonResponse({ message: 'Event not found', error: 'No event exists with the given ID' }, 404)
    }

    // Now delete the event
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting event:', error)
      return toJsonResponse({ message: 'Failed to delete event', error: error.message }, 500)
    }

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('Error in events DELETE:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return toJsonResponse({ message: 'Failed to delete event', error: message }, 400)
  }
}








