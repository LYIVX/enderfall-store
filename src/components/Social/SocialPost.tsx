"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { FaHeart, FaComment, FaTrash, FaEdit } from 'react-icons/fa';
import { SocialPost as SocialPostType, Profile, hasUserLikedSocialPost, likeSocialPost, supabase, getSocialPostComments, createSocialPostComment } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthContext';
import ReactMarkdown from 'react-markdown';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import styles from './SocialPost.module.css';
import { useRouter, useSearchParams } from 'next/navigation';
import AvatarWithStatus from '@/components/UI/AvatarWithStatus';

interface SocialPostProps {
  post: SocialPostType;
  onDelete?: (postId: string) => void;
}

const SocialPost = ({ post, onDelete }: SocialPostProps) => {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const postRef = useRef<HTMLDivElement>(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentContent, setCommentContent] = useState('');
  const [isCommentLoading, setIsCommentLoading] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  
  useEffect(() => {
    // Check if this post should be scrolled to
    if (!searchParams) return;
    
    const viewPostId = searchParams.get('view');
    const shouldScroll = searchParams.get('scroll') === 'true';
    
    if (viewPostId === post.id && shouldScroll && postRef.current) {
      postRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [post.id, searchParams]);
  
  useEffect(() => {
    // Check if user has liked this post
    const checkLikeStatus = async () => {
      if (!user) return;
      
      try {
        const hasLiked = await hasUserLikedSocialPost(post.id, user.id);
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
  }, [post.id, post.user_id, user]);
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMins < 60) {
        return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      } else if (diffDays < 7) {
        return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
      } else {
        return date.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Unknown date';
    }
  };
  
  const handleLikeToggle = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    setIsLikeLoading(true);
    
    try {
      const result = await likeSocialPost(post.id, user.id);
      
      if (result.success) {
        const newLikedState = !liked;
        setLiked(newLikedState);
        setLikesCount(prev => newLikedState ? prev + 1 : prev - 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLikeLoading(false);
    }
  };
  
  const handleShowComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }
    
    setIsCommentLoading(true);
    
    try {
      const commentsData = await getSocialPostComments(post.id);
      setComments(commentsData);
      setShowComments(true);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsCommentLoading(false);
    }
  };
  
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !commentContent.trim()) return;
    
    setIsCommentLoading(true);
    
    try {
      const { success, comment } = await createSocialPostComment(post.id, user.id, commentContent.trim());
      
      if (success && comment) {
        setComments(prev => [...prev, comment]);
        setCommentContent('');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsCommentLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      try {
        const { error } = await supabase
          .from('social_posts')
          .delete()
          .eq('id', post.id);
          
        if (error) throw error;
        
        if (onDelete) onDelete(post.id);
      } catch (error) {
        console.error('Error deleting post:', error);
      }
    }
  };
  
  const handleViewProfile = () => {
    if (!post.author) return;
    router.push(`/profile/${post.author.id}`);
  };

  return (
    <div ref={postRef} className={styles.socialPost}>
      <div className={styles.postHeader}>
        <div className={styles.authorInfo} onClick={handleViewProfile}>
          {post.author && (
            <div className={styles.authorAvatar}>
              <AvatarWithStatus
                userId={post.author.id}
                avatarUrl={post.author.avatar_url}
                username={post.author.username || 'User'}
                size="medium"
              />
            </div>
          )}
          <div className={styles.authorDetails}>
            <span className={styles.authorName}>
              {post.author?.username || 'Unknown User'}
              {post.author?.is_admin && (
                <span className={styles.adminBadge}>ADMIN</span>
              )}
            </span>
            <span className={styles.postTime}>{formatDate(post.created_at)}</span>
          </div>
        </div>
        
        {isAuthor && (
          <div className={styles.postActions}>
            <Button
              variant="ghost"
              size="small"
              className={`${styles.actionButton} ${styles.editButton}`}
              onClick={() => router.push(`/social/edit/${post.id}`)}
            >
              <FaEdit />
            </Button>
            <Button
              variant="ghost"
              size="small"
              className={`${styles.actionButton} ${styles.deleteButton}`}
              onClick={handleDelete}
            >
              <FaTrash />
            </Button>
          </div>
        )}
      </div>

      <div className={styles.postContent}>
        {post.is_markdown ? (
          <ReactMarkdown>
            {post.content}
          </ReactMarkdown>
        ) : (
          <div className={styles.contentText}>{post.content}</div>
        )}
        
        {post.image_url && (
          <div className={styles.imageContainer}>
            <img
              src={post.image_url}
              alt="Post attachment"
              className={styles.postImage}
            />
          </div>
        )}
      </div>
      
      <div className={styles.postFooter}>
        <Button 
          variant="ghost"
          size="small"
          className={`${styles.footerButton} ${liked ? styles.liked : ''}`}
          onClick={handleLikeToggle}
          disabled={isLikeLoading}
        >
          <FaHeart />
          <span>{likesCount} {likesCount === 1 ? 'Like' : 'Likes'}</span>
        </Button>
        
        <Button 
          variant="ghost"
          size="small"
          className={`${styles.footerButton} ${showComments ? styles.active : ''}`}
          onClick={handleShowComments}
          disabled={isCommentLoading}
        >
          <FaComment />
          <span>Comments</span>
        </Button>
      </div>
      
      {showComments && (
        <div className={styles.commentsSection}>
          <div className={styles.commentsList}>
            {comments.length === 0 ? (
              <div className={styles.noComments}>No comments yet. Be the first to comment!</div>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className={styles.comment}>
                  <div className={styles.commentHeader}>
                    <div className={styles.commentAuthor} onClick={() => router.push(`/profile/${comment.author?.id}`)}>
                      {comment.author && (
                        <div className={styles.commentAvatar}>
                          <AvatarWithStatus
                            userId={comment.author?.id || comment.author_id}
                            avatarUrl={comment.author?.avatar_url}
                            username={comment.author?.username || 'User'}
                            size="small"
                          />
                        </div>
                      )}
                      <span className={styles.commentAuthorName}>
                        {comment.author?.username || 'Unknown User'}
                        {comment.author?.is_admin && (
                          <span className={styles.commentAdminBadge}>ADMIN</span>
                        )}
                      </span>
                    </div>
                    <span className={styles.commentTime}>{formatDate(comment.created_at)}</span>
                  </div>
                  <div className={styles.commentContent}>{comment.content}</div>
                </div>
              ))
            )}
          </div>
          
          {user && (
            <form className={styles.commentForm} onSubmit={handleSubmitComment}>
              <Input
                label=""
                placeholder="Write a comment..."
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                className={styles.commentInput}
              />
              <Button
                type="submit"
                variant="primary"
                size="small"
                disabled={!commentContent.trim() || isCommentLoading}
                className={styles.commentSubmit}
              >
                Post
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default SocialPost; 