"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ForumPost as ForumPostType, Profile, supabase, hasUserLikedPost, togglePostLike, getCurrentUser } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthContext';
import { FaHeart, FaEdit, FaTrash, FaArrowRight } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import Button from '@/components/UI/Button';
import styles from './ForumPost.module.css';
import AvatarWithStatus from '@/components/UI/AvatarWithStatus';
import NineSliceContainer from '../UI/NineSliceContainer';

interface ForumPostProps {
  post: ForumPostType & { is_blog?: boolean, thumbnail_url?: string | null };
  showFullContent?: boolean;
  onDelete?: (postId: string) => void;
  onEdit?: (post: ForumPostType & { is_blog?: boolean, thumbnail_url?: string | null }) => void;
}

// Convert a string to a URL-friendly slug
const titleToSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with dashes
    .replace(/-+/g, '-')      // Consolidate multiple dashes
    .trim();                  // Trim whitespace
};

// Function to fetch author info
const fetchAuthorInfo = async (userId: string): Promise<Profile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching author:', error);
    return null;
  }
};

const ForumPost = ({ post, showFullContent = false, onDelete, onEdit }: ForumPostProps) => {
  const [author, setAuthor] = useState<Profile | null>(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const { user } = useAuth();
  const [isAuthor, setIsAuthor] = useState(false);
  
  useEffect(() => {
    // If post already has author info, use that
    if (post.author) {
      setAuthor(post.author);
    } else {
      // Otherwise fetch the author info
      const getAuthor = async () => {
        if (post.user_id) {
          const authorData = await fetchAuthorInfo(post.user_id);
          if (authorData) setAuthor(authorData);
        }
      };
      
      getAuthor();
    }
    
    // Check if user has liked this post
    const checkLikeStatus = async () => {
      if (!user) return;
      
      try {
        const hasLiked = await hasUserLikedPost(post.id, user.id);
        setLiked(hasLiked);
      } catch (error) {
        console.error('Error checking like status:', error);
      }
    };
    
    // Check if current user is the author
    if (user && post.user_id === user.id) {
      setIsAuthor(true);
    }
    
    checkLikeStatus();
  }, [post.user_id, post.author, post.id, user]);
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Unknown date';
    }
  };
  
  const handleLikeToggle = async () => {
    if (!user) {
      // Redirect to login or show login modal
      return;
    }
    
    setIsLikeLoading(true);
    
    try {
      const result = await togglePostLike(post.id, user.id);
      
      if (result.success) {
        setLiked(result.liked);
        setLikesCount(prev => result.liked ? prev + 1 : prev - 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLikeLoading(false);
    }
  };
  
  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent the Link from navigating
    e.stopPropagation(); // Stop event propagation
    
    if (onEdit) {
      onEdit(post);
    } else {
      // Fall back to the URL navigation if no callback is provided
      window.location.href = `/social/forums/edit/${post.id}`;
    }
  };
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent the Link from navigating
    
    if (window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      if (onDelete) {
        onDelete(post.id);
      } else {
        try {
          const { error } = await supabase
            .from('forum_posts')
            .delete()
            .eq('id', post.id);
            
          if (error) throw error;
          
          // Redirect to forums page
          window.location.href = '/social/forums';
        } catch (error) {
          console.error('Error deleting post:', error);
        }
      }
    }
  };

  // Get the slug for the post URL
  const postSlug = titleToSlug(post.title || 'untitled-post');
  
  const contentToShow = showFullContent 
    ? post.content 
    : (post.summary || (post.content && post.content.length > 150
        ? `${post.content.substring(0, 150)}...`
        : post.content) || 'No content');

  const PostContent = () => (
    <NineSliceContainer 
      className={styles.forumPost} 
      data-post-id={post.id}
      id={`forum-${post.id}`}
    >
      <div className={styles.postContent}>
        <div className={styles.postMeta}>
          {post.is_blog ? (
            <div className={`${styles.category} ${styles.blogCategory}`}>Blog</div>
          ) : (
            <div className={styles.category}>{post.category || 'Uncategorized'}</div>
          )}
          <div className={styles.date}>{formatDate(post.created_at)}</div>
        </div>

        <NineSliceContainer className={styles.postTitle}>
          {(post.pinned || post.is_blog) && <span className={styles.pinnedIndicator}>📌 </span>}
          {post.title || 'Untitled Post'}
        </NineSliceContainer>

        {post.thumbnail_url && (
          <div className={styles.thumbnailContainer}>
            <img 
              src={post.thumbnail_url} 
              alt={post.title || 'Post thumbnail'} 
              className={styles.thumbnail} 
            />
          </div>
        )}

        {!showFullContent && post.summary && (
          <NineSliceContainer className={styles.postSummary}>
            {post.is_markdown ? (
              <ReactMarkdown>
                {post.summary}
              </ReactMarkdown>
            ) : (
              <div className={styles.summaryText}>{post.summary}</div>
            )}
          </NineSliceContainer>
        )}

        {showFullContent && (
          <NineSliceContainer className={styles.postFullContent}>
            {post.is_markdown ? (
              <ReactMarkdown>
                {contentToShow}
              </ReactMarkdown>
            ) : (
              <div className={styles.contentText}>
                {contentToShow.split('\n').map((line: string, index: number) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            )}
          </NineSliceContainer>
        )}
        
        <div className={styles.postFooter}>
          <div className={styles.authorInfo}>
            {author && (
              <div className={styles.authorAvatar}>
                <AvatarWithStatus
                  userId={author.id}
                  avatarUrl={author.avatar_url}
                  username={author.username || 'User'}
                  size="small"
                />
              </div>
            )}
            <span className={styles.authorName}>
              {author?.username || 'Unknown User'}
              {author?.is_admin && (
                <span className={styles.adminBadge}>ADMIN</span>
              )}
            </span>
          </div>
          
          <div className={styles.postControls}>
            {user && (
              <Button 
                variant="danger"
                size="small"
                onClick={handleLikeToggle}
                disabled={isLikeLoading}
                stopPropagation={true}
              >
                <FaHeart />
                <span>{likesCount} {likesCount === 1 ? 'Like' : 'Likes'}</span>
              </Button>
            )}
            
            {!showFullContent && (
              <Button 
                variant="info"
                size="small"
                className={styles.readMoreButton}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = `/social?tab=forums#forum-${post.id}`;
                }}
                stopPropagation={true}
              >
                <FaArrowRight />
                <span>Read More</span>
              </Button>
            )}
            
            {isAuthor && (
              <div className={styles.postActions}>
                <Button
                  variant="edit"
                  size="small"
                  className={`${styles.actionButton}`}
                  onClick={handleEdit}
                >
                </Button>
                <Button
                  variant="delete"
                  size="small"
                  className={`${styles.actionButton}`}
                  onClick={handleDelete}
                >
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </NineSliceContainer>
  );

  // If we're showing full content, don't wrap in a link
  if (showFullContent) {
    return <PostContent />;
  }

  // Otherwise, wrap in a link for the list view
  return (
    showFullContent ? (
      <PostContent />
    ) : (
      <Link 
        href={`/social?tab=forums#forum-${post.id}`} 
        className={styles.forumLink}
      >
        <PostContent />
      </Link>
    )
  );
}

export default ForumPost; 