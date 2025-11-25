-- Create interest_registrations table to store join/partner interest submissions
CREATE TABLE IF NOT EXISTS public.interest_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  interest_type TEXT NOT NULL CHECK (interest_type IN ('member', 'partner', 'sponsor', 'volunteer', 'general')),
  full_name TEXT,
  organization TEXT,
  message TEXT,
  country TEXT,
  phone TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'accepted', 'declined'))
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.interest_registrations ENABLE ROW LEVEL SECURITY;

-- Create policies (allow anyone to insert, but only authenticated users to read)
CREATE POLICY "Allow anyone to register interest"
  ON public.interest_registrations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read interest registrations"
  ON public.interest_registrations FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_interest_registrations_created_at ON public.interest_registrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interest_registrations_status ON public.interest_registrations(status);
CREATE INDEX IF NOT EXISTS idx_interest_registrations_type ON public.interest_registrations(interest_type);
CREATE INDEX IF NOT EXISTS idx_interest_registrations_email ON public.interest_registrations(email);
