-- Create messages table for storing contact form submissions
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'general', -- 'partnership', 'contact', 'general'
  status TEXT DEFAULT 'unread', -- 'unread', 'read', 'replied'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting (anyone can submit)
CREATE POLICY "Anyone can submit messages" ON messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Create policy for reading (only authenticated users)
CREATE POLICY "Authenticated users can read messages" ON messages
  FOR SELECT TO authenticated
  USING (true);

-- Create policy for updating (only authenticated users)
CREATE POLICY "Authenticated users can update messages" ON messages
  FOR UPDATE TO authenticated
  USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_messages_type ON messages(type);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
