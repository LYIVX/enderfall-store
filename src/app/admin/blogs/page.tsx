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
import { useRouter } from 'next/navigation';
import { 
  FaEye, FaEdit, FaTrash
} from 'react-icons/fa';

interface BlogPost {
  id: string;
  title: string;
  summary: string;
  created_at: string;
  updated_at: string;
  is_published: boolean;
  is_pinned: boolean;
  profiles: {
    username: string;
  } | null;
}

export default function AdminBlogs() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'published', 'draft', 'pinned'
  const [actionLoading, setActionLoading] = useState<string | null>(null);
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
      fetchBlogPosts();
    }
  }, [filter, pagination.page, user]);

  async function fetchBlogPosts() {
    if (!loading) setChangingPage(true);
    else setLoading(true);
    
    try {
      // First get the total count for pagination
      let countQuery = supabase
        .from('blog_posts')
        .select('id', { count: 'exact', head: false });
      
      // Apply filters to count query
      if (filter === 'published') {
        countQuery = countQuery.eq('is_published', true);
      } else if (filter === 'draft') {
        countQuery = countQuery.eq('is_published', false);
      } else if (filter === 'pinned') {
        countQuery = countQuery.eq('is_pinned', true);
      }
      
      const { count, error: countError } = await countQuery;
      
      if (countError) {
        console.error('Error counting blog posts:', countError);
      } else {
        const totalPages = Math.ceil((count || 0) / pagination.limit);
        setPagination(prev => ({ 
          ...prev, 
          total: count || 0,
          pages: totalPages
        }));
      }

      // Then get paginated data
      let query = supabase
        .from('blog_posts')
        .select(`
          id,
          title,
          summary,
          created_at,
          updated_at,
          is_published,
          is_pinned,
          profiles:user_id (username)
        `)
        .order('created_at', { ascending: false })
        .range(
          (pagination.page - 1) * pagination.limit, 
          pagination.page * pagination.limit - 1
        );

      // Apply filters
      if (filter === 'published') {
        query = query.eq('is_published', true);
      } else if (filter === 'draft') {
        query = query.eq('is_published', false);
      } else if (filter === 'pinned') {
        query = query.eq('is_pinned', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to match our interface
      const blogPosts = data?.map(post => ({
        ...post,
        profiles: post.profiles?.[0] || null
      })) || [];

      setPosts(blogPosts);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
    } finally {
      setLoading(false);
      setChangingPage(false);
    }
  }

  async function togglePublished(postId: string, currentValue: boolean) {
    setActionLoading(`publish-${postId}`);
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({ is_published: !currentValue })
        .eq('id', postId);

      if (error) throw error;

      // Update local state to reflect the change
      setPosts(posts.map(post => 
        post.id === postId ? { ...post, is_published: !currentValue } : post
      ));
    } catch (error) {
      console.error('Error toggling published status:', error);
    } finally {
      setActionLoading(null);
    }
  }

  async function togglePinned(postId: string, currentValue: boolean) {
    setActionLoading(`pin-${postId}`);
    try {
      const { error } = await supabase
        .from('blog_posts')
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
      setActionLoading(null);
    }
  }

  async function deletePost(postId: string) {
    if (!confirm('Are you sure you want to delete this blog post? This action cannot be undone.')) {
      return;
    }

    setActionLoading(`delete-${postId}`);
    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      // Remove post from state
      setPosts(posts.filter(post => post.id !== postId));
      // Refetch to update counts
      fetchBlogPosts();
    } catch (error) {
      console.error('Error deleting blog post:', error);
    } finally {
      setActionLoading(null);
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
        <Loading type="fullscreen" text="Loading blog posts..." />
      </div>
    );
  }

  return (
    <div className={styles.contentWrapper}>
      <div className={styles.contentHeader}>
        <h2 className={styles.contentTitle}>Blog Management</h2>
        <div className={styles.headerActions}>
          <div className={styles.filterWrapper}>
            <Dropdown
              label="Filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Posts' },
                { value: 'published', label: 'Published' },
                { value: 'draft', label: 'Drafts' },
                { value: 'pinned', label: 'Pinned' }
              ]}
              layout="horizontal"
            />
          </div>
          <Button 
            variant="primary"
            onClick={() => router.push('/admin/blogs/create')}
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
            <th className={styles.colBlogTitle}>Title</th>
            <th className={styles.colSummary}>Summary</th>
            <th className={styles.colBlogAuthor}>Author</th>
            <th className={styles.colBlogCreated}>Created</th>
            <th className={styles.colBlogUpdated}>Updated</th>
            <th className={styles.colPublished}>Published</th>
            <th className={styles.colBlogPinned}>Pinned</th>
            <th className={styles.colBlogActions}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id}>
              <td className={styles.colBlogTitle}>
                {post.title}
              </td>
              <td className={styles.colSummary}>
                {post.summary.length > 50 ? `${post.summary.substring(0, 50)}...` : post.summary}
              </td>
              <td className={styles.colBlogAuthor}>{post.profiles?.username || 'Unknown'}</td>
              <td className={styles.colBlogCreated}>{new Date(post.created_at).toLocaleDateString()}</td>
              <td className={styles.colBlogUpdated}>{new Date(post.updated_at).toLocaleDateString()}</td>
              <td className={styles.colPublished}>
                <div className={styles.toggleWrapper}>
                  {actionLoading === `publish-${post.id}` ? (
                    <Loading type="inline" size="small" />
                  ) : (
                    <Toggle 
                      isEnabled={post.is_published} 
                      onChange={() => togglePublished(post.id, post.is_published)}
                    />
                  )}
                </div>
              </td>
              <td className={styles.colBlogPinned}>
                <div className={styles.toggleWrapper}>
                  {actionLoading === `pin-${post.id}` ? (
                    <Loading type="inline" size="small" />
                  ) : (
                    <Toggle 
                      isEnabled={post.is_pinned} 
                      onChange={() => togglePinned(post.id, post.is_pinned)}
                    />
                  )}
                </div>
              </td>
              <td className={styles.colBlogActions}>
                <div className={styles.postActions}>
                  <Button 
                    variant="view"
                    size="small"
                    className={`${styles.actionButton} ${styles.viewButton}`}
                    onClick={() => router.push(`/social?tab=blogs&blog=${post.id}`)}
                    disabled={actionLoading?.includes(post.id)}
                  >
                  </Button>
                  <Button 
                    variant="edit"
                    size="small"
                    className={`${styles.actionButton} ${styles.editButton}`}
                    onClick={() => router.push(`/admin/blogs/edit/${post.id}`)}
                    disabled={actionLoading?.includes(post.id)}
                  >
                  </Button>
                  <Button 
                    variant="delete"
                    size="small"
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={() => deletePost(post.id)} 
                    disabled={actionLoading?.includes(post.id)}
                  >
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {posts.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center' }}>No blog posts found</td>
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