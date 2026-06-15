import "server-only"

import { unstable_cache } from "next/cache"

import { createAdminClient } from "@/lib/supabase/server"

export interface HomepageEvent {
  id: string
  title: string
  subtitle: string | null
  summary: string | null
  description: string | null
  start_at: string
  end_at: string | null
  location: string | null
  city: string | null
  country: string | null
  is_virtual: boolean
  featured_image_url: string | null
  registration_url: string | null
  registration_label: string
  is_featured: boolean
  capacity: number | null
  tags: string[]
  status: string
  visibility: string
  created_at: string | null
  updated_at: string | null
}

export interface HomepageAnnouncement {
  id: string
  title: string
  content: string | null
  image_url: string | null
  cta_label: string
  cta_url: string | null
  status: string
  is_active: boolean
  scheduled_at: string | null
  created_at: string | null
}

const normalizeText = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return null
}

const parseIsoString = (value: unknown, fallback: string): string => {
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString()
  }

  return fallback
}

const parseBoolean = (value: unknown, fallback = false) => {
  if (typeof value === "boolean") {
    return value
  }

  if (typeof value === "number") {
    return value !== 0
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (["true", "1", "yes", "y"].includes(normalized)) {
      return true
    }

    if (["false", "0", "no", "n"].includes(normalized)) {
      return false
    }
  }

  return fallback
}

const normalizeTags = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter(Boolean)
  }

  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
  }

  return []
}

const DAY = 24 * 60 * 60 * 1000

const makeRelativeIso = (daysFromNow: number, hours = 9, minutes = 0) => {
  const date = new Date(Date.now() + daysFromNow * DAY)
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

const loadStaticHomepageEvents = (): HomepageEvent[] => {
  const now = new Date().toISOString()

  return [
    {
      id: "africa-future-leaders-summit-2026",
      title: "Africa Future Leaders Summit 2026",
      subtitle: "Shaping the Future of African Leadership",
      summary: "Join us for an immersive leadership summit connecting awardees, partners, and mentors across the continent.",
      description:
        "The Africa Future Leaders Summit brings together the continent's most promising young leaders, innovators, and changemakers for keynote sessions, workshops, and high-value networking.",
      start_at: makeRelativeIso(42, 9, 0),
      end_at: makeRelativeIso(44, 17, 0),
      location: "Kigali Convention Centre",
      city: "Kigali",
      country: "Rwanda",
      is_virtual: false,
      featured_image_url: null,
      registration_url: "/initiatives/summit",
      registration_label: "Register Your Interest",
      is_featured: true,
      capacity: 500,
      tags: ["leadership", "networking", "innovation", "summit"],
      status: "published",
      visibility: "public",
      created_at: now,
      updated_at: now,
    },
    {
      id: "talk100-live-innovation-in-african-tech",
      title: "Talk100 Live: Innovation in African Tech",
      subtitle: "Monthly Conversation Series",
      summary: "A virtual conversation with innovators and policymakers shaping Africa's digital future.",
      description:
        "Talk100 Live brings together builders, founders, and policy voices for practical conversations about scaling ideas, funding innovation, and strengthening the continent's tech ecosystem.",
      start_at: makeRelativeIso(14, 15, 0),
      end_at: makeRelativeIso(14, 17, 0),
      location: "Zoom Meeting",
      city: "Online",
      country: "Africa-wide",
      is_virtual: true,
      featured_image_url: null,
      registration_url: "/initiatives/talk100-live",
      registration_label: "Join Virtual Event",
      is_featured: false,
      capacity: 250,
      tags: ["tech", "policy", "innovation", "virtual"],
      status: "published",
      visibility: "public",
      created_at: now,
      updated_at: now,
    },
    {
      id: "project100-scholarship-info-session",
      title: "Project100 Scholarship Info Session",
      subtitle: "Learn About Scholarship Opportunities",
      summary: "Learn about scholarship opportunities, eligibility criteria, and the application process.",
      description:
        "Whether you're a prospective applicant or just curious about the program, this session covers eligibility, selection criteria, and tips from past scholarship recipients.",
      start_at: makeRelativeIso(7, 14, 0),
      end_at: makeRelativeIso(7, 16, 0),
      location: "Virtual Event",
      city: "Online",
      country: "Africa-wide",
      is_virtual: true,
      featured_image_url: null,
      registration_url: "/initiatives/project100",
      registration_label: "Register Now",
      is_featured: false,
      capacity: 300,
      tags: ["education", "scholarship", "opportunity"],
      status: "published",
      visibility: "public",
      created_at: now,
      updated_at: now,
    },
  ]
}

const mapHomepageEvent = (record: Record<string, unknown>): HomepageEvent => {
  const now = new Date().toISOString()
  const fallbackStart = parseIsoString(record.start_at ?? record.startAt ?? record.created_at ?? record.createdAt, now)
  const fallbackCreatedAt = parseIsoString(record.created_at ?? record.createdAt, now)

  return {
    id: typeof record.id === "string" ? record.id : fallbackCreatedAt,
    title: normalizeText(record.title) ?? "Untitled event",
    subtitle: normalizeText(record.subtitle),
    summary: normalizeText(record.summary),
    description: normalizeText(record.description),
    start_at: fallbackStart,
    end_at: normalizeText(record.end_at ?? record.endAt),
    location: normalizeText(record.location),
    city: normalizeText(record.city),
    country: normalizeText(record.country),
    is_virtual: parseBoolean(record.is_virtual ?? record.isVirtual ?? record.virtual, false),
    featured_image_url: normalizeText(record.featured_image_url ?? record.featuredImageUrl),
    registration_url: normalizeText(record.registration_url ?? record.registrationUrl),
    registration_label: normalizeText(record.registration_label ?? record.registrationLabel) ?? "Register Now",
    is_featured: parseBoolean(record.is_featured ?? record.isFeatured, false),
    capacity:
      typeof record.capacity === "number" && Number.isFinite(record.capacity)
        ? Math.trunc(record.capacity)
        : typeof record.capacity === "string" && record.capacity.trim().length > 0 && !Number.isNaN(Number(record.capacity))
          ? Math.trunc(Number(record.capacity))
          : null,
    tags: normalizeTags(record.tags),
    status: normalizeText(record.status) ?? "published",
    visibility: normalizeText(record.visibility) ?? "public",
    created_at: normalizeText(record.created_at ?? record.createdAt),
    updated_at: normalizeText(record.updated_at ?? record.updatedAt),
  }
}

const mapHomepageAnnouncement = (record: Record<string, unknown>): HomepageAnnouncement => ({
  id: typeof record.id === "string" ? record.id : normalizeText(record.title) ?? "announcement",
  title: normalizeText(record.title) ?? "Untitled announcement",
  content: normalizeText(record.content),
  image_url: normalizeText(record.image_url ?? record.imageUrl),
  cta_label: normalizeText(record.cta_label ?? record.ctaLabel) ?? "Learn More",
  cta_url: normalizeText(record.cta_url ?? record.ctaUrl),
  status: normalizeText(record.status) ?? "published",
  is_active: parseBoolean(record.is_active ?? record.isActive, true),
  scheduled_at: normalizeText(record.scheduled_at ?? record.scheduledAt),
  created_at: normalizeText(record.created_at ?? record.createdAt),
})

export const getHomepageEvents = unstable_cache(
  async (): Promise<HomepageEvent[]> => {
    if (!hasServiceRoleKey) {
      return loadStaticHomepageEvents()
    }

    try {
      const supabase = createAdminClient()

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("status", "published")
        .eq("visibility", "public")
        .order("start_at", { ascending: false })

      if (error || !data || data.length === 0) {
        if (error) {
          console.warn("[homepage-feed] Failed to fetch events", error)
        }
        return loadStaticHomepageEvents()
      }

      return (data as Record<string, unknown>[]).map(mapHomepageEvent)
    } catch (error) {
      console.warn("[homepage-feed] Events unavailable", error)
      return loadStaticHomepageEvents()
    }
  },
  ["homepage-events"],
  { revalidate: 300, tags: ["homepage-feed", "events"] },
)

export const getHomepageAnnouncements = unstable_cache(
  async (): Promise<HomepageAnnouncement[]> => {
    if (!hasServiceRoleKey) {
      return []
    }

    try {
      const supabase = createAdminClient()

      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("status", "published")
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (error || !data) {
        if (error) {
          console.warn("[homepage-feed] Failed to fetch announcements", error)
        }
        return []
      }

      const now = Date.now()
      return (data as Record<string, unknown>[])
        .filter((record) => {
          const scheduledAt = normalizeText(record.scheduled_at ?? record.scheduledAt)
          if (!scheduledAt) {
            return true
          }

          const scheduledAtTime = new Date(scheduledAt).getTime()
          return Number.isNaN(scheduledAtTime) ? true : scheduledAtTime <= now
        })
        .map(mapHomepageAnnouncement)
    } catch (error) {
      console.warn("[homepage-feed] Announcements unavailable", error)
      return []
    }
  },
  ["homepage-announcements"],
  { revalidate: 300, tags: ["homepage-feed", "announcements"] },
)
