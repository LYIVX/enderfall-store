"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import styles from '../admin.module.css';
import { useAuth } from '@/components/Auth/AuthContext';
import Dropdown from '@/components/UI/Dropdown';
import Button from '@/components/UI/Button';
import { Loading } from '@/components/UI';
import { useLoading } from '@/hooks';
import { useRouter } from 'next/navigation';
import { 
  FaEye, FaEdit, FaTrash
} from 'react-icons/fa';

interface SocialPost {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  is_markdown: boolean;
  likes: number;
  created_at: string;
  updated_at: string;
  author?: {
    username: string;
    is_admin?: boolean;
  } | null;
  _count?: {
    social_post_comments: number;
  } | null;
}

export default function AdminSocialPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'with-image', 'popular'
  const { isLoading, startLoading, stopLoading } = useLoading();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });
  const [changingPage, setChangingPage] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchSocialPosts();
    }
  }, [filter, pagination.page, user]);

  async function fetchSocialPosts() {
    if (!loading) setChangingPage(true);
    else setLoading(true);
    
    try {
      // First get the total count for pagination
      let countQuery = supabase
        .from('social_posts')
        .select('id', { count: 'exact', head: false });
      
      // Apply filters to count query
      if (filter === 'with-image') {
        countQuery = countQuery.not('image_url', 'is', null);
      } else if (filter === 'popular') {
        countQuery = countQuery.gte('likes', 5);
      }
      
      const { count, error: countError } = await countQuery;
      
      if (countError) {
        console.error('Error counting social posts:', countError);
      } else {
        const totalPages = Math.ceil((count || 0) / pagination.limit);
        setPagination(prev => ({ 
          ...prev, 
          total: count || 0,
          pages: totalPages
        }));
      }
    
      let query = supabase
        .from('social_posts')
        .select(`
          id,
          user_id,
          content,
          image_url,
          is_markdown,
          likes,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })
        .range(
          (pagination.page - 1) * pagination.limit, 
          pagination.page * pagination.limit - 1
        );

      // Apply filters
      if (filter === 'with-image') {
        query = query.not('image_url', 'is', null);
      } else if (filter === 'popular') {
        query = query.gte('likes', 5);
      }

      const { data: postsData, error: postsError } = await query;

      if (postsError) throw postsError;

      // Get comment counts for each post
      const postIds = postsData?.map(post => post.id) || [];
      const { data: commentsData, error: commentsError } = await supabase
        .from('social_post_comments')
        .select('post_id, id')
        .in('post_id', postIds);

      if (commentsError) throw commentsError;

      // Get user information
      const authorIds = postsData?.map(post => post.user_id).filter(Boolean) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, is_admin')
        .in('id', authorIds);

      if (profilesError) throw profilesError;

      // Create a map of author_id to profile
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Create a map of post_id to comment count
      const commentCountMap = new Map();
      commentsData?.forEach(comment => {
        const count = commentCountMap.get(comment.post_id) || 0;
        commentCountMap.set(comment.post_id, count + 1);
      });

      // Combine the data into social posts
      const socialPosts = postsData?.map(post => {
        const profile = profilesMap.get(post.user_id);
        const commentCount = commentCountMap.get(post.id) || 0;

        return {
          id: post.id,
          user_id: post.user_id,
          content: post.content,
          image_url: post.image_url,
          is_markdown: post.is_markdown,
          likes: post.likes,
          created_at: post.created_at,
          updated_at: post.updated_at,
          author: profile ? {
            username: profile.username || 'Unknown',
            is_admin: profile.is_admin || false
          } : null,
          _count: {
            social_post_comments: commentCount
          }
        };
      }) || [];

      setPosts(socialPosts);
    } catch (error) {
      console.error('Error fetching social posts:', error);
    } finally {
      setLoading(false);
      setChangingPage(false);
    }
  }

  async function deletePost(postId: string) {
    if (!confirm('Are you sure you want to delete this social post? This action cannot be undone.')) {
      return;
    }

    startLoading(`delete-${postId}`);
    try {
      const { error } = await supabase
        .from('social_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      // Remove post from state
      setPosts(posts.filter(post => post.id !== postId));
      // Refetch to update counts
      fetchSocialPosts();
    } catch (error) {
      console.error('Error deleting social post:', error);
    } finally {
      stopLoading(`delete-${postId}`);
    }
  }

  // Function to navigate to next/previous pages
  function goToPage(page: number) {
    if (page >= 1 && page <= pagination.pages) {
      setPagination(prev => ({ ...prev, page }));
    }
  }

  // Function to truncate content
  function truncateContent(content: string, maxLength = 50) {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }

  if (loading && posts.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <Loading type="fullscreen" text="Loading social posts..." />
      </div>
    );
  }

  return (
    <div className={styles.contentWrapper}>
      <div className={styles.contentHeader}>
        <h2 className={styles.contentTitle}>Social Posts Management</h2>
        <div className={styles.headerActions}>
          <div className={styles.filterWrapper}>
            <Dropdown
              label="Filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Posts' },
                { value: 'with-image', label: 'With Images' },
                { value: 'popular', label: 'Popular Posts' }
              ]}
              layout="horizontal"
            />
          </div>
        </div>
      </div>

      {changingPage && (
        <Loading type="overlay" text="Loading..." withOverlay={true} />
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.colContent}>Content</th>
            <th className={styles.colAuthor}>Author</th>
            <th className={styles.colCreated}>Created</th>
            <th className={styles.colUpdated}>Updated</th>
            <th className={styles.colComments}>Comments</th>
            <th className={styles.colLikes}>Likes</th>
            <th className={styles.colImage}>Has Image</th>
            <th className={styles.colActions}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id}>
              <td className={styles.colContent}>
                {truncateContent(post.content)}
              </td>
              <td className={styles.colAuthor}>
                {post.author?.username || 'Unknown'}
                {post.author?.is_admin && <span className={styles.adminBadge}>Admin</span>}
              </td>
              <td className={styles.colCreated}>{new Date(post.created_at).toLocaleDateString()}</td>
              <td className={styles.colUpdated}>{new Date(post.updated_at).toLocaleDateString()}</td>
              <td className={styles.colComments}>{post._count?.social_post_comments || 0}</td>
              <td className={styles.colLikes}>{post.likes}</td>
              <td className={styles.colImage}>
                {post.image_url ? <span className={styles.badgeSuccess}>Yes</span> : <span className={styles.badge}>No</span>}
              </td>
              <td className={styles.colActions}>
                <div className={styles.postActions}>
                  <Button 
                    variant="view"
                    size="small"
                    className={`${styles.actionButton} ${styles.viewButton}`}
                    onClick={() => router.push(`/social?tab=posts&view=${post.id}&scroll=true`)}
                    disabled={isLoading(`view-${post.id}`)}
                  >
                  </Button>
                  <Button 
                    variant="edit"
                    size="small"
                    className={`${styles.actionButton} ${styles.editButton}`}
                    onClick={() => router.push(`/social?tab=posts&edit=${post.id}`)}
                    disabled={isLoading(`edit-${post.id}`)}
                  >
                  </Button>
                  <Button 
                    variant="delete"
                    size="small"
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={() => deletePost(post.id)} 
                    disabled={isLoading(`delete-${post.id}`)}
                  >
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}