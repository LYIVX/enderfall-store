-- Create Minecraft Verifications table
CREATE TABLE IF NOT EXISTS public.minecraft_verifications (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_minecraft_verifications_user_id ON public.minecraft_verifications(user_id);

-- Create Minecraft Profiles table
CREATE TABLE IF NOT EXISTS public.minecraft_profiles (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_minecraft_profiles_user_id ON public.minecraft_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_minecraft_profiles_username ON public.minecraft_profiles(username);

-- Create User Ranks table (if not already created)
CREATE TABLE IF NOT EXISTS public.user_ranks (
  id SERIAL PRIMARY KEY,
  minecraft_username TEXT NOT NULL,
  rank_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user ranks table
CREATE INDEX IF NOT EXISTS idx_user_ranks_minecraft_username ON public.user_ranks(minecraft_username);
CREATE INDEX IF NOT EXISTS idx_user_ranks_rank_id ON public.user_ranks(rank_id);

-- Create Pending Purchases table (if not already created)
CREATE TABLE IF NOT EXISTS public.pending_purchases (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  rank_id TEXT NOT NULL,
  minecraft_username TEXT NOT NULL,
  timestamp BIGINT,
  session_id TEXT NOT NULL,
  is_gift BOOLEAN DEFAULT FALSE,
  recipient TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for pending purchases table
CREATE INDEX IF NOT EXISTS idx_pending_purchases_user_id ON public.pending_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_purchases_minecraft_username ON public.pending_purchases(minecraft_username);
CREATE INDEX IF NOT EXISTS idx_pending_purchases_session_id ON public.pending_purchases(session_id);

-- Create Pending Ranks Backup table (if not already created)
CREATE TABLE IF NOT EXISTS public.pending_ranks_backup (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  rank_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for pending ranks backup table
CREATE INDEX IF NOT EXISTS idx_pending_ranks_backup_username ON public.pending_ranks_backup(username);

-- Create Applied Ranks table (for tracking which ranks have been applied to players)
CREATE TABLE IF NOT EXISTS public.applied_ranks (
  id SERIAL PRIMARY KEY,
  minecraft_username TEXT NOT NULL,
  rank_id TEXT NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for applied ranks table
CREATE INDEX IF NOT EXISTS idx_applied_ranks_minecraft_username ON public.applied_ranks(minecraft_username);
CREATE INDEX IF NOT EXISTS idx_applied_ranks_rank_id ON public.applied_ranks(rank_id);

-- Add RLS policies for security
ALTER TABLE public.minecraft_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minecraft_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_ranks_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applied_ranks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to view their own verifications
CREATE POLICY verifications_select_policy ON public.minecraft_verifications 
  FOR SELECT USING (auth.uid()::text = user_id);

-- Create policy to allow authenticated users to update their own verifications
CREATE POLICY verifications_update_policy ON public.minecraft_verifications 
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Create policy to allow authenticated users to view their own profiles
CREATE POLICY profiles_select_policy ON public.minecraft_profiles 
  FOR SELECT USING (auth.uid()::text = user_id);

-- Create policy to allow authenticated users to update their own profiles
CREATE POLICY profiles_update_policy ON public.minecraft_profiles 
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Create policy to allow users to view their own pending purchases
CREATE POLICY pending_purchases_select_policy ON public.pending_purchases
  FOR SELECT USING (auth.uid()::text = user_id);

-- Allow service role access for server-side operations
CREATE POLICY service_role_access_verifications ON public.minecraft_verifications 
  USING (auth.role() = 'service_role');

CREATE POLICY service_role_access_profiles ON public.minecraft_profiles 
  USING (auth.role() = 'service_role');

CREATE POLICY service_role_access_user_ranks ON public.user_ranks
  USING (auth.role() = 'service_role');

CREATE POLICY service_role_access_pending_purchases ON public.pending_purchases
  USING (auth.role() = 'service_role');

CREATE POLICY service_role_access_pending_ranks ON public.pending_ranks_backup
  USING (auth.role() = 'service_role');

CREATE POLICY service_role_access_applied_ranks ON public.applied_ranks
  USING (auth.role() = 'service_role'); 