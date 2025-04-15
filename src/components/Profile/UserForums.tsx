"use client";

import { useState, useEffect } from 'react';
import { ForumPost as ForumPostType, supabase } from '@/lib/supabase';
import ForumPost from '@/components/Forums/ForumPost';
import styles from './UserForums.module.css';

interface UserForumsProps {
  userId: string;
}

export default function UserForums({ userId }: UserForumsProps) {
  const [posts, setPosts] = useState<ForumPostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserForums();
  }, [userId]);

  const fetchUserForums = async () => {
    if (!userId) {
      setError("User ID is required");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // First fetch the forum posts by this user
      const { data: postsData, error: postsError } = await supabase
        .from('forum_posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      
      // Then fetch the user's profile
      const { data: authorProfile, error: authorError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, minecraft_username, is_admin')
        .eq('id', userId)
        .single();
        
      if (authorError) {
        console.error('Error fetching author profile:', authorError);
      }
      
      // Attach the author to each post
      const postsWithAuthor = postsData?.map(post => ({
        ...post,
        author: authorProfile || null
      })) || [];
      
      setPosts(postsWithAuthor);
    } catch (err: any) {
      console.error('Error fetching user forums:', err);
      setError('Failed to fetch forums');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading forums...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <>
      <div className={styles.userForums}>
        <div className={styles.forumGrid}>
          {posts.length === 0 ? (
          <div className={styles.emptyState}>No forums created yet.</div>
        ) : (
          posts.map(post => (
            <ForumPost key={post.id} post={post} />
          ))
        )}
      </div>
    </div>
    </>
  );
} 