-- Drop existing policies on user_purchases
DROP POLICY IF EXISTS "Users can view their own purchases" ON user_purchases;
DROP POLICY IF EXISTS "Users can create their own purchases" ON user_purchases;
DROP POLICY IF EXISTS "Service role can create user purchases" ON user_purchases;

-- Create more permissive policies
-- Allow any authenticated user to view their own purchases
CREATE POLICY "Users can view their own purchases" ON user_purchases
FOR SELECT USING (auth.uid() = user_id);

-- Allow any authenticated user to create purchases
CREATE POLICY "Users can create purchases" ON user_purchases
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow anon and service role to create purchases for anyone
CREATE POLICY "Service role or anon can create purchases" ON user_purchases
FOR INSERT TO anon, service_role WITH CHECK (true);

-- Allow service role to read all purchases
CREATE POLICY "Service role can read all purchases" ON user_purchases
FOR SELECT TO service_role USING (true);

-- Make sure RLS is enabled
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;

-- Make sure the schema can be queried
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role; 