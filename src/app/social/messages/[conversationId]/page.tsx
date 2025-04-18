"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthContext';
import { formatMessageTime, getUserColor } from '@/lib/socialUtils';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import { FaPaperPlane, FaArrowLeft, FaSync, FaTrash, FaEllipsisH, FaPalette, FaFont, FaUndo, FaCheck, FaCheckDouble, FaClock, FaEdit } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatPreferences, MessageStyleOption, TextSizeOption, ChatBackgroundOption } from '@/components/Theme/ChatPreferencesContext';
import styles from './page.module.css';
import toast from 'react-hot-toast';
import { useUserStatus } from '@/components/Auth/UserStatusContext';
import StatusIndicator from '@/components/UI/StatusIndicator';
import AvatarWithStatus from '@/components/UI/AvatarWithStatus';
import { NineSliceContainer } from '@/components/UI';

export default function ConversationPage() {
  const params = useParams();
  const conversationId = Array.isArray(params?.conversationId) 
    ? params.conversationId[0] 
    : params?.conversationId || '';
  const router = useRouter();
  const { user } = useAuth();
  const { userStatuses } = useUserStatus();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<{[key: string]: boolean}>({});
  const [recipientUser, setRecipientUser] = useState<any>(null);
  const [conversationName, setConversationName] = useState<string | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageContent, setEditMessageContent] = useState('');
  const [messageLimit] = useState(10);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showDateDividers, setShowDateDividers] = useState<{[key: string]: boolean}>({});
  const isLoadingMoreRef = useRef(false);
  
  // Chat preferences dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Use the chat preferences context
  const { 
    messageStyle, 
    changeMessageStyle, 
    textSize, 
    changeTextSize, 
    chatBackground, 
    changeChatBackground,
    resetToDefaults,
    getMessageStyleClass,
    getChatBackgroundClass,
    getTextSizeClass
  } = useChatPreferences();
  
  // Add a new state to track if the recipient is typing
  const [recipientIsTyping, setRecipientIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add a ref to track typing status record IDs by user
  const typingRecordsMapRef = useRef<{[recordId: string]: string}>({});
  
  // Define type for typing status payload
  type TypingStatusPayload = {
    new: {
      user_id: string;
      is_typing: boolean;
      [key: string]: any;
    };
    old?: {
      user_id: string;
      is_typing: boolean;
      [key: string]: any;
    };
    [key: string]: any;
  };
  
  const [isScrollListenerActive, setIsScrollListenerActive] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (!conversationId) {
      console.error("Conversation ID is missing");
      toast.error('Invalid conversation link.');
      router.push('/social');
      return;
    }
    
    // Fetch conversation data directly using conversationId
    fetchConversationData(); 
    
  }, [user, conversationId, router]);

  const fetchConversationData = async () => {
    setLoading(true);
    if (!user || !conversationId) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch conversation details including participants
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .select(`
          id,
          name,
          participants:conversation_participants(
            user_id,
            profiles(id, username, avatar_url)
          )
        `)
        .eq('id', conversationId)
        .single();

      if (conversationError) throw conversationError;
      if (!conversationData) {
        toast.error('Conversation not found.');
        router.push('/social');
        return;
      }

      // 2. Check if current user is a participant
      const isParticipant = conversationData.participants.some(
        (p: any) => p.user_id === user.id
      );

      if (!isParticipant) {
        toast.error('You do not have access to this conversation.');
        router.push('/social');
        return;
      }
      
      // 3. Determine recipient(s) and set state
      const otherParticipants = conversationData.participants
        .filter((p: any) => p.user_id !== user.id)
        .map((p: any) => p.profiles); // Get the profile info

      setParticipants(otherParticipants); // Store all other participants

      // For now, assume one recipient for display purposes (can be enhanced for group chat)
      if (otherParticipants.length > 0) {
        setRecipientUser(otherParticipants[0]); 
      } else {
        // Handle case where user is the only participant (e.g., notes to self)
        setRecipientUser(user.user_metadata); // Or set to null/handle differently
      }

      setConversationName(conversationData.name); // Set conversation name

      // 4. Fetch messages for this conversation
      fetchMessages(); 

    } catch (error) {
      console.error('Error fetching conversation data:', error);
      toast.error('Failed to load conversation.');
      router.push('/social');
    } finally {
       setLoading(false); // Moved to fetchMessages
    }
  };
  
  const fetchMessages = async () => {
    if (!user || !conversationId) return;
    setLoading(true);
    setHasMoreMessages(true);
    setInitialLoadComplete(false);

    try {
      const { data: messagesData, error, count } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id(id, username, avatar_url)
        `, { count: 'exact' })
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(0, messageLimit - 1);

      if (error) throw error;

      const formattedMessages = messagesData 
        ? messagesData.map(message => ({
            ...message,
            username: message.sender?.username || 'Unknown User',
            avatar_url: message.sender?.avatar_url,
          })).reverse()
        : [];
      
      setMessages(formattedMessages);
      
      if (!messagesData || messagesData.length < messageLimit || formattedMessages.length === count) {
        setHasMoreMessages(false);
      }

      markConversationAsRead();

    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Could not load messages.');
      setMessages([]);
      setHasMoreMessages(false);
    } finally {
       setLoading(false);
       setInitialLoadComplete(true);
       setTimeout(scrollToBottom, 100); 
    }
  };

  useEffect(() => {
    // Remove the old useEffect that depended on recipientUser for initial setup
    // Keep the interval if needed, but ensure recipientUser is set before using it
    if (!user || !conversationId) return; // Basic check
    
    const refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') { // Only refresh if tab is active
         console.log('Performing periodic refresh of messages');
         refreshMessages(false); // Don't scroll on auto-refresh
      }
    }, 15000); // Check every 15 seconds
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [user, conversationId]); // Depends only on user and conversationId now

  useEffect(() => {
    // Realtime subscription setup - ensure recipientUser is available if needed inside
    if (!user || !conversationId) return;

    const channelName = `messages-channel-${conversationId}-${user.id}`;
    console.log(`Setting up real-time subscription on channel: ${channelName}`);
    
    const messageSubscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          console.log(`New message received in conversation ${conversationId}:`, payload.new);
          
          // Check if message already exists (including temporary)
          const messageExists = messages.some(m => m.id === payload.new.id || (m.temp && m.id === `temp-${payload.new.created_at}`));
          if (messageExists) {
             console.log('Message already exists, updating or ignoring.');
             // Update logic remains mostly the same, ensure status updates correctly
             setMessages(prevMessages => prevMessages.map(msg => {
                // If it's the confirmed message matching the payload ID
                if (msg.id === payload.new.id) return { ...msg, ...payload.new, temp: false };
                // If it's a temp message matching content and sender (more reliable than timestamp)
                if (msg.temp && msg.content === payload.new.content && msg.sender_id === payload.new.sender_id) {
                  console.log(`Replacing temp message with confirmed message ${payload.new.id}`);
                  return {
                    ...payload.new,
                    username: msg.username, // Keep temp username/avatar if needed
                    avatar_url: msg.avatar_url,
                    temp: false
                  };
                }
                return msg;
             }));
            return;
          }

          // Process and add the new message
          try {
            // Determine sender profile (check participants first, then current user)
            const senderProfile = participants.find(p => p.id === payload.new.sender_id) ||
                                  (payload.new.sender_id === user?.id ? user.user_metadata : null);

            const newMessageData: any = {
              ...payload.new,
              username: senderProfile?.username || 'User',
              avatar_url: senderProfile?.avatar_url,
              temp: false,
            };

            // Check scroll position BEFORE adding the new message
            const container = messagesContainerRef.current;
            // Should scroll if near the bottom or container not yet available
            const shouldScroll = !container || (container.scrollHeight - container.scrollTop <= container.clientHeight + 150); // Threshold can be adjusted
            console.log(`[Realtime INSERT] Message ${newMessageData.id}. ShouldScroll: ${shouldScroll}, isLoadingMore: ${isLoadingMoreRef.current}`);

            // Append the new message to the END of the array
            setMessages(prevMessages => [...prevMessages, newMessageData]);

            // Mark as read if received from another user
            if (newMessageData.sender_id !== user.id) {
              markMessageAsRead(newMessageData.id);
            }

            // Scroll down only if user was near the bottom AND not loading history
            if (shouldScroll && !isLoadingMoreRef.current) {
              console.log(`[Realtime INSERT] Scrolling for new message ${newMessageData.id}`);
              setTimeout(() => scrollToBottom('smooth'), 50); // Delay slightly for render
            }

          } catch (error) {
            console.error('Error processing new message:', error);
          }
        }
      )
      // Add listener for message updates (e.g., is_read changes)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('Message update received:', payload);
          setMessages(prevMessages => 
            prevMessages.map(message => 
              message.id === payload.new.id 
                ? { ...message, ...payload.new } // Update the message with new data
                : message
            )
          );
          // Potentially update read status display if needed
        }
      )
      // Add listener for message deletions
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('Message delete received:', payload);
          setMessages(prevMessages => 
            prevMessages.filter(message => message.id !== payload.old.id)
          );
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to ${channelName}`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`Subscription error on ${channelName}:`, err);
          toast.error('Real-time connection error. Please refresh.');
        }
        if (status === 'TIMED_OUT') {
          console.warn(`Subscription timed out on ${channelName}. Retrying maybe needed.`);
          toast('Real-time connection timed out.', { icon: '⏳' });
        }
      });

    // Set up typing status subscription
    let typingStatusSubscription: any = null;
    if (recipientUser) { // Check if recipientUser is determined
      const typingChannelName = `typing-channel-${conversationId}-${user.id}`;
      console.log(`Setting up typing subscription on channel: ${typingChannelName}`);
      typingStatusSubscription = supabase
        .channel(typingChannelName) // Use a different channel name for typing
        .on(
          'postgres_changes' as any, // Use type assertion to bypass overload error
          {
            event: '*', // Listen for INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'typing_status',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload: TypingStatusPayload) => {
             console.log('Typing status change received:', payload);

            // Handle different event types
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              if (payload.new && payload.new.user_id && payload.new.user_id !== user.id) {
                 // Store record ID for future reference if needed
                 if (payload.new.id) typingRecordsMapRef.current[payload.new.id] = payload.new.user_id;
                 setRecipientIsTyping(payload.new.is_typing);

                 // Check scroll position and loading state BEFORE scrolling for typing
                 const container = messagesContainerRef.current;
                 const shouldScroll = !container || (container.scrollHeight - container.scrollTop <= container.clientHeight + 150);
                 console.log(`[Typing Status] Recipient typing: ${payload.new.is_typing}. ShouldScroll: ${shouldScroll}, isLoadingMore: ${isLoadingMoreRef.current}`);

                 // Scroll when recipient starts typing only if user is near bottom AND not loading history
                 if (payload.new.is_typing && shouldScroll && !isLoadingMoreRef.current) {
                     console.log("[Typing Status] Scrolling due to recipient typing");
                     setTimeout(() => scrollToBottom('smooth'), 50); // Delay slightly
                 }
              }
            }
            else if (payload.eventType === 'DELETE') {
               if (payload.old && payload.old.user_id && payload.old.user_id !== user.id) {
                   const recordId = payload.old.id;
                   // If this was the recipient's record, set typing to false
                   // We might not need the map if we just check user_id != user.id
                   setRecipientIsTyping(false); 
                   // Clean up the mapping if used
                   if (recordId) delete typingRecordsMapRef.current[recordId];
               }
            }
          }
        )
        .subscribe((status, err) => {
           if (status === 'SUBSCRIBED') {
               console.log(`Successfully subscribed to typing status on ${typingChannelName}`);
           }
           if (status === 'CHANNEL_ERROR') {
               console.error(`Typing subscription error on ${typingChannelName}:`, err);
           }
        });
    }

    return () => {
      console.log(`Unsubscribing from channel: ${channelName}`);
      supabase.removeChannel(messageSubscription);
      if (typingStatusSubscription) {
         console.log(`Unsubscribing from typing status channel`);
         supabase.removeChannel(typingStatusSubscription);
         // Ensure typing status is cleared on unmount if user was typing
         if (isTyping) {
             updateTypingStatus(false);
         }
      }
      // Clear typing timeout on unmount
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [user, conversationId, recipientUser, messages, participants]);

  const refreshMessages = async (shouldScrollToBottom = false) => {
    if (!user || !conversationId || refreshing) return;
    
    setRefreshing(true);
    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id(id, username, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      const formattedMessages = messagesData ? messagesData.map(message => ({
        ...message,
        username: message.sender?.username || 'Unknown User',
        avatar_url: message.sender?.avatar_url,
      })) : [];

      // Basic reconciliation: Only update if length differs or last message ID differs
      if (messages.length !== formattedMessages.length || 
          (messages.length > 0 && messages[messages.length - 1].id !== formattedMessages[formattedMessages.length - 1].id)) {
          setMessages(formattedMessages);
          if (shouldScrollToBottom) {
            setTimeout(scrollToBottom, 100);
          }
      }
      
      // Refresh participant data in case someone joined/left (less common)
      // This might be better handled by a separate subscription if needed frequently
      // await fetchConversationData(); // Re-fetching all data might be too heavy

    } catch (error) {
      console.error('Error refreshing messages:', error);
      toast.error('Failed to refresh messages.');
    } finally {
      setRefreshing(false);
    }
  };
  
  const markMessageAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };
  
  const markConversationAsRead = async () => {
    try {
      // Only mark other people's messages as read
      const unreadMessages = messages.filter(
        message => !message.is_read && message.sender_id !== user?.id
      );
      
      if (unreadMessages.length === 0) return;
      
      const unreadIds = unreadMessages.map(message => message.id);
      
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', unreadIds);
      
      if (error) throw error;
      
      // Update the local messages state
      setMessages(prev => 
        prev.map(message => 
          unreadIds.includes(message.id) 
            ? { ...message, is_read: true } 
            : message
        )
      );
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
      updateTypingStatus(userIsTyping);
    }
    
    // Always clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    // If user is typing, set a timeout to clear typing status after inactivity
    if (userIsTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        console.log('Typing timeout reached, setting typing status to false');
        updateTypingStatus(false);
        setIsTyping(false);
      }, 10000); // 10 seconds timeout, matching Android implementation
    }
  };

  // Handle key press for message input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as unknown as React.FormEvent);
    }
  };

  // Function to update typing status in the database
  const updateTypingStatus = async (isTyping: boolean) => {
    try {
      // Skip the update if conversationId or user is not available
      if (!conversationId || !user?.id) {
        console.error('Cannot update typing status: missing conversationId or userId');
        return;
      }
      
      console.log(`⚠️⚠️⚠️ SENDING TYPING STATUS UPDATE ⚠️⚠️⚠️`);
      console.log(`⚠️ Status: ${isTyping}, conversation: ${conversationId}, user: ${user?.id}`);
      
      // Update to match Android implementation by explicitly including user_id
      const result = await supabase.rpc('set_typing_status', {
        p_conversation_id: conversationId,
        p_user_id: user?.id,
        p_is_typing: isTyping
      });
      
      if (result.error) {
        console.error('Error in typing status RPC call:', result.error);
        throw result.error;
      }
      
      console.log('⚠️ Typing status update successful:', result);
    } catch (error) {
      console.error('⚠️ Error updating typing status:', error);
    }
  };

  // Make sure to clean up timeout and set typing status to false when unmounting
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set typing status to false when leaving the conversation
      // This matches the Android implementation's DisposableEffect cleanup
      if (isTyping) {
        console.log('Cleaning up typing status on page unmount');
        updateTypingStatus(false);
      }
    };
  }, [isTyping]);

  // Add a function to render message status indicator
  const getMessageStatusIcon = (message: any) => {
    // For messages sent by the current user
    if (message.sender_id === user?.id) {
      // If we're still sending (temporary state before supabase insert)
      if (message.status === 'sending') {
        return <FaClock className="text-gray-400 ml-1 text-xs" title="Sending..." />;
      }
      // If message has been read
      else if (message.is_read) {
        return <FaCheckDouble className="text-blue-500 ml-1 text-xs" title="Read" />;
      }
      // If message has been delivered but not read
      else {
        return <FaCheck className="text-gray-400 ml-1 text-xs" title="Delivered" />;
      }
    }
    return null;
  };

  // Modify the handleSendMessage function to better handle temporary messages
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !user) return;
    
    setSending(true);
    
    // Reset typing status
    updateTypingStatus(false);
    
    // Create a temporary message with sending status
    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      content: newMessage,
      created_at: new Date().toISOString(),
      sender_id: user.id,
      is_read: false,
      username: user.user_metadata?.username || user.email,
      avatar_url: user.user_metadata?.avatar_url,
      status: 'sending', // Adding a temporary status
      temp: true // Flag to identify this as a temporary message
    };
    
    // Add to messages immediately to show in UI
    setMessages(prev => [...prev, tempMessage]);
    scrollToBottom();
    
    // Clear the input
    setNewMessage('');
    
    try {
      // Then send to server
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: tempMessage.content
        })
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('Message sent successfully:', data);
      
      // Replace temp message with real one to prevent duplicates
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { 
          ...data, 
          username: user.user_metadata?.username || user.email,
          avatar_url: user.user_metadata?.avatar_url,
          temp: false // Mark as a real message
        } : msg
      ));
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      
      // Remove the temporary message on error
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
    } finally {
      setSending(false);
    }
  };

  // New function to group messages by date
  const getMessageDateGroup = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toDateString();
  };
  
  // Function to scroll to bottom with optional behavior
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    // Use messagesContainerRef to scroll the container itself
    if (messagesContainerRef.current) {
      if (behavior === 'smooth') {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      } else { // 'auto' or other
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }
    /* 
    // Previous method using scrollIntoView on a target element
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
    */
  };
  
  // Initial scroll to bottom effect (only runs once after initial load)
  useEffect(() => {
    if (initialLoadComplete && messages.length > 0 && !initialScrollPerformedRef.current) {
      console.log("[useEffect initialScroll] Performing initial scroll and activating listener.");
      // Scroll first
      scrollToBottom('auto'); // Use 'auto' for instant scroll on initial load

      // Then activate the scroll listener after a short delay
      const timer = setTimeout(() => {
        setIsScrollListenerActive(true);
        console.log("[useEffect initialScroll] Scroll listener activated.");
      }, 100); // Adjust delay if needed

      initialScrollPerformedRef.current = true; // Mark as done
      return () => clearTimeout(timer);
    }
    // Depend only on initialLoadComplete to trigger this check once per full load cycle
  }, [initialLoadComplete]);

  // Add this ref for initial scroll tracking
  const initialScrollPerformedRef = useRef(false);

  // Reset initial scroll flag when conversation changes (if applicable, depends on component structure)
  // Assuming fetchConversationData is called when the conversationId param changes:
  useEffect(() => {
      initialScrollPerformedRef.current = false; // Reset on conversation change
      // Any other state reset needed when conversation switches
  }, [conversationId]);

  const getParticipantNames = () => {
    // Use the participants state which contains the other users' profiles
    if (participants.length > 0) {
      return participants.map(p => p.username || 'User').join(', ');
    }
    // Handle case with no other participants (e.g., notes to self)
    return user?.user_metadata?.username || 'Conversation'; 
  };

  // Handle right click on message
  const handleMessageRightClick = (e: React.MouseEvent, messageId: string) => {
    e.preventDefault();
    
    // If clicking the same message again, toggle the active state
    if (activeMessageId === messageId) {
      setActiveMessageId(null);
    } else {
      setActiveMessageId(messageId);
    }
  };

  // Close active message when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeMessageId && !editingMessageId) {
        const target = e.target as HTMLElement;
        // Don't close if clicking on action buttons
        if (!target.closest(`.${styles.messageActionButtons}`)) {
          setActiveMessageId(null);
        }
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeMessageId, editingMessageId]);

  // Check if message is within 15 minutes timeframe
  const isWithin15Minutes = (timestamp: string) => {
    const messageTime = new Date(timestamp).getTime();
    const currentTime = new Date().getTime();
    const timeDifference = currentTime - messageTime;
    const fifteenMinutesInMs = 15 * 60 * 1000;
    
    return timeDifference <= fifteenMinutesInMs;
  };

  // Handle editing a message
  const handleEditMessage = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.sender_id !== user?.id) {
      toast.error("You can only edit your own messages");
      return;
    }
    
    if (!isWithin15Minutes(message.created_at)) {
      toast.error("You can only edit messages within 15 minutes of sending");
      return;
    }
    
    setEditingMessageId(messageId);
    setEditMessageContent(message.content);
  };

  // Save edited message
  const saveEditedMessage = async () => {
    if (!editingMessageId || !editMessageContent.trim()) return;
    
    try {
      const { error } = await supabase
        .from('messages')
        .update({ content: editMessageContent })
        .eq('id', editingMessageId);
      
      if (error) throw error;
      
      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.id === editingMessageId 
          ? { ...msg, content: editMessageContent } 
          : msg
      ));
      
      toast.success('Message updated');
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error('Failed to update message');
    } finally {
      setEditingMessageId(null);
      setActiveMessageId(null);
      setEditMessageContent('');
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditMessageContent('');
  };

  const handleDeleteMessage = async (messageId: string) => {
    // Only allow users to delete their own messages
    const message = messages.find(m => m.id === messageId);
    if (!message || message.sender_id !== user?.id) {
      toast.error("You can only delete your own messages");
      return;
    }
    
    // Check if the message is within 15 minutes of sending
    if (!isWithin15Minutes(message.created_at)) {
      toast.error("You can only delete messages within 15 minutes of sending");
      return;
    }
    
    if (!confirm('Are you sure you want to delete this message?')) {
      return;
    }
    
    setActiveMessageId(null);
    setDeleteLoading(prev => ({ ...prev, [messageId]: true }));
    
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);
      
      if (error) throw error;
      
      // Update local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    } finally {
      setDeleteLoading(prev => ({ ...prev, [messageId]: false }));
    }
  };
  
  // Toggle the dropdown menu
  const toggleDropdown = () => {
    setDropdownOpen(prev => !prev);
  };
  
  // Change message style with the context function
  const handleChangeMessageStyle = (style: MessageStyleOption) => {
    changeMessageStyle(style);
    toast.success(`Message style changed!`);
    setDropdownOpen(false);
  };
  
  // Change chat background with the context function
  const handleChangeChatBackground = (background: ChatBackgroundOption) => {
    changeChatBackground(background);
    toast.success(`Chat background changed!`);
    setDropdownOpen(false);
  };
  
  // Change text size with the context function
  const handleChangeTextSize = (size: TextSizeOption) => {
    changeTextSize(size);
    toast.success(`Text size changed to ${size}!`);
    setDropdownOpen(false);
  };
  
  // Reset all preferences to defaults
  const handleResetToDefaults = () => {
    resetToDefaults();
    toast.success("Default style restored");
    setDropdownOpen(false);
  };

  // Function to directly test typing status (for debugging)
  const setTypingForTesting = (isTyping: boolean) => {
    console.log(`⚠️ Directly setting typing status to: ${isTyping}`);
    setRecipientIsTyping(isTyping);
  };

  // --- Function to load older messages ---
  const loadMoreMessages = async () => {
    if (loadingMore || !hasMoreMessages || !user || !conversationId) return;

    // Store scroll position *before* fetching and changing height
    const container = messagesContainerRef.current;
    const previousScrollHeight = container ? container.scrollHeight : 0;
    const previousScrollTop = container ? container.scrollTop : 0;

    isLoadingMoreRef.current = true; // <-- Set loading flag
    setLoadingMore(true);
    const currentMessageCount = messages.length;

    try {
      console.log(`[loadMoreMessages] Loading more messages, offset: ${currentMessageCount}, limit: ${messageLimit}`);
      const { data: olderMessagesData, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id(id, username, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false }) // Fetch latest first within the range
        .range(currentMessageCount, currentMessageCount + messageLimit - 1);

      if (error) throw error;

      if (olderMessagesData && olderMessagesData.length > 0) {
        const formattedOlderMessages = olderMessagesData.map(message => ({
          ...message,
          username: message.sender?.username || 'Unknown User',
          avatar_url: message.sender?.avatar_url,
        })).reverse(); // Reverse fetched batch to maintain chronological order when prepending

        // Prepend messages AND adjust scroll immediately after state update
        setMessages(prevMessages => [...formattedOlderMessages, ...prevMessages]);

        // Adjust scroll position immediately after prepending messages
        if (container) {
            // Use requestAnimationFrame for immediate DOM update handling
            requestAnimationFrame(() => {
                const newScrollHeight = container.scrollHeight;
                const scrollOffset = newScrollHeight - previousScrollHeight;
                const newScrollTop = previousScrollTop + scrollOffset;
                console.log(`[loadMoreMessages] Adjusting scroll. PrevHeight: ${previousScrollHeight}, NewHeight: ${newScrollHeight}, PrevTop: ${previousScrollTop}, Offset: ${scrollOffset}, NewScrollTop: ${newScrollTop}`);
                container.scrollTop = newScrollTop;
            });
        }

        // If we fetched fewer messages than the limit, we've reached the beginning
        if (olderMessagesData.length < messageLimit) {
          setHasMoreMessages(false);
        }
      } else {
        // No more messages were returned
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
      toast.error('Could not load older messages.');
    } finally {
      setLoadingMore(false);
      isLoadingMoreRef.current = false; // <-- Unset loading flag
    }
  };

  // --- Scroll handler for infinite loading ---
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!isScrollListenerActive) return; // Don't handle scroll if listener isn't active

    const container = e.currentTarget;
    console.log(`[Scroll Check] scrollTop: ${container.scrollTop}, hasMore: ${hasMoreMessages}, loadingMore: ${loadingMore}`);

    // Load more when scrolled near the top - ONLY trigger loading here
    if (container.scrollTop < 50 && hasMoreMessages && !loadingMore && !isLoadingMoreRef.current) { // Added isLoadingMoreRef check here too
      console.log("[handleScroll] Scroll threshold reached, calling loadMoreMessages...");
      loadMoreMessages(); // Just call loadMore, adjustment is inside it now

      // REMOVED: Scroll adjustment logic moved to loadMoreMessages
      /*
      loadMoreMessages().then(() => {
        // After loading, adjust scroll position to keep view stable
        // Use setTimeout for a slightly longer delay than requestAnimationFrame
        setTimeout(() => {
           if (messagesContainerRef.current) { // Check ref still exists
              const newScrollTop = messagesContainerRef.current.scrollHeight - previousScrollHeight;
              console.log(`Adjusting scroll. PrevHeight: ${previousScrollHeight}, NewHeight: ${messagesContainerRef.current.scrollHeight}, NewScrollTop: ${newScrollTop}`);
              messagesContainerRef.current.scrollTop = newScrollTop;
           }
        }, 50); // 50ms delay, adjust if necessary
      });
      */
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <div className={styles.loading}>Loading conversation...</div>
      </div>
    );
  }

  // Get the avatar or default avatar for the recipient
  const recipientAvatar = participants.length > 0 ? participants[0].avatar_url : null; // Simplified recipient logic assuming 1-on-1 for avatar
  const recipientName = participants.length > 0 ? participants[0].username : (conversationName || 'Conversation'); // Use first participant or convo name
  
  // Compose class names for elements based on preferences
  const backgroundClass = styles[getChatBackgroundClass()];
  const textSizeClass = styles[getTextSizeClass()];
  
  return (
    <motion.div 
      className={styles.conversationPage}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <NineSliceContainer 
        variant={chatBackground !== 1 ? "ghost" : undefined} 
        className={`${styles.conversationHeader} ${styles.elevatedCard} ${backgroundClass}`}>
        <Button 
          variant="ghost"
          size="medium"
          onClick={() => router.push('/social?tab=messages')}
          className={styles.backButton}
        >
          <FaArrowLeft />
        </Button>
        
        <div className={styles.recipientInfo}>
          {recipientUser ? (
            <AvatarWithStatus
              userId={recipientUser.id}
              avatarUrl={recipientAvatar}
              username={recipientName}
              size="medium"
              className={styles.recipientAvatarContainer}
            />
          ) : (
            <div className={styles.avatarContainer}>
              <div 
                className={styles.recipientDefaultAvatar}
                style={{ 
                  backgroundColor: getUserColor(recipientName) 
                }}
              >
                {recipientName[0]}
              </div>
            </div>
          )}
          <div className={styles.recipientDetails}>
            <h2 className={styles.conversationTitle}>
              {getParticipantNames()}
            </h2>
            {recipientUser && (
              <div className={styles.onlineStatus}>
                <StatusIndicator 
                  status={userStatuses[recipientUser.id]?.status || 'offline'} 
                  showDot={false}
                  showText={true}
                />
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.headerActions}>
          <Button 
            variant="ghost"
            onClick={() => refreshMessages(true)}
            disabled={refreshing}
            className={`${styles.refreshButton} ${styles.iconButton}`}
            aria-label="Refresh messages"
            size="medium"
          >
            <FaSync className={refreshing ? styles.spin : ''} />
          </Button>
          
            <Button 
              variant="ghost"
              onClick={toggleDropdown}
              aria-label="More options"
              className={`${styles.moreOptionsButton} ${styles.iconButton}`}
              size="medium"
            >
              <FaEllipsisH />
            </Button>
            
            <NineSliceContainer className={`${styles.dropdown} ${dropdownOpen ? styles.dropdownOpen : ''}`}>
              <NineSliceContainer className={styles.dropdownHeader}>Customize Chat</NineSliceContainer>
              <div className={styles.dropdownSection}>
                <div className={styles.dropdownTitle}>Your Message Style</div>
                <div className={styles.colorOptions}>
                  {/* Default style */}
                  <Button 
                    variant="ghost"
                    className={`${styles.colorOption} ${styles.bgColorOption1} ${messageStyle === 1 ? styles.colorOptionActive : ''}`}
                    onClick={() => handleChangeMessageStyle(2)}
                    aria-label="Primary"
                  />
                  <Button 
                    variant="ghost"
                    className={`${styles.colorOption} ${styles.bgColorOption2} ${messageStyle === 2 ? styles.colorOptionActive : ''}`}
                    onClick={() => handleChangeMessageStyle(3)}
                    aria-label="Primary Light"
                  />
                  <Button 
                    variant="ghost"
                    className={`${styles.colorOption} ${styles.bgColorOption3} ${messageStyle === 3 ? styles.colorOptionActive : ''}`}
                    onClick={() => handleChangeMessageStyle(4)}
                    aria-label="Primary Dark"
                  />
                  <Button 
                    variant="ghost"
                    className={`${styles.colorOption} ${styles.bgColorOption4} ${messageStyle === 4 ? styles.colorOptionActive : ''}`}
                    onClick={() => handleChangeMessageStyle(5)}
                    aria-label="Secondary"
                  />
                  <Button 
                    variant="ghost"
                    className={`${styles.colorOption} ${styles.bgColorOption5} ${messageStyle === 5 ? styles.colorOptionActive : ''}`}
                    onClick={() => handleChangeMessageStyle(6)}
                    aria-label="Secondary Light"
                  />
                  <Button 
                    variant="ghost"
                    className={`${styles.colorOption} ${styles.bgColorOption6} ${messageStyle === 6 ? styles.colorOptionActive : ''}`}
                    onClick={() => handleChangeMessageStyle(7)}
                    aria-label="Secondary Dark"
                  />
                  <Button 
                    variant="ghost"
                    className={`${styles.colorOption} ${styles.bgColorOption7} ${messageStyle === 7 ? styles.colorOptionActive : ''}`}
                    onClick={() => handleChangeMessageStyle(8)}
                    aria-label="Red"
                  />
                  <Button 
                    variant="ghost"
                    className={`${styles.colorOption} ${styles.bgColorOption8} ${messageStyle === 8 ? styles.colorOptionActive : ''}`}
                    onClick={() => handleChangeMessageStyle(9)}
                    aria-label="Green"
                  />
                  <Button 
                    variant="ghost"
                    className={`${styles.colorOption} ${styles.bgColorOption9} ${messageStyle === 9 ? styles.colorOptionActive : ''}`}
                    onClick={() => handleChangeMessageStyle(10)}
                    aria-label="Orange"
                  />
                  <Button 
                    variant="ghost"
                    className={`${styles.colorOption} ${styles.bgColorOption10} ${messageStyle === 10 ? styles.colorOptionActive : ''}`}
                    onClick={() => handleChangeMessageStyle(11)}
                    aria-label="Purple"
                  />
                </div>
              </div>
              
              <div className={styles.dropdownSection}>
                <div className={styles.dropdownTitle}>Chat Background</div>
                <div className={styles.colorOptions}>
                  {/* Default background */}
                  <Button 
                    variant="ghost"
                    className={`${styles.colorOption} ${styles.chatBackground1} ${chatBackground === 1 ? styles.colorOptionActive : ''}`}
                    style={{ background: "#111111" }}
                    onClick={() => handleChangeChatBackground(2)}
                    aria-label="Dark Background"
                  />
                  <Button 
                    variant="ghost"
                    className={`${styles.colorOption} ${styles.chatBackground2} ${chatBackground === 2 ? styles.colorOptionActive : ''}`}
                    style={{ background: "#1e1e1e" }}
                    onClick={() => handleChangeChatBackground(3)}
                    aria-label="Dark Surface"
                  />
                  <Button 
                    variant="ghost"
                    className={`${styles.colorOption} ${styles.chatBackground3} ${chatBackground === 3 ? styles.colorOptionActive : ''}`}
                    style={{ background: "#f9f8fb" }}
                    onClick={() => handleChangeChatBackground(4)}
                    aria-label="Light Background"
                  />
                  <Button 
                    variant="ghost"
                    className={`${styles.colorOption} ${styles.chatBackground4} ${chatBackground === 4 ? styles.colorOptionActive : ''}`}
                    style={{ background: "#ffffff" }}
                    onClick={() => handleChangeChatBackground(5)}
                    aria-label="Light Surface"
                  />
                  <Button 
                    variant="ghost"
                    className={`${styles.colorOption} ${styles.chatBackground5} ${chatBackground === 5 ? styles.colorOptionActive : ''}`}
                    style={{ background: "#320d45" }}
                    onClick={() => handleChangeChatBackground(6)}
                    aria-label="Primary Background"
                  />
                  <Button 
                    variant="ghost"
                    className={`${styles.colorOption} ${styles.chatBackground6} ${chatBackground === 6 ? styles.colorOptionActive : ''}`}
                    style={{ background: "#1f2545" }}
                    onClick={() => handleChangeChatBackground(7)}
                    aria-label="Secondary Background"
                  />
                  <Button 
                    variant="ghost"
                    className={`${styles.colorOption} ${styles.chatBackground7} ${chatBackground === 7 ? styles.colorOptionActive : ''}`}
                    style={{ background: "#4c0c0c" }}
                    onClick={() => handleChangeChatBackground(8)}
                    aria-label="Red Background"
                  />
                  <Button 
                    variant="ghost"
                    className={`${styles.colorOption} ${styles.chatBackground8} ${chatBackground === 8 ? styles.colorOptionActive : ''}`}
                    style={{ background: "#0b320b" }}
                    onClick={() => handleChangeChatBackground(9)}
                    aria-label="Green Background"
                  />
                  <Button 
                    variant="ghost"
                    className={`${styles.colorOption} ${styles.chatBackground9} ${chatBackground === 9 ? styles.colorOptionActive : ''}`}
                    style={{ background: "#332400" }}
                    onClick={() => handleChangeChatBackground(10)}
                    aria-label="Orange Background"
                  />
                  <Button 
                    variant="ghost"
                    className={`${styles.colorOption} ${styles.chatBackground10} ${chatBackground === 10 ? styles.colorOptionActive : ''}`}
                    style={{ background: "#250425" }}
                    onClick={() => handleChangeChatBackground(11)}
                    aria-label="Purple Background"
                  />
                </div>
              </div>
              
              <div className={styles.dropdownSection}>
                <div className={styles.dropdownTitle}>Text Size</div>
                <div className={styles.textSizeOptions}>
                  <Button 
                    className={`${styles.textSizeButton} ${textSize === 'x-small' ? styles.activeTextSize : ''}`}
                    onClick={() => handleChangeTextSize('x-small')}
                    variant="ghost"
                  >
                    XS
                  </Button>
                  <Button 
                    className={`${styles.textSizeButton} ${textSize === 'small' ? styles.activeTextSize : ''}`}
                    onClick={() => handleChangeTextSize('small')}
                    variant="ghost"
                  >
                    S
                  </Button>
                  <Button 
                    className={`${styles.textSizeButton} ${textSize === 'medium' ? styles.activeTextSize : ''}`}
                    onClick={() => handleChangeTextSize('medium')}
                    variant="ghost"
                  >
                    M
                  </Button>
                  <Button 
                    className={`${styles.textSizeButton} ${textSize === 'large' ? styles.activeTextSize : ''}`}
                    onClick={() => handleChangeTextSize('large')}
                    variant="ghost"
                  >
                    L
                  </Button>
                  <Button 
                    className={`${styles.textSizeButton} ${textSize === 'x-large' ? styles.activeTextSize : ''}`}
                    onClick={() => handleChangeTextSize('x-large')}
                    variant="ghost"
                  >
                    XL
                  </Button>
                  <Button 
                    className={`${styles.textSizeButton} ${textSize === 'xx-large' ? styles.activeTextSize : ''}`}
                    onClick={() => handleChangeTextSize('xx-large')}
                    variant="ghost"
                  >
                    XXL
                  </Button>
                </div>
              </div>
              
              <div className={styles.dropdownSection}>
                <Button 
                className={styles.dropdownButton} 
                onClick={handleResetToDefaults} 
                variant="ghost">
                  <FaUndo />
                </Button>
              </div>
            </NineSliceContainer>
        </div>
      </NineSliceContainer>
      
      <NineSliceContainer 
        variant={chatBackground !== 1 ? "ghost" : undefined} 
        className={`${styles.messagesContainer} ${styles.elevatedCard} ${backgroundClass} ${textSizeClass}`}
        ref={messagesContainerRef}
        onScroll={isScrollListenerActive ? handleScroll : undefined}
      >
        {loadingMore && (
          <div className={styles.loadingMoreIndicator}>
             <div className={styles.loadingSpinnerSmall}></div> Loading older messages...
          </div>
        )}
        
        {loading && !loadingMore && messages.length === 0 ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <div className={styles.loading}>Loading messages...</div>
          </div>
        ) : messages.length === 0 && !hasMoreMessages ? (
          <>
            <motion.div 
              className={styles.emptyState}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className={styles.emptyStateContent}>
                <div className={styles.emptyStateIcon}>💬</div>
                <p>No messages yet. Start the conversation!</p>
              </div>
            </motion.div>
            
            {recipientIsTyping && (
              <motion.div 
                key="typing-indicator-empty"
                className={`${styles.typingIndicator} ${styles.recipientTyping}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                <div className={`
                  ${styles.typingIndicatorContent}
                  ${styles[getMessageStyleClass(true)]}
                `}>
                  <div className={styles.typingDots}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className={styles.typingText}>{recipientName} is typing...</span>
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <div className={styles.messagesList}>
            <AnimatePresence mode="sync">
              {messages.map((message, index) => {
                const isOwnMessage = message.sender_id === user?.id;
                const showAuthor = index === 0 || messages[index - 1].sender_id !== message.sender_id;
                const messageDate = getMessageDateGroup(message.created_at);
                const showDateDivider = index === 0 || 
                  getMessageDateGroup(messages[index - 1].created_at) !== messageDate;
                
                // Check if this message is part of a consecutive series from the same user
                const isConsecutiveStart = showAuthor || showDateDivider;
                const isConsecutiveEnd = index === messages.length - 1 || 
                  messages[index + 1].sender_id !== message.sender_id || 
                  getMessageDateGroup(messages[index + 1].created_at) !== messageDate;
                
                // Get the message style class from the context for either own or other user's messages
                const messageStyleClass = styles[getMessageStyleClass(isOwnMessage)];
                
                // Check if this message is being edited
                const isEditing = editingMessageId === message.id;
                
                // Check if this message is active (showing action buttons)
                const isActive = activeMessageId === message.id;
                
                // Check if message is within 15 minutes
                const canModify = isOwnMessage && isWithin15Minutes(message.created_at);
                
                return (
                  <React.Fragment key={message.id}>
                    {showDateDivider && (
                      <motion.div 
                        className={styles.dateDivider}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <span>{new Date(messageDate).toLocaleDateString(undefined, { 
                          weekday: 'long',
                          month: 'short', 
                          day: 'numeric',
                          year: new Date(messageDate).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                        })}</span>
                      </motion.div>
                    )}
                    
                    <motion.div 
                      className={`${styles.messageItem} ${isOwnMessage ? styles.ownMessage : ''}`}
                      initial={{ opacity: 0, x: isOwnMessage ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      onContextMenu={(e) => isOwnMessage && handleMessageRightClick(e, message.id)}
                    >
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
                      
                      <div className={styles.messageWithActions}>
                        <motion.div
                          animate={{ x: isActive && canModify ? -75 : 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                          <NineSliceContainer 
                            variant='ghost'
                            className={`
                              ${styles.messageContent} 
                              ${isOwnMessage ? styles.ownMessageContent : ''} 
                              ${messageStyleClass}
                              ${!isConsecutiveStart ? (isOwnMessage ? styles.consecutiveOwnMessage : styles.consecutiveMessage) : ''}
                              ${!isConsecutiveEnd ? (isOwnMessage ? styles.consecutiveOwnMessageEnd : styles.consecutiveMessageEnd) : ''}
                            `}
                          >
                            {isEditing ? (
                              <div className={styles.editMessageContainer}>
                                <Input
                                  type="text"
                                  value={editMessageContent}
                                  onChange={(e) => setEditMessageContent(e.target.value)}
                                  autoFocus
                                  className={styles.editMessageInput}
                                  label=""
                                />
                                <div className={styles.editButtons}>
                                  <Button 
                                    onClick={saveEditedMessage} 
                                    variant="success" 
                                    className={styles.editButton}
                                    disabled={!editMessageContent.trim()}
                                  >
                                    <FaCheck size={12} />
                                  </Button>
                                  <Button 
                                    onClick={cancelEditing} 
                                    variant="warning" 
                                    className={styles.editButton}
                                  >
                                    <FaUndo size={12} />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className={styles.messageText}>{message.content}</p>
                            )}
                            <span className={styles.messageTime}>
                              {formatMessageTime(message.created_at)}
                              {getMessageStatusIcon(message)}
                            </span>
                          </NineSliceContainer>
                        </motion.div>
                        
                        {isActive && canModify && (
                          <div className={styles.messageActionButtons}>
                            <Button 
                              variant="edit" 
                              onClick={() => handleEditMessage(message.id)}
                              className={styles.actionButton}
                              disabled={isEditing}
                            >
                            </Button>
                            <Button 
                              variant="delete" 
                              onClick={() => handleDeleteMessage(message.id)}
                              className={styles.actionButton}
                              disabled={deleteLoading[message.id]}
                            >
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </React.Fragment>
                );
              })}
              
              {recipientIsTyping && (
                <motion.div 
                  key="typing-indicator-main"
                  className={`${styles.typingIndicator} ${styles.recipientTyping}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <NineSliceContainer variant='ghost' className={`
                    ${styles.typingIndicatorContent}
                    ${styles[getMessageStyleClass(true)]}
                  `}>
                    <div className={styles.typingDots}>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span className={styles.typingText}>{recipientName} is typing...</span>
                  </NineSliceContainer>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
      </NineSliceContainer>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <NineSliceContainer 
          variant={chatBackground !== 1 ? "ghost" : undefined}
          className={`${styles.messageForm} ${styles.elevatedCard} ${backgroundClass}`}
        >
          <form onSubmit={handleSendMessage} className={styles.messageFormInner}>
            <Input
              type="text"
              placeholder={`Message ${recipientName}...`}
              value={newMessage}
              onChange={handleTyping}
              onKeyDown={handleKeyDown}
              className={styles.messageInput}
              autoComplete="off"
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
          </form>
        </NineSliceContainer>
      </motion.div>
    </motion.div>
  );
}