-- Add linkedin_post_url column to awardees table for featured LinkedIn posts
-- This allows admins to add a LinkedIn post URL that displays as a compact card on awardee profiles

ALTER TABLE awardees 
ADD COLUMN IF NOT EXISTS linkedin_post_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN awardees.linkedin_post_url IS 'URL to a public LinkedIn post to feature on the awardee profile';
