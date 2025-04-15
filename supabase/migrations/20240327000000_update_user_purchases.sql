-- Add additional fields to the user_purchases table
ALTER TABLE user_purchases
ADD COLUMN IF NOT EXISTS amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS currency TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Make item_id nullable for cases where we don't have a direct mapping
ALTER TABLE user_purchases
ALTER COLUMN item_id DROP NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_purchases_user_id ON user_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_transaction_id ON user_purchases(transaction_id);

-- Add a ranks column to profiles if it doesn't exist yet
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS ranks TEXT[] DEFAULT '{}'::TEXT[];

-- Add a policy to allow service role to create user purchases
CREATE POLICY "Service role can create user purchases" ON user_purchases
FOR INSERT TO service_role WITH CHECK (true); 