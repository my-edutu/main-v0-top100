ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS announcements_slug_idx ON public.announcements (slug);
