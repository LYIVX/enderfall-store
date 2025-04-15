"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import styles from '../admin.module.css';
import Toggle from '@/components/UI/Toggle';
import { useAuth } from '@/components/Auth/AuthContext';
import Dropdown from '@/components/UI/Dropdown';
import Button from '@/components/UI/Button';
import { Loading } from '@/components/UI';
import { useLoading } from '@/hooks';
import { useRouter } from 'next/navigation';
import { 
  FaEye, FaEdit, FaTrash
} from 'react-icons/fa';

// Convert a string to a URL-friendly slug
const titleToSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with dashes
    .replace(/-+/g, '-')      // Consolidate multiple dashes
    .trim();                  // Trim whitespace
};

interface ForumPost {
  id: string;
  title: string;
  category: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  profiles: {
    username: string;
    is_admin?: boolean;
  } | null;
  _count: {
    forum_comments: number;
  } | null;
}

export default function AdminForums() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'pinned', 'admin'
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
      fetchForumPosts();
    }
  }, [filter, pagination.page, user]);

  async function fetchForumPosts() {
    if (!loading) setChangingPage(true);
    else setLoading(true);
    
    try {
      // First get the total count for pagination
      let countQuery = supabase
        .from('forum_posts')
        .select('id', { count: 'exact', head: false });
      
      // Apply filters to count query
      if (filter === 'pinned') {
        countQuery = countQuery.eq('is_pinned', true);
      }
      
      const { count, error: countError } = await countQuery;
      
      if (countError) {
        console.error('Error counting forum posts:', countError);
      } else {
        const totalPages = Math.ceil((count || 0) / pagination.limit);
        setPagination(prev => ({ 
          ...prev, 
          total: count || 0,
          pages: totalPages
        }));
      }
    
      let query = supabase
        .from('forum_posts')
        .select(`
          id,
          title,
          category,
          created_at,
          updated_at,
          is_pinned,
          user_id
        `)
        .order('created_at', { ascending: false })
        .range(
          (pagination.page - 1) * pagination.limit, 
          pagination.page * pagination.limit - 1
        );

      // Apply filters
      if (filter === 'pinned') {
        query = query.eq('is_pinned', true);
      }

      const { data: postsData, error: postsError } = await query;

      if (postsError) throw postsError;

      // Get comment counts for each post
      const postIds = postsData?.map(post => post.id) || [];
      const { data: commentsData, error: commentsError } = await supabase
        .from('forum_comments')
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

      // Create a map of suer_id to profile
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

      // Combine the data into forum posts
      const forumPosts = postsData?.map(post => {
        const profile = profilesMap.get(post.user_id);
        const commentCount = commentCountMap.get(post.id) || 0;

        return {
          id: post.id,
          title: post.title,
          category: post.category,
          created_at: post.created_at,
          updated_at: post.updated_at,
          is_pinned: post.is_pinned,
          profiles: profile ? {
            username: profile.username || 'Unknown',
            is_admin: profile.is_admin || false
          } : null,
          _count: {
            forum_comments: commentCount
          }
        };
      }) || [];

      setPosts(forumPosts);
    } catch (error) {
      console.error('Error fetching forum posts:', error);
    } finally {
      setLoading(false);
      setChangingPage(false);
    }
  }

  async function togglePinned(postId: string, currentValue: boolean) {
    startLoading(`pin-${postId}`);
    try {
      const { error } = await supabase
        .from('forum_posts')
        .update({ is_pinned: !currentValue })
        .eq('id', postId);

      if (error) throw error;

      // Update local state to reflect the change
      setPosts(posts.map(post => 
        post.id === postId ? { ...post, is_pinned: !currentValue } : post
      ));
    } catch (error) {
      console.error('Error toggling pinned status:', error);
    } finally {
      stopLoading(`pin-${postId}`);
    }
  }

  async function deletePost(postId: string) {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    startLoading(`delete-${postId}`);
    try {
      const { error } = await supabase
        .from('forum_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      // Remove post from state
      setPosts(posts.filter(post => post.id !== postId));
      // Refetch to update counts
      fetchForumPosts();
    } catch (error) {
      console.error('Error deleting forum post:', error);
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

  if (loading && posts.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <Loading type="fullscreen" text="Loading forum posts..." />
      </div>
    );
  }

  return (
    <div className={styles.contentWrapper}>
      <div className={styles.contentHeader}>
        <h2 className={styles.contentTitle}>Forums Management</h2>
        <div className={styles.headerActions}>
          <div className={styles.filterWrapper}>
            <Dropdown
              label="Filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Posts' },
                { value: 'pinned', label: 'Pinned Posts' }
              ]}
              layout="horizontal"
            />
          </div>
          <Button 
            variant="primary"
            onClick={() => router.push('/admin/forums/create')}
          >
            Create New Post
          </Button>
        </div>
      </div>

      {changingPage && (
        <Loading type="overlay" text="Loading..." withOverlay={true} />
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.colTitle}>Title</th>
            <th className={styles.colCategory}>Category</th>
            <th className={styles.colAuthor}>Author</th>
            <th className={styles.colCreated}>Created</th>
            <th className={styles.colUpdated}>Updated</th>
            <th className={styles.colComments}>Comments</th>
            <th className={styles.colPinned}>Pinned</th>
            <th className={styles.colForumActions}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id}>
              <td className={styles.colTitle}>
                {post.title}
              </td>
              <td className={styles.colCategory}>{post.category}</td>
              <td className={styles.colAuthor}>
                {post.profiles?.username || 'Unknown'}
                {post.profiles?.is_admin && <span className={styles.adminBadge}>Admin</span>}
              </td>
              <td className={styles.colCreated}>{new Date(post.created_at).toLocaleDateString()}</td>
              <td className={styles.colUpdated}>{new Date(post.updated_at).toLocaleDateString()}</td>
              <td className={styles.colComments}>{post._count?.forum_comments || 0}</td>
              <td className={styles.colPinned}>
                <div className={styles.toggleWrapper}>
                  {isLoading(`pin-${post.id}`) ? (
                    <Loading type="inline" size="small" />
                  ) : (
                    <Toggle 
                      isEnabled={post.is_pinned} 
                      onChange={() => togglePinned(post.id, post.is_pinned)}
                    />
                  )}
                </div>
              </td>
              <td className={styles.colForumActions}>
                <div className={styles.postActions}>
                  <Button 
                    variant="view"
                    size="small"
                    className={`${styles.actionButton} ${styles.viewButton}`}
                    onClick={() => router.push(`/social?tab=forums&forum=${post.id}`)}
                    disabled={isLoading(`view-${post.id}`)}
                  >
                  </Button>
                  <Button 
                    variant="edit"
                    size="small"
                    className={`${styles.actionButton} ${styles.editButton}`}
                    onClick={() => router.push(`/admin/forums/edit/${post.id}`)}
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
          {posts.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center' }}>No forum posts found</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination controls */}
      {pagination.pages > 1 && (
        <div className={styles.paginationControls}>
          <Button
            variant="secondary"
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page <= 1 || changingPage}
          >
            Previous
          </Button>
          <span className={styles.paginationInfo}>
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            variant="secondary"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages || changingPage}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
} 