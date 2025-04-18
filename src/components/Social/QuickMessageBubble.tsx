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
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [recipientIsTyping, setRecipientIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingRecordsMapRef = useRef<{[recordId: string]: string}>({});
  
  // --- Pagination State ---
  const [messageLimit] = useState(10);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isScrollListenerActive, setIsScrollListenerActive] = useState(false);
  const isLoadingMoreRef = useRef(false);
  const initialScrollPerformedRef = useRef(false);
  const [windowWidth, setWindowWidth] = useState(0);

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
                    position: 'bottom-left'
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
      // Fetch conversation IDs where the current user is a participant
      const { data: userConvIdsData, error: userConvIdsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (userConvIdsError) throw userConvIdsError;
      if (!userConvIdsData || userConvIdsData.length === 0) {
        setConversations([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      const userConversationIds = userConvIdsData.map(c => c.conversation_id);

      // Fetch conversations based on the IDs found
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
          messages(
            id,
            content,
            created_at,
            is_read,
            sender_id,
            sender:profiles!sender_id(id, username, avatar_url)
          )
        `)
        .in('id', userConversationIds) // Filter by user's conversation IDs
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
        if (conversation.messages && conversation.messages.length > 0) {
          // Sort messages by created_at descending to get the latest
          const sortedMessages = [...conversation.messages].sort(
            (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          const latestMessage = sortedMessages[0];
          lastMessage = {
            id: latestMessage.id,
            conversation_id: conversation.id,
            sender_id: latestMessage.sender_id,
            content: latestMessage.content,
            is_read: latestMessage.is_read,
            created_at: latestMessage.created_at,
            username: undefined // Initialize the username property
          };
          
          // Add username if available from sender relationship
          if (latestMessage.sender) {
            // Ensure sender is not an array (handle potential Supabase inconsistencies)
            const sender = Array.isArray(latestMessage.sender) ? latestMessage.sender[0] : latestMessage.sender;
            if (sender && sender.username) {
              lastMessage.username = sender.username;
            }
          }
        }

        // Count unread messages - messages that aren't from the current user and aren't read
        const unreadCount = (conversation.messages || []).filter(
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
      // Handle the error gracefully, maybe show a toast or message
      toast.error('Could not load your conversations.');
      setConversations([]); // Clear conversations on error
      setUnreadCount(0);
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

  // Select a conversation and load its messages
  const handleSelectConversation = (conversation: any) => {
    setMessages([]);
    setInitialLoadComplete(false);
    setIsScrollListenerActive(false);
    setHasMoreMessages(true);
    initialScrollPerformedRef.current = false;
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
  };

  // Fetch messages for a specific conversation (Implement Pagination)
  const fetchMessages = async (conversationId: string) => {
    if (!user) return;
    setMessagesLoading(true);
    setHasMoreMessages(true);
    setInitialLoadComplete(false);

    try {
      const { data: messagesData, error, count } = await supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          is_read,
          created_at,
          sender:profiles!sender_id(id, username, avatar_url)
        `, { count: 'exact' })
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(0, messageLimit - 1);

      if (error) throw error;

      const formattedMessages = messagesData
        ? messagesData.map(message => {
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
          }).reverse()
        : [];

      setMessages(formattedMessages);

      if (!messagesData || messagesData.length < messageLimit || formattedMessages.length === count) {
        setHasMoreMessages(false);
      }

      // Mark messages as read (consider only visible ones if needed)
      const unreadMessages = formattedMessages.filter(
        message => !message.is_read && message.sender_id !== user.id
      );
      if (unreadMessages.length > 0) {
        markConversationAsRead(unreadMessages.map(msg => msg.id));
      }

    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Could not load messages.');
      setMessages([]);
      setHasMoreMessages(false);
    } finally {
      setMessagesLoading(false);
      setInitialLoadComplete(true);
      // Initial scroll handled by useEffect below
    }
  };

  // --- Function to load older messages ---
  const loadMoreMessages = async () => {
    if (loadingMore || !hasMoreMessages || !user || !selectedConversation) return;

    // Store scroll position *before* fetching and changing height
    const container = messagesContainerRef.current;
    const previousScrollHeight = container ? container.scrollHeight : 0;
    const previousScrollTop = container ? container.scrollTop : 0;

    isLoadingMoreRef.current = true;
    setLoadingMore(true);
    const currentMessageCount = messages.length;
    const conversationId = selectedConversation.id;

    try {
      console.log(`[loadMoreMessages] Loading more messages, offset: ${currentMessageCount}, limit: ${messageLimit}`);
      const { data: olderMessagesData, error } = await supabase
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
        .order('created_at', { ascending: false })
        .range(currentMessageCount, currentMessageCount + messageLimit - 1);

      if (error) throw error;

      if (olderMessagesData && olderMessagesData.length > 0) {
        const formattedOlderMessages = olderMessagesData.map(message => {
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
        }).reverse();
        
        // Prepend messages AND adjust scroll immediately after state update
        setMessages(prevMessages => [...formattedOlderMessages, ...prevMessages]);
        
        // Adjust scroll position immediately after prepending messages
        if (container) {
            // Need a micro-delay for the DOM to update scrollHeight after setMessages
            requestAnimationFrame(() => { 
                const newScrollHeight = container.scrollHeight;
                const newScrollTop = newScrollHeight - previousScrollHeight + previousScrollTop;
                console.log(`[loadMoreMessages] Adjusting scroll immediately. PrevHeight: ${previousScrollHeight}, NewHeight: ${newScrollHeight}, PrevTop: ${previousScrollTop}, NewScrollTop: ${newScrollTop}`);
                container.scrollTop = newScrollTop;
            });
        }

        if (olderMessagesData.length < messageLimit) {
          setHasMoreMessages(false);
        }
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
      toast.error('Could not load older messages.');
    } finally {
      setLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  };

  // --- Scroll handler for infinite loading ---
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!isScrollListenerActive) return;
    
    const container = e.currentTarget;
    console.log(`[Scroll Check] scrollTop: ${container.scrollTop}, hasMore: ${hasMoreMessages}, loadingMore: ${loadingMore}, messagesLoading: ${messagesLoading}`);
    
    // Only trigger loading, don't adjust scroll here
    if (container.scrollTop < 50 && hasMoreMessages && !loadingMore && !messagesLoading) {
      console.log("[handleScroll] Threshold reached, calling loadMoreMessages...");
      // const previousScrollHeight = container.scrollHeight; // No longer needed here
      // const previousScrollTop = container.scrollTop; // No longer needed here
      // console.log(`[handleScroll] Before load - scrollHeight: ${previousScrollHeight}, scrollTop: ${previousScrollTop}`);
      
      loadMoreMessages(); // Just call loadMore
      
      // Remove the .then() and setTimeout logic for scroll adjustment
      /*
      loadMoreMessages().then(() => {
        console.log("[handleScroll] loadMoreMessages finished.");
        setTimeout(() => {
           if (messagesContainerRef.current) { 
              const currentScrollHeight = messagesContainerRef.current.scrollHeight;
              const newScrollTop = currentScrollHeight - previousScrollHeight + previousScrollTop;
              console.log(`[handleScroll] After load (in timeout) - prevHeight: ${previousScrollHeight}, currentHeight: ${currentScrollHeight}, prevTop: ${previousScrollTop}, newTop Calc: ${newScrollTop}`);
              messagesContainerRef.current.scrollTop = newScrollTop;
              console.log(`[handleScroll] ScrollTop set to: ${newScrollTop}`);
           }
        }, 50); 
      });
      */
    }
  };

  // Function to scroll to bottom of messages
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    console.log(`[scrollToBottom] Called with behavior: ${behavior}`);
    if (messagesContainerRef.current) {
        const targetScrollTop = messagesContainerRef.current.scrollHeight;
        console.log(`[scrollToBottom] Container found. Current height: ${messagesContainerRef.current.scrollHeight}, Target scroll top: ${targetScrollTop}`);
        if (behavior === 'smooth') {
            messagesContainerRef.current.scrollTo({
                top: targetScrollTop,
                behavior: 'smooth'
            });
        } else {
            messagesContainerRef.current.scrollTop = targetScrollTop;
        }
        console.log(`[scrollToBottom] Scroll attempt finished. Current scrollTop: ${messagesContainerRef.current.scrollTop}`);
    } else if (messagesEndRef.current) { 
        console.log("[scrollToBottom] Container ref not found, using messagesEndRef fallback.");
        // Fallback if container ref is not ready? Less ideal.
        messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  // Initial scroll to bottom effect - Run ONCE after initial load per conversation
  useEffect(() => {
    if (initialLoadComplete && !initialScrollPerformedRef.current) {
      console.log('[useEffect initialScroll] Running initial scroll and activating listener.');
      if (messages.length > 0) {
         scrollToBottom('auto'); 
      }
      const timer = setTimeout(() => {
        setIsScrollListenerActive(true);
        console.log('[useEffect initialScroll] Scroll listener activated.');
      }, 100);
      initialScrollPerformedRef.current = true; // Mark as done for this conversation load
      return () => clearTimeout(timer);
    }
    // Depend only on initialLoadComplete and selectedConversation to trigger this check once per load
  }, [initialLoadComplete, selectedConversation]);

  // Effect for new message appending and auto-scroll (from subscriptions)
  useEffect(() => {
    if (!user || !selectedConversation) return; // Guard clause

    const channelName = `quick-messages-${selectedConversation.id}-${user.id}`;
    console.log(`[useEffect realtime] Setting up subscription on ${channelName}`);
    
    const messageSubscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        async (payload) => {
           console.log('[useEffect realtime] Received INSERT payload:', payload.new?.id);
           if (payload.new.sender_id === user.id) { 
             console.log('[useEffect realtime] Ignoring self-sent message via subscription.');
             return; 
           }
           
           const messageExists = messages.some(m => m.id === payload.new.id);
           if (messageExists) { 
             console.log(`[useEffect realtime] Message ${payload.new.id} already exists, ignoring.`);
             return; 
           }

           // Use 'any' for participant type in find as a workaround
           const sender = selectedConversation.participants.find((p: any) => p.id === payload.new.sender_id);
           // Explicitly include id and define as any to bypass inference issue
           const newMessage: any = {
                ...payload.new,
                id: payload.new.id, // Ensure id is explicitly included
                username: sender?.username || 'User',
                avatar_url: sender?.avatar_url || null
            };

           // Check scroll position before adding
           const container = messagesContainerRef.current;
           const shouldScroll = !container || (container.scrollHeight - container.scrollTop <= container.clientHeight + 150); 
           console.log(`[useEffect realtime] Message ${newMessage.id}. ShouldScroll: ${shouldScroll}, isLoadingMore: ${isLoadingMoreRef.current}`);

           setMessages(prev => [...prev, newMessage]);
           markMessageAsRead(newMessage.id); // Mark received message as read

           // Only scroll if loading more is NOT in progress and user is near bottom.
           if (shouldScroll && !isLoadingMoreRef.current) { 
                console.log(`[useEffect realtime] Scrolling for new message ${newMessage.id}`);
                setTimeout(() => scrollToBottom('smooth'), 100);
           }
        }
      )
       // Consider adding UPDATE/DELETE handlers if needed in quick bubble
      .subscribe();
      
    return () => {
      console.log(`[useEffect realtime] Unsubscribing from ${channelName}`);
      supabase.removeChannel(messageSubscription);
    }

    // Rerun ONLY if user or selectedConversation changes
  }, [user, selectedConversation]); 

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

  // Add back the effect for typing indicators
  useEffect(() => {
    // Only scroll if not loading older messages
    if (selectedConversation && recipientIsTyping && !isLoadingMoreRef.current) { 
      console.log("[useEffect typing] Scrolling due to typing indicator");
      setTimeout(() => scrollToBottom('smooth'), 100);
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
    updateTypingStatus(selectedConversation.id, false);
    
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
    
    // Append temporary message
    setMessages(prev => [...prev, tempMessage]);
    setTimeout(() => scrollToBottom('smooth'), 50); // Scroll after adding temp message
    
    setNewMessage('');
    
    try {
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
    setInitialLoadComplete(false);
    setIsScrollListenerActive(false);
    fetchConversations();
  };

  // Effect to track window width
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    // Set initial width
    handleResize();

    // Add resize listener
    window.addEventListener('resize', handleResize);

    // Cleanup listener on unmount
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!user) return null;

  return (
    <div className={styles.bubbleContainer} ref={bubbleRef}>
      {/* Bubble Button - Conditionally Rendered based on isOpen and windowWidth */}
      {(!isOpen || windowWidth > 450) && (
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
      )}

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
                (() => {
                  const recipient = selectedConversation.participants.find((p: any) => p.id !== user.id);
                  const recipientName = recipient?.username || 'User';

                  return (
                    <div className={styles.messageView}>
                      <NineSliceContainer 
                        className={`${styles.messagesContainer} ${styles[getChatBackgroundClass()]} ${styles[getTextSizeClass()]}`}
                        ref={messagesContainerRef}
                        onScroll={isScrollListenerActive ? handleScroll : undefined}
                      >
                        {messagesLoading && messages.length === 0 && (
                           <div className={styles.loading}>Loading messages...</div>
                        )}
                        
                        {loadingMore && (
                           <div className={styles.loadingMoreIndicator}>Loading older messages...</div>
                        )}
                        
                        {!messagesLoading && messages.length === 0 && !hasMoreMessages ? (
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
                            
                            {recipientIsTyping && (
                              <div className={`${styles.typingIndicator}`}>
                                <NineSliceContainer variant="ghost" className={`${styles.typingIndicatorContent} ${styles[getMessageStyleClass(false)]}`}>
                                  <div className={styles.typingDots}>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                  </div>
                                  <span className={styles.typingText}>
                                    {recipientName} is typing...
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
                          placeholder={`Message ${recipientName}...`}
                          value={newMessage}
                          onChange={handleTyping}
                          onKeyDown={handleKeyDown}
                          className={styles.messageInput}
                          label=""
                          button={<Button 
                          type="submit" 
                          variant="primary"
                          className={styles.sendButton}
                          disabled={sending || !newMessage.trim()}
                        >
                          <FaPaperPlane />
                        </Button>}
                        />
                      </NineSliceContainer>
                    </div>
                  );
                })()
              )}
            </div>
          </NineSliceContainer>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuickMessageBubble; 