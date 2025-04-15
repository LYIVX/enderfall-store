"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase, getUserSocialPosts } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';
import Button from '@/components/UI/Button';
import Tabs, { Tab } from '@/components/UI/Tabs';
import styles from '../../admin.module.css';
import customStyles from './page.module.css';
import { Loading } from '@/components/UI';
import { useLoading } from '@/hooks';
import { 
  FaUserFriends, FaComments, FaBlog, FaExchangeAlt, FaCommentDots, 
  FaUsers, FaStream, FaEye, FaEdit, FaTrash, FaArrowRight
} from 'react-icons/fa';
import AvatarWithStatus from '@/components/UI/AvatarWithStatus';

interface User {
  id: string;
  username: string;
  email: string | null;
  minecraft_username: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
}

interface ForumPost {
  id: string;
  title: string;
  category: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
}

interface BlogPost {
  id: string;
  title: string;
  summary: string;
  created_at: string;
  is_published: boolean;
  is_pinned: boolean;
}

// Define an interface for the data returned from the API
interface SocialPostApiResponse {
  id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  user_id: string;
  likes: any[];
  comments: any[];
  profiles: {
    username: string;
    avatar_url: string | null;
    id?: string;
  } | null;
  image_url?: string | null;
}

interface SocialPost {
  id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  user_id: string;
  likes: any[];
  comments: any[];
  profiles: {
    username: string;
    avatar_url: string | null;
    id?: string;
  } | null;
  image_url?: string | null;
  author?: any;
}

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  payment_status?: string;
  created_at: string;
  payment_method?: string;
  transaction_id?: string;
}

interface Friend {
  id: string;
  friend_id: string;
  username: string;
  avatar_url: string | null;
  status: string;
  created_at: string;
}

interface Conversation {
  id: string;
  created_at: string;
  last_message?: string | null;
  participants: {
    id: string;
    username: string;
    avatar_url: string | null;
  }[];
}

interface ProfileRecord {
  id: string;
  username: string;
  avatar_url: string | null;
  [key: string]: any;
}

interface FriendshipRecord {
  id: string;
  status: string;
  created_at: string;
  profiles: ProfileRecord | ProfileRecord[] | any;
  [key: string]: any;
}

interface ParticipantData {
  user_id: string;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

export default function UserDetailPage() {
  const params = useParams();
  const userId = Array.isArray(params?.userId) 
    ? params.userId[0] 
    : params?.userId || '';
  const router = useRouter();
  
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('transactions');
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const { isLoading, startLoading, stopLoading } = useLoading();
  
  useEffect(() => {
    fetchUserData();
  }, [userId]);
  
  const fetchUserData = async () => {
    setLoading(true);
    
    try {
      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId);
      
      if (userError) throw userError;
      
      // Check if any user was found
      if (!userData || userData.length === 0) {
        console.error(`No user found with ID: ${userId}`);
        setLoading(false);
        setUser(null);
        return; // Exit early if no user is found
      }
      
      // Use the first user if multiple are returned (shouldn't happen with proper ID)
      setUser(userData[0]);
      
      // Rest of the function continues only if a user is found
      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);
      
      // Fetch forum posts
      const { data: forumData, error: forumError } = await supabase
        .from('forum_posts')
        .select('id, title, category, created_at, updated_at, is_pinned')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (forumError) throw forumError;
      setForumPosts(forumData || []);
      
      // Fetch friends
      const { data: friendsData, error: friendsError } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          friend_id,
          profiles!friendships_friend_id_fkey(id, username, avatar_url)
        `)
        .eq('user_id', userId)
        .eq('status', 'accepted');
        
      if (friendsError) throw friendsError;
      
      // Also get friendships where user is the friend
      const { data: friendsData2, error: friendsError2 } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          user_id,
          profiles!friendships_user_id_fkey(id, username, avatar_url)
        `)
        .eq('friend_id', userId)
        .eq('status', 'accepted');
        
      if (friendsError2) throw friendsError2;
      
      // Safely handle profiles data from friendships
      const formattedFriends: Friend[] = [];
      
      // Process friends data - for friendships where user is the user_id
      if (friendsData && Array.isArray(friendsData)) {
        friendsData.forEach(record => {
          // Get profile info from the friend record
          let username = 'Unknown';
          let avatar_url = null;
          
          if (record.profiles) {
            const profile = Array.isArray(record.profiles) ? record.profiles[0] : record.profiles;
            username = profile?.username || 'Unknown';
            avatar_url = profile?.avatar_url || null;
          }
          
          formattedFriends.push({
            id: record.id,
            friend_id: record.friend_id || '',
            username,
            avatar_url,
            status: record.status,
            created_at: record.created_at
          });
        });
      }
      
      // Process friends data - for friendships where user is the friend_id
      if (friendsData2 && Array.isArray(friendsData2)) {
        friendsData2.forEach(record => {
          // Get profile info from the user record
          let username = 'Unknown';
          let avatar_url = null;
          
          if (record.profiles) {
            const profile = Array.isArray(record.profiles) ? record.profiles[0] : record.profiles;
            username = profile?.username || 'Unknown';
            avatar_url = profile?.avatar_url || null;
          }
          
          formattedFriends.push({
            id: record.id,
            friend_id: record.user_id || '',
            username,
            avatar_url,
            status: record.status,
            created_at: record.created_at
          });
        });
      }
      
      setFriends(formattedFriends);
      
      // Fetch conversations
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select(`
          id, 
          created_at,
          conversation_participants!inner(
            user_id,
            profiles:user_id(id, username, avatar_url)
          )
        `)
        .eq('conversation_participants.user_id', userId);
        
      if (conversationsError) throw conversationsError;
      
      // Format conversations data
      const formattedConversations: Conversation[] = [];
      
      // For each conversation, fetch all participants (not just the current user)
      if (conversationsData && conversationsData.length > 0) {
        // Fetch all participants for each conversation
        for (const conv of conversationsData) {
          try {
            const { data: participantsData, error: participantsError } = await supabase
              .from('conversation_participants')
              .select(`
                user_id,
                profiles:user_id(id, username, avatar_url)
              `)
              .eq('conversation_id', conv.id);
              
            if (participantsError) throw participantsError;
            
            if (participantsData && participantsData.length > 0) {
              // Map the participants data to the format we need
              const participants = participantsData.map((p: any) => ({
                id: p.profiles ? p.profiles.id : p.user_id,
                username: p.profiles ? p.profiles.username : 'Unknown',
                avatar_url: p.profiles ? p.profiles.avatar_url : null
              }));
              
              formattedConversations.push({
                id: conv.id,
                created_at: conv.created_at,
                participants
              });
            }
          } catch (error) {
            console.error(`Error fetching participants for conversation ${conv.id}:`, error);
          }
        }
      }
      
      setConversations(formattedConversations);
      
      // Fetch blogs if user is admin
      if (userData[0].is_admin) {
        const { data: blogsData, error: blogsError } = await supabase
          .from('blog_posts')
          .select('id, title, summary, created_at, is_published, is_pinned')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
          
        if (blogsError) throw blogsError;
        setBlogs(blogsData || []);
      }
      
      // Fetch social posts
      try {
        // Cast the entire API response to avoid TypeScript errors
        const postsData = (await getUserSocialPosts(userId)) as unknown as SocialPostApiResponse[];
        
        // Map to our expected data structure
        const formattedPosts = postsData.map(post => ({
          id: post.id || '',
          content: post.content || '',
          created_at: post.created_at || new Date().toISOString(),
          updated_at: post.updated_at,
          user_id: post.user_id || '',
          likes: Array.isArray(post.likes) ? post.likes : [],
          comments: Array.isArray(post.comments) ? post.comments : [],
          profiles: post.profiles,
          image_url: post.image_url
        }));
        
        setSocialPosts(formattedPosts as SocialPost[]);
      } catch (error) {
        console.error('Error fetching social posts:', error);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Function to truncate content
  function truncateContent(content: string, maxLength = 50) {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }
  
  // Define tabs dynamically based on available data
  const getTabs = (): Tab[] => {
    const tabs: Tab[] = [];
    
    // Only show tabs with data
    if (transactions.length > 0) {
      tabs.push({
        id: 'transactions',
        label: 'Transactions',
        icon: <FaExchangeAlt />,
      });
    }
    
    if (forumPosts.length > 0) {
      tabs.push({
        id: 'forums',
        label: 'Forum Posts',
        icon: <FaCommentDots />,
      });
    }
    
    if (socialPosts.length > 0) {
      tabs.push({
        id: 'social',
        label: 'Social Posts',
        icon: <FaStream />,
      });
    }
    
    if (friends.length > 0) {
      tabs.push({
        id: 'friends',
        label: 'Friends',
        icon: <FaUserFriends />,
      });
    }
    
    if (conversations.length > 0) {
      tabs.push({
        id: 'conversations',
        label: 'Conversations',
        icon: <FaComments />,
      });
    }
    
    // Add blogs tab if user is admin and has blogs
    if (user?.is_admin && blogs.length > 0) {
      tabs.push({
        id: 'blogs',
        label: 'Blog Posts',
        icon: <FaBlog />,
      });
    }
    
    // If no tabs, add a placeholder tab
    if (tabs.length === 0) {
      tabs.push({
        id: 'no-content',
        label: 'No Content',
        icon: <FaStream />,
      });
    }
    
    return tabs;
  };
  
  // Update active tab when tabs change
  useEffect(() => {
    const availableTabs = getTabs();
    if (availableTabs.length > 0 && !availableTabs.some(tab => tab.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [transactions, forumPosts, socialPosts, friends, conversations, blogs]);
  
  // Get current tabs
  const tabs = getTabs();
  
  // Render tab content based on active tab
  const renderTabContent = (tab: Tab) => {
    switch (tab.id) {
      case 'transactions':
        return (
          <div>
            <h3 className={styles.sectionTitle}>Transactions</h3>
            {transactions.length === 0 ? (
              <div className={styles.emptyState}>No transactions found for this user.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={customStyles.colMedium}>ID</th>
                    <th className={customStyles.colSmall}>Amount</th>
                    <th className={customStyles.colSmall}>Currency</th>
                    <th className={customStyles.colMedium}>Status</th>
                    <th className={customStyles.colMedium}>Date</th>
                    <th className={customStyles.colActions}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(transaction => (
                    <tr key={transaction.id}>
                      <td className={customStyles.colMedium}>{truncateContent(transaction.transaction_id || transaction.id, 10)}</td>
                      <td className={customStyles.colSmall}>{transaction.amount}</td>
                      <td className={customStyles.colSmall}>{transaction.currency || 'USD'}</td>
                      <td className={customStyles.colMedium}>
                        <span className={
                          transaction.payment_status === 'completed' || transaction.payment_status === 'succeeded' 
                            ? customStyles.badgeSuccess 
                            : customStyles.badgeWarning
                        }>
                          {transaction.payment_status || 'completed'}
                        </span>
                      </td>
                      <td className={customStyles.colMedium}>{formatDate(transaction.created_at)}</td>
                      <td className={customStyles.colActions}>
                        <div className={styles.postActions}>
                          <Button 
                            variant="view"
                            size="small"
                            className={`${styles.actionButton} ${styles.viewButton}`}
                            onClick={() => router.push(`/admin/transactions/${transaction.id}`)}
                          >
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
        
      case 'forums':
        return (
          <div>
            <h3 className={styles.sectionTitle}>Forum Posts</h3>
            {forumPosts.length === 0 ? (
              <div className={styles.emptyState}>No forum posts found for this user.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={customStyles.colLarge}>Title</th>
                    <th className={customStyles.colMedium}>Category</th>
                    <th className={customStyles.colMedium}>Created</th>
                    <th className={customStyles.colMedium}>Updated</th>
                    <th className={customStyles.colSmall}>Pinned</th>
                    <th className={customStyles.colActions}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {forumPosts.map(post => (
                    <tr key={post.id}>
                      <td className={customStyles.colLarge}>{post.title}</td>
                      <td className={customStyles.colMedium}>{post.category}</td>
                      <td className={customStyles.colMedium}>{formatDate(post.created_at)}</td>
                      <td className={customStyles.colMedium}>{formatDate(post.updated_at)}</td>
                      <td className={customStyles.colSmall}>
                        {post.is_pinned ? 
                          <span className={customStyles.badgeSuccess}>Yes</span> : 
                          <span className={customStyles.badge}>No</span>
                        }
                      </td>
                      <td className={customStyles.colActions}>
                        <div className={styles.postActions}>
                          <Button 
                            variant="view"
                            size="small"
                            className={`${styles.actionButton} ${styles.viewButton}`}
                            onClick={() => router.push(`/social?tab=forums&forum=${post.id}`)}
                          >
                          </Button>
                          <Button 
                            variant="edit"
                            size="small"
                            className={`${styles.actionButton} ${styles.editButton}`}
                            onClick={() => router.push(`/admin/forums/edit/${post.id}`)}
                          >
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
        
      case 'social':
        return (
          <div>
            <h3 className={styles.sectionTitle}>Social Posts</h3>
            {socialPosts.length === 0 ? (
              <div className={styles.emptyState}>No social posts found for this user.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={customStyles.colContent}>Content</th>
                    <th className={customStyles.colMedium}>Created</th>
                    <th className={customStyles.colMedium}>Updated</th>
                    <th className={customStyles.colSmall}>Likes</th>
                    <th className={customStyles.colSmall}>Comments</th>
                    <th className={customStyles.colSmall}>Has Image</th>
                    <th className={customStyles.colActions}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {socialPosts.map(post => (
                    <tr key={post.id}>
                      <td className={customStyles.colContent}>
                        {truncateContent(post.content, 50)}
                      </td>
                      <td className={customStyles.colMedium}>{formatDate(post.created_at)}</td>
                      <td className={customStyles.colMedium}>{formatDate(post.updated_at)}</td>
                      <td className={customStyles.colSmall}>{post.likes?.length || 0}</td>
                      <td className={customStyles.colSmall}>{post.comments?.length || 0}</td>
                      <td className={customStyles.colSmall}>
                        {post.image_url ? 
                          <span className={customStyles.badgeSuccess}>Yes</span> : 
                          <span className={customStyles.badge}>No</span>
                        }
                      </td>
                      <td className={customStyles.colActions}>
                        <div className={styles.postActions}>
                          <Button 
                            variant="view"
                            size="small"
                            className={`${styles.actionButton} ${styles.viewButton}`}
                            onClick={() => router.push(`/social?tab=posts&view=${post.id}&scroll=true`)}
                          >
                          </Button>
                          <Button 
                            variant="edit"
                            size="small"
                            className={`${styles.actionButton} ${styles.editButton}`}
                            onClick={() => router.push(`/social?tab=posts&edit=${post.id}`)}
                          >
                          </Button>
                          <Button 
                            variant="delete"
                            size="small"
                            className={`${styles.actionButton} ${styles.deleteButton}`}
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this post?')) {
                                startLoading(`delete-${post.id}`);
                                supabase
                                  .from('social_posts')
                                  .delete()
                                  .eq('id', post.id)
                                  .then(({ error }) => {
                                    if (error) {
                                      console.error('Error deleting post:', error);
                                    } else {
                                      setSocialPosts(posts => posts.filter(p => p.id !== post.id));
                                    }
                                    stopLoading(`delete-${post.id}`);
                                  });
                              }
                            }} 
                            disabled={isLoading(`delete-${post.id}`)}
                          >
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
        
      case 'friends':
        return (
          <div>
            <h3 className={styles.sectionTitle}>Friends</h3>
            {friends.length === 0 ? (
              <div className={styles.emptyState}>No friends found for this user.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={customStyles.colMedium}>Username</th>
                    <th className={customStyles.colSmall}>Avatar</th>
                    <th className={customStyles.colMedium}>Status</th>
                    <th className={customStyles.colMedium}>Since</th>
                    <th className={customStyles.colActions}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {friends.map(friend => (
                    <tr key={friend.id}>
                      <td className={customStyles.colMedium}>{friend.username}</td>
                      <td className={customStyles.colSmall}>
                        {friend.avatar_url ? (
                          <div className={customStyles.avatarContainer}>
                            <AvatarWithStatus
                              userId={friend.friend_id}
                              avatarUrl={friend.avatar_url}
                              username={friend.username}
                              size="small"
                            />
                          </div>
                        ) : (
                          <div className={customStyles.noAvatar}>N/A</div>
                        )}
                      </td>
                      <td className={customStyles.colMedium}>
                        <span className={customStyles.badgeSuccess}>{friend.status}</span>
                      </td>
                      <td className={customStyles.colMedium}>{formatDate(friend.created_at)}</td>
                      <td className={customStyles.colActions}>
                        <div className={styles.postActions}>
                          <Button 
                            variant="view"
                            size="small"
                            className={`${styles.actionButton} ${styles.viewButton}`}
                            onClick={() => router.push(`/profile/${friend.friend_id}`)}
                          >
                          </Button>
                          <Button 
                            variant="delete"
                            size="small"
                            className={`${styles.actionButton} ${styles.deleteButton}`}
                            onClick={() => {
                              if (confirm('Are you sure you want to remove this friendship?')) {
                                startLoading(`delete-friend-${friend.id}`);
                                supabase
                                  .from('friendships')
                                  .delete()
                                  .eq('id', friend.id)
                                  .then(({ error }) => {
                                    if (error) {
                                      console.error('Error deleting friendship:', error);
                                    } else {
                                      setFriends(friends => friends.filter(f => f.id !== friend.id));
                                    }
                                    stopLoading(`delete-friend-${friend.id}`);
                                  });
                              }
                            }}
                            disabled={isLoading(`delete-friend-${friend.id}`)}
                          >
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
        
      case 'conversations':
        return (
          <div>
            <h3 className={styles.sectionTitle}>Conversations</h3>
            {conversations.length === 0 ? (
              <div className={styles.emptyState}>No conversations found for this user.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={customStyles.colMedium}>Conversation ID</th>
                    <th className={customStyles.colLarge}>Participants</th>
                    <th className={customStyles.colMedium}>Started</th>
                    <th className={customStyles.colActions}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {conversations.map(conversation => (
                    <tr key={conversation.id}>
                      <td className={customStyles.colMedium}>{truncateContent(conversation.id, 10)}</td>
                      <td className={customStyles.colLarge}>
                        <div className={customStyles.participantsList}>
                          {conversation.participants.map(participant => (
                            <div key={participant.id} className={customStyles.participantItem}>
                              {participant.avatar_url ? (
                                <AvatarWithStatus
                                  userId={participant.id}
                                  avatarUrl={participant.avatar_url}
                                  username={participant.username}
                                  size="xsmall"
                                />
                              ) : null}
                              <span>{participant.username}</span>
                              {participant.id === userId && (
                                <span className={customStyles.currentUser}>(Current)</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className={customStyles.colMedium}>{formatDate(conversation.created_at)}</td>
                      <td className={customStyles.colActions}>
                        <div className={styles.postActions}>
                          <Button 
                            variant="view"
                            size="small"
                            className={`${styles.actionButton} ${styles.viewButton}`}
                            onClick={() => {
                              // Find the other participant that is not the current user
                              const otherParticipant = conversation.participants.find(
                                p => p.id !== userId
                              );
                              if (otherParticipant && user) {
                                router.push(
                                  `/social/messages/${user.username}/${otherParticipant.username}/${conversation.id}`
                                );
                              } else {
                                router.push(`/social?tab=messages`);
                              }
                            }}
                          >
                          </Button>
                          <Button 
                            variant="delete"
                            size="small"
                            className={`${styles.actionButton} ${styles.deleteButton}`}
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this conversation?')) {
                                startLoading(`delete-conversation-${conversation.id}`);
                                supabase
                                  .from('conversations')
                                  .delete()
                                  .eq('id', conversation.id)
                                  .then(({ error }) => {
                                    if (error) {
                                      console.error('Error deleting conversation:', error);
                                    } else {
                                      setConversations(convs => 
                                        convs.filter(c => c.id !== conversation.id)
                                      );
                                    }
                                    stopLoading(`delete-conversation-${conversation.id}`);
                                  });
                              }
                            }}
                            disabled={isLoading(`delete-conversation-${conversation.id}`)}
                          >
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
        
      case 'blogs':
        return (
          <div>
            <h3 className={styles.sectionTitle}>Blog Posts</h3>
            {blogs.length === 0 ? (
              <div className={styles.emptyState}>No blog posts found for this user.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={customStyles.colLarge}>Title</th>
                    <th className={customStyles.colLarge}>Summary</th>
                    <th className={customStyles.colMedium}>Created</th>
                    <th className={customStyles.colSmall}>Published</th>
                    <th className={customStyles.colSmall}>Pinned</th>
                    <th className={customStyles.colActions}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blogs.map(blog => (
                    <tr key={blog.id}>
                      <td className={customStyles.colLarge}>{blog.title}</td>
                      <td className={customStyles.colLarge}>{truncateContent(blog.summary, 50)}</td>
                      <td className={customStyles.colMedium}>{formatDate(blog.created_at)}</td>
                      <td className={customStyles.colSmall}>
                        {blog.is_published ? 
                          <span className={customStyles.badgeSuccess}>Yes</span> : 
                          <span className={customStyles.badge}>No</span>
                        }
                      </td>
                      <td className={customStyles.colSmall}>
                        {blog.is_pinned ? 
                          <span className={customStyles.badgeSuccess}>Yes</span> : 
                          <span className={customStyles.badge}>No</span>
                        }
                      </td>
                      <td className={customStyles.colActions}>
                        <div className={styles.postActions}>
                          <Button 
                            variant="view"
                            size="small"
                            className={`${styles.actionButton} ${styles.viewButton}`}
                            onClick={() => router.push(`/blog/${blog.id}`)}
                          >
                          </Button>
                          <Button 
                            variant="edit"
                            size="small"
                            className={`${styles.actionButton} ${styles.editButton}`}
                            onClick={() => router.push(`/admin/blog/edit/${blog.id}`)}
                          >
                          </Button>
                          <Button 
                            variant="delete"
                            size="small"
                            className={`${styles.actionButton} ${styles.deleteButton}`}
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this blog post?')) {
                                startLoading(`delete-blog-${blog.id}`);
                                supabase
                                  .from('blog_posts')
                                  .delete()
                                  .eq('id', blog.id)
                                  .then(({ error }) => {
                                    if (error) {
                                      console.error('Error deleting blog post:', error);
                                    } else {
                                      setBlogs(blogs => blogs.filter(b => b.id !== blog.id));
                                    }
                                    stopLoading(`delete-blog-${blog.id}`);
                                  });
                              }
                            }}
                            disabled={isLoading(`delete-blog-${blog.id}`)}
                          >
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
        
      default:
        return <div>No content found for this tab.</div>;
    }
  };
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>User Details</h1>
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      {renderTabContent(tabs.find(tab => tab.id === activeTab) || { id: 'no-content', label: '', icon: null })}
    </div>
  );
}