"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FaComment, FaTimes, FaPaperPlane, FaArrowLeft, FaClock, FaCheck, FaCheckDouble } from 'react-icons/fa';
import { Button, NineSliceContainer, Input } from '@/components/UI';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthContext';
import { useUserStatus } from '@/components/Auth/UserStatusContext';
import { useChatPreferences } from '@/components/Theme/ChatPreferencesContext';
import { formatMessageTime, getUserColor } from '@/lib/socialUtils';
import ConversationItem from './ConversationItem';
import AvatarWithStatus from '@/components/UI/AvatarWithStatus';
import toast from 'react-hot-toast';
import styles from './QuickMessageBubble.module.css';

// Define interfaces for better TypeScript support
interface MessageSender {
  id?: string;
  username?: string;
  avatar_url?: string;
}

interface MessageType {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: MessageSender;
  username?: string;
  avatar_url?: string | null;
  status?: string;
  temp?: boolean;
}

interface ConversationParticipant {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface ConversationType {
  id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
  participants: ConversationParticipant[];
  last_message?: MessageType;
  unread_count?: number;
}

const QuickMessageBubble = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { userStatuses } = useUserStatus();
  const { getMessageStyleClass, getChatBackgroundClass, getTextSizeClass } = useChatPreferences();

  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [recipientIsTyping, setRecipientIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingRecordsMapRef = useRef<{[recordId: string]: string}>({});

  // Load conversations when the component mounts
  useEffect(() => {
    if (user) {
      fetchConversations();
      setupUnreadMessagesSubscription();
      setupRealtimeUnreadCounters();
    }
  }, [user]);

  // Setup subscription for new messages to update unread count
  const setupUnreadMessagesSubscription = () => {
    if (!user) return;

    const subscription = supabase
      .channel(`messages-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `is_read=eq.false`
        },
        (payload) => {
          // Ignore messages sent by the current user
          if (payload.new.sender_id !== user.id) {
            console.log('New unread message detected:', payload.new);
            
            // Refresh conversations to get updated unread counts
            fetchConversations();
            
            // If the conversation is already selected, load its messages
            if (selectedConversation?.id === payload.new.conversation_id) {
              fetchMessages(payload.new.conversation_id);
              // Mark the message as read since we're actively viewing the conversation
              markMessageAsRead(payload.new.id);
            } else {
              // Show a toast notification for new messages
              fetchMessageSender(payload.new.sender_id).then(sender => {
                if (sender) {
                  toast(`New message from ${sender.username || 'User'}`, {
                    icon: '💬',
                    position: 'bottom-right'
                  });
                }
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  // Add this new function to setup real-time unread counter updates
  const setupRealtimeUnreadCounters = () => {
    if (!user) return;
    
    console.log('Setting up real-time unread counters');
    
    // Listen for message status updates (when messages are marked as read)
    const readStatusSubscription = supabase
      .channel(`read-status-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=neq.${user.id}`
        },
        (payload) => {
          // If a message's read status has changed
          if (payload.old && payload.new && 
              payload.old.is_read !== payload.new.is_read) {
            console.log('Message read status changed:', payload);
            
            // Refresh conversations to get updated unread counts
            fetchConversations();
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(readStatusSubscription);
    };
  };

  const fetchMessageSender = async (senderId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', senderId)
        .single();
      
      return data;
    } catch (error) {
      console.error('Error fetching message sender:', error);
      return null;
    }
  };

  // Fetch all user conversations
  const fetchConversations = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: conversationsData, error } = await supabase
        .from('conversations')
        .select(`
          id,
          name,
          created_at,
          updated_at,
          participants:conversation_participants(
            user_id,
            profiles(id, username, avatar_url)
          ),
          last_message:messages(
            id,
            content,
            created_at,
            is_read,
            sender_id,
            sender:profiles!sender_id(id, username, avatar_url)
          )
        `)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;

      // Process conversations to include participant information and last message
      const processedConversations = conversationsData?.map(conversation => {
        // Format participants
        const formattedParticipants = conversation.participants.map((p: any) => ({
          id: p.profiles.id,
          username: p.profiles.username,
          avatar_url: p.profiles.avatar_url
        }));

        // Get the most recent message
        let lastMessage = null;
        if (conversation.last_message && conversation.last_message.length > 0) {
          // Sort messages by created_at
          const sortedMessages = [...conversation.last_message].sort(
            (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          const latestMessage = sortedMessages[0];
          lastMessage = {
            id: latestMessage.id,
            conversation_id: conversation.id,
            sender_id: latestMessage.sender_id,
            content: latestMessage.content,
            is_read: latestMessage.is_read,
            created_at: latestMessage.created_at
          };
          
          // Add username if available from sender relationship
          if (latestMessage.sender && latestMessage.sender.username) {
            lastMessage.username = latestMessage.sender.username;
          }
        }

        // Count unread messages - messages that aren't from the current user and aren't read
        const unreadCount = (conversation.last_message || []).filter(
          (msg: any) => !msg.is_read && msg.sender_id !== user.id
        ).length;

        return {
          id: conversation.id,
          name: conversation.name,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at,
          participants: formattedParticipants,
          last_message: lastMessage,
          unread_count: unreadCount
        };
      }) || [];

      setConversations(processedConversations);
      
      // Calculate total unread messages
      const totalUnread = processedConversations.reduce(
        (total, conv) => total + (conv.unread_count || 0), 0
      );
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle the bubble open/closed
  const toggleBubble = () => {
    if (!isOpen) {
      // If opening, refresh conversations but don't mark as read
      fetchConversations();
    }
    setIsOpen(!isOpen);
  };

  // Mark a conversation as read when viewing it
  const viewConversation = (conversation: any) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
  };

  // Select a conversation and load its messages
  const handleSelectConversation = (conversation: any) => {
    viewConversation(conversation);
  };

  // Fetch messages for a specific conversation
  const fetchMessages = async (conversationId: string) => {
    if (!user) return;
    
    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          is_read,
          created_at,
          sender:profiles!sender_id(id, username, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      // Format messages
      const formattedMessages = messagesData ? messagesData.map(message => {
        const sender = message.sender as any;
        return {
          id: message.id,
          conversation_id: message.conversation_id,
          sender_id: message.sender_id,
          content: message.content, 
          is_read: message.is_read,
          created_at: message.created_at,
          username: sender?.username || 'Unknown User',
          avatar_url: sender?.avatar_url || null
        };
      }) : [];

      setMessages(formattedMessages);
      
      // Find unread messages that aren't from the current user
      const unreadMessages = formattedMessages.filter(
        message => !message.is_read && message.sender_id !== user.id
      );

      // Mark messages as read immediately when viewing
      if (unreadMessages.length > 0) {
        markConversationAsRead(unreadMessages.map(msg => msg.id));
      }

      // Scroll to the bottom after messages load
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Mark a message as read
  const markMessageAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);
      
      if (error) throw error;
      
      console.log(`Marked message ${messageId} as read in Supabase`);
      
      // Update local state
      setMessages(prev => 
        prev.map(message => 
          message.id === messageId ? { ...message, is_read: true } : message
        )
      );
      
      // Update conversation list to refresh unread counts - but after a small delay
      // to allow Supabase to process the updates
      setTimeout(() => {
        fetchConversations();
      }, 300);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  // Mark all messages in a conversation as read
  const markConversationAsRead = async (messageIds: string[]) => {
    if (messageIds.length === 0) return;
    
    try {
      // Update messages in Supabase
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', messageIds);
        
      if (error) throw error;
      
      console.log(`Marked ${messageIds.length} messages as read in Supabase`);
      
      // Update local messages state
      setMessages(prev => 
        prev.map(message => 
          messageIds.includes(message.id) ? { ...message, is_read: true } : message
        )
      );
      
      // Update conversation list to refresh unread counts - but after a small delay
      // to allow Supabase to process the updates
      setTimeout(() => {
        fetchConversations();
      }, 300);
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  };

  // Handle typing in the message input
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setNewMessage(newValue);
    
    // Determine if user is typing (has content)
    const userIsTyping = newValue.length > 0;
    
    // Only update if typing status changed
    if (userIsTyping !== isTyping) {
      setIsTyping(userIsTyping);
      
      // Send typing status update
      if (selectedConversation) {
        updateTypingStatus(selectedConversation.id, userIsTyping);
      }
    }
    
    // Always clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    // If user is typing, set a timeout to clear typing status after inactivity
    if (userIsTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        if (selectedConversation) {
          updateTypingStatus(selectedConversation.id, false);
        }
        setIsTyping(false);
      }, 10000); // 10 seconds timeout
    }
  };

  // Update typing status in the database
  const updateTypingStatus = async (conversationId: string, isTyping: boolean) => {
    if (!user || !conversationId) return;
    
    try {
      await supabase.rpc('set_typing_status', {
        p_conversation_id: conversationId,
        p_user_id: user.id,
        p_is_typing: isTyping
      });
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };

  // Set up typing status subscription when a conversation is selected
  useEffect(() => {
    if (!user || !selectedConversation) return;
    
    // Get the other participant (recipient)
    const recipient = selectedConversation.participants.find(
      (p: any) => p.id !== user.id
    );
    
    if (!recipient) return;
    
    // Set up real-time subscription for typing status
    const typingStatusSubscription = supabase
      .channel('public:typing_status')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for all events
          schema: 'public',
          table: 'typing_status',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        (payload: any) => {
          // Handle different event types
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Store record ID for future reference
            if (payload.new && payload.new.id && payload.new.user_id) {
              typingRecordsMapRef.current[payload.new.id] = payload.new.user_id;
            }
            
            // Only update if it's the recipient's typing status
            if (payload.new && payload.new.user_id === recipient.id) {
              setRecipientIsTyping(payload.new.is_typing);
            }
          } 
          else if (payload.eventType === 'DELETE') {
            if (payload.old && payload.old.id) {
              const recordId = payload.old.id;
              const userId = typingRecordsMapRef.current[recordId];
              
              // If this was the recipient's record, set typing to false
              if (userId === recipient.id) {
                setRecipientIsTyping(false);
              }
              
              // Clean up the mapping
              delete typingRecordsMapRef.current[recordId];
            }
          }
        }
      )
      .subscribe();
    
    // Clean up subscription and typing status when unmounting
    return () => {
      supabase.removeChannel(typingStatusSubscription);
      if (isTyping) {
        updateTypingStatus(selectedConversation.id, false);
      }
    };
  }, [selectedConversation, user]);

  // Clean up typing timeout when component unmounts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Close the bubble when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Function to scroll to bottom of messages
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const messagesContainer = document.querySelector(`.${styles.messagesList}`);
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  };

  // Add this effect to ensure scrolling happens when the message panel appears
  useEffect(() => {
    if (isOpen && selectedConversation && messages.length > 0) {
      // Use multiple timeouts to ensure scrolling happens after rendering
      setTimeout(scrollToBottom, 50);
      setTimeout(scrollToBottom, 150);
      setTimeout(scrollToBottom, 300);
    }
  }, [isOpen, selectedConversation, messages.length]);

  // Add back the effect for typing indicators
  useEffect(() => {
    if (selectedConversation && recipientIsTyping) {
      setTimeout(scrollToBottom, 100);
    }
  }, [recipientIsTyping, selectedConversation]);

  // Handle key press for message input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as unknown as React.FormEvent);
    }
  };

  // Send a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !user || !selectedConversation) return;
    
    setSending(true);
    
    // Reset typing status
    updateTypingStatus(selectedConversation.id, false);
    
    // Create a temporary message
    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      conversation_id: selectedConversation.id,
      content: newMessage,
      created_at: new Date().toISOString(),
      sender_id: user.id,
      is_read: false,
      username: user.user_metadata?.username || user.email,
      avatar_url: user.user_metadata?.avatar_url,
      status: 'sending',
      temp: true
    };
    
    // Add to messages immediately
    setMessages(prev => [...prev, tempMessage]);
    scrollToBottom();
    
    // Clear the input
    setNewMessage('');
    
    try {
      // Send to server
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: tempMessage.content
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Replace temp message with real one
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { 
          ...data, 
          username: user.user_metadata?.username || user.email,
          avatar_url: user.user_metadata?.avatar_url,
          temp: false
        } : msg
      ));
      
      // Refresh conversations to update last message
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      
      // Remove the temporary message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // Get the message status icon
  const getMessageStatusIcon = (message: any) => {
    if (message.sender_id === user?.id) {
      if (message.status === 'sending') {
        return <FaClock className={styles.statusIcon} title="Sending..." />;
      } else if (message.is_read) {
        return <FaCheckDouble className={styles.statusIconRead} title="Read" />;
      } else {
        return <FaCheck className={styles.statusIcon} title="Delivered" />;
      }
    }
    return null;
  };

  // Group messages by date
  const getMessageDateGroup = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toDateString();
  };

  // Back to conversation list
  const handleBackToList = () => {
    setSelectedConversation(null);
    setMessages([]);
    // Refresh conversation list to show updated unread counts
    fetchConversations();
  };

  if (!user) return null;

  return (
    <div className={styles.bubbleContainer} ref={bubbleRef}>
      {/* Bubble Button */}
      <Button 
        className={styles.bubbleButton}
        onClick={toggleBubble}
        aria-label="Messages"
        variant="primary"
        size="large"
      >
        <FaComment />
        {unreadCount > 0 && (
          <span className={styles.unreadBadge}>{unreadCount}</span>
        )}
      </Button>

      {/* Message Panel */}
      <AnimatePresence>
        {isOpen && (
          <NineSliceContainer variant="blue" className={styles.messagePanel}>
            <NineSliceContainer className={styles.messagePanelHeader}>
              <div className={styles.messagePanelTitle}>
                {selectedConversation ? (
                  <>
                    <Button 
                      onClick={handleBackToList} 
                      variant="ghost" 
                      className={styles.backButton}
                    >
                      <FaArrowLeft />
                    </Button>
                    <span>
                      {selectedConversation.participants.find((p: any) => p.id !== user.id)?.username || 'Chat'}
                    </span>
                  </>
                ) : (
                  'Messages'
                )}
              </div>
              <Button 
                onClick={() => setIsOpen(false)} 
                variant="ghost" 
                className={styles.closeButton}
              >
                <FaTimes />
              </Button>
            </NineSliceContainer>

            <div className={styles.messagePanelContent}>
              {!selectedConversation ? (
                /* Conversation List */
                <div className={styles.conversationList}>
                  {loading ? (
                    <div className={styles.loading}>Loading conversations...</div>
                  ) : conversations.length === 0 ? (
                    <div className={styles.emptyState}>No conversations yet</div>
                  ) : (
                    conversations.map(conversation => (
                      <ConversationItem
                        key={conversation.id}
                        conversation={conversation}
                        currentUserId={user.id}
                        shouldNavigate={false}
                        onClick={handleSelectConversation}
                      />
                    ))
                  )}
                </div>
              ) : (
                /* Message View */
                <div className={styles.messageView}>
                  <NineSliceContainer className={`${styles.messagesContainer} ${styles[getChatBackgroundClass()]} ${styles[getTextSizeClass()]}`}>
                    {messages.length === 0 ? (
                      <div className={styles.emptyState}>No messages yet. Start the conversation!</div>
                    ) : (
                      <div className={styles.messagesList}>
                        {messages.map((message, index) => {
                          const isOwnMessage = message.sender_id === user.id;
                          const showAuthor = index === 0 || messages[index - 1].sender_id !== message.sender_id;
                          const messageDate = getMessageDateGroup(message.created_at);
                          const showDateDivider = index === 0 || 
                            getMessageDateGroup(messages[index - 1].created_at) !== messageDate;
                            
                          // Get the message style class
                          const messageStyleClass = styles[getMessageStyleClass(isOwnMessage)];
                          
                          return (
                            <React.Fragment key={message.id}>
                              {showDateDivider && (
                                <div className={styles.dateDivider}>
                                  <span>{new Date(messageDate).toLocaleDateString(undefined, { 
                                    weekday: 'long',
                                    month: 'short', 
                                    day: 'numeric',
                                    year: new Date(messageDate).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                                  })}</span>
                                </div>
                              )}
                              
                              <div className={`${styles.messageItem} ${isOwnMessage ? styles.ownMessage : ''}`}>
                                {showAuthor && !isOwnMessage && (
                                  <div className={styles.messageAuthor}>
                                    <AvatarWithStatus
                                      userId={message.sender_id}
                                      avatarUrl={message.avatar_url}
                                      username={message.username || 'User'}
                                      size="small"
                                      className={styles.messageAvatarContainer}
                                    />
                                    <span className={styles.messageUsername}>{message.username}</span>
                                  </div>
                                )}
                                
                                {showAuthor && isOwnMessage && (
                                  <div className={styles.ownMessageIndicator}>You</div>
                                )}
                                
                                <NineSliceContainer variant="ghost" className={styles.messageContent + ' ' + (isOwnMessage ? styles.ownMessageContent : '') + ' ' + messageStyleClass}>
                                  <p className={styles.messageText}>{message.content}</p>
                                  <span className={styles.messageTime}>
                                    {formatMessageTime(message.created_at)}
                                    {getMessageStatusIcon(message)}
                                  </span>
                                </NineSliceContainer>
                              </div>
                            </React.Fragment>
                          );
                        })}
                        
                        {/* Typing indicator */}
                        {recipientIsTyping && (
                          <div className={`${styles.typingIndicator}`}>
                            <NineSliceContainer variant="ghost" className={`${styles.typingIndicatorContent} ${styles[getMessageStyleClass(false)]}`}>
                              <div className={styles.typingDots}>
                                <span></span>
                                <span></span>
                                <span></span>
                              </div>
                              <span className={styles.typingText}>
                                {selectedConversation.participants.find((p: any) => p.id !== user.id)?.username || 'User'} is typing...
                              </span>
                            </NineSliceContainer>
                          </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </NineSliceContainer>
                  
                  <NineSliceContainer className={styles.messageForm} onSubmit={handleSendMessage}>
                    <Input
                      type="text"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={handleTyping}
                      onKeyDown={handleKeyDown}
                      className={styles.messageInput}
                      label=""
                    />
                    <Button 
                      type="submit" 
                      variant="primary"
                      className={styles.sendButton}
                      disabled={sending || !newMessage.trim()}
                    >
                      <FaPaperPlane />
                    </Button>
                  </NineSliceContainer>
                </div>
              )}
            </div>
          </NineSliceContainer>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuickMessageBubble; 