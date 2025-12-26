-- Push Notifications Tables Migration
-- Run this in your Supabase SQL Editor

-- Push Subscriptions Table
-- Stores browser push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB, -- Contains p256dh and auth keys
  user_agent TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (creates their own subscription)
CREATE POLICY "Anyone can create subscription" ON push_subscriptions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Users can only delete their own subscription (by endpoint)
CREATE POLICY "Anyone can delete own subscription" ON push_subscriptions
  FOR DELETE TO anon, authenticated
  USING (true);

-- Only admins can view all subscriptions
CREATE POLICY "Admins can view subscriptions" ON push_subscriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- Notification History Table
-- Tracks all notifications sent by admins
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT DEFAULT '/',
  icon TEXT,
  recipient_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Only admins can insert
CREATE POLICY "Admins can create notification history" ON notification_history
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- Only admins can view
CREATE POLICY "Admins can view notification history" ON notification_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- Pending Notifications Table
-- Stores notifications for users to fetch when they visit
CREATE TABLE IF NOT EXISTS pending_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT DEFAULT '/',
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Enable RLS
ALTER TABLE pending_notifications ENABLE ROW LEVEL SECURITY;

-- Anyone can read pending notifications
CREATE POLICY "Anyone can view pending notifications" ON pending_notifications
  FOR SELECT TO anon, authenticated
  USING (expires_at > NOW());

-- Only admins can create
CREATE POLICY "Admins can create pending notifications" ON pending_notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_notifications_expires ON pending_notifications(expires_at);

-- Auto-cleanup expired pending notifications (run daily via cron)
-- You can set this up in Supabase Dashboard > Database > Scheduled Jobs
-- DELETE FROM pending_notifications WHERE expires_at < NOW();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscriptions_updated_at();
