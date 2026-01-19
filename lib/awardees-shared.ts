import type { AwardeeDirectoryEntry } from '@/types/profile'

export type Awardee = AwardeeDirectoryEntry & {
    course?: string | null
}

export type StaticAwardeeRecord = {
    id?: string
    slug?: string
    name?: string
    email?: string | null
    country?: string | null
    current_school?: string | null
    field_of_study?: string | null
    course?: string | null
    category?: string | null
    bio?: string | null
    bio30?: string | null
    avatar_url?: string | null
    headline?: string | null
    location?: string | null
    cgpa?: string | null
    year?: number | string | null
    featured?: boolean | null
    cohort?: string | null
    role?: string | null
    mentor?: string | null
}

export const normalizeAwardeeEntry = (entry: AwardeeDirectoryEntry): Awardee => ({
    ...entry,
    course: entry.field_of_study ?? entry.current_school ?? null,
    impact_projects: entry.impact_projects ?? null,
    lives_impacted: entry.lives_impacted ?? null,
    awards_received: entry.awards_received ?? null,
    youtube_video_url: entry.youtube_video_url ?? null,
})

// Type for proof page awardees (minimal data)
export type ProofAwardee = {
    id: string
    name: string
    cgpa: string | null
    country: string | null
    year: number | null
}
