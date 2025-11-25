-- Create Awardees Table
-- This table stores Africa Future Leaders awardees data
-- It can be linked to user profiles for full profile management

CREATE TABLE IF NOT EXISTS public.awardees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  email text,
  country text,
  cgpa text,
  course text,
  bio text,
  year integer,
  image_url text,
  avatar_url text,
  tagline text,
  headline text,
  social_links jsonb DEFAULT '{}'::jsonb,
  achievements jsonb DEFAULT '[]'::jsonb,
  interests text[] DEFAULT ARRAY[]::text[],
  featured boolean DEFAULT false,
  is_public boolean DEFAULT true,
  highlights jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS awardees_profile_idx ON public.awardees(profile_id);
CREATE INDEX IF NOT EXISTS awardees_featured_idx ON public.awardees(featured);
CREATE INDEX IF NOT EXISTS awardees_is_public_idx ON public.awardees(is_public);
CREATE INDEX IF NOT EXISTS awardees_year_idx ON public.awardees(year);
CREATE INDEX IF NOT EXISTS awardees_slug_idx ON public.awardees(slug);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_awardee_updated()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_awardee_updated ON public.awardees;
CREATE TRIGGER on_awardee_updated
  BEFORE UPDATE ON public.awardees
  FOR EACH ROW EXECUTE FUNCTION public.handle_awardee_updated();

-- Trigger to auto-generate slug if not provided
CREATE OR REPLACE FUNCTION public.sync_awardee_profile()
RETURNS trigger AS $$
BEGIN
  -- ensure awardees row has a slug; prefer profile slug
  IF new.slug IS NULL OR new.slug = '' THEN
    new.slug := COALESCE(
      (SELECT slug FROM public.profiles WHERE id = new.profile_id),
      regexp_replace(lower(new.name), '[^a-z0-9]+', '-', 'g')
    );
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_awardees_before_insert ON public.awardees;
CREATE TRIGGER on_awardees_before_insert
  BEFORE INSERT ON public.awardees
  FOR EACH ROW EXECUTE FUNCTION public.sync_awardee_profile();

DROP TRIGGER IF EXISTS on_awardees_before_update ON public.awardees;
CREATE TRIGGER on_awardees_before_update
  BEFORE UPDATE ON public.awardees
  FOR EACH ROW EXECUTE FUNCTION public.sync_awardee_profile();

-- Enable Row Level Security
ALTER TABLE public.awardees ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  CREATE POLICY "Public can view public awardees" ON public.awardees
    FOR SELECT USING (is_public = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages all awardees" ON public.awardees
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create awardee_directory view (combines awardees and profiles data)
CREATE OR REPLACE VIEW public.awardee_directory AS
SELECT
  a.id AS awardee_id,
  COALESCE(p.id, a.profile_id) AS profile_id,
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
  COALESCE(p.updated_at, a.updated_at) AS updated_at,
  COALESCE(p.is_public, a.is_public, true) AS is_public,
  COALESCE(p.role, 'user') AS role,
  COALESCE(p.mentor, '') AS mentor
FROM public.awardees a
LEFT JOIN public.profiles p ON p.id = a.profile_id
WHERE COALESCE(p.is_public, a.is_public, true);

-- Add realtime support
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.awardees;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN
    IF SQLSTATE = '42704' THEN
      NULL; -- publication does not exist (local dev), ignore
    ELSE
      RAISE;
    END IF;
END $$;

-- Add helpful comment
COMMENT ON TABLE public.awardees IS 'Stores Top100 Africa Future Leaders awardees data. Can be linked to profiles for full user management.';
COMMENT ON COLUMN public.awardees.featured IS 'Featured awardees appear on the homepage';
COMMENT ON COLUMN public.awardees.is_public IS 'Controls whether awardee profile is publicly visible';
COMMENT ON COLUMN public.awardees.profile_id IS 'Links to profiles table for user accounts';
