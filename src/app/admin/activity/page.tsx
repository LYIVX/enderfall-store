"use client";

import { useState, useEffect } from 'react';
import styles from '../admin.module.css';
import Button from '@/components/UI/Button';
import { Loading } from '@/components/UI';
import { ActivityType } from '@/app/api/admin/activity/route';
import { FaEye, FaEdit, FaTrash, FaUserFriends, FaComment } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { useLoading } from '@/hooks/useLoading';

// Extend ActivityType to include social_post and friendship
type ExtendedActivityType = ActivityType | 'social_post' | 'friendship' | 'message' | 'forum_comments' | 'social_post_comments';

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

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Function to convert a title to a URL-friendly slug
const titleToSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
};

// Format date to locale string
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

// User info component
const UserInfo = ({ userName, userId }: { userName?: string, userId?: string }) => {
  return (
    <span className={styles.userInfo}>
      {userName || 'Unknown User'}
    </span>
  );
};

export default function AdminActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0
  });
  const [loading, setLoading] = useState(true);
  const [changingPage, setChangingPage] = useState(false);
  const router = useRouter();
  const { isLoading, startLoading, stopLoading } = useLoading();

  // Fetch activities when page changes
  useEffect(() => {
    fetchActivities();
  }, [pagination.page]);

  // Function to fetch activities from API
  async function fetchActivities() {
    if (!loading) setChangingPage(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      const response = await fetch(`/api/admin/activity?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setActivities(data.activities || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
      setChangingPage(false);
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
      
      // Refresh the activity list
      fetchActivities();
      toast.success(`${activity.type.replace('_', ' ')} deleted successfully`);
    } catch (error) {
      console.error('Error deleting activity', error);
      toast.error('Failed to delete activity');
    }
    
    stopLoading(`delete-${activity.id}`);
  };

  // Function to navigate to next/previous pages
  function goToPage(page: number) {
    if (page >= 1 && page <= pagination.pages) {
      setPagination(prev => ({ ...prev, page }));
    }
  }

  // Helper function to check if activity can be edited
  function canEditActivity(activity: Activity): boolean {
    return ['forum_created', 'blog_created', 'social_post', 'forum_comments', 'social_post_comments'].includes(activity.type);
  }

  // Helper function to check if activity can be deleted
  function canDeleteActivity(activity: Activity): boolean {
    return ['forum_created', 'blog_created', 'social_post', 'friendship', 'forum_comments', 'social_post_comments'].includes(activity.type);
  }

  // If initial loading state (no activities fetched yet)
  if (loading && activities.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <Loading type="fullscreen" text="Loading activity data..." />
      </div>
    );
  }

  return (
    <div className={styles.contentWrapper}>
      <div className={styles.contentHeader}>
        <h2 className={styles.contentTitle}>Activity Log</h2>
      </div>

      {/* Loading overlay when changing pages */}
      {changingPage && (
        <Loading type="overlay" text="Loading..." withOverlay={true} />
      )}

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
          {activities.map((activity) => (
            <tr key={activity.id} className={styles.activityRow}>
              <td className={styles.colType}>
                {getActivityBadge(activity.type)}
              </td>
              <td className={styles.colDescription}>
                <span className={styles.description}>{activity.title}</span>
              </td>
              <td className={styles.colUser}>
                <UserInfo userName={activity.user_name} userId={activity.user_id} />
              </td>
              <td className={styles.colDate}>
                <span>{formatDate(activity.created_at)}</span>
              </td>
              <td className={styles.colActions}>
                <div className={styles.actionButtons}>
                  <Button 
                    variant="view" 
                    className={styles.actionButton} 
                    onClick={() => handleActivityClick(activity)}
                    disabled={isLoading(`view-${activity.id}`)}
                  >
                  </Button>
                  
                  {canEditActivity(activity) && (
                    <Button 
                      variant="edit" 
                      className={styles.actionButton} 
                      onClick={() => handleEdit(activity)}
                      disabled={isLoading(`edit-${activity.id}`)}
                    >
                    </Button>
                  )}
                  
                  {canDeleteActivity(activity) && (
                    <Button 
                      variant="delete" 
                      className={styles.actionButton} 
                      onClick={() => handleDelete(activity)}
                      disabled={isLoading(`delete-${activity.id}`)}
                    >
                    </Button>
                  )}
                  
                  {activity.type === 'friendship' && (
                    <Button 
                      variant="friend" 
                      className={styles.actionButton} 
                      onClick={() => router.push(`/profile/${activity.details?.friend_id}?tab=friends`)}
                    >
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {activities.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center' }}>No activities found</td>
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