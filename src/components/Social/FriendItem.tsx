"use client";

import { useState } from 'react';
import Image from 'next/image';
import { FaEnvelope, FaUserPlus, FaUserMinus, FaCheck, FaTimes } from 'react-icons/fa';
import { Friendship, Profile, respondToFriendRequest, removeFriend } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import Button from '@/components/UI/Button';
import styles from './FriendItem.module.css';
import { useRouter } from 'next/navigation';
import { createConversation } from '@/lib/supabase';
import AvatarWithStatus from '@/components/UI/AvatarWithStatus';
import { NineSliceContainer } from '../UI';

interface FriendItemProps {
  friendship?: Friendship;
  user?: Profile;
  currentUserId: string;
  type: 'friend' | 'request' | 'user' | 'outgoing';
  onAccept?: (friendshipId: string) => void;
  onReject?: (friendshipId: string) => void;
  onRemove?: (friendshipId: string) => void;
  onSendRequest?: (userId: string) => void;
  onCancel?: (friendshipId: string) => void;
}

const FriendItem = ({
  friendship,
  user,
  currentUserId,
  type,
  onAccept,
  onReject,
  onRemove,
  onSendRequest,
  onCancel
}: FriendItemProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Determine which profile to display based on the type
  const profile = type === 'friend' 
    ? friendship?.friend 
    : type === 'request' 
      ? friendship?.friend 
      : type === 'outgoing'
        ? friendship?.friend
        : user;

  if (!profile) return null;

  const handleAccept = async () => {
    if (!friendship) return;
    setIsLoading(true);
    
    try {
      await respondToFriendRequest(friendship.id, 'accepted');
      if (onAccept) onAccept(friendship.id);
    } catch (error) {
      console.error('Error accepting friend request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!friendship) return;
    setIsLoading(true);
    
    try {
      await respondToFriendRequest(friendship.id, 'rejected');
      if (onReject) onReject(friendship.id);
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!friendship) return;
    setIsLoading(true);
    
    try {
      await removeFriend(friendship.id);
      if (onRemove) onRemove(friendship.id);
    } catch (error) {
      console.error('Error removing friend:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!friendship) return;
    setIsLoading(true);
    
    try {
      await removeFriend(friendship.id);
      if (onCancel) onCancel(friendship.id);
    } catch (error) {
      console.error('Error canceling friend request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      if (onSendRequest) onSendRequest(user.id);
    } catch (error) {
      console.error('Error sending friend request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!profile) return;
    setIsLoading(true);
    
    try {
      // Get the current user's username (we need to query for it)
      const { data: currentUserData, error: currentUserError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', currentUserId)
        .single();
        
      if (currentUserError) throw currentUserError;
      
      const currentUsername = currentUserData?.username || 'unknown';
      const friendUsername = profile.username || 'unknown';
      
      // Use the createConversation function to get or create a conversation
      const { success, conversationId, error } = await createConversation([currentUserId, profile.id]);
      
      if (success && conversationId) {
        router.push(`/social/messages/${currentUsername}/${friendUsername}/${conversationId}`);
      } else if (error) {
        console.error('Error creating conversation:', error);
        
        // Fallback to direct RPC call if the function fails
        try {
          const { data, error: rpcError } = await supabase.rpc('create_or_get_conversation', {
            user_ids: [currentUserId, profile.id]
          });
          
          if (rpcError) throw rpcError;
          
          if (data) {
            router.push(`/social/messages/${currentUsername}/${friendUsername}/${data}`);
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      }
    } catch (error) {
      console.error('Error creating/getting conversation:', error);
      
      // Fallback to direct SQL call if the function fails
      try {
        // Get the current user's username again (in case the earlier attempt failed)
        const { data: currentUserData, error: currentUserError } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', currentUserId)
          .single();
          
        if (currentUserError) throw currentUserError;
        
        const currentUsername = currentUserData?.username || 'unknown';
        const friendUsername = profile.username || 'unknown';
        
        // Try with RPC call as a fallback
        const { data, error: rpcError } = await supabase.rpc('create_or_get_conversation', {
          user_ids: [currentUserId, profile.id]
        });
        
        if (rpcError) throw rpcError;
        
        if (data) {
          router.push(`/social/messages/${currentUsername}/${friendUsername}/${data}`);
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewProfile = () => {
    if (!profile) return;
    router.push(`/profile/${profile.id}`);
  };

  return (
    <NineSliceContainer className={styles.friendItem}>
      <div className={styles.friendProfile} onClick={handleViewProfile}>
        <AvatarWithStatus
          userId={profile.id}
          avatarUrl={profile.avatar_url}
          username={profile.username || 'User'}
          size="medium"
          className={styles.avatar}
            />
        <div className={styles.info}>
          <span className={styles.username}>
            {profile.username || 'Unknown User'}
            {profile.is_admin && <span className={styles.adminBadge}>ADMIN</span>}
          </span>
          {profile.minecraft_username && (
            <span className={styles.minecraftName}>Minecraft: {profile.minecraft_username}</span>
          )}
        </div>
      </div>
      
      <div className={styles.actions}>
        {type === 'friend' && (
          <>
            <Button
              variant="info"
              size="medium"
              onClick={handleMessage}
              disabled={isLoading}
              className={styles.actionButton}
            >
              <FaEnvelope />
              <span>Message</span>
            </Button>
            <Button
              variant="danger"
              size="medium"
              onClick={handleRemove}
              disabled={isLoading}
              className={`${styles.actionButton} ${styles.removeButton}`}
            >
              <FaUserMinus />
              <span>Remove</span>
            </Button>
          </>
        )}
        
        {type === 'request' && (
          <>
            <Button
              variant="success"
              size="medium"
              onClick={handleAccept}
              disabled={isLoading}
              className={`${styles.actionButton} ${styles.acceptButton}`}
            >
              <FaCheck />
              <span>Accept</span>
            </Button>
            <Button
              variant="danger"
              size="medium"
              onClick={handleReject}
              disabled={isLoading}
              className={`${styles.actionButton} ${styles.rejectButton}`}
            >
              <FaTimes />
              <span>Reject</span>
            </Button>
          </>
        )}
        
        {type === 'user' && (
          <Button
            variant="success"
            size="medium"
            onClick={handleSendRequest}
            disabled={isLoading}
            className={styles.actionButton}
          >
            <FaUserPlus />
            <span>Add Friend</span>
          </Button>
        )}
        
        {type === 'outgoing' && (
          <Button
            variant="danger"
            size="medium"
            onClick={handleCancelRequest}
            disabled={isLoading}
            className={`${styles.actionButton} ${styles.rejectButton}`}
          >
            <FaTimes />
            <span>Cancel Request</span>
          </Button>
        )}
      </div>
    </NineSliceContainer>
  );
};

export default FriendItem; 