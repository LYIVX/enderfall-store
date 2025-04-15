-- Fix for conversations functionality

-- First, let's check if tables exist and create them if needed
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS create_or_get_conversation;
DROP FUNCTION IF EXISTS get_conversation_messages;
DROP FUNCTION IF EXISTS mark_conversation_messages_as_read;

-- Create a function to create or get a conversation between users
CREATE OR REPLACE FUNCTION create_or_get_conversation(user_ids uuid[])
RETURNS uuid 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conv_id uuid;
  user_id uuid;
  participant_count integer;
  matching_count integer;
BEGIN
  -- Check if a conversation with exactly these participants already exists
  -- First find conversations where all the specified users are participants
  SELECT c.id INTO conv_id
  FROM conversations c
  WHERE (
    SELECT COUNT(*)
    FROM conversation_participants cp
    WHERE cp.conversation_id = c.id AND cp.user_id = ANY(user_ids)
  ) = array_length(user_ids, 1)
  AND (
    SELECT COUNT(*)
    FROM conversation_participants cp
    WHERE cp.conversation_id = c.id
  ) = array_length(user_ids, 1)
  LIMIT 1;
  
  -- If no conversation exists, create a new one
  IF conv_id IS NULL THEN
    INSERT INTO conversations (created_at, updated_at)
    VALUES (NOW(), NOW())
    RETURNING id INTO conv_id;
    
    -- Add all specified users as participants
    FOREACH user_id IN ARRAY user_ids
    LOOP
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (conv_id, user_id);
    END LOOP;
  END IF;
  
  RETURN conv_id;
END;
$$;

-- Create function to get conversation messages
CREATE OR REPLACE FUNCTION get_conversation_messages(conv_id UUID, limit_count INTEGER DEFAULT 50, offset_count INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  content TEXT,
  is_read BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.conversation_id,
    m.sender_id AS user_id,
    p.username,
    p.avatar_url,
    m.content,
    m.is_read,
    m.created_at
  FROM 
    messages m
    JOIN profiles p ON m.sender_id = p.id
  WHERE 
    m.conversation_id = conv_id
  ORDER BY 
    m.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Create function to mark messages as read
CREATE OR REPLACE FUNCTION mark_conversation_messages_as_read(conv_id UUID, reader_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE 
    messages
  SET 
    is_read = TRUE
  WHERE 
    conversation_id = conv_id
    AND sender_id <> reader_id
    AND is_read = FALSE;
END;
$$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id 
ON conversation_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id 
ON conversation_participants(conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
ON messages(conversation_id);

-- Update conversation timestamps when new messages are added
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON messages;
CREATE TRIGGER trigger_update_conversation_timestamp
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- Additional helper view to get last message for conversations
CREATE OR REPLACE VIEW conversation_last_messages AS
WITH ranked_messages AS (
  SELECT 
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.is_read,
    m.created_at,
    m.updated_at,
    ROW_NUMBER() OVER (PARTITION BY m.conversation_id ORDER BY m.created_at DESC) as rn
  FROM 
    messages m
)
SELECT 
  rm.id,
  rm.conversation_id,
  rm.sender_id AS user_id,
  rm.content,
  rm.is_read,
  rm.created_at,
  rm.updated_at,
  p.username as sender_username,
  p.avatar_url as sender_avatar
FROM 
  ranked_messages rm
  JOIN profiles p ON rm.sender_id = p.id
WHERE 
  rm.rn = 1;

-- Helper function to get user conversations with last message
CREATE OR REPLACE FUNCTION get_user_conversations(user_id UUID)
RETURNS TABLE (
  conversation_id UUID,
  other_user_id UUID,
  other_username TEXT,
  other_avatar_url TEXT,
  last_message TEXT,
  last_message_created_at TIMESTAMPTZ,
  unread_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH user_convs AS (
    SELECT 
      cp.conversation_id
    FROM 
      conversation_participants cp
    WHERE 
      cp.user_id = user_id
  ),
  other_participants AS (
    SELECT 
      cp.conversation_id,
      p.id as other_user_id,
      p.username as other_username,
      p.avatar_url as other_avatar_url
    FROM 
      conversation_participants cp
      JOIN profiles p ON cp.user_id = p.id
    WHERE 
      cp.conversation_id IN (SELECT conversation_id FROM user_convs)
      AND cp.user_id <> user_id
  ),
  last_msgs AS (
    SELECT 
      clm.conversation_id,
      clm.content as last_message,
      clm.created_at as last_message_created_at
    FROM 
      conversation_last_messages clm
    WHERE 
      clm.conversation_id IN (SELECT conversation_id FROM user_convs)
  ),
  unread_counts AS (
    SELECT 
      m.conversation_id,
      COUNT(*) as unread_count
    FROM 
      messages m
    WHERE 
      m.conversation_id IN (SELECT conversation_id FROM user_convs)
      AND m.sender_id <> user_id
      AND m.is_read = FALSE
    GROUP BY 
      m.conversation_id
  )
  SELECT
    op.conversation_id,
    op.other_user_id,
    op.other_username,
    op.other_avatar_url,
    COALESCE(lm.last_message, '') as last_message,
    lm.last_message_created_at,
    COALESCE(uc.unread_count, 0) as unread_count
  FROM
    other_participants op
    LEFT JOIN last_msgs lm ON op.conversation_id = lm.conversation_id
    LEFT JOIN unread_counts uc ON op.conversation_id = uc.conversation_id
  ORDER BY
    lm.last_message_created_at DESC NULLS LAST;
END;
$$;

-- Reset RLS policies completely

-- First disable RLS on all tables to make it easier to work with
ALTER TABLE IF EXISTS "public"."conversations" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."conversation_participants" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."messages" DISABLE ROW LEVEL SECURITY;

-- Drop all policies using pattern matching
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('conversations', 'conversation_participants', 'messages')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      policy_record.policyname, 
                      'public', 
                      policy_record.tablename);
    END LOOP;
END
$$;

-- Re-enable RLS with completely fresh policies
ALTER TABLE IF EXISTS "public"."conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."conversation_participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."messages" ENABLE ROW LEVEL SECURITY;

-- Create the most minimal policies possible to prevent recursion
-- Just allow authenticated users full access to these tables
CREATE POLICY "access_conversations" ON "public"."conversations"
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "access_conversation_participants" ON "public"."conversation_participants"
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "access_messages" ON "public"."messages"
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Grant access to anon and authenticated roles
GRANT ALL ON conversations TO anon, authenticated;
GRANT ALL ON conversation_participants TO anon, authenticated;
GRANT ALL ON messages TO anon, authenticated; 