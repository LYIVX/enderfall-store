-- Create social posts table
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_markdown BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create social post comments table
CREATE TABLE IF NOT EXISTS social_post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create social post likes table
CREATE TABLE IF NOT EXISTS social_post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

-- Create comment likes table
CREATE TABLE IF NOT EXISTS social_comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID REFERENCES social_post_comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (comment_id, user_id)
);

-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversation participants table (for group conversations)
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (conversation_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to get a conversation between users or create one if it doesn't exist
CREATE OR REPLACE FUNCTION create_or_get_conversation(user_ids UUID[])
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  conv_id UUID;
  user_count INTEGER;
BEGIN
  -- Check if conversation already exists between users
  SELECT c.id INTO conv_id
  FROM conversations c
  WHERE (
    SELECT COUNT(DISTINCT cp.user_id)
    FROM conversation_participants cp
    WHERE cp.conversation_id = c.id AND cp.user_id = ANY(user_ids)
  ) = array_length(user_ids, 1)
  AND (
    SELECT COUNT(DISTINCT cp.user_id)
    FROM conversation_participants cp
    WHERE cp.conversation_id = c.id
  ) = array_length(user_ids, 1)
  LIMIT 1;
  
  -- If conversation exists, return its ID
  IF conv_id IS NOT NULL THEN
    RETURN conv_id;
  END IF;
  
  -- Create a new conversation
  INSERT INTO conversations DEFAULT VALUES
  RETURNING id INTO conv_id;
  
  -- Add participants to the conversation
  FOR i IN 1..array_length(user_ids, 1) LOOP
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (conv_id, user_ids[i]);
  END LOOP;
  
  RETURN conv_id;
END;
$$;

-- Create function to get all conversations for a user
CREATE OR REPLACE FUNCTION get_user_conversations(user_id UUID)
RETURNS TABLE (
  conversation_id UUID,
  conversation_created_at TIMESTAMP WITH TIME ZONE,
  other_user_id UUID,
  other_username TEXT,
  other_avatar_url TEXT,
  last_message TEXT,
  last_message_created_at TIMESTAMP WITH TIME ZONE,
  unread_count BIGINT
)
LANGUAGE sql
AS $$
  WITH user_convs AS (
    SELECT 
      cp.conversation_id,
      c.created_at AS conversation_created_at
    FROM 
      conversation_participants cp
      JOIN conversations c ON cp.conversation_id = c.id
    WHERE 
      cp.user_id = user_id
  ),
  other_users AS (
    SELECT 
      cp.conversation_id,
      cp.user_id AS other_user_id,
      p.username AS other_username,
      p.avatar_url AS other_avatar_url
    FROM 
      conversation_participants cp
      JOIN profiles p ON cp.user_id = p.id
    WHERE 
      cp.conversation_id IN (SELECT conversation_id FROM user_convs)
      AND cp.user_id <> user_id
  ),
  last_messages AS (
    SELECT 
      m.conversation_id,
      m.content AS last_message,
      m.created_at AS last_message_created_at,
      ROW_NUMBER() OVER (PARTITION BY m.conversation_id ORDER BY m.created_at DESC) AS rn
    FROM 
      messages m
    WHERE 
      m.conversation_id IN (SELECT conversation_id FROM user_convs)
  ),
  unread_counts AS (
    SELECT 
      m.conversation_id,
      COUNT(*) AS unread_count
    FROM 
      messages m
    WHERE 
      m.conversation_id IN (SELECT conversation_id FROM user_convs)
      AND m.user_id <> user_id
      AND m.is_read = FALSE
    GROUP BY 
      m.conversation_id
  )
  SELECT 
    u.conversation_id,
    u.conversation_created_at,
    o.other_user_id,
    o.other_username,
    o.other_avatar_url,
    COALESCE(lm.last_message, '') AS last_message,
    lm.last_message_created_at,
    COALESCE(uc.unread_count, 0) AS unread_count
  FROM 
    user_convs u
    JOIN other_users o ON u.conversation_id = o.conversation_id
    LEFT JOIN last_messages lm ON u.conversation_id = lm.conversation_id AND lm.rn = 1
    LEFT JOIN unread_counts uc ON u.conversation_id = uc.conversation_id
  ORDER BY 
    COALESCE(lm.last_message_created_at, u.conversation_created_at) DESC;
$$;

-- Create function to get the most recent messages in a conversation
CREATE OR REPLACE FUNCTION get_conversation_messages(conv_id UUID, limit_count INTEGER DEFAULT 50, offset_count INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  content TEXT,
  is_read BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
AS $$
  SELECT 
    m.id,
    m.conversation_id,
    m.user_id,
    p.username,
    p.avatar_url,
    m.content,
    m.is_read,
    m.created_at
  FROM 
    messages m
    JOIN profiles p ON m.user_id = p.id
  WHERE 
    m.conversation_id = conv_id
  ORDER BY 
    m.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
$$;

-- Create function to mark messages as read
CREATE OR REPLACE FUNCTION mark_conversation_messages_as_read(conv_id UUID, reader_id UUID)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE 
    messages
  SET 
    is_read = TRUE
  WHERE 
    conversation_id = conv_id
    AND user_id <> reader_id
    AND is_read = FALSE;
$$; 