"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import EditForumPost from '@/components/Forums/EditForumPost';
import styles from '../../../admin.module.css';

interface ForumPost {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  is_pinned: boolean;
  is_markdown?: boolean;
}

export default function EditForumPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [forumPost, setForumPost] = useState<ForumPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(true);

  useEffect(() => {
    const fetchForumPost = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('forum_posts')
          .select('*')
          .eq('id', params.id)
          .single();

        if (error) {
          throw error;
        }

        setForumPost(data);
      } catch (err: any) {
        console.error('Error fetching forum post:', err);
        setError(err.message || 'Failed to fetch forum post');
      } finally {
        setLoading(false);
      }
    };

    fetchForumPost();
  }, [params.id]);

  const handleClose = () => {
    setIsFormOpen(false);
    router.push('/admin/forums');
  };

  if (loading) {
    return (
      <div className={styles.contentSection}>
        <div className={styles.loading}>Loading forum post...</div>
      </div>
    );
  }

  if (error || !forumPost) {
    return (
      <div className={styles.contentSection}>
        <div className={styles.error}>
          {error || 'Forum post not found'}
          <button 
            onClick={() => router.push('/admin/forums')}
            className={styles.button}
          >
            Back to Forums
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.contentSection}>
      <div className={styles.contentHeader}>
        <h2 className={styles.contentTitle}>Edit Forum Post</h2>
      </div>
      
      <div className={styles.contentContainer}>
        <EditForumPost 
          post={forumPost}
          isOpen={isFormOpen}
          onClose={handleClose}
        />
      </div>
    </div>
  );
} 