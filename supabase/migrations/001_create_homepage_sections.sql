-- Homepage Sections Management
-- This table stores dynamic content sections for the homepage

CREATE TABLE IF NOT EXISTS public.homepage_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text UNIQUE NOT NULL, -- unique identifier like 'hero', 'about', 'sponsors', etc.
  title text,
  subtitle text,
  content jsonb DEFAULT '{}'::jsonb, -- flexible JSON structure for section content
  images jsonb DEFAULT '[]'::jsonb, -- array of image URLs
  cta_text text, -- Call to action text
  cta_url text, -- Call to action URL
  order_position integer DEFAULT 0, -- for ordering sections
  is_active boolean DEFAULT true,
  visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS homepage_sections_order_idx ON public.homepage_sections (order_position);
CREATE INDEX IF NOT EXISTS homepage_sections_active_idx ON public.homepage_sections (is_active);
CREATE INDEX IF NOT EXISTS homepage_sections_key_idx ON public.homepage_sections (section_key);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.handle_homepage_section_updated()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_homepage_section_updated ON public.homepage_sections;
CREATE TRIGGER on_homepage_section_updated
  BEFORE UPDATE ON public.homepage_sections
  FOR EACH ROW EXECUTE FUNCTION public.handle_homepage_section_updated();

-- Enable RLS
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;

-- Public can read active sections
DO $$ BEGIN
  CREATE POLICY "Public can view active homepage sections" ON public.homepage_sections
    FOR SELECT USING (is_active = true AND visibility = 'public');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service role can manage all sections
DO $$ BEGIN
  CREATE POLICY "Service manages homepage sections" ON public.homepage_sections
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Insert default homepage sections
INSERT INTO public.homepage_sections (section_key, title, subtitle, content, order_position, is_active) VALUES
  ('hero', 'Empowering Africa''s Future Leaders', 'Celebrating excellence, impact, and innovation across the continent',
   '{"description": "Join a movement that identifies, celebrates, and empowers the brightest young leaders shaping Africa''s future."}'::jsonb, 1, true),

  ('about', 'About the movement', NULL,
   '{"description": "We celebrate Africa''s high-achieving youth leaders — from first-class graduates to innovators, changemakers, and student leaders — who are redefining what leadership looks like across the continent."}'::jsonb, 2, true),

  ('vision', 'Our Vision', '10,000 youth leaders by 2030',
   '{"description": "Our vision is to identify, empower, and celebrate youth leaders across Africa by 2030."}'::jsonb, 3, true),

  ('sponsors', 'Meet some of our sponsors', 'These partners amplify our mission',
   '{"partners": [
     {"name": "One Young World West & Central Africa", "logo": "/3.png"},
     {"name": "ALX Nigeria", "logo": "/7.png"},
     {"name": "Learning Planet Institute", "logo": "/6.png"}
   ]}'::jsonb, 4, true),

  ('initiatives', 'Our latest initiatives', 'Each initiative unlocks mentorship, funding, and opportunities',
   '{}'::jsonb, 5, true),

  ('team', 'Meet the people behind the platform', 'Programme leads, storytellers, and community builders',
   '{"members": [
     {"name": "Nwosu Paul Light", "role": "Founder", "linkedIn": "https://www.linkedin.com/in/paul-light-/"},
     {"name": "Emmanuella Igboafu", "role": "Team Lead", "linkedIn": "https://www.linkedin.com/in/emmanuellaigboafu/"},
     {"name": "Chinedu Daniel", "role": "Team Lead", "linkedIn": "https://www.linkedin.com/in/chinedu-nwandu-a4689323b/"}
   ]}'::jsonb, 6, true),

  ('partnership', 'Partner With Us', 'Empower Africa''s Future Leaders',
   '{"description": "Top100 connects brilliant young Africans to life-changing opportunities, scholarships, and leadership development."}'::jsonb, 7, true),

  ('summit', 'Africa Future Leaders Summit 2026', 'Join us in co-creating a gathering',
   '{"description": "Join us in co-creating a gathering that accelerates Africa''s next generation of changemakers."}'::jsonb, 8, true),

  ('newsletter', 'Stay in the loop', 'Get monthly highlights delivered to your inbox',
   '{"description": "Get monthly highlights on awardees, opportunities, and events delivered straight to your inbox."}'::jsonb, 9, true)
ON CONFLICT (section_key) DO NOTHING;

-- Add realtime support
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.homepage_sections;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN
    IF SQLSTATE = '42704' THEN
      NULL; -- publication does not exist (local dev), ignore
    ELSE
      RAISE;
    END IF;
END $$;
