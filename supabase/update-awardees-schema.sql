-- Add new columns to awardees table for enhanced profile data
-- This migration adds avatar, tagline, social links, achievements, and visibility control

-- Add columns if they don't exist
ALTER TABLE public.awardees ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.awardees ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE public.awardees ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.awardees ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.awardees ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.awardees ADD COLUMN IF NOT EXISTS headline TEXT;
ALTER TABLE public.awardees ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT ARRAY[]::TEXT[];
CREATE INDEX IF NOT EXISTS awardees_is_public_idx ON public.awardees (is_public);

-- Create index for visibility queries
CREATE INDEX IF NOT EXISTS awardees_is_public_idx ON public.awardees (is_public);

-- Update the awardee_directory view to include new fields
DROP VIEW IF EXISTS public.awardee_directory;

CREATE OR REPLACE VIEW public.awardee_directory AS
SELECT
  a.id AS awardee_id,
  a.profile_id,
  COALESCE(p.slug, a.slug) AS slug,
  COALESCE(p.full_name, a.name) AS name,
  COALESCE(p.email, a.email) AS email,
  COALESCE(p.location, a.country) AS country,
  p.location AS location,
  COALESCE(p.current_school, a.course) AS current_school,
  COALESCE(p.field_of_study, a.course) AS field_of_study,
  COALESCE(p.bio, a.bio) AS bio,
  COALESCE(p.avatar_url, a.avatar_url, a.image_url) AS avatar_url,
  p.cover_image_url,
  COALESCE(p.headline, a.headline) AS headline,
  COALESCE(p.tagline, a.tagline) AS tagline,
  p.personal_email,
  p.phone,
  COALESCE(p.achievements, a.achievements) AS achievements,
  p.gallery,
  p.video_links,
  COALESCE(p.social_links, a.social_links) AS social_links,
  COALESCE(p.interests, a.interests) AS interests,
  p.cohort,
  p.metadata,
  a.cgpa,
  a.year,
  a.featured,
  a.created_at,
  p.updated_at,
  COALESCE(p.is_public, a.is_public, TRUE) AS is_public,
  COALESCE(p.role, 'user') AS role,
  COALESCE(p.mentor, '') AS mentor
FROM public.awardees a
LEFT JOIN public.profiles p ON p.id = a.profile_id
WHERE COALESCE(p.is_public, a.is_public, TRUE);

