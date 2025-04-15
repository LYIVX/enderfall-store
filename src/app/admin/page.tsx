"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import styles from './admin.module.css';
import Button from '@/components/UI/Button';
import { ActivityType } from '@/app/api/admin/activity/route';
import { FaEye, FaEdit, FaTrash, FaUserFriends, FaComment } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/hooks/useLoading';
import { toast } from 'react-hot-toast';

interface RecentPost {
  id: string;
  title: string;
  created_at: string;
  profiles?: {
    username: string;
  } | null;
}

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

// Add interface for transaction data
interface Transaction {
  id: string;
  created_at: string;
  amount: number;
}

// Extend ActivityType to include social_post and friendship
type ExtendedActivityType = ActivityType | 'social_post' | 'friendship' | 'message' | 'forum_comments' | 'social_post_comments';

// Add interface for activities
interface Activity {
  id: string;
  type: ExtendedActivityType;
  created_at: string;
  title: string;
  user_name?: string;
  user_id?: string;
  amount?: number;
  currency?: string;
  details?: any;
}

const titleToSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with dashes
    .replace(/-+/g, '-')      // Consolidate multiple dashes
    .trim();                  // Trim whitespace
};

export default function AdminDashboard() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalForumPosts: 0,
    totalComments: 0,
    totalBlogPosts: 0,
    totalTransactions: 0
  });
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionStats, setTransactionStats] = useState({
    totalRevenue: 0,
    thisYearRevenue: 0,
    thisMonthRevenue: 0,
    thisWeekRevenue: 0
  });
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const router = useRouter();
  const { isLoading, startLoading, stopLoading } = useLoading();

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        console.log('Fetching admin dashboard data...');
        
        // Fetch statistics separately to isolate any issues
        let dashboardStats = {
          totalUsers: 0,
          totalForumPosts: 0,
          totalComments: 0,
          totalBlogPosts: 0,
          totalTransactions: 0
        };
        
        try {
          // Get users count
          const { count: usersCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
          dashboardStats.totalUsers = usersCount || 0;
          console.log('Users count:', dashboardStats.totalUsers);
        } catch (error) {
          console.error('Error counting users:', error);
        }
        
        try {
          // Get forum posts count using a basic count query
          const { count: forumCount } = await supabase
            .from('forum_posts')
            .select('*', { count: 'exact', head: true });
          dashboardStats.totalForumPosts = forumCount || 0;
          console.log('Forum posts count:', dashboardStats.totalForumPosts);
        } catch (error) {
          console.error('Error counting forum posts:', error);
        }
        
        try {
          // Get comments count
          const { count: commentsCount } = await supabase
            .from('forum_comments')
            .select('*', { count: 'exact', head: true });
          dashboardStats.totalComments = commentsCount || 0;
          console.log('Comments count:', dashboardStats.totalComments);
        } catch (error) {
          console.error('Error counting comments:', error);
        }
        
        try {
          // Get blog posts count
          const { count: blogsCount } = await supabase
            .from('blog_posts')
            .select('*', { count: 'exact', head: true });
          dashboardStats.totalBlogPosts = blogsCount || 0;
          console.log('Blog posts count:', dashboardStats.totalBlogPosts);
        } catch (error) {
          console.error('Error counting blog posts:', error);
        }
        
        try {
          // Get transactions count - include both transactions and user_purchases
          let transactionsCount = 0;

          // Get count from transactions table (Stripe transactions)
          const { count: stripeTransactionsCount, error: stripeTransactionsError } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true });
          
          if (stripeTransactionsError) {
            console.error('Error counting stripe transactions:', stripeTransactionsError);
          } else {
            console.log('Stripe transactions count:', stripeTransactionsCount);
            transactionsCount += stripeTransactionsCount || 0;
          }

          // Also get count from user_purchases for backwards compatibility
          const { count: purchasesCount, error: purchasesError } = await supabase
            .from('user_purchases')
            .select('*', { count: 'exact', head: true });
          
          if (purchasesError) {
            console.error('Error counting user purchases:', purchasesError);
          } else {
            console.log('User purchases count:', purchasesCount);
            // We only add purchases that might not be in the transactions table
            // This assumes most purchases are recorded in both tables
            // For a more accurate count, you'd need to deduplicate based on transaction_id
          }

          // Use the Stripe transactions count as the primary metric
          dashboardStats.totalTransactions = transactionsCount;
          console.log('Total transactions count:', dashboardStats.totalTransactions);
        } catch (error) {
          console.error('Error counting transactions:', error);
        }
        
        // Fetch transaction revenue data
        try {
          // Fetch revenue stats from Stripe API for different time periods
          const response = await fetch('/api/stripe/transactions');
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          
          const data = await response.json();
          const transactions: Transaction[] = data.transactions || [];
          
          // Calculate revenue for different time periods
          const now = new Date();
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          
          const yearRevenue = transactions
            .filter(tx => new Date(tx.created_at) >= startOfYear)
            .reduce((sum: number, tx: Transaction) => sum + tx.amount, 0);
            
          const monthRevenue = transactions
            .filter(tx => new Date(tx.created_at) >= startOfMonth)
            .reduce((sum: number, tx: Transaction) => sum + tx.amount, 0);
            
          const weekRevenue = transactions
            .filter(tx => new Date(tx.created_at) >= startOfWeek)
            .reduce((sum: number, tx: Transaction) => sum + tx.amount, 0);
          
          setTransactionStats({
            totalRevenue: data.totalRevenue || 0,
            thisYearRevenue: yearRevenue,
            thisMonthRevenue: monthRevenue,
            thisWeekRevenue: weekRevenue
          });
          
        } catch (error) {
          console.error('Error fetching transaction revenue data:', error);
        }
        
        // Set stats regardless of any individual count failures
        setStats(dashboardStats);
        
        // Fetch recent posts separately
        let transformedPosts: RecentPost[] = [];
        
        try {
          console.log('Fetching recent forum posts...');
          const { data: postsData, error: postsError } = await supabase
            .from('forum_posts')
            .select('id, title, created_at, user_id')
            .order('created_at', { ascending: false })
            .limit(5);
            
          if (postsError) {
            console.error('Error fetching recent posts:', postsError);
          } else if (postsData && postsData.length > 0) {
            console.log(`Found ${postsData.length} recent posts`);
            
            // Filter out posts with undefined user_id
            const validPosts = postsData.filter(post => post.user_id);
            
            if (validPosts.length > 0) {
              // Try to get usernames
              try {
                const userIds = validPosts.map(post => post.user_id).filter(Boolean);
                console.log(`Fetching usernames for ${userIds.length} users`);
                
                if (userIds.length > 0) {
                  const { data: profilesData } = await supabase
                    .from('profiles')
                    .select('id, username')
                    .in('id', userIds);
                    
                  // Create a map of user_id to username
                  const profileMap = (profilesData || []).reduce((acc, profile) => {
                    acc[profile.id] = profile.username;
                    return acc;
                  }, {} as Record<string, string>);
                  
                  transformedPosts = validPosts.map(post => ({
                    id: post.id,
                    title: post.title,
                    created_at: post.created_at,
                    profiles: post.user_id ? { 
                      username: profileMap[post.user_id] || 'Unknown' 
                    } : null
                  }));
                }
              } catch (profileError) {
                console.error('Error fetching profiles:', profileError);
                // Fall back to posts without usernames
                transformedPosts = validPosts.map(post => ({
                  id: post.id,
                  title: post.title,
                  created_at: post.created_at,
                  profiles: null
                }));
              }
            } else {
              // No valid posts with user_id
              transformedPosts = postsData.map(post => ({
                id: post.id,
                title: post.title,
                created_at: post.created_at,
                profiles: null
              }));
            }
          }
        } catch (error) {
          console.error('Error processing recent posts:', error);
        }
        
        setRecentPosts(transformedPosts);

        // Fetch recent activities
        try {
          const response = await fetch('/api/admin/activity?limit=5');
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          
          const data = await response.json();
          setRecentActivities(data.activities || []);
        } catch (error) {
          console.error('Error fetching activities:', error);
        }
        
      } catch (error) {
        console.error('Error loading admin dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading dashboard data...</div>;
  }

  async function deletePost(postId: string) {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }
  
    try {
      const { error } = await supabase
        .from('forum_posts')
        .delete()
        .eq('id', postId);
  
      if (error) throw error;
  
      // Remove post from state
      setPosts(posts.filter(post => post.id !== postId));
      // Also update recentPosts to refresh the UI
      setRecentPosts(recentPosts.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Error deleting forum post:', error);
    }
  }

  // Function to get appropriate icon/badge for activity type
  function getActivityBadge(type: ExtendedActivityType) {
    switch (type) {
      case 'forum_created':
        return <span className={styles.badgeInfo}>Forum</span>;
      case 'blog_created':
        return <span className={styles.badgePrimary}>Blog</span>;
      case 'user_created':
        return <span className={styles.badgeSuccess}>User</span>;
      case 'transaction':
        return <span className={styles.badgeWarning}>Transaction</span>;
      case 'social_post':
        return <span className={styles.badgeSocial}>Social Post</span>;
      case 'friendship':
        return <span className={styles.badgeFriendship}>Friendship</span>;
      case 'message':
        return <span className={styles.badgeMessage}>Message</span>;
      case 'forum_comments':
        return <span className={styles.badgeForumComment}>Forum Comment</span>;
      case 'social_post_comments':
        return <span className={styles.badgeSocialComment}>Social Comment</span>;
      default:
        return <span className={styles.badge}>Activity</span>;
    }
  }

  // Function to handle activity click - navigate to appropriate page
  const handleActivityClick = (activity: Activity) => {
    if (isLoading(`view-${activity.id}`)) return;
    
    startLoading(`view-${activity.id}`);
    
    try {
      switch (activity.type) {
        case 'forum_created':
          const forumId = activity.details?.post_id || '';
          // Navigate to the social page with forums tab and the specific forum
          router.push(`/social?tab=forums&view=${forumId}`);
          break;
        case 'blog_created':
          const blogId = activity.details?.post_id || '';
          const blogTitle = activity.title.replace('New blog post: ', '');
          // Navigate to the blog page with the specific blog post
          router.push(`/blog/${titleToSlug(blogTitle)}-${blogId}`);
          break;
        case 'user_created':
          router.push(`/admin/users?search=${activity.user_name}`);
          break;
        case 'transaction':
          router.push(`/admin/transactions?search=${activity.details?.transaction_id || ''}`);
          break;
        case 'social_post':
          const postId = activity.details?.post_id || '';
          // Navigate to the social page with posts tab
          router.push(`/social?tab=posts&view=${postId}`);
          break;
        case 'friendship':
          const userId = activity.user_id || '';
          // Navigate to the user's profile
          router.push(`/profile/${userId}`);
          break;
        case 'message':
          const messageData = activity.details || {};
          const conversationId = messageData.conversation_id || '';
          const senderUsername = messageData.sender_username || '';
          const recipientUsername = messageData.recipient_username || '';
          
          if (senderUsername && recipientUsername && conversationId) {
            router.push(`/social/messages/${senderUsername}/${recipientUsername}/${conversationId}`);
          } else {
            // Fallback to messages tab
            router.push(`/social?tab=messages`);
          }
          break;
        case 'forum_comments':
          const forumCommentPostId = activity.details?.post_id || '';
          // Navigate to the specific forum post with the comment
          router.push(`/social?tab=forums&view=${forumCommentPostId}&comment=${activity.details?.comment_id}`);
          break;
        case 'social_post_comments':
          const socialPostId = activity.details?.post_id || '';
          // Navigate to the specific social post with the comment
          router.push(`/social?tab=posts&view=${socialPostId}&comment=${activity.details?.comment_id}`);
          break;
        default:
          console.error('Unknown activity type', activity.type);
      }
    } catch (error) {
      console.error('Error navigating to activity', error);
    }
    
    stopLoading(`view-${activity.id}`);
  };

  // Function to handle edit action
  const handleEdit = (activity: Activity) => {
    if (isLoading(`edit-${activity.id}`)) return;
    
    startLoading(`edit-${activity.id}`);
    
    try {
      switch (activity.type) {
        case 'forum_created':
          const forumId = activity.details?.post_id || '';
          router.push(`/admin/forums/edit/${forumId}`);
          break;
        case 'blog_created':
          const blogId = activity.details?.post_id || '';
          router.push(`/admin/blog/edit/${blogId}`);
          break;
        case 'user_created':
          router.push(`/admin/users/edit/${activity.user_id}`);
          break;
        case 'social_post':
          const postId = activity.details?.post_id || '';
          router.push(`/social?tab=posts&edit=${postId}`);
          break;
        case 'friendship':
          // No direct edit for friendships, redirect to user's friends tab
          router.push(`/profile/${activity.user_id}?tab=friends`);
          break;
        case 'forum_comments':
          const forumCommentId = activity.details?.comment_id || '';
          router.push(`/social?tab=forums&view=${activity.details?.post_id}&edit_comment=${forumCommentId}`);
          break;
        case 'social_post_comments':
          const socialCommentId = activity.details?.comment_id || '';
          router.push(`/social?tab=posts&view=${activity.details?.post_id}&edit_comment=${socialCommentId}`);
          break;
        default:
          console.error('Editing not available for this activity type', activity.type);
      }
    } catch (error) {
      console.error('Error navigating to edit activity', error);
    }
    
    stopLoading(`edit-${activity.id}`);
  };

  // Function to handle delete action
  const handleDelete = async (activity: Activity) => {
    if (isLoading(`delete-${activity.id}`)) return;
    
    if (!confirm(`Are you sure you want to delete this ${activity.type.replace('_', ' ')}?`)) return;
    
    startLoading(`delete-${activity.id}`);
    
    try {
      switch (activity.type) {
        case 'forum_created':
          const forumId = activity.details?.post_id || '';
          await fetch(`/api/social/forums/${forumId}`, {
            method: 'DELETE',
          });
          break;
        case 'blog_created':
          const blogId = activity.details?.post_id || '';
          await fetch(`/api/blog/${blogId}`, {
            method: 'DELETE',
          });
          break;
        case 'social_post':
          const postId = activity.details?.post_id || '';
          await fetch(`/api/social/posts/${postId}`, {
            method: 'DELETE',
          });
          break;
        case 'friendship':
          const friendshipId = activity.details?.friendship_id || '';
          await fetch(`/api/social/friends/${friendshipId}`, {
            method: 'DELETE',
          });
          break;
        case 'forum_comments':
          const forumCommentId = activity.details?.comment_id || '';
          await fetch(`/api/social/forums/comments/${forumCommentId}`, {
            method: 'DELETE',
          });
          break;
        case 'social_post_comments':
          const socialCommentId = activity.details?.comment_id || '';
          await fetch(`/api/social/posts/comments/${socialCommentId}`, {
            method: 'DELETE',
          });
          break;
        default:
          console.error('Deletion not available for this activity type', activity.type);
          stopLoading(`delete-${activity.id}`);
          return;
      }
      
      // Refresh the dashboard data
      setLoading(true);
      const refreshData = async () => {
        try {
          // Fetch basic stats
          const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
          const { count: forumCount } = await supabase.from('forum_posts').select('*', { count: 'exact', head: true });
          const { count: commentsCount } = await supabase.from('forum_comments').select('*', { count: 'exact', head: true });
          const { count: blogsCount } = await supabase.from('blog_posts').select('*', { count: 'exact', head: true });
          const { count: stripeTransactionsCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
          
          // Update state with new counts
          setStats({
            totalUsers: usersCount || 0,
            totalForumPosts: forumCount || 0,
            totalComments: commentsCount || 0,
            totalBlogPosts: blogsCount || 0,
            totalTransactions: stripeTransactionsCount || 0
          });
          
          // Fetch recent activities
          const response = await fetch('/api/admin/activity?limit=10');
          if (response.ok) {
            const data = await response.json();
            setRecentActivities(data.activities || []);
          }
        } catch (error) {
          console.error('Error refreshing dashboard data:', error);
        } finally {
          setLoading(false);
        }
      };
      
      await refreshData();
      toast.success(`${activity.type.replace('_', ' ')} deleted successfully`);
    } catch (error) {
      console.error('Error deleting activity', error);
      toast.error('Failed to delete activity');
    }
    
    stopLoading(`delete-${activity.id}`);
  };

  // Helper function to check if activity can be edited
  function canEditActivity(activity: Activity): boolean {
    return ['forum_created', 'blog_created', 'social_post', 'forum_comments', 'social_post_comments'].includes(activity.type);
  }

  // Helper function to check if activity can be deleted
  function canDeleteActivity(activity: Activity): boolean {
    return ['forum_created', 'blog_created', 'social_post', 'friendship', 'forum_comments', 'social_post_comments'].includes(activity.type);
  }

  return (
    <div>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>Total Users</h3>
          <div className={styles.statValue}>{stats.totalUsers}</div>
          <Button 
            variant="ghost"
            onClick={() => window.open('/admin/users', '_blank')}
          >
            View all users
          </Button>
        </div>
        <div className={styles.statCard}>
          <h3>Forum Posts</h3>
          <div className={styles.statValue}>{stats.totalForumPosts}</div>
          <Button 
            variant="ghost"
            onClick={() => window.open('/admin/forums', '_blank')}
          >
            Manage forums
          </Button>
        </div>
        <div className={styles.statCard}>
          <h3>Blog Posts</h3>
          <div className={styles.statValue}>{stats.totalBlogPosts}</div>
          <Button 
            variant="ghost"
            onClick={() => window.open('/admin/blogs', '_blank')}
          >
            Manage blogs
          </Button>
        </div>
        <div className={styles.statCard}>
          <h3>Comments</h3>
          <div className={styles.statValue}>{stats.totalComments}</div>
          <Button 
            variant="ghost"
            onClick={() => window.open('/admin/forums', '_blank')}
          >
            View all comments
          </Button>
        </div>
        <div className={styles.statCard}>
          <h3>Transactions</h3>
          <div className={styles.statValue}>{stats.totalTransactions}</div>
          <Button 
            variant="ghost"
            onClick={() => window.open('/admin/transactions', '_blank')}
          >
            View all transactions
          </Button>
        </div>
      </div>

      <div className={styles.contentSection}>
        <div className={styles.contentHeader}>
          <h2 className={styles.contentTitle}>Transaction Revenue</h2>
          <Button 
            variant="primary"
            onClick={() => window.open('/admin/transactions', '_blank')}
          >
            View All
          </Button>
        </div>
        
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3>All Time Revenue</h3>
            <div className={styles.statValue}>${transactionStats.totalRevenue.toFixed(2)}</div>
          </div>
          <div className={styles.statCard}>
            <h3>This Year</h3>
            <div className={styles.statValue}>${transactionStats.thisYearRevenue.toFixed(2)}</div>
          </div>
          <div className={styles.statCard}>
            <h3>This Month</h3>
            <div className={styles.statValue}>${transactionStats.thisMonthRevenue.toFixed(2)}</div>
          </div>
          <div className={styles.statCard}>
            <h3>This Week</h3>
            <div className={styles.statValue}>${transactionStats.thisWeekRevenue.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className={styles.contentSection}>
        <div className={styles.contentHeader}>
          <h2 className={styles.contentTitle}>Recent Activities</h2>
          <Button 
            variant="primary"
            onClick={() => router.push('/admin/activity')}
          >
            View All
          </Button>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.colType}>Type</th>
              <th className={styles.colDescription}>Description</th>
              <th className={styles.colUser}>User</th>
              <th className={styles.colDate}>Date</th>
              <th className={styles.colActions}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recentActivities.slice(0, 10).map((activity) => (
              <tr key={activity.id}>
                <td className={styles.colType}>{getActivityBadge(activity.type)}</td>
                <td className={styles.colDescription}>
                  {activity.title}
                </td>
                <td className={styles.colUser}>{activity.user_name || 'Unknown'}</td>
                <td className={styles.colDate}>{new Date(activity.created_at).toLocaleString()}</td>
                <td className={styles.colActions}>
                  <div className={styles.postActions}>
                    <Button 
                      variant="ghost" 
                      className={`${styles.actionButton} ${styles.viewButton}`}
                      onClick={() => handleActivityClick(activity)}
                      disabled={isLoading(`view-${activity.id}`)}
                    >
                      <FaEye className={styles.viewIcon} />
                    </Button>
                    
                    {canEditActivity(activity) && (
                      <Button 
                        variant="ghost" 
                        className={`${styles.actionButton} ${styles.editButton}`}
                        onClick={() => handleEdit(activity)}
                        disabled={isLoading(`edit-${activity.id}`)}
                      >
                        <FaEdit className={styles.editIcon} />
                      </Button>
                    )}
                    
                    {canDeleteActivity(activity) && (
                      <Button 
                        variant="ghost" 
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        onClick={() => handleDelete(activity)}
                        disabled={isLoading(`delete-${activity.id}`)}
                      >
                        <FaTrash className={styles.deleteIcon} />
                      </Button>
                    )}
                    
                    {activity.type === 'friendship' && (
                      <Button 
                        variant="ghost" 
                        className={`${styles.actionButton} ${styles.friendButton}`}
                        onClick={() => router.push(`/profile/${activity.details?.friend_id}?tab=friends`)}
                      >
                        <FaUserFriends className={styles.friendIcon} />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {recentActivities.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center' }}>No recent activities</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className={styles.viewAll}>
          <Button variant="secondary" onClick={() => router.push('/admin/activity')}>
            View All Activities
          </Button>
        </div>
      </div>
    </div>
  );
} 