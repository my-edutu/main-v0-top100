-- Create site_settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name TEXT NOT NULL DEFAULT 'Top100 Africa Future Leaders',
  site_description TEXT DEFAULT 'Showcasing Africa''s emerging leaders',
  site_url TEXT NOT NULL DEFAULT 'https://top100afl.org',
  contact_email TEXT NOT NULL DEFAULT 'admin@top100afl.org',
  social_links JSONB DEFAULT '{"twitter": "", "linkedin": "", "instagram": ""}'::jsonb,
  registration_enabled BOOLEAN DEFAULT true,
  newsletter_enabled BOOLEAN DEFAULT true,
  maintenance_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_site_settings_updated_at ON site_settings;
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings if table is empty
INSERT INTO site_settings (
  site_name,
  site_description,
  site_url,
  contact_email,
  social_links,
  registration_enabled,
  newsletter_enabled,
  maintenance_mode
)
SELECT
  'Top100 Africa Future Leaders',
  'Showcasing Africa''s emerging leaders',
  'https://top100afl.org',
  'admin@top100afl.org',
  '{"twitter": "https://twitter.com/top100afl", "linkedin": "https://linkedin.com/company/top100afl", "instagram": "https://instagram.com/top100afl"}'::jsonb,
  true,
  true,
  false
WHERE NOT EXISTS (SELECT 1 FROM site_settings);

-- Enable Row Level Security
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
DROP POLICY IF EXISTS "Allow public read access to settings" ON site_settings;
CREATE POLICY "Allow public read access to settings"
  ON site_settings
  FOR SELECT
  TO public
  USING (true);

-- Create policy to allow admin write access
DROP POLICY IF EXISTS "Allow admin write access to settings" ON site_settings;
CREATE POLICY "Allow admin write access to settings"
  ON site_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
