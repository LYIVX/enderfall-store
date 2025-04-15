-- Add is_markdown column to blog_posts table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='blog_posts' AND column_name='is_markdown') THEN
        ALTER TABLE blog_posts ADD COLUMN is_markdown BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Comment about this migration
COMMENT ON COLUMN blog_posts.is_markdown IS 'Flag indicating if the blog content should be rendered as markdown';

-- Update existing posts to use markdown if needed (optional)
-- Uncomment if you want to set all existing posts to use markdown
-- UPDATE blog_posts SET is_markdown = true WHERE is_published = true; 