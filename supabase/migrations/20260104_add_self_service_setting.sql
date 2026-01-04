-- Add self_service_profile_edit_enabled column to settings table
-- This allows admins to enable/disable the self-service profile editing feature

ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS self_service_profile_edit_enabled BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN settings.self_service_profile_edit_enabled IS 'Enable/disable self-service profile editing at /edit-profile';
