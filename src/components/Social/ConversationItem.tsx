"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Conversation, Profile } from '@/lib/supabase';
import styles from './ConversationItem.module.css';
import { useUserStatus } from '@/components/Auth/UserStatusContext';
import StatusIndicator from '@/components/UI/StatusIndicator';
import AvatarWithStatus from '@/components/UI/AvatarWithStatus';
import { Button, NineSliceContainer } from '../UI';
import { supabase } from '@/lib/supabase';

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
  const [unreadCount, setUnreadCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const typingRecordsMapRef = useRef<{[recordId: string]: string}>({});
  
  // Get recipient user info
  const recipient = otherParticipants.length > 0 ? otherParticipants[0] : null;
  
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

    // Calculate unread messages count
    if ((conversation as any).messages) {
      // If messages are already in the conversation object
      const unreadMessages = ((conversation as any).messages as any[]).filter(
        (msg: any) => !msg.is_read && msg.sender_id !== currentUserId
      );
      setUnreadCount(unreadMessages.length);
    } else if (conversation.last_message && Array.isArray(conversation.last_message)) {
      // If messages are in last_message field - match QuickMessageBubble calculation
      const unreadCount = (conversation.last_message as any[]).filter(
        (msg: any) => !msg.is_read && msg.sender_id !== currentUserId
      ).length;
      setUnreadCount(unreadCount);
    } else {
      // Default to conversation.unread_count if it exists
      setUnreadCount(conversation.unread_count || 0);
    }
  }, [conversation, currentUserId]);
  
  // Add this effect to make sure unread count is updated in real-time
  useEffect(() => {
    // Function to check for unread messages
    const checkUnreadMessages = async () => {
      if (!conversation.id || !currentUserId) return;
      
      try {
        // Fetch the latest messages for this conversation
        const { data } = await supabase
          .from('messages')
          .select('id, is_read, sender_id')
          .eq('conversation_id', conversation.id)
          .eq('is_read', false)
          .neq('sender_id', currentUserId);
        
        if (data) {
          // Update the unread count
          console.log(`Unread messages for conversation ${conversation.id}: ${data.length}`);
          setUnreadCount(data.length);
        }
      } catch (error) {
        console.error('Error fetching unread messages:', error);
      }
    };
    
    // Check immediately when component mounts
    checkUnreadMessages();
    
    // Set up a subscription for messages table changes (new messages AND read status changes)
    const channel = supabase
      .channel(`unread-counter-${conversation.id}-${currentUserId}`)
      .on('postgres_changes', {
        event: 'INSERT', 
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`
      }, (payload) => {
        console.log('New message inserted:', payload);
        // Only increment if it's from another user
        if (payload.new && payload.new.sender_id !== currentUserId) {
          checkUnreadMessages();
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`
      }, (payload) => {
        console.log('Message updated:', payload);
        // If is_read status changed, update our count
        if (payload.old && payload.new && 
            payload.old.is_read !== payload.new.is_read) {
          checkUnreadMessages();
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, currentUserId]);
  
  // Add this effect for typing status subscription
  useEffect(() => {
    if (!conversation.id || !currentUserId || !recipient) return;
    
    console.log(`Setting up typing subscription for conversation: ${conversation.id}`);
    
    // Set up real-time subscription for typing status
    const typingStatusSubscription = supabase
      .channel(`typing-${conversation.id}-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'typing_status',
          filter: `conversation_id=eq.${conversation.id}`
        },
        (payload: any) => {
          console.log('Typing status changed:', payload);
          
          // Handle different event types
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Store record ID for future reference
            if (payload.new && payload.new.id && payload.new.user_id) {
              typingRecordsMapRef.current[payload.new.id] = payload.new.user_id;
            }
            
            // Only update if it's another user's typing status (not current user)
            if (payload.new && payload.new.user_id !== currentUserId) {
              setIsTyping(payload.new.is_typing);
            }
          } 
          else if (payload.eventType === 'DELETE') {
            if (payload.old && payload.old.id) {
              const recordId = payload.old.id;
              const userId = typingRecordsMapRef.current[recordId];
              
              // If this was another user's record, set typing to false
              if (userId && userId !== currentUserId) {
                setIsTyping(false);
              }
              
              // Clean up the mapping
              delete typingRecordsMapRef.current[recordId];
            }
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(typingStatusSubscription);
    };
  }, [conversation.id, currentUserId, recipient]);
  
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
    // If someone is typing, show typing indicator instead of last message
    if (isTyping && recipient) {
      return `${recipient.username || 'User'} is typing...`;
    }
    
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
      <div className={styles.avatarSection}>
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
        
        {(unreadCount > 0) && (
          <span className={styles.unreadBadge}>{unreadCount}</span>
        )}
      </div>
      
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={styles.name}>{getConversationName()}</span>
          {conversation.last_message && (
            <span className={styles.time}>
              {formatTimestamp(conversation.last_message.created_at)}
            </span>
          )}
        </div>
        
        <div className={isTyping ? styles.typingPreview : styles.preview}>
          {getLastMessagePreview()}
        </div>
      </div>
    </Button>
  );
};

export default ConversationItem; 