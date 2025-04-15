-- Create the user_status table
CREATE TABLE IF NOT EXISTS public.user_status (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('online', 'do_not_disturb', 'offline')) DEFAULT 'online',
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- In case the table already exists but columns need updating
DO $$
BEGIN
    -- Only attempt to alter columns if they exist
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_status' AND column_name = 'last_updated'
    ) THEN
        ALTER TABLE public.user_status 
        ALTER COLUMN last_updated TYPE TIMESTAMPTZ;
    END IF;
    
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_status' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.user_status 
        ALTER COLUMN created_at TYPE TIMESTAMPTZ;
    END IF;
END $$;

-- Add RLS policies
ALTER TABLE IF EXISTS public.user_status ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view any user's status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_status' AND policyname = 'Anyone can view user statuses'
  ) THEN
    CREATE POLICY "Anyone can view user statuses" 
    ON public.user_status FOR SELECT 
    USING (true);
  END IF;
END $$;

-- Policy to allow users to update only their own status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_status' AND policyname = 'Users can update their own status'
  ) THEN
    CREATE POLICY "Users can update their own status" 
    ON public.user_status FOR UPDATE 
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Policy to allow users to insert their own status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_status' AND policyname = 'Users can insert their own status'
  ) THEN
    CREATE POLICY "Users can insert their own status" 
    ON public.user_status FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS user_status_user_id_idx ON public.user_status(user_id);

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

-- Add the table to realtime publication for subscriptions
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