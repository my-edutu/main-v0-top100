-- Magazine Downloads table to store user details before downloading magazines
CREATE TABLE IF NOT EXISTS public.magazine_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  magazine_year integer NOT NULL,
  magazine_title text NOT NULL,
  download_link text NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS magazine_downloads_email_idx ON public.magazine_downloads (email);
CREATE INDEX IF NOT EXISTS magazine_downloads_magazine_year_idx ON public.magazine_downloads (magazine_year);
CREATE INDEX IF NOT EXISTS magazine_downloads_created_at_idx ON public.magazine_downloads (created_at);

-- Enable RLS
ALTER TABLE public.magazine_downloads ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (for capturing leads)
DO $$ BEGIN
  CREATE POLICY "Allow public inserts" ON public.magazine_downloads
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Only service role can read/update/delete
DO $$ BEGIN
  CREATE POLICY "Service manages downloads" ON public.magazine_downloads
    FOR SELECT USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service updates downloads" ON public.magazine_downloads
    FOR UPDATE USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service deletes downloads" ON public.magazine_downloads
    FOR DELETE USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
