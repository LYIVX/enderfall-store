"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import Button from '@/components/UI/Button';
import { FaArrowLeft, FaTrash, FaSync, FaUserCircle } from 'react-icons/fa';
import styles from './page.module.css';
import adminStyles from '../../../../admin.module.css';
import { formatDistance } from 'date-fns';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  is_read: boolean;
  sender: {
    username: string;
    avatar_url: string | null;
    id: string;
  };
}

interface Participant {
  id: string;
  username: string;
  avatar_url: string | null;
}

export default function ConversationDetailPage() {
  const params = useParams();
  const userId = Array.isArray(params?.userId) 
    ? params.userId[0] 
    : params?.userId || '';
  const conversationId = Array.isArray(params?.conversationId) 
    ? params.conversationId[0] 
    : params?.conversationId || '';
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<{[key: string]: boolean}>({});
  
  useEffect(() => {
    if (!conversationId || !userId) {
      router.push(`/admin/users/${userId}`);
      return;
    }
    
    fetchConversationData();
  }, [conversationId, userId, router]);
  
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
      
      // Use any type to avoid TypeScript errors with complex Supabase response
      const formattedParticipants = (participantsData || []).map((p: any) => ({
        id: p.profiles.id,
        username: p.profiles.username,
        avatar_url: p.profiles.avatar_url
      }));
      
      setParticipants(formattedParticipants);
      
      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          sender_id,
          created_at,
          is_read,
          sender:profiles!sender_id(id, username, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (messagesError) throw messagesError;
      
      // Format messages with type assertion to avoid TypeScript errors
      const formattedMessages = (messagesData || []).map((message: any) => ({
        id: message.id,
        content: message.content,
        created_at: message.created_at,
        sender_id: message.sender_id,
        is_read: message.is_read,
        sender: {
          id: message.sender.id,
          username: message.sender.username,
          avatar_url: message.sender.avatar_url
        }
      }));
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching conversation data:', error);
      toast.error('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };
  
  const refreshMessages = async () => {
    setRefreshing(true);
    
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          sender_id,
          created_at,
          is_read,
          sender:profiles!sender_id(id, username, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (messagesError) throw messagesError;
      
      // Format messages to handle sender data properly
      const formattedMessages = (messagesData || []).map((message: any) => ({
        id: message.id,
        content: message.content,
        created_at: message.created_at,
        sender_id: message.sender_id,
        is_read: message.is_read,
        sender: {
          id: message.sender.id,
          username: message.sender.username,
          avatar_url: message.sender.avatar_url
        }
      }));
      
      setMessages(formattedMessages);
      toast.success('Messages refreshed');
    } catch (error) {
      console.error('Error refreshing messages:', error);
      toast.error('Failed to refresh messages');
    } finally {
      setRefreshing(false);
    }
  };
  
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      return;
    }
    
    setDeleteLoading(prev => ({ ...prev, [messageId]: true }));
    
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);
      
      if (error) throw error;
      
      // Update local state
      setMessages(prev => prev.filter(message => message.id !== messageId));
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    } finally {
      setDeleteLoading(prev => ({ ...prev, [messageId]: false }));
    }
  };
  
  const formatMessageTime = (dateString: string) => {
    try {
      return formatDistance(new Date(dateString), new Date(), { addSuffix: true });
    } catch (e) {
      return 'Unknown time';
    }
  };
  
  const getParticipantNames = () => {
    return participants.map(p => p.username).join(', ');
  };
  
  if (loading) {
    return <div className={styles.loading}>Loading conversation...</div>;
  }
  
  return (
    <div className={styles.conversationPage}>
      <div className={styles.adminControls}>
        <Button 
          variant="secondary"
          onClick={() => router.push(`/admin/users/${userId}`)}
          className={styles.backButton}
        >
          <FaArrowLeft /> Back to User
        </Button>
        
        <h1 className={styles.adminTitle}>
          Conversation Details
        </h1>
        
        <Button 
          variant="primary"
          onClick={refreshMessages}
          disabled={refreshing}
          className={styles.refreshButton}
        >
          <FaSync className={refreshing ? adminStyles.spin : ''} /> Refresh
        </Button>
      </div>
      
      <div className={styles.conversationHeader}>
        <div className={styles.conversationTitle}>
          Participants: {getParticipantNames()}
        </div>
        
        <div className={styles.participantsInfo}>
          <span>Users in this conversation:</span>
          <div className={styles.participantsList}>
            {participants.map(participant => (
              <div key={participant.id} title={participant.username}>
                {participant.avatar_url ? (
                  <Image 
                    src={participant.avatar_url}
                    alt={participant.username}
                    width={24}
                    height={24}
                    className={styles.participantAvatar}
                  />
                ) : (
                  <FaUserCircle size={24} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No messages in this conversation</p>
          </div>
        ) : (
          <div className={styles.messagesList}>
            {messages.map(message => (
              <div key={message.id} className={styles.messageItem}>
                <div className={styles.messageContent}>
                  {message.content}
                </div>
                
                <div className={styles.messageInfo}>
                  <div className={styles.messageSender}>
                    {message.sender.avatar_url ? (
                      <Image
                        src={message.sender.avatar_url}
                        alt={message.sender.username}
                        width={24}
                        height={24}
                        className={styles.messageAvatar}
                      />
                    ) : (
                      <FaUserCircle size={24} />
                    )}
                    {message.sender.username}
                  </div>
                  
                  <div className={styles.messageTime}>
                    {formatMessageTime(message.created_at)}
                  </div>
                </div>
                
                <button 
                  className={styles.deleteButton}
                  onClick={() => handleDeleteMessage(message.id)}
                  disabled={deleteLoading[message.id]}
                  aria-label="Delete message"
                >
                  <FaTrash size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}