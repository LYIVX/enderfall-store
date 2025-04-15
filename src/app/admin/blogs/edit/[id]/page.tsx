"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import EditBlogPost from '@/components/Social/EditBlogPost';
import styles from '../../../admin.module.css';

interface BlogPost {
  id: string;
  title: string;
  summary: string;
  content: string;
  thumbnail_url: string | null;
  is_published: boolean;
  is_pinned: boolean;
  is_markdown?: boolean;
}

export default function EditBlogPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(true);

  useEffect(() => {
    const fetchBlogPost = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', params.id)
          .single();

        if (error) {
          throw error;
        }

        setBlogPost(data);
      } catch (err: any) {
        console.error('Error fetching blog post:', err);
        setError(err.message || 'Failed to fetch blog post');
      } finally {
        setLoading(false);
      }
    };

    fetchBlogPost();
  }, [params.id]);

  const handleClose = () => {
    setIsFormOpen(false);
    router.push('/admin/blogs');
  };

  if (loading) {
    return (
      <div className={styles.contentSection}>
        <div className={styles.loading}>Loading blog post...</div>
      </div>
    );
  }

  if (error || !blogPost) {
    return (
      <div className={styles.contentSection}>
        <div className={styles.error}>
          {error || 'Blog post not found'}
          <button 
            onClick={() => router.push('/admin/blogs')}
            className={styles.button}
          >
            Back to Blogs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.contentSection}>
      <div className={styles.contentHeader}>
        <h2 className={styles.contentTitle}>Edit Blog Post</h2>
      </div>
      
      <div className={styles.contentContainer}>
        <EditBlogPost 
          post={blogPost}
          isOpen={isFormOpen}
          onClose={handleClose}
        />
      </div>
    </div>
  );
} 