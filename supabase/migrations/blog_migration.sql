-- Add is_admin column to profiles table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='is_admin') THEN
        ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add is_pinned column to forum_posts table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='forum_posts' AND column_name='is_pinned') THEN
        ALTER TABLE forum_posts ADD COLUMN is_pinned BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create blog_posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT NOT NULL,
  thumbnail_url TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_published BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on blog_posts if not already enabled
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Create blog posts policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'Blog posts are viewable by everyone') THEN
        CREATE POLICY "Blog posts are viewable by everyone" ON blog_posts
        FOR SELECT USING (is_published = true OR auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'Admins can manage all blog posts') THEN
        CREATE POLICY "Admins can manage all blog posts" ON blog_posts
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
          )
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'Users can create blog posts if admin') THEN
        CREATE POLICY "Users can create blog posts if admin" ON blog_posts
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
          )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'Users can update their own blog posts') THEN
        CREATE POLICY "Users can update their own blog posts" ON blog_posts
        FOR UPDATE USING (
          auth.uid() = user_id OR
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
          )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'Users can delete their own blog posts') THEN
        CREATE POLICY "Users can delete their own blog posts" ON blog_posts
        FOR DELETE USING (
          auth.uid() = user_id OR
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
          )
        );
    END IF;
END $$;

-- Create trigger to update the updated_at column for blog_posts
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_blog_posts_updated_at') THEN
        CREATE TRIGGER update_blog_posts_updated_at
        BEFORE UPDATE ON blog_posts
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$; 