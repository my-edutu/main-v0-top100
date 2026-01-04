-- Create feature_requests table for news feature requests
CREATE TABLE IF NOT EXISTS feature_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    awardee_id UUID REFERENCES awardees(id) ON DELETE SET NULL,
    awardee_name TEXT NOT NULL,
    has_own_article BOOLEAN DEFAULT false,
    article_content TEXT,
    needs_article_written BOOLEAN DEFAULT false,
    contact_email TEXT NOT NULL,
    whatsapp_number TEXT NOT NULL,
    amount DECIMAL(10, 2) DEFAULT 40000,
    currency TEXT DEFAULT 'NGN',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'paid', 'in_progress', 'published', 'cancelled')),
    payment_status TEXT CHECK (payment_status IN ('pending', 'confirmed', 'refunded')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_feature_requests_awardee_id ON feature_requests(awardee_id);
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_created_at ON feature_requests(created_at DESC);

-- Add RLS policies
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to feature_requests" ON feature_requests
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow authenticated admins to read
CREATE POLICY "Admins can view feature_requests" ON feature_requests
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow public insert (for awardees to submit requests)
CREATE POLICY "Anyone can submit feature_requests" ON feature_requests
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE feature_requests IS 'Stores news feature requests from awardees who want to be featured in local and international news channels';
