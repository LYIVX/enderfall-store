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
  const senderUsername = Array.isArray(params?.senderUsername) 
    ? params.senderUsername[0] 
    : params?.senderUsername || '';
  const recipientUsername = Array.isArray(params?.recipientUsername) 
    ? params.recipientUsername[0] 
    : params?.recipientUsername || '';
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
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageContent, setEditMessageContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showDateDividers, setShowDateDividers] = useState<{[key: string]: boolean}>({});
  
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
  
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (!conversationId || !recipientUsername) {
      router.push('/social');
      return;
    }
    
    // First, get the user ID from the recipient username
    fetchRecipientByUsername();
  }, [user, conversationId, recipientUsername, router]);

  const fetchRecipientByUsername = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', recipientUsername)
        .single();
      
      if (error) throw error;
      
      if (!data) {
        toast.error('User not found');
        router.push('/social');
        return;
      }
      
      setRecipientUser(data);
      
      // Once we have the user, check if current user has access to this conversation 
      checkUserAccess();
      fetchConversationData();
    } catch (error) {
      console.error('Error fetching user by username:', error);
      toast.error('User not found');
      router.push('/social');
    }
  };
  
  const checkUserAccess = async () => {
    try {
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .eq('user_id', user?.id);
      
      if (participantError) throw participantError;
      
      // If the user is not a participant in this conversation, redirect them
      if (!participantData || participantData.length === 0) {
        toast.error('You do not have access to this conversation');
        router.push('/social');
      }
    } catch (error) {
      console.error('Error checking user access:', error);
      router.push('/social');
    }
  };
  
  useEffect(() => {
    if (!user || !conversationId || !recipientUser) return;
    
    // Initial scroll to bottom
    if (messages.length > 0) {
      scrollToBottom();
    }
    
    // Add back refresh interval as a fallback while realtime is being set up
    const refreshInterval = setInterval(() => {
      console.log('Performing periodic refresh of messages');
      refreshMessages(false); // Don't scroll on auto-refresh
    }, 5000); // Check every 5 seconds
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [user, conversationId, messages.length, recipientUser]);

  useEffect(() => {
    if (!user || !recipientUser) return;
    
    // Create a unique channel name including userId to prevent conflicts between different users
    const channelName = `messages-channel-${conversationId}-${user.id}`;
    console.log(`Setting up real-time subscription on channel: ${channelName}`);
    
    // Set up real-time subscription for new messages
    const messageSubscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          console.log(`New message received in conversation ${conversationId}:`, payload.new);
          
          // Check if this message is already in our state by ID or if we have a temp version
          const messageExists = messages.some(m => 
            m.id === payload.new.id || 
            (m.temp && m.sender_id === payload.new.sender_id && m.content === payload.new.content)
          );
          
          if (messageExists) {
            console.log(`Message ${payload.new.id} already exists or has a temp version, updating instead of adding`);
            
            // Update the message if it exists as a temp message
            setMessages(prevMessages => {
              return prevMessages.map(msg => {
                if (msg.id === payload.new.id) {
                  // This is the same message, keep it
                  return msg;
                } else if (msg.temp && msg.sender_id === payload.new.sender_id && msg.content === payload.new.content) {
                  // This is a temp version of the same message, replace it
                  return {
                    ...payload.new,
                    username: msg.username,
                    avatar_url: msg.avatar_url,
                    temp: false
                  };
                }
                return msg;
              });
            });
            return;
          }
          
          try {
            const newMessage = await fetchMessageWithAuthor(payload.new.id);
            if (!newMessage) return;
            
            // Add to messages state
            setMessages(prevMessages => {
              // Double check it's not already in the list (race condition)
              if (prevMessages.some(m => m.id === newMessage.id)) {
                return prevMessages;
              }
              
              const updatedMessages = [...prevMessages, newMessage].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
              
              return updatedMessages;
            });
            
            // Mark as read if received from another user
            if (newMessage.sender_id !== user.id) {
              markMessageAsRead(newMessage.id);
            }
            
            scrollToBottom();
          } catch (error) {
            console.error('Error processing new message:', error);
          }
        }
      )
      .subscribe();
      
    console.log(`Subscription ${channelName} created and listening`);
    
    // Set up real-time subscription for message read status updates
    const readStatusSubscription = supabase
      .channel(`read-status-channel-${conversationId}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('Message read status updated:', payload.new);
          // Update the message in our state without duplicating
          setMessages(prev => 
            prev.map(msg => 
              msg.id === payload.new.id 
                ? { ...msg, is_read: payload.new.is_read }
                : msg
            )
          );
        }
      )
      .subscribe();
    
    return () => {
      console.log(`Cleaning up message subscriptions on ${channelName}`);
      supabase.removeChannel(messageSubscription);
      supabase.removeChannel(readStatusSubscription);
    };
  }, [user, conversationId, recipientUser, messages]);
  
  useEffect(() => {
    // Mark all messages as read when the conversation is opened
    if (user && messages.length > 0) {
      markConversationAsRead();
    }
  }, [messages, user]);
  
  const fetchConversationData = async () => {
    setLoading(true);
    
    try {
      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('conversation_participants')
        .select(`
          user_id,
          profiles(id, username, avatar_url)
        `)
        .eq('conversation_id', conversationId);
      
      if (participantsError) throw participantsError;
      
      // Format participant data
      const formattedParticipants = (participantsData || []).map((p: any) => ({
        id: p.profiles.id,
        username: p.profiles.username,
        avatar_url: p.profiles.avatar_url
      }));
      
      setParticipants(formattedParticipants);
      
      await refreshMessages(true);
    } catch (error) {
      console.error('Error fetching conversation data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to refresh messages without full loading state
  const refreshMessages = async (shouldScrollToBottom = false) => {
    if (refreshing) return; // Prevent concurrent refreshes
    
    setRefreshing(true);
    try {
      // Fetch messages with author information directly
      const { data: messagesData, error: messagesError } = await supabase
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
      
      if (messagesError) throw messagesError;
      
      // Format messages to include username and avatar_url at the top level
      const formattedMessages = messagesData ? messagesData.map(message => {
        const sender = message.sender as { id?: string, username?: string, avatar_url?: string };
        return {
          ...message,
          username: sender?.username || 'Unknown User',
          avatar_url: sender?.avatar_url || null
        };
      }) : [];
      
      console.log('Refreshed messages data:', formattedMessages);
      
      // Check if we have new messages
      const hasNewMessages = formattedMessages.length > messages.length;
      
      // Use a simple replace strategy for refreshing, as this is a full refresh
      setMessages(formattedMessages);
      
      if (shouldScrollToBottom || hasNewMessages) {
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error refreshing messages:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  const fetchMessageWithAuthor = async (messageId: string) => {
    try {
      const { data, error } = await supabase
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
        .eq('id', messageId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        const sender = data.sender as { id?: string, username?: string, avatar_url?: string };
        return {
          ...data,
          username: sender?.username || 'Unknown User',
          avatar_url: sender?.avatar_url || null
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching message ${messageId}:`, error);
      return null;
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
  
  // Add this effect for typing status subscription
  useEffect(() => {
    if (!user || !recipientUser || !conversationId) return;
    
    console.log('🔄 Setting up typing status subscription for conversation:', conversationId);
    console.log('🔄 Current user ID:', user?.id, 'Recipient user ID:', recipientUser?.id);
    
    // Use a direct channel name for the table 
    const channelName = 'public:typing_status';
    console.log(`🔄 Creating typing subscription channel: ${channelName}`);
    
    // First remove any existing channels with the same name to avoid duplicates
    const existingChannel = supabase.getChannels().find(ch => 
      ch.topic === channelName || ch.topic === `realtime:${channelName}`
    );
    
    if (existingChannel) {
      console.log('🔄 Removing existing channel with same name');
      supabase.removeChannel(existingChannel);
    }
    
    // Set up real-time subscription for typing status
    const typingStatusSubscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'typing_status',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload: any) => {
          console.log('⚠️⚠️⚠️ TYPING STATUS CHANGED ⚠️⚠️⚠️');
          console.log('⚠️ Full payload:', payload);
          console.log('⚠️ Event:', payload.eventType);
          
          // Handle different event types
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Store record ID for future reference
            if (payload.new && payload.new.id && payload.new.user_id) {
              typingRecordsMapRef.current[payload.new.id] = payload.new.user_id;
              console.log(`⚠️ Stored record mapping: ${payload.new.id} -> ${payload.new.user_id}`);
            }
            
            // Only update if it's the other user's typing status
            if (payload.new && payload.new.user_id === recipientUser.id) {
              console.log(`⚠️ Received typing status: ${payload.new.is_typing} from user: ${payload.new.user_id}`);
              setRecipientIsTyping(payload.new.is_typing);
            } else {
              console.log('⚠️ Ignoring typing update for other user or self');
            }
          } 
          else if (payload.eventType === 'DELETE') {
            // For DELETE operations, the payload only contains minimal info in old_record
            console.log('⚠️ Received DELETE operation for typing status');
            
            if (payload.old && payload.old.id) {
              const recordId = payload.old.id;
              const userId = typingRecordsMapRef.current[recordId];
              
              console.log(`⚠️ DELETE for record ID: ${recordId}, mapped user ID: ${userId}`);
              
              // If this was the recipient's record, set typing to false
              if (userId === recipientUser.id) {
                console.log(`⚠️ Recipient ${recipientUser.id} stopped typing (DELETE event)`);
                setRecipientIsTyping(false);
              }
              
              // Clean up the mapping
              delete typingRecordsMapRef.current[recordId];
            } else {
              console.log('⚠️ DELETE event missing record ID information');
            }
          }
        }
      )
      .subscribe((status: any) => {
        console.log(`🔄 Subscription status for ${channelName}:`, status);
        
        // Check for successful subscription
        if (status === 'SUBSCRIBED') {
          console.log('🔄🔄🔄 SUCCESSFULLY SUBSCRIBED TO TYPING UPDATES 🔄🔄🔄');
        }
      });
    
    console.log('🔄 Subscription created and waiting for events');
    
    // Add a status change debug
    supabase.getChannels().forEach(channel => {
      console.log(`🔄 Current channel: ${channel.topic}, state: ${channel}`);
    });
    
    return () => {
      console.log('🔄 Cleaning up typing status subscription');
      supabase.removeChannel(typingStatusSubscription);
    };
  }, [user, recipientUser, conversationId]);

  // Update the handleTyping function to send typing status updates
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
  
  // Function to scroll to bottom with smooth behavior
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const messagesContainer = document.querySelector(`.${styles.messagesContainer}`);
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  };
  
  // Make sure to scroll to bottom on any message changes
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(scrollToBottom, 100); // Small delay to ensure DOM has updated
    }
  }, [messages.length, recipientIsTyping]);
  
  const getParticipantNames = () => {
    // Filter out the current user
    const otherParticipants = participants.filter(p => p.id !== user?.id);
    
    if (otherParticipants.length === 0) {
      return 'No participants';
    }
    
    return otherParticipants.map(p => p.username).join(', ');
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

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <div className={styles.loading}>Loading conversation...</div>
      </div>
    );
  }

  // Get the avatar or default avatar for the recipient
  const recipientAvatar = participants.find(p => p.id !== user?.id)?.avatar_url;
  const recipientName = participants.find(p => p.id !== user?.id)?.username || recipientUsername;
  
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
      <NineSliceContainer className={`${styles.conversationHeader} ${styles.elevatedCard} ${backgroundClass}`}>
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
                  status={userStatuses[recipientUser.id] || 'offline'} 
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
      
      <NineSliceContainer className={`${styles.messagesContainer} ${styles.elevatedCard} ${backgroundClass} ${textSizeClass}`}>
        {messages.length === 0 ? (
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
            
            {/* Show typing indicator even when no messages exist */}
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
              
              {/* Typing indicator when messages exist */}
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
          </div>
        )}
      </NineSliceContainer>
      
      <NineSliceContainer 
        className={`${styles.messageForm} ${styles.elevatedCard} ${backgroundClass}`} 
        onSubmit={handleSendMessage}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Input
          type="text"
          placeholder={`Message ${recipientName}...`}
          value={newMessage}
          onChange={handleTyping}
          className={styles.messageInput}
          autoComplete="off"
          label=""
        />
        <Button 
          type="submit" 
          variant="primary"
          className={`${styles.sendButton} ${isTyping ? styles.sendActive : ''}`}
          disabled={sending || !newMessage.trim()}
        >
          <FaPaperPlane />
        </Button>

        {/* Debug buttons - uncomment for testing */}
        {/* 
        <div className={styles.debugButtons}>
          <Button type="button" onClick={() => setTypingForTesting(true)} className={styles.debugButton}>
            Test Typing On
          </Button>
          <Button type="button" onClick={() => setTypingForTesting(false)} className={styles.debugButton}>
            Test Typing Off
          </Button>
        </div>
        */}
      </NineSliceContainer>
    </motion.div>
  );
}