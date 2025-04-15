-- First handle the publication - remove our table if it exists
DO $$
DECLARE
  table_in_publication BOOLEAN;
BEGIN
  -- Check if our table is in the publication
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_status'
  ) INTO table_in_publication;

  IF table_in_publication THEN
    -- Remove our table from the publication if it exists
    ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.user_status;
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view user statuses" ON public.user_status;
DROP POLICY IF EXISTS "Users can update their own status" ON public.user_status;
DROP POLICY IF EXISTS "Users can insert their own status" ON public.user_status;

-- Drop existing function
DROP FUNCTION IF EXISTS public.set_inactive_users_offline();

-- Drop existing index
DROP INDEX IF EXISTS user_status_user_id_idx;

-- Drop existing table
DROP TABLE IF EXISTS public.user_status;

-- Create the user_status table from scratch
CREATE TABLE public.user_status (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('online', 'do_not_disturb', 'offline')) DEFAULT 'online',
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add RLS policies
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view user statuses" 
ON public.user_status FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own status" 
ON public.user_status FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own status" 
ON public.user_status FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX user_status_user_id_idx ON public.user_status(user_id);

-- Function to handle heartbeats and auto-offline after inactivity
CREATE OR REPLACE FUNCTION public.set_inactive_users_offline()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set users who haven't updated their status in 5 minutes to offline
  -- Only if they're not already offline
  UPDATE public.user_status
  SET status = 'offline',
      last_updated = NOW()
  WHERE 
    status <> 'offline' AND
    last_updated < NOW() - INTERVAL '5 minutes';
    
  RETURN;
END;
$$;

-- Add our table to the publication
DO $$
DECLARE
  publication_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) INTO publication_exists;

  IF publication_exists THEN
    -- Add the table to the existing publication
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_status;
  ELSE
    -- Create a new publication if it doesn't exist
    CREATE PUBLICATION supabase_realtime FOR TABLE public.user_status;
  END IF;
END $$; 