-- Create Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    image_url TEXT,
    cta_label TEXT DEFAULT 'Learn More',
    cta_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, published
    is_active BOOLEAN DEFAULT true,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Public read access
DO $$ BEGIN
    CREATE POLICY "Public read announcements" ON public.announcements
        FOR SELECT USING (status = 'published' AND is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service role full access
DO $$ BEGIN
    CREATE POLICY "Service manages announcements" ON public.announcements
        FOR ALL USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.handle_announcement_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_announcement_updated ON public.announcements;
CREATE TRIGGER on_announcement_updated
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW EXECUTE FUNCTION public.handle_announcement_updated();
