-- Add scheduled status to posts table enum

-- First, we'll add 'scheduled' to the check constraint by dropping and recreating it
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_status_check;

-- Add the scheduled value to the check constraint
ALTER TABLE public.posts ADD CONSTRAINT posts_status_check 
CHECK (status IN ('draft', 'published', 'scheduled', 'archived'));