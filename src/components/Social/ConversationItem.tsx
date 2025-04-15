"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Conversation, Profile } from '@/lib/supabase';
import styles from './ConversationItem.module.css';
import { useUserStatus } from '@/components/Auth/UserStatusContext';
import StatusIndicator from '@/components/UI/StatusIndicator';
import AvatarWithStatus from '@/components/UI/AvatarWithStatus';
import { Button, NineSliceContainer } from '../UI';

interface ConversationItemProps {
  conversation: Conversation;
  currentUserId: string;
  isActive?: boolean;
  shouldNavigate?: boolean;
  onClick?: (conversation: Conversation) => void;
}

const ConversationItem = ({ 
  conversation, 
  currentUserId, 
  isActive = false, 
  shouldNavigate = true,
  onClick 
}: ConversationItemProps) => {
  const router = useRouter();
  const [otherParticipants, setOtherParticipants] = useState<Profile[]>([]);
  const { userStatuses } = useUserStatus();
  
  useEffect(() => {
    console.log('ConversationItem - conversation:', conversation);
    console.log('ConversationItem - participants:', conversation.participants);
    
    if (conversation.participants) {
      // Filter out the current user from participants
      const others = conversation.participants.filter(
        p => p.id !== currentUserId
      );
      console.log('ConversationItem - other participants:', others);
      setOtherParticipants(others);
    }
  }, [conversation.participants, currentUserId]);
  
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMins < 60) {
        return `${diffMins}m`;
      } else if (diffHours < 24) {
        return `${diffHours}h`;
      } else if (diffDays < 7) {
        return `${diffDays}d`;
      } else {
        return date.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        });
      }
    } catch (e) {
      return '';
    }
  };
  
  const getConversationName = () => {
    if (conversation.name) {
      return conversation.name;
    }
    
    if (otherParticipants.length > 0) {
      return otherParticipants.map(p => p.username || 'Unknown User').join(', ');
    }
    
    return 'New Conversation';
  };
  
  const getLastMessagePreview = () => {
    if (!conversation.last_message) {
      return 'No messages yet';
    }
    
    const isSender = conversation.last_message.sender_id === currentUserId;
    const prefix = isSender ? 'You: ' : '';
    
    // Get sender name for non-current user messages
    let senderPrefix = prefix;
    if (!isSender && conversation.last_message.username) {
      senderPrefix = `${conversation.last_message.username}: `;
    }
    
    const content = conversation.last_message.content;
    
    if (content.length > 30) {
      return `${senderPrefix}${content.substring(0, 30)}...`;
    }
    
    return `${senderPrefix}${content}`;
  };
  
  const handleClick = () => {
    if (shouldNavigate) {
      // Get the other participant's username (the person we're talking to)
      const otherParticipant = conversation.participants?.find(p => p.id !== currentUserId);
      const otherUsername = otherParticipant?.username || 'unknown';
      
      // Get the current user's username
      const currentUserParticipant = conversation.participants?.find(p => p.id === currentUserId);
      const currentUsername = currentUserParticipant?.username || 'unknown';
      
      // Navigate to the username-based URL with both usernames as separate parameters
      router.push(`/social/messages/${currentUsername}/${otherUsername}/${conversation.id}`);
    } else if (onClick) {
      // Use the custom onClick handler
      onClick(conversation);
    }
  };
  
  return (
    <Button 
      variant='standard'
      className={`${styles.conversationItem} ${isActive ? styles.active : ''}`}
      onClick={handleClick}
    >
      {otherParticipants.length > 0 ? (
        <AvatarWithStatus
          userId={otherParticipants[0].id}
          avatarUrl={otherParticipants[0].avatar_url}
          username={otherParticipants[0].username || 'User'}
          size="medium"
          className={styles.avatarWrapper}
        />
      ) : (
        <div className={styles.defaultAvatarContainer}>
          <div className={styles.defaultAvatar}>
            {getConversationName()[0].toUpperCase()}
          </div>
        </div>
      )}
      
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={styles.name}>{getConversationName()}</span>
          {conversation.last_message && (
            <span className={styles.time}>
              {formatTimestamp(conversation.last_message.created_at)}
            </span>
          )}
        </div>
        
        <div className={styles.preview}>
          {getLastMessagePreview()}
        </div>
      </div>
    </Button>
  );
};

export default ConversationItem; 