-- Add email column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Add has_completed_onboarding column with default value of false
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false;

-- Add has_password column with default value of false
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_password BOOLEAN DEFAULT false;

-- Update existing profiles to have completed onboarding (if you want existing users to skip it)
UPDATE profiles SET has_completed_onboarding = true WHERE has_completed_onboarding IS NULL;

-- Add NOT NULL constraint to email if you want to enforce it going forward
-- ALTER TABLE profiles ALTER COLUMN email SET NOT NULL; 