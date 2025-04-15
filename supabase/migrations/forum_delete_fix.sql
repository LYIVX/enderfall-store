-- Check existing RLS policies
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM
  pg_policies
WHERE
  schemaname = 'public' 
  AND tablename IN ('forum_posts', 'forum_comments');

-- Create or update delete policy for forum_posts
CREATE POLICY delete_own_posts ON forum_posts
    FOR DELETE 
    USING (auth.uid() = author_id);

-- Create or update delete policy for forum_comments
CREATE POLICY delete_own_comments ON forum_comments
    FOR DELETE 
    USING (auth.uid() = author_id);

-- Make sure RLS is enabled on both tables
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY; 