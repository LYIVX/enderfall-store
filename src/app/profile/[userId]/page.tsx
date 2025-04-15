"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase, getUserSocialPosts, sendFriendRequest, createConversation } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthContext';
import SocialPost from '@/components/Social/SocialPost';
import Button from '@/components/UI/Button';
import { FaUserPlus, FaEnvelope, FaUserMinus, FaUserCheck, FaStream, FaNewspaper, FaComments } from 'react-icons/fa';
import styles from './page.module.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import dark from 'react-syntax-highlighter/dist/cjs/styles/prism/dark';
import { visit } from 'unist-util-visit';
import AvatarWithStatus from '@/components/UI/AvatarWithStatus';
import Tabs, { Tab } from '@/components/UI/Tabs';
import ForumPost from '@/components/Forums/ForumPost';

interface FriendshipStatus {
  exists: boolean;
  status: 'pending' | 'accepted' | 'rejected' | null;
  friendshipId: string | null;
  isRequester: boolean;
}

interface BlogPost {
  id: string;
  title: string;
  summary: string;
  content: string;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  is_published: boolean;
  is_pinned: boolean;
  user_id: string;
  category?: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    is_admin?: boolean;
  } | null;
}

// Add remarkImageDimensions plugin function
const remarkImageDimensions = () => {
  return (tree: any) => {
    visit(tree, 'image', (node) => {
      const { url } = node;
      const dimensions = url.match(/#([0-9]+)x([0-9]+)$/);
      if (dimensions) {
        node.url = url.replace(/#([0-9]+)x([0-9]+)$/, '');
        node.data = {
          ...node.data,
          hProperties: {
            ...node.data?.hProperties,
            width: dimensions[1],
            height: dimensions[2],
          },
        };
      }
    });
  };
};

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = Array.isArray(params?.userId) 
    ? params.userId[0] 
    : params?.userId || '';
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [forums, setForums] = useState<any[]>([]);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>({
    exists: false,
    status: null,
    friendshipId: null,
    isRequester: false
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('social');
  
  useEffect(() => {
    fetchProfileData();
  }, [userId, user]);
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };
  
  // Function to check if current user is admin
  const checkCurrentUserAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data?.is_admin || false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  };
  
  const fetchProfileData = async () => {
    setLoading(true);
    
    try {
      // Fetch the user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (profileError) throw profileError;
      setProfile(profileData);
      
      // Check if current user is admin
      if (user) {
        const isAdmin = await checkCurrentUserAdminStatus(user.id);
        setCurrentUserIsAdmin(isAdmin);
      }
      
      // Fetch social posts
      const postsData = await getUserSocialPosts(userId);
      setPosts(postsData);
      
      // If the user is an admin, fetch blog posts
      if (profileData.is_admin) {
        const { data: blogsData, error: blogsError } = await supabase
          .from('blog_posts')
          .select('*, profiles(id, username, avatar_url, is_admin)')
          .eq('user_id', userId)
          .eq('is_published', true)
          .order('created_at', { ascending: false });
          
        if (blogsError) throw blogsError;
        setBlogs(blogsData || []);
        
        // Log blog data to verify content is included
        console.log('Fetched blog posts:', blogsData);
      }
      
      // Fetch forum posts
      const { data: forumsData, error: forumsError } = await supabase
        .from('forum_posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (forumsError) throw forumsError;
      setForums(forumsData || []);
      
      // Check friendship status
      if (user && user.id !== userId) {
        const { data: friendship, error: friendshipError } = await supabase
          .from('friendships')
          .select('*')
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
          
        if (friendshipError) throw friendshipError;
        
        if (friendship && friendship.length > 0) {
          const isFriendshipRequester = friendship[0].user_id === user.id;
          setFriendshipStatus({
            exists: true,
            status: friendship[0].status,
            friendshipId: friendship[0].id,
            isRequester: isFriendshipRequester
          });
        }
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSendFriendRequest = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    setActionLoading(true);
    
    try {
      const { success, error } = await sendFriendRequest(user.id, userId);
      
      if (success) {
        setFriendshipStatus({
          exists: true,
          status: 'pending',
          friendshipId: null, // We don't have the ID yet
          isRequester: true
        });
      } else if (error) {
        console.error('Error sending friend request:', error);
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleCancelFriendRequest = async () => {
    if (!user || !friendshipStatus.friendshipId) return;
    
    setActionLoading(true);
    
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipStatus.friendshipId);
        
      if (error) throw error;
      
      setFriendshipStatus({
        exists: false,
        status: null,
        friendshipId: null,
        isRequester: false
      });
    } catch (error) {
      console.error('Error canceling friend request:', error);
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleRemoveFriend = async () => {
    if (!user || !friendshipStatus.friendshipId) return;
    
    setActionLoading(true);
    
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipStatus.friendshipId);
        
      if (error) throw error;
      
      setFriendshipStatus({
        exists: false,
        status: null,
        friendshipId: null,
        isRequester: false
      });
    } catch (error) {
      console.error('Error removing friend:', error);
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleAcceptFriendRequest = async () => {
    if (!user || !friendshipStatus.friendshipId) return;
    
    setActionLoading(true);
    
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipStatus.friendshipId);
        
      if (error) throw error;
      
      setFriendshipStatus({
        ...friendshipStatus,
        status: 'accepted'
      });
    } catch (error) {
      console.error('Error accepting friend request:', error);
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleRejectFriendRequest = async () => {
    if (!user || !friendshipStatus.friendshipId) return;
    
    setActionLoading(true);
    
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'rejected' })
        .eq('id', friendshipStatus.friendshipId);
        
      if (error) throw error;
      
      setFriendshipStatus({
        ...friendshipStatus,
        status: 'rejected'
      });
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleMessageUser = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    setActionLoading(true);
    
    try {
      // Get the current user's username
      const { data: currentUserData, error: currentUserError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
        
      if (currentUserError) throw currentUserError;
      
      const currentUsername = currentUserData?.username || 'unknown';
      const profileUsername = profile.username || 'unknown';
      
      // Use the createConversation function from our API
      const { success, conversationId, error } = await createConversation([user.id, userId]);
      
      if (success && conversationId) {
        router.push(`/social/messages/${currentUsername}/${profileUsername}/${conversationId}`);
      } else if (error) {
        console.error('Error creating conversation:', error);
        
        // Fallback to direct RPC call if the function fails
        try {
          const { data, error: rpcError } = await supabase.rpc('create_or_get_conversation', {
            user_ids: [user.id, userId]
          });
          
          if (rpcError) throw rpcError;
          
          if (data) {
            router.push(`/social/messages/${currentUsername}/${profileUsername}/${data}`);
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      
      // Fallback to direct RPC call if the function fails
      try {
        // Get the current user's username again (in case the earlier attempt failed)
        const { data: currentUserData, error: currentUserError } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
          
        if (currentUserError) throw currentUserError;
        
        const currentUsername = currentUserData?.username || 'unknown';
        const profileUsername = profile.username || 'unknown';
        
        const { data, error: rpcError } = await supabase.rpc('create_or_get_conversation', {
          user_ids: [user.id, userId]
        });
        
        if (rpcError) throw rpcError;
        
        if (data) {
          router.push(`/social/messages/${currentUsername}/${profileUsername}/${data}`);
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    } finally {
      setActionLoading(false);
    }
  };
  
  const renderFriendshipButton = () => {
    if (!user || user.id === userId) return null;
    
    if (!friendshipStatus.exists) {
      return (
        <Button 
          onClick={handleSendFriendRequest} 
          disabled={actionLoading}
          className={styles.actionButton}
        >
          <FaUserPlus /> Add Friend
        </Button>
      );
    }
    
    if (friendshipStatus.status === 'pending') {
      if (friendshipStatus.isRequester) {
        return (
          <Button 
            onClick={handleCancelFriendRequest} 
            variant="secondary"
            disabled={actionLoading}
            className={styles.actionButton}
          >
            Cancel Request
          </Button>
        );
      } else {
        return (
          <div className={styles.requestActions}>
            <Button 
              onClick={handleAcceptFriendRequest} 
              variant="primary"
              disabled={actionLoading}
              className={styles.actionButton}
            >
              <FaUserCheck /> Accept
            </Button>
            <Button 
              onClick={handleRejectFriendRequest} 
              variant="secondary"
              disabled={actionLoading}
              className={styles.actionButton}
            >
              Reject
            </Button>
          </div>
        );
      }
    }
    
    if (friendshipStatus.status === 'accepted') {
      return (
        <div className={styles.friendActions}>
          <Button 
            onClick={handleMessageUser} 
            variant="primary"
            disabled={actionLoading}
            className={styles.actionButton}
          >
            <FaEnvelope /> Message
          </Button>
          <Button 
            onClick={handleRemoveFriend} 
            variant="secondary"
            disabled={actionLoading}
            className={styles.actionButton}
          >
            <FaUserMinus /> Remove Friend
          </Button>
        </div>
      );
    }
    
    return null;
  };
  
  // Define tabs for the profile content
  const getTabs = (): Tab[] => {
    const tabs: Tab[] = [
      {
        id: 'social',
        label: 'Social Posts',
        icon: <FaStream />,
      }
    ];
    
    // Add blogs tab if user is admin and has blogs
    if (profile?.is_admin && blogs.length > 0) {
      tabs.push({
        id: 'blogs',
        label: 'Blog Posts',
        icon: <FaNewspaper />,
      });
    }
    
    // Add forums tab if user has forum posts
    if (forums.length > 0) {
      tabs.push({
        id: 'forums',
        label: 'Forum Posts',
        icon: <FaComments />,
      });
    }
    
    return tabs;
  };
  
  // Render tab content based on active tab
  const renderTabContent = (tab: Tab) => {
    switch (tab.id) {
      case 'social':
        return (
          <div className={styles.socialPosts}>
            <h2 className={styles.sectionTitle}>Posts</h2>
            
            {posts.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No posts yet</p>
              </div>
            ) : (
              posts.map(post => (
                <SocialPost 
                  key={post.id} 
                  post={post} 
                  onDelete={user?.id === userId ? () => fetchProfileData() : undefined}
                />
              ))
            )}
          </div>
        );
        
      case 'blogs':
        return (
          <div className={styles.blogPosts}>
            <h2 className={styles.sectionTitle}>Blog Posts</h2>
            <div className={styles.blogsList}>
              {blogs.map(blog => (
                <div key={blog.id} className={styles.blogPost}>
                  <div className={styles.postContent}>
                    <div className={styles.postMeta}>
                      <div className={styles.category}>{blog.category || 'Blog'}</div>
                      <div className={styles.date}>{formatDate(blog.created_at)}</div>
                    </div>

                    <h3 className={styles.postTitle}>
                      {blog.is_pinned && <span className={styles.pinnedIndicator}>📌 </span>}
                      {blog.title}
                    </h3>
                    
                    {blog.thumbnail_url && (
                      <div className={styles.thumbnailContainer}>
                        <img 
                          src={blog.thumbnail_url} 
                          alt={blog.title} 
                          className={styles.thumbnail} 
                        />
                      </div>
                    )}
                    
                    {blog.summary && (
                      <div className={styles.postSummary}>{blog.summary}</div>
                    )}
                    
                    {blog.content && (
                      <div className={styles.postFullContent}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkImageDimensions]}
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            code({node, inline, className, children, ...props}: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              return !inline && match ? (
                                <SyntaxHighlighter
                                  // @ts-ignore
                                  style={dark}
                                  language={match[1]}
                                  PreTag="div"
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              ) : (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {blog.content}
                        </ReactMarkdown>
                      </div>
                    )}
                    
                    <div className={styles.postFooter}>
                      <div className={styles.authorInfo}>
                        {blog.profiles?.avatar_url && (
                          <div className={styles.authorAvatar}>
                            <AvatarWithStatus
                              userId={blog.profiles.id}
                              avatarUrl={blog.profiles.avatar_url}
                              username={blog.profiles.username || 'User'}
                              size="small"
                            />
                          </div>
                        )}
                        <span className={styles.authorName}>
                          {blog.profiles?.username || 'Unknown User'}
                          {blog.profiles?.is_admin && (
                            <span className={styles.adminBadge}>ADMIN</span>
                          )}
                        </span>
                      </div>
                      <div className={styles.postControls}>
                        {/* Show controls if user is the post author or admin */}
                        {user && (
                          (blog?.user_id === user.id || currentUserIsAdmin) && (
                            <>
                              <Button 
                                variant="secondary" 
                                size="small" 
                                onClick={() => router.push(`/admin/blogs/edit/${blog.id}`)}
                              >
                                Edit
                              </Button>
                              <Button 
                                variant="danger" 
                                size="small" 
                                onClick={async () => {
                                  if (!confirm('Are you sure you want to delete this blog post? This action cannot be undone.')) {
                                    return;
                                  }
                                  
                                  try {
                                    const { error } = await supabase
                                      .from('blog_posts')
                                      .delete()
                                      .eq('id', blog.id);
                                      
                                    if (error) {
                                      console.error('Error deleting blog post:', error);
                                      alert(`Failed to delete blog post: ${error.message}`);
                                      return;
                                    }
                                    
                                    // Refresh the profile data
                                    fetchProfileData();
                                    alert('Blog post deleted successfully');
                                  } catch (error: any) {
                                    console.error('Error deleting blog post:', error);
                                    alert(`An unexpected error occurred: ${error?.message || 'Unknown error'}`);
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            </>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'forums':
        return (
          <div className={styles.forumPosts}>
            <h2 className={styles.sectionTitle}>Forum Posts</h2>
            
            {forums.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No forum posts yet</p>
              </div>
            ) : (
              <div className={styles.forumsList}>
                {forums.map(forum => (
                  <ForumPost 
                    key={forum.id} 
                    post={forum} 
                    onDelete={user?.id === userId ? () => fetchProfileData() : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };
  
  if (loading) {
    return <div className={styles.loading}>Loading profile...</div>;
  }
  
  if (!profile) {
    return <div className={styles.notFound}>User not found</div>;
  }
  
  // Get current tabs
  const tabs = getTabs();
  
  return (
    <div className={styles.profilePage}>
      <h2 className={styles.profileTitle}>Social Profile</h2>
      <div className={styles.profileHeader}>
        <div className={styles.profileInfo}>
          <div className={styles.profileAvatar}>
            <AvatarWithStatus
              userId={profile.id}
              avatarUrl={profile.avatar_url}
              username={profile.username || 'User'}
              size="xxxxxlarge"
            />
          </div>
          
          <div className={styles.profileDetails}>
            <h1 className={styles.username}>
              {profile.username || 'Unknown User'}
              {profile.is_admin && (
                <span className={styles.adminBadge}>ADMIN</span>
              )}
            </h1>
            
            {profile.minecraft_username && (
              <div className={styles.minecraftUsername}>
                Minecraft: {profile.minecraft_username}
              </div>
            )}
            
            <div className={styles.memberSince}>
              Member since {new Date(profile.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
        
        <div className={styles.profileActions}>
          {renderFriendshipButton()}
        </div>
      </div>
      
      <div className={styles.profileContent}>
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          orientation="horizontal"
          showContentBackground={true}
          showContainerBackground={true}
          className={styles.profileTabs}
          renderTabContent={renderTabContent}
        />
      </div>
    </div>
  );
} 