-- Upcoming Events Management
-- This table stores upcoming events that can be displayed on the homepage

CREATE TABLE IF NOT EXISTS public.upcoming_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone,
  location text,
  event_type text DEFAULT 'conference' CHECK (event_type IN ('conference', 'workshop', 'webinar', 'summit', 'networking', 'other')),
  image_url text,
  registration_url text,
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  max_attendees integer,
  current_attendees integer DEFAULT 0,
  tags jsonb DEFAULT '[]'::jsonb, -- array of tags like ["leadership", "innovation"]
  metadata jsonb DEFAULT '{}'::jsonb, -- additional flexible data
  order_position integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS upcoming_events_date_idx ON public.upcoming_events (event_date);
CREATE INDEX IF NOT EXISTS upcoming_events_active_idx ON public.upcoming_events (is_active);
CREATE INDEX IF NOT EXISTS upcoming_events_featured_idx ON public.upcoming_events (is_featured);
CREATE INDEX IF NOT EXISTS upcoming_events_order_idx ON public.upcoming_events (order_position);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.handle_upcoming_events_updated()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_upcoming_events_updated ON public.upcoming_events;
CREATE TRIGGER on_upcoming_events_updated
  BEFORE UPDATE ON public.upcoming_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_upcoming_events_updated();

-- Enable RLS
ALTER TABLE public.upcoming_events ENABLE ROW LEVEL SECURITY;

-- Public can read active events
DO $$ BEGIN
  CREATE POLICY "Public can view active upcoming events" ON public.upcoming_events
    FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service role can manage all events
DO $$ BEGIN
  CREATE POLICY "Service manages upcoming events" ON public.upcoming_events
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Insert sample upcoming events
INSERT INTO public.upcoming_events (title, description, event_date, end_date, location, event_type, registration_url, is_featured, is_active, order_position, tags) VALUES
  (
    'Africa Future Leaders Summit 2026',
    'Join us for an immersive leadership summit connecting awardees, partners, and investors. Network with change-makers, attend workshops, and be part of shaping Africa''s future.',
    '2026-07-15 09:00:00+00',
    '2026-07-17 18:00:00+00',
    'Kigali, Rwanda',
    'summit',
    '/initiatives/summit',
    true,
    true,
    1,
    '["leadership", "networking", "innovation"]'::jsonb
  ),
  (
    'Talk100 Live: Innovation in African Tech',
    'Monthly conversation with tech pioneers and policymakers discussing Africa''s technology ecosystem and digital transformation.',
    '2025-12-20 15:00:00+00',
    '2025-12-20 17:00:00+00',
    'Virtual Event',
    'webinar',
    '/initiatives/talk100-live',
    true,
    true,
    2,
    '["tech", "policy", "innovation"]'::jsonb
  ),
  (
    'Project100 Scholarship Info Session',
    'Learn about scholarship opportunities, eligibility criteria, and the application process. Meet past scholars and get your questions answered.',
    '2025-12-15 14:00:00+00',
    '2025-12-15 16:00:00+00',
    'Virtual Event',
    'webinar',
    '/initiatives/project100',
    false,
    true,
    3,
    '["education", "scholarship", "opportunity"]'::jsonb
  )
ON CONFLICT DO NOTHING;

-- Add realtime support
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.upcoming_events;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN
    IF SQLSTATE = '42704' THEN
      NULL; -- publication does not exist (local dev), ignore
    ELSE
      RAISE;
    END IF;
END $$;
