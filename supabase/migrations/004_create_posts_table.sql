-- Create Posts Table for Blog Management
-- This table stores blog posts with full admin control

CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL,
  excerpt text,
  cover_image text,
  cover_image_alt text,
  author text,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_featured boolean DEFAULT false,
  visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'unlisted')),
  tags text[] DEFAULT ARRAY[]::text[],
  read_time integer,
  views integer DEFAULT 0,
  scheduled_at timestamp with time zone,
  published_at timestamp with time zone,
  meta_title text,
  meta_description text,
  meta_keywords text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS posts_slug_idx ON public.posts(slug);
CREATE INDEX IF NOT EXISTS posts_status_idx ON public.posts(status);
CREATE INDEX IF NOT EXISTS posts_is_featured_idx ON public.posts(is_featured);
CREATE INDEX IF NOT EXISTS posts_author_id_idx ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS posts_published_at_idx ON public.posts(published_at);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON public.posts(created_at);
CREATE INDEX IF NOT EXISTS posts_tags_idx ON public.posts USING gin(tags);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_post_updated()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();

  -- Auto-set published_at when status changes to published
  IF new.status = 'published' AND old.status != 'published' AND new.published_at IS NULL THEN
    new.published_at = now();
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_updated ON public.posts;
CREATE TRIGGER on_post_updated
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_post_updated();

-- Trigger to auto-generate slug if not provided
CREATE OR REPLACE FUNCTION public.generate_post_slug()
RETURNS trigger AS $$
BEGIN
  IF new.slug IS NULL OR new.slug = '' THEN
    new.slug := regexp_replace(lower(new.title), '[^a-z0-9]+', '-', 'g');
    -- Remove leading/trailing hyphens
    new.slug := regexp_replace(new.slug, '^-+|-+$', '', 'g');
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_before_insert ON public.posts;
CREATE TRIGGER on_post_before_insert
  BEFORE INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.generate_post_slug();

-- Enable Row Level Security
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  CREATE POLICY "Public can view published posts" ON public.posts
    FOR SELECT USING (status = 'published' AND visibility = 'public');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authors can view their own posts" ON public.posts
    FOR SELECT USING (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages all posts" ON public.posts
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage all posts" ON public.posts
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add realtime support
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN
    IF SQLSTATE = '42704' THEN
      NULL; -- publication does not exist (local dev), ignore
    ELSE
      RAISE;
    END IF;
END $$;

-- Add helpful comments
COMMENT ON TABLE public.posts IS 'Stores blog posts with full content management capabilities';
COMMENT ON COLUMN public.posts.is_featured IS 'Featured posts appear on homepage and special sections';
COMMENT ON COLUMN public.posts.status IS 'Post publication status: draft, published, or archived';
COMMENT ON COLUMN public.posts.visibility IS 'Post visibility: public, private, or unlisted';
COMMENT ON COLUMN public.posts.scheduled_at IS 'When the post should be auto-published';
COMMENT ON COLUMN public.posts.published_at IS 'When the post was first published';
COMMENT ON COLUMN public.posts.author_id IS 'Links to profiles table for authenticated authors';
