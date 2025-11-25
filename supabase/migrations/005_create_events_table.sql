-- Create Events Table for Full Event Management
-- This table stores all events with full admin control
-- Replaces the old upcoming_events table with a more comprehensive structure

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  subtitle text,
  summary text,
  description text,
  location text,
  city text,
  country text,
  is_virtual boolean NOT NULL DEFAULT false,
  start_at timestamp with time zone NOT NULL,
  end_at timestamp with time zone,
  registration_url text,
  registration_label text DEFAULT 'Register',
  featured_image_url text,
  gallery jsonb DEFAULT '[]'::jsonb,
  tags text[] DEFAULT ARRAY[]::text[],
  capacity integer,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  is_featured boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS events_status_idx ON public.events (status);
CREATE INDEX IF NOT EXISTS events_start_at_idx ON public.events (start_at);
CREATE INDEX IF NOT EXISTS events_is_featured_idx ON public.events (is_featured);
CREATE INDEX IF NOT EXISTS events_visibility_idx ON public.events (visibility);
CREATE INDEX IF NOT EXISTS events_slug_idx ON public.events (slug);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_event_updated()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_event_updated ON public.events;
CREATE TRIGGER on_event_updated
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_event_updated();

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Public can view published events
DO $$ BEGIN
  CREATE POLICY "Public can view published events" ON public.events
    FOR SELECT USING (status = 'published' AND visibility = 'public');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service role can manage all events (admin access)
DO $$ BEGIN
  CREATE POLICY "Service manages events" ON public.events
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add realtime support for live updates
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN
    IF SQLSTATE = '42704' THEN
      NULL; -- publication does not exist (local dev), ignore
    ELSE
      RAISE;
    END IF;
END $$;

-- Insert sample events for testing
INSERT INTO public.events (
  title,
  slug,
  subtitle,
  summary,
  description,
  city,
  country,
  location,
  is_virtual,
  start_at,
  end_at,
  registration_url,
  registration_label,
  status,
  visibility,
  is_featured,
  tags
) VALUES
  (
    'Africa Future Leaders Summit 2026',
    'africa-future-leaders-summit-2026',
    'Shaping the Future of African Leadership',
    'Join us for an immersive leadership summit connecting awardees, partners, and investors. Network with change-makers, attend workshops, and be part of shaping Africa''s future.',
    'The Africa Future Leaders Summit 2026 is our flagship annual gathering that brings together the continent''s most promising young leaders, innovators, and changemakers.

Over three transformative days, participants will engage in:

• Keynote sessions with global thought leaders
• Interactive workshops on leadership, innovation, and entrepreneurship
• Networking opportunities with investors and mentors
• Panel discussions on Africa''s most pressing challenges
• Showcase of innovative projects and solutions

This is more than a conference - it''s a movement to accelerate Africa''s development through youth leadership.',
    'Kigali',
    'Rwanda',
    'Kigali Convention Centre',
    false,
    '2026-07-15 09:00:00+00',
    '2026-07-17 18:00:00+00',
    '/initiatives/summit',
    'Register Your Interest',
    'published',
    'public',
    true,
    ARRAY['leadership', 'networking', 'innovation', 'summit']
  ),
  (
    'Talk100 Live: Innovation in African Tech',
    'talk100-live-innovation-african-tech-dec-2025',
    'Monthly Conversation Series',
    'Monthly conversation with tech pioneers and policymakers discussing Africa''s technology ecosystem and digital transformation.',
    'Talk100 Live brings together innovators, policymakers, and industry leaders for candid conversations about Africa''s tech future.

This month''s theme: Innovation in African Tech
• Speakers from leading African tech companies
• Discussion on funding and scaling startups
• Policy frameworks for tech innovation
• Q&A session with attendees

Join us virtually from anywhere in Africa and beyond.',
    'Virtual',
    'Online',
    'Zoom Meeting',
    true,
    '2025-12-20 15:00:00+00',
    '2025-12-20 17:00:00+00',
    '/initiatives/talk100-live',
    'Join Virtual Event',
    'published',
    'public',
    false,
    ARRAY['tech', 'policy', 'innovation', 'virtual']
  ),
  (
    'Project100 Scholarship Info Session',
    'project100-scholarship-info-session-dec-2025',
    'Learn About Scholarship Opportunities',
    'Learn about scholarship opportunities, eligibility criteria, and the application process. Meet past scholars and get your questions answered.',
    'Interested in applying for the Project100 Scholarship? This info session will cover:

• Overview of scholarship opportunities
• Eligibility requirements and selection criteria
• Application process and timeline
• Tips from past scholarship recipients
• Q&A with the selection committee

Whether you''re a prospective applicant or just curious about the program, this session will provide all the information you need.',
    'Virtual',
    'Online',
    'Virtual Event',
    true,
    '2025-12-15 14:00:00+00',
    '2025-12-15 16:00:00+00',
    '/initiatives/project100',
    'Register Now',
    'published',
    'public',
    false,
    ARRAY['education', 'scholarship', 'opportunity']
  )
ON CONFLICT (slug) DO NOTHING;
