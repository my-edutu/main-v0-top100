-- Create contact_messages table to store contact form submissions
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied'))
);

-- Create newsletter_subscribers table to store newsletter signups
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed'))
);

-- Enable Row Level Security (RLS) for both tables
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Create policies for contact_messages (allow anyone to insert, but only authenticated users to read)
CREATE POLICY "Allow anyone to insert contact messages" 
  ON public.contact_messages FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read contact messages" 
  ON public.contact_messages FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Create policies for newsletter_subscribers (allow anyone to insert, but only authenticated users to read)
CREATE POLICY "Allow anyone to subscribe to newsletter" 
  ON public.newsletter_subscribers FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read newsletter subscribers" 
  ON public.newsletter_subscribers FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON public.newsletter_subscribers(email);
