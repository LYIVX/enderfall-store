"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { supabase, getSocialPosts, getFriendships, getFriendRequests, getOutgoingFriendRequests, 
  getConversations, sendFriendRequest, getCurrentUser, getSocialPostComments, likeSocialPost, 
  hasUserLikedSocialPost, createSocialPostComment, hasUserLikedPost, togglePostLike } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthContext';
import SocialPost from '@/components/Social/SocialPost';
import CreatePost from '@/components/Social/CreatePost';
import FriendItem from '@/components/Social/FriendItem';
import ConversationItem from '@/components/Social/ConversationItem';
import UserSearch from '@/components/Social/UserSearch';
import Button from '@/components/UI/Button';
import styles from './page.module.css';
import { 
  FaEnvelope, FaUserFriends, FaUserPlus, FaBell, FaSync, FaNewspaper, 
  FaComments, FaHeart, FaComment, FaEdit, FaTrash, FaArchive, FaHome, FaStream, FaArrowLeft, 
  FaPaperPlane
} from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import Dropdown from '@/components/UI/Dropdown';
import Input from '@/components/UI/Input';
import CreateForumPost from '@/components/Forums/CreateForumPost';
import EditForumPost from '@/components/Forums/EditForumPost';
import EditBlogPost from '@/components/Social/EditBlogPost';
import CreateBlogPost from '@/components/Social/CreateBlogPost';
import Tabs, { Tab } from '@/components/UI/Tabs';
import AvatarWithStatus from '@/components/UI/AvatarWithStatus';
import ForumPost from '@/components/Forums/ForumPost';
import NineSliceContainer from '@/components/UI/NineSliceContainer';
import CollapsibleSidebar from '@/components/UI/CollapsibleSidebar';
import AuthModal from '@/components/Auth/LoginModal';

// Add debounce function at the top of the component
const debounce = (func: Function, delay: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

const blogCategories = [
  'All Categories',
  'News',
  'Updates',
  'Announcements',
  'Tutorials',
  'Features',
];

const blogSortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'author_asc', label: 'Author (A-Z)' },
  { value: 'author_desc', label: 'Author (Z-A)' },
  { value: 'title_asc', label: 'Title (A-Z)' },
  { value: 'title_desc', label: 'Title (Z-A)' },
];

const forumCategories = [
  'All Categories',
  'Announcements',
  'General',
  'Towns',
  'Events',
  'Guides',
  'Support',
];

const forumSortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'author_asc', label: 'Author (A-Z)' },
  { value: 'author_desc', label: 'Author (Z-A)' },
  { value: 'likes_desc', label: 'Most Likes' },
  { value: 'likes_asc', label: 'Least Likes' },
  { value: 'title_asc', label: 'Title (A-Z)' },
  { value: 'title_desc', label: 'Title (Z-A)' },
];

export default function SocialPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [forums, setForums] = useState<any[]>([]);
  const [friendships, setFriendships] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const [loadingForums, setLoadingForums] = useState(false);
  const [refreshingConversations, setRefreshingConversations] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'friends' | 'requests' | 'conversations'>('feed');
  const [activeContentTab, setActiveContentTab] = useState<'posts' | 'blogs' | 'forums'>('posts');
  const [showFriendsOnly, setShowFriendsOnly] = useState(false);
  const [showBlogsFriendsOnly, setShowBlogsFriendsOnly] = useState(false);
  const [showForumsFriendsOnly, setShowForumsFriendsOnly] = useState(false);
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const lastConversationRefresh = useRef<number>(Date.now());
  const [blogSearchQuery, setBlogSearchQuery] = useState('');
  const [blogCategory, setBlogCategory] = useState('All Categories');
  const [blogSort, setBlogSort] = useState('newest');
  const [forumSearchQuery, setForumSearchQuery] = useState('');
  const [forumCategory, setForumCategory] = useState('All Categories');
  const [forumSort, setForumSort] = useState('newest');
  const [forumComments, setForumComments] = useState<any[]>([]);
  const [forumCommentContent, setForumCommentContent] = useState('');
  const [isForumCommentLoading, setIsForumCommentLoading] = useState(false);
  const [showForumComments, setShowForumComments] = useState(false);
  const [userHasLikedForum, setUserHasLikedForum] = useState(false);
  const [showCreateForum, setShowCreateForum] = useState(false);
  const [editingForum, setEditingForum] = useState<any | null>(null);
  const [selectedForum, setSelectedForum] = useState<any | null>(null);
  
  // Blog states
  const [selectedBlog, setSelectedBlog] = useState<any | null>(null);
  const [editingBlog, setEditingBlog] = useState<any | null>(null);
  const [showCreateBlog, setShowCreateBlog] = useState(false);
  
  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  
  // Content tabs definition
  const contentTabs: Tab[] = [
    { id: 'posts', label: 'Social Posts', icon: <FaStream /> },
    { id: 'blogs', label: 'Blogs', icon: <FaNewspaper /> },
    { id: 'forums', label: 'Forums', icon: <FaComments /> }
  ];
  
  // Sidebar tabs definition
  const getSidebarTabs = () => {
    if (!user) return [];
    
    return [
      { id: 'feed', label: 'Feed', icon: <FaHome /> },
      { 
        id: 'friends', 
        label: 'Friends', 
        icon: <FaUserFriends />,
      },
      { 
        id: 'requests', 
        label: 'Friend Requests', 
        icon: <FaUserPlus />,
      },
      { 
        id: 'conversations', 
        label: 'Messages', 
        icon: <FaEnvelope />,
      }
    ];
  };
  
  // Type-safe tab change handlers
  const handleContentTabChange = (tabId: string) => {
    if (tabId === 'posts' || tabId === 'blogs' || tabId === 'forums') {
      setActiveContentTab(tabId);
    }
  };
  
  const handleSidebarTabChange = (tabId: string) => {
    if (tabId === 'feed' || tabId === 'friends' || tabId === 'requests' || tabId === 'conversations') {
      setActiveTab(tabId);
    }
  };
  
  // Debounced function to refresh conversations
  const debouncedRefreshConversations = useRef(
    debounce(async (userId: string) => {
      console.log('Refreshing conversations (debounced)');
      const data = await getConversations(userId);
      setConversations(data);
      lastConversationRefresh.current = Date.now();
    }, 300)
  ).current;
  
  // Add functions to fetch blogs and forums
  const fetchBlogs = async () => {
    setLoadingBlogs(true);
    try {
      // Fetch published blog posts
      let query = supabase
        .from('blog_posts')
        .select(`
          *,
          profiles (
            username,
            avatar_url,
            is_admin
          )
        `)
        .eq('is_published', true);
      
      // Apply sorting - always sort pinned posts first
      query = query.order('is_pinned', { ascending: false });
      
      // Apply additional sorting based on selection
      switch (blogSort) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'title_asc':
          query = query.order('title', { ascending: true });
          break;
        case 'title_desc':
          query = query.order('title', { ascending: false });
          break;
        // For author sorts, we'll handle these after fetching the data
        default:
          query = query.order('created_at', { ascending: false });
      }

      // Apply category filter if not "All Categories"
      if (blogCategory !== 'All Categories') {
        query = query.eq('category', blogCategory);
      }
        
      const { data, error } = await query;
        
      if (error) throw error;
      
      // Apply author-based sorting if needed
      let sortedData = [...(data || [])];
      if (blogSort === 'author_asc') {
        sortedData.sort((a, b) => {
          const authorA = a.profiles?.username?.toLowerCase() || '';
          const authorB = b.profiles?.username?.toLowerCase() || '';
          return authorA.localeCompare(authorB);
        });
      } else if (blogSort === 'author_desc') {
        sortedData.sort((a, b) => {
          const authorA = a.profiles?.username?.toLowerCase() || '';
          const authorB = b.profiles?.username?.toLowerCase() || '';
          return authorB.localeCompare(authorA);
        });
      }
      
      // Filter by friends only if enabled and user is logged in
      if (showBlogsFriendsOnly && user) {
        // First, get all friend IDs
        const { data: friendshipsData } = await supabase
          .from('friendships')
          .select('friend_id, user_id')
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .eq('status', 'accepted');
          
        if (friendshipsData) {
          const friendIds = friendshipsData.map(fs => 
            fs.friend_id === user.id ? fs.user_id : fs.friend_id
          );
          
          // Then filter the blogs to only show those from friends
          sortedData = sortedData.filter(blog => 
            friendIds.includes(blog.user_id) && blog.user_id !== user.id
          );
        }
      }
      
      setBlogs(sortedData || []);
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoadingBlogs(false);
    }
  };
  
  const fetchForums = async () => {
    setLoadingForums(true);
    try {
      // Fetch forum posts
      let query = supabase
        .from('forum_posts')
        .select('*');
      
      // Apply category filter if not "All Categories"
      if (forumCategory !== 'All Categories') {
        query = query.eq('category', forumCategory);
      }
      
      // Apply sorting - always sort pinned posts first
      query = query.order('pinned', { ascending: false });
      
      // Apply additional sorting based on selection
      switch (forumSort) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'likes_desc':
          query = query.order('likes', { ascending: false });
          break;
        case 'likes_asc':
          query = query.order('likes', { ascending: true });
          break;
        case 'title_asc':
          query = query.order('title', { ascending: true });
          break;
        case 'title_desc':
          query = query.order('title', { ascending: false });
          break;
        // For author sorts, we'll handle these after fetching the data
        default:
          query = query.order('created_at', { ascending: false });
      }
      
      const { data: forumData, error: forumError } = await query;
        
      if (forumError) throw forumError;
      
      // Collect unique author IDs from posts
      const authorIds = forumData?.map(post => post.user_id).filter(Boolean) || [];
      
      // Fetch author profiles in a separate query
      let authorProfiles: Record<string, any> = {};
      
      if (authorIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, minecraft_username, is_admin')
          .in('id', authorIds);
          
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        } else if (profilesData) {
          // Create a map of author ID to profile
          authorProfiles = profilesData.reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {} as Record<string, any>);
        }
      }
      
      // Combine post data with author profiles
      const postsWithAuthors = forumData?.map(post => ({
        ...post,
        author: authorProfiles[post.user_id] || null
      })) || [];
      
      // Apply author-based sorting if needed
      let sortedData = [...postsWithAuthors];
      if (forumSort === 'author_asc') {
        sortedData.sort((a, b) => {
          const authorA = a.author?.username?.toLowerCase() || '';
          const authorB = b.author?.username?.toLowerCase() || '';
          return authorA.localeCompare(authorB);
        });
      } else if (forumSort === 'author_desc') {
        sortedData.sort((a, b) => {
          const authorA = a.author?.username?.toLowerCase() || '';
          const authorB = b.author?.username?.toLowerCase() || '';
          return authorB.localeCompare(authorA);
        });
      }
      
      // Filter by friends only if enabled and user is logged in
      if (showForumsFriendsOnly && user) {
        // First, get all friend IDs
        const { data: friendshipsData } = await supabase
          .from('friendships')
          .select('friend_id, user_id')
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .eq('status', 'accepted');
          
        if (friendshipsData) {
          const friendIds = friendshipsData.map(fs => 
            fs.friend_id === user.id ? fs.user_id : fs.friend_id
          );
          
          // Then filter the forums to only show those from friends
          sortedData = sortedData.filter(forum => 
            friendIds.includes(forum.user_id) && forum.user_id !== user.id
          );
        }
      }
      
      setForums(sortedData);
    } catch (error) {
      console.error('Error fetching forums:', error);
    } finally {
      setLoadingForums(false);
    }
  };
  
  // Set up periodic refresh for conversations
  useEffect(() => {
    if (!user) return;
    
    const refreshInterval = setInterval(() => {
      const now = Date.now();
      // Only refresh if it's been more than 15 seconds since the last refresh
      if (now - lastConversationRefresh.current > 15000) {
        console.log('Performing periodic refresh of conversations');
        getConversations(user.id).then(data => {
          setConversations(data);
          lastConversationRefresh.current = now;
        }).catch(err => {
          console.error('Error in periodic conversation refresh:', err);
        });
      }
    }, 10000); // Check every 10 seconds
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [user]);
  
  // Check if the current user is an admin
  useEffect(() => {
    if (profile) {
      setCurrentUserIsAdmin(profile.is_admin || false);
    }
  }, [profile]);
  
  useEffect(() => {
    if (user) {
      fetchSocialData(user.id);
      
      // Set up real-time subscriptions for messages and conversations
      const conversationsSubscription = supabase
        .channel('social-conversations-updates')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen for inserts, updates and deletes
            schema: 'public',
            table: 'conversations',
          },
          async (payload) => {
            console.log('Conversation changed:', payload.new || payload.old);
            // When there's any change to conversations, refresh conversations with debounce
            if (user) {
              debouncedRefreshConversations(user.id);
            }
          }
        )
        .subscribe();
        
      // Set up subscription for all messages in conversations the user is part of
      const messagesSubscription = supabase
        .channel('social-all-messages-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
          },
          async (payload) => {
            console.log('Message detected:', payload.new);
            
            if (!user || !payload.new || !payload.new.conversation_id) return;
            
            try {
              // Check if this message is for a conversation the user is part of
              const { data, error } = await supabase
                .from('conversation_participants')
                .select('id')
                .eq('conversation_id', payload.new.conversation_id)
                .eq('user_id', user.id);
                
              if (error) {
                console.error('Error checking if user is in conversation:', error);
                return;
              }
              
              // If user is part of this conversation, refresh the conversations list
              if (data && data.length > 0) {
                console.log(`Refreshing conversations for message in conversation ${payload.new.conversation_id}`);
                debouncedRefreshConversations(user.id);
              }
            } catch (err) {
              console.error('Error processing message update:', err);
            }
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(conversationsSubscription);
        supabase.removeChannel(messagesSubscription);
      };
    } else {
      // Initialize state for not logged in users
      setLoading(false);
    }
  }, [user, debouncedRefreshConversations]);

  // Load blogs and forums when the content tab changes
  useEffect(() => {
    if (activeContentTab === 'blogs') {
      fetchBlogs();
    } else if (activeContentTab === 'forums') {
      fetchForums();
    }
  }, [activeContentTab]);
  
  const fetchSocialData = async (userId: string) => {
    setLoading(true);
    
    try {
      // Fetch posts
      const postsData = await getSocialPosts(showFriendsOnly, userId);
      setPosts(postsData);
      
      // Fetch friendships
      const friendshipsData = await getFriendships(userId);
      setFriendships(friendshipsData);
      
      // Fetch friend requests
      const requestsData = await getFriendRequests(userId);
      setFriendRequests(requestsData);
      
      // Fetch outgoing friend requests
      const outgoingRequestsData = await getOutgoingFriendRequests(userId);
      setOutgoingRequests(outgoingRequestsData);
      
      // Fetch conversations
      const conversationsData = await getConversations(userId);
      setConversations(conversationsData);
    } catch (error) {
      console.error('Error fetching social data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePostCreated = () => {
    if (user) {
      fetchSocialData(user.id);
    }
  };
  
  const handlePostDeleted = (postId: string) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
  };
  
  const handleAcceptFriendRequest = (friendshipId: string) => {
    setFriendRequests(prevRequests => prevRequests.filter(req => req.id !== friendshipId));
    
    // Refresh friendships
    if (user) {
      getFriendships(user.id).then(data => {
        setFriendships(data);
      });
    }
  };
  
  const handleRejectFriendRequest = (friendshipId: string) => {
    setFriendRequests(prevRequests => prevRequests.filter(req => req.id !== friendshipId));
  };
  
  const handleRemoveFriend = (friendshipId: string) => {
    setFriendships(prevFriendships => prevFriendships.filter(f => f.id !== friendshipId));
  };
  
  const handleSendFriendRequest = async (friendId: string) => {
    if (!user) return;
    
    try {
      await sendFriendRequest(user.id, friendId);
      // Optionally show a success message
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };
  
  const handleToggleFriendsOnly = () => {
    setShowFriendsOnly(!showFriendsOnly);
    if (user) {
      getSocialPosts(!showFriendsOnly, user.id).then(data => {
        setPosts(data);
      });
    }
  };
  
  const handleToggleBlogsFriendsOnly = () => {
    setShowBlogsFriendsOnly(!showBlogsFriendsOnly);
    if (user) {
      fetchBlogs();
    }
  };
  
  const handleToggleForumsFriendsOnly = () => {
    setShowForumsFriendsOnly(!showForumsFriendsOnly);
    if (user) {
      fetchForums();
    }
  };
  
  const toggleCreatePost = () => {
    setShowCreatePost(!showCreatePost);
  };
  
  const handleCancelFriendRequest = async (friendshipId: string) => {
    setOutgoingRequests(prevRequests => prevRequests.filter(req => req.id !== friendshipId));
    
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error canceling friend request:', error);
      // Refresh the data in case of error
      if (user) fetchSocialData(user.id);
    }
  };
  
  // Function to manually refresh conversations
  const refreshConversations = async () => {
    if (!user) return;
    
    try {
      setRefreshingConversations(true);
      const data = await getConversations(user.id);
      console.log('Refreshed conversations data:', data);
      
      // Log detailed information about participants and messages
      data.forEach((conversation, index) => {
        console.log(`Conversation ${index + 1} (${conversation.id}):`);
        console.log('- Participants:', conversation.participants);
        console.log('- Last message:', conversation.last_message);
      });
      
      setConversations(data);
      lastConversationRefresh.current = Date.now();
    } catch (error) {
      console.error("Error refreshing conversations:", error);
    } finally {
      setRefreshingConversations(false);
    }
  };
  
  // Add search handlers
  const handleBlogSearch = () => {
    if (!blogSearchQuery.trim()) {
      fetchBlogs();
      return;
    }

    const filteredBlogs = blogs.filter(blog => 
      blog.title.toLowerCase().includes(blogSearchQuery.toLowerCase()) ||
      blog.content.toLowerCase().includes(blogSearchQuery.toLowerCase()) ||
      (blog.summary && blog.summary.toLowerCase().includes(blogSearchQuery.toLowerCase()))
    );
    
    setBlogs(filteredBlogs);
  };
  
  const handleForumSearch = () => {
    if (!forumSearchQuery.trim()) {
      // If the search query is empty, just reset to the normal forum view
      fetchForums();
      return;
    }
    
    // Filter the forums based on the search query
    const filteredForums = forums.filter(forum => {
      const searchTerms = forumSearchQuery.toLowerCase().split(' ');
      const forumContent = (
        (forum.title || '') + ' ' +
        (forum.content || '') + ' ' + 
        (forum.summary || '') + ' ' +
        (forum.category || '') + ' ' +
        (forum.author?.username || '')
      ).toLowerCase();
      
      // Check if all search terms are found in the forum content
      return searchTerms.every(term => forumContent.includes(term));
    });
    
    setForums(filteredForums);
  };
  
  // Add separate effects for category and sort changes
  useEffect(() => {
    if (user && activeContentTab === 'blogs') {
      fetchBlogs();
    }
  }, [user, blogCategory, blogSort, showBlogsFriendsOnly]);
  
  useEffect(() => {
    if (user && activeContentTab === 'forums') {
      fetchForums();
    }
  }, [user, forumCategory, forumSort, showForumsFriendsOnly]);
  
  // Add keyboard event handler for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (activeContentTab === 'blogs' && document.activeElement === document.querySelector(`.${styles.searchInput} input`)) {
          handleBlogSearch();
        } else if (activeContentTab === 'forums' && document.activeElement === document.querySelector(`.${styles.searchInput} input`)) {
          handleForumSearch();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeContentTab, blogSearchQuery, forumSearchQuery]);
  
  // Handle URL parameters
  useEffect(() => {
    // Check if we need to activate a specific tab
    if (!searchParams) return;
    
    const tab = searchParams.get('tab');
    if (tab) {
      if (tab === 'forums') {
        setActiveTab('feed');
        setActiveContentTab('forums');
      } else if (tab === 'blogs') {
        setActiveTab('feed');
        setActiveContentTab('blogs');
        
        // Check if we have a blog ID to display
        const blogId = searchParams.get('blog');
        if (blogId && user) {
          // Fetch the blog post
          supabase
            .from('blog_posts')
            .select(`
              *,
              profiles (
                username,
                avatar_url,
                is_admin
              )
            `)
            .eq('id', blogId)
            .single()
            .then(({ data, error }) => {
              if (error) {
                console.error('Error fetching blog post:', error);
                return;
              }
              
              if (data) {
                // Display the blog
                handleViewBlog(data);
              }
            });
        }
      }
    }
  }, [searchParams, user]);
  
  // Create a type-safe component for each tab content
  const renderFeedContent = () => {
    return (
      <NineSliceContainer className={styles.feedContent} variant='blue'>
        <Tabs
          tabs={contentTabs}
          activeTab={activeContentTab}
          onChange={handleContentTabChange}
          className={styles.contentTabs}
        />
        
        {activeContentTab === 'posts' && (
          <>
            <NineSliceContainer className={styles.postsHeader}>
              <h2 className={styles.sectionTitle}>Social Posts</h2>
              {user ? (
                <div className={styles.postsHeaderButtons}>
                  <Button 
                    variant={showFriendsOnly ? 'primary' : 'secondary'}
                    nineSlice={true}
                    onClick={handleToggleFriendsOnly}
                    size="medium"
                    className={styles.friendsFilterButton}
                  >
                    {showFriendsOnly ? 'Friends Posts Only' : 'Showing All Posts'}
                  </Button>
                  <Button 
                    variant="primary"
                    size="medium"
                    nineSlice={true}
                    onClick={toggleCreatePost}
                    className={styles.createPostButton}
                  >
                    {showCreatePost ? 'Hide Post Form' : 'Create Post'}
                  </Button>
                </div>
              ) : null}
            </NineSliceContainer>
            
            {user ? (
              <>
                {showCreatePost && <CreatePost onPostCreated={handlePostCreated} />}
                
                {posts.length === 0 ? (
                  <NineSliceContainer className={styles.emptyState}>
                    <p>No posts to show. {showFriendsOnly ? 'Add some friends or create your first post!' : 'Be the first to create a post!'}</p>
                  </NineSliceContainer>
                ) : (
                  posts.map(post => (
                    <SocialPost 
                      key={post.id} 
                      post={post} 
                      onDelete={handlePostDeleted} 
                    />
                  ))
                )}
              </>
            ) : (
              <NineSliceContainer className={styles.authPrompt}>
                <h2>Join the Community</h2>
                <p>Sign in or create an account to connect with other players, share posts, and more!</p>
                <Button variant="primary" nineSlice={true} onClick={openLoginModal}>Sign In</Button>
              </NineSliceContainer>
            )}
          </>
        )}
        
        {activeContentTab === 'blogs' && (
          <div className={styles.blogsContent}>
            {editingBlog ? (
              <NineSliceContainer className={styles.editForumWrapper}>
                <div className={styles.editForumHeader}>
                  <h2 className={styles.sectionTitle}>Edit Blog Post</h2>
                  <Button
                    variant="secondary"
                    size="medium"
                    onClick={handleCancelEditBlog}
                    className={styles.backButton}
                  >
                    ← Cancel
                  </Button>
                </div>
                <EditBlogPost
                  post={editingBlog}
                  isOpen={true}
                  onClose={handleBlogEdited}
                />
              </NineSliceContainer>
            ) : selectedBlog ? (
              /* Blog Detail View */
              <div className={styles.forumDetailContainer}>
                <div className={styles.forumDetailHeader}>
                  <h2 className={styles.sectionTitle}>{selectedBlog.title}</h2>
                  <Button
                    variant="secondary"
                    size="medium"
                    onClick={handleBackToBlogs}
                    className={styles.backButton}
                  >
                    ← Back to Blogs
                  </Button>
                </div>
                
                <div className={styles.forumDetail}>
                  <div className={styles.forumDetailMeta}>
                    <div className={styles.category}>{selectedBlog.category || 'Blog'}</div>
                    <div className={styles.date}>
                      {new Date(selectedBlog.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  
                  {selectedBlog.thumbnail_url && (
                    <div className={styles.thumbnailContainer}>
                      <img 
                        src={selectedBlog.thumbnail_url} 
                        alt={selectedBlog.title} 
                        className={styles.thumbnail} 
                      />
                    </div>
                  )}
                  
                  <div className={styles.forumDetailAuthor}>
                    <div className={styles.authorAvatar}>
                      <AvatarWithStatus
                        userId={selectedBlog.user_id}
                        avatarUrl={selectedBlog.profiles?.avatar_url}
                        username={selectedBlog.profiles?.username || 'User'}
                        size="medium"
                      />
                    </div>
                    <div className={styles.authorDetails}>
                      <span className={styles.authorName}>
                        {selectedBlog.profiles?.username || 'Unknown User'}
                        {selectedBlog.profiles?.is_admin && (
                          <span className={styles.adminBadge}>ADMIN</span>
                        )}
                      </span>
                    </div>
                  </div>
                  
                  <div className={styles.forumDetailContent}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                    >
                      {selectedBlog.content}
                    </ReactMarkdown>
                  </div>
                  
                  <div className={styles.forumDetailFooter}>
                    {/* Edit/Delete controls */}
                    {user && (
                      (selectedBlog?.user_id === user.id || currentUserIsAdmin) && (
                        <div className={styles.postActions}>
                          <Button
                            variant="edit"
                            size="medium"
                            className={`${styles.actionButton}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditBlog(selectedBlog);
                            }}
                          >
                          </Button>
                          <Button
                            variant="delete"
                            size="small"
                            className={`${styles.actionButton} ${styles.deleteButton}`}
                            onClick={async (e) => {
                              if (!confirm('Are you sure you want to delete this blog post? This action cannot be undone.')) {
                                return;
                              }
                              
                              try {
                                const { error } = await supabase
                                  .from('blog_posts')
                                  .delete()
                                  .eq('id', selectedBlog.id);
                                  
                                if (error) {
                                  console.error('Error deleting blog post:', error);
                                  alert(`Failed to delete blog post: ${error.message}`);
                                  return;
                                }
                                
                                // Remove from the UI and go back to list
                                setBlogs(blogs.filter(b => b.id !== selectedBlog.id));
                                handleBackToBlogs();
                                alert('Blog post deleted successfully');
                              } catch (error: any) {
                                console.error('Error deleting blog post:', error);
                                alert(`An unexpected error occurred: ${error?.message || 'Unknown error'}`);
                              }
                            }}
                          >
                          </Button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {!showCreateBlog && (
                  <NineSliceContainer className={styles.blogsHeader}>
                    <h2 className={styles.sectionTitle}>Blogs</h2>
                    <div className={styles.blogsHeaderButtons}>
                      {user ? (
                        <>
                          <Button 
                            variant={showBlogsFriendsOnly ? 'primary' : 'secondary'}
                            onClick={handleToggleBlogsFriendsOnly}
                            size="medium"  
                            nineSlice={true}
                            className={styles.friendsFilterButton}
                          >
                            {showBlogsFriendsOnly ? 'Friends Posts Only' : 'Showing All Posts'}
                          </Button>
                          <Button 
                            variant="primary"
                            size="medium"
                            nineSlice={true}
                            onClick={toggleCreateBlog}
                            className={styles.createBlogButton}
                          >
                            Create Blog
                          </Button>
                        </>
                      ) : (
                        <Button 
                          variant="primary"
                          size="medium"
                          nineSlice={true}
                          onClick={openLoginModal}
                          className={styles.createBlogButton}
                        >
                          Sign In to Create
                        </Button>
                      )}
                    </div>
                  </NineSliceContainer>
                )}
                
                {showCreateBlog ? (
                  <NineSliceContainer className={styles.createForumWrapper}>
                    <div className={styles.createForumHeader}>
                      <h2 className={styles.sectionTitle}>Create New Blog Post</h2>
                      <Button
                        variant="secondary"
                        size="medium"
                        onClick={() => setShowCreateBlog(false)}
                        className={styles.backButton}
                      >
                        ← Cancel
                      </Button>
                    </div>
                    <CreateBlogPost
                      isOpen={true}
                      onClose={handleBlogCreated}
                    />
                  </NineSliceContainer>
                ) : (
                  <>
                    <NineSliceContainer className={styles.toolbarContainer}>
                      <div className={styles.categoryFilter}>
                        <Dropdown
                          label="Category"
                          options={blogCategories}
                          value={blogCategory}
                          onChange={(e) => setBlogCategory(e.target.value)}
                          className={styles.categoryDropdown}
                          layout="horizontal"
                        />
                      </div>
                      <div className={styles.sortFilter}>
                        <Dropdown
                          label="Sort By"
                          options={blogSortOptions.map(option => option.label)}
                          value={blogSortOptions.find(option => option.value === blogSort)?.label || 'Newest First'}
                          onChange={(e) => {
                            const selected = blogSortOptions.find(option => option.label === e.target.value);
                            setBlogSort(selected ? selected.value : 'newest');
                          }}
                          className={styles.sortDropdown}
                          layout="horizontal"
                        />
                      </div>
                      <div className={styles.searchContainer}>
                        <Input 
                          label="Search"
                          placeholder="Search blog posts..." 
                          className={styles.searchInput}
                          value={blogSearchQuery}
                          onChange={(e) => setBlogSearchQuery(e.target.value)}
                          layout="horizontal"
                          nineSlice={true}
                        />
                        <Button 
                        variant="secondary" 
                        size="medium" 
                        onClick={handleBlogSearch} 
                        className={styles.searchButton}
                        nineSlice={true}
                        >
                          Search
                        </Button>
                      </div>
                    </NineSliceContainer>
                    
                    {loadingBlogs ? (
                      <div className={styles.loadingState}>Loading blogs...</div>
                    ) : blogs.length === 0 ? (
                      <div className={styles.emptyState}>
                        <p>No blog posts available.</p>
                      </div>
                    ) : (
                      <div className={styles.blogsList}>
                        {blogs.map(blog => (
                          <NineSliceContainer 
                            key={blog.id} 
                            className={styles.blogPost}
                          >
                            <div className={styles.postContent}>
                              <div className={styles.postMeta}>
                                <div className={styles.category}>{blog.category || 'Blog'}</div>
                                <div className={styles.date}>
                                  {new Date(blog.created_at).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </div>
                              </div>
                              
                              <NineSliceContainer className={styles.postTitle}>
                                {blog.is_pinned && <span className={styles.pinnedIndicator}>📌 </span>}
                                {blog.title}
                              </NineSliceContainer>
                              
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
                                <NineSliceContainer className={styles.postSummary}>{blog.summary}</NineSliceContainer>
                              )}
                              
                              {blog.content && (
                                <NineSliceContainer className={styles.postFullContent}>
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeRaw]}
                                  >
                                    {blog.content}
                                  </ReactMarkdown>
                                </NineSliceContainer>
                              )}
                              
                              <div className={styles.postFooter}>
                                <NineSliceContainer className={styles.authorInfo}>
                                  <div className={styles.authorAvatar}>
                                    <AvatarWithStatus
                                      userId={blog.user_id}
                                      avatarUrl={blog.profiles?.avatar_url}
                                      username={blog.profiles?.username || 'User'}
                                      size="small"
                                    />
                                  </div>
                                  <span className={styles.authorName}>
                                    {blog.profiles?.username || 'Unknown User'}
                                    {blog.profiles?.is_admin && (
                                      <span className={styles.adminBadge}>ADMIN</span>
                                    )}
                                  </span>
                                </NineSliceContainer>
                                <div className={styles.postControls}>
                                  {user && (
                                    (blog?.user_id === user.id || currentUserIsAdmin) && (
                                      <div className={styles.postActions}>
                                        <Button
                                          variant="edit"
                                          size="small"
                                          className={`${styles.actionButton} ${styles.editButton}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditBlog(blog);
                                          }}
                                        >
                                        </Button>
                                        <Button
                                          variant="delete"
                                          size="small"
                                          className={`${styles.actionButton} ${styles.deleteButton}`}
                                          onClick={async (e) => {
                                            e.stopPropagation();
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
                                              
                                              // Remove from the UI
                                              setBlogs(blogs.filter(b => b.id !== blog.id));
                                              alert('Blog post deleted successfully');
                                            } catch (error: any) {
                                              console.error('Error deleting blog post:', error);
                                              alert(`An unexpected error occurred: ${error?.message || 'Unknown error'}`);
                                            }
                                          }}
                                        >
                                        </Button>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          </NineSliceContainer>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
        
        {activeContentTab === 'forums' && (
          <div className={styles.forumsContent}>
            {editingForum ? (
              <NineSliceContainer className={styles.editForumWrapper}>
                <div className={styles.editForumHeader}>
                  <h2 className={styles.sectionTitle}>Edit Forum Post</h2>
                  <Button
                    variant="secondary"
                    size="medium"
                    onClick={handleCancelEditForum}
                    className={styles.backButton}
                  >
                    ← Cancel
                  </Button>
                </div>
                <EditForumPost
                  post={editingForum}
                  isOpen={true}
                  onClose={handleForumEdited}
                />
              </NineSliceContainer>
            ) : (
              <>
                {!showCreateForum && (
                  <NineSliceContainer className={styles.forumsHeader}>
                    <h2 className={styles.sectionTitle}>Forums</h2>
                    <div className={styles.forumsHeaderButtons}>
                      {user ? (
                        <>
                          <Button 
                            variant={showForumsFriendsOnly ? 'primary' : 'secondary'}
                            onClick={handleToggleForumsFriendsOnly}
                            size="medium"
                            className={styles.friendsFilterButton}
                          >
                            {showForumsFriendsOnly ? 'Friends Posts Only' : 'Showing All Posts'}
                          </Button>
                          <Button 
                            variant="primary"
                            size="medium"
                            onClick={toggleCreateForum}
                            className={styles.createForumButton}
                          >
                            Create Forum
                          </Button>
                        </>
                      ) : (
                        <Button 
                          variant="primary"
                          size="medium"
                          nineSlice={true}
                          onClick={openLoginModal}
                          className={styles.createForumButton}
                        >
                          Sign In to Create
                        </Button>
                      )}
                    </div>
                  </NineSliceContainer>
                )}
                
                {showCreateForum ? (
                  <NineSliceContainer className={styles.createForumWrapper}>
                    <div className={styles.createForumHeader}>
                      <h2 className={styles.sectionTitle}>Create New Forum Post</h2>
                      <Button
                        variant="secondary"
                        size="medium"
                        onClick={() => setShowCreateForum(false)}
                        className={styles.backButton}
                      >
                        ← Cancel
                      </Button>
                    </div>
                    <CreateForumPost
                      isOpen={true}
                      onClose={handleForumCreated}
                    />
                  </NineSliceContainer>
                ) : (
                  <>
                    <NineSliceContainer className={styles.toolbarContainer}>
                      <div className={styles.categoryFilter}>
                        <Dropdown
                          label="Category"
                          options={forumCategories}
                          value={forumCategory}
                          onChange={(e) => setForumCategory(e.target.value)}
                          className={styles.categoryDropdown}
                          layout="horizontal"
                        />
                      </div>
                      <div className={styles.sortFilter}>
                        <Dropdown
                          label="Sort By"
                          options={forumSortOptions.map(option => option.label)}
                          value={forumSortOptions.find(option => option.value === forumSort)?.label || 'Newest First'}
                          onChange={(e) => {
                            const selected = forumSortOptions.find(option => option.label === e.target.value);
                            setForumSort(selected ? selected.value : 'newest');
                          }}
                          className={styles.sortDropdown}
                          layout="horizontal"
                        />
                      </div>
                      <div className={styles.searchContainer}>
                        <Input 
                          label="Search"
                          placeholder="Search discussions..." 
                          className={styles.searchInput}
                          value={forumSearchQuery}
                          onChange={(e) => setForumSearchQuery(e.target.value)}
                          layout="horizontal"
                        />
                        <Button variant="secondary" size="medium" onClick={handleForumSearch} className={styles.searchButton}>
                          Search
                        </Button>
                      </div>
                    </NineSliceContainer>
                    
                    {loadingForums ? (
                      <div className={styles.loadingState}>Loading forums...</div>
                    ) : forums.length === 0 ? (
                      <div className={styles.emptyState}>
                        <p>No forum posts available.</p>
                      </div>
                    ) : (
                      <div className={styles.forumsList}>
                        {forums.map(forum => (
                          <NineSliceContainer 
                            key={forum.id} 
                            className={styles.blogPost}
                          >
                            <div className={styles.postContent}>
                              <div className={styles.postMeta}>
                                <div className={styles.category}>{forum.category || 'Discussion'}</div>
                                <div className={styles.date}>
                                  {new Date(forum.created_at).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </div>
                              </div>
                              
                              <NineSliceContainer className={styles.postTitle}>
                                {forum.pinned && <span className={styles.pinnedIndicator}>📌 </span>}
                                {forum.title}
                              </NineSliceContainer>
                              
                              {forum.summary && (
                                <NineSliceContainer className={styles.postSummary}>{forum.summary}</NineSliceContainer>
                              )}
                              
                              <NineSliceContainer className={styles.postFullContent}>
                                {forum.is_markdown ? (
                                  <ReactMarkdown>
                                    {forum.content}
                                  </ReactMarkdown>
                                ) : (
                                  <div className={styles.contentText}>
                                    {forum.content.split('\n').map((line: string, index: number) => (
                                      <p key={index}>{line}</p>
                                    ))}
                                  </div>
                                )}
                              </NineSliceContainer>
                              
                              <div className={styles.postFooter}>
                                <NineSliceContainer className={styles.authorInfo}>
                                  <div className={styles.authorAvatar}>
                                    <AvatarWithStatus
                                      userId={forum.author?.id || forum.user_id}
                                      avatarUrl={forum.author?.avatar_url}
                                      username={forum.author?.username || 'User'}
                                      size="small"
                                    />
                                  </div>
                                  <span className={styles.authorName}>
                                    {forum.author?.username || 'Unknown User'}
                                    {forum.author?.is_admin && (
                                      <span className={styles.adminBadge}>ADMIN</span>
                                    )}
                                  </span>
                                </NineSliceContainer>
                                
                                <div className={styles.postControls}>
                                  <Button 
                                    variant="danger"
                                    size="small"
                                    onClick={() => {
                                      if (user) {
                                        handleToggleForumLike(forum);
                                      }
                                    }}
                                    disabled={!user}
                                  >
                                    <FaHeart />
                                    <span>{forum.likes || 0} {(forum.likes || 0) === 1 ? 'Like' : 'Likes'}</span>
                                  </Button>
                                  
                                  <Button 
                                    variant="info"
                                    size="small"
                                    onClick={() => {
                                      handleViewForumComments(forum);
                                    }}
                                    className={showForumComments && selectedForum && selectedForum.id === forum.id ? styles.active : ''}
                                  >
                                    <FaComment />
                                    <span>Comments</span>
                                  </Button>
                                  
                                  {user && (
                                    (forum?.user_id === user.id || currentUserIsAdmin) && (
                                      <div className={styles.postActions}>
                                        <Button
                                          variant="edit"
                                          size="small"
                                          className={`${styles.actionButton} ${styles.editButton}`}
                                          onClick={() => handleEditForum(forum)}
                                        >
                                        </Button>
                                        <Button
                                          variant="delete"
                                          size="small"
                                          className={`${styles.actionButton} ${styles.deleteButton}`}
                                          onClick={async () => {
                                            if (!confirm('Are you sure you want to delete this forum post? This action cannot be undone.')) {
                                              return;
                                            }
                                            
                                            try {
                                              const { error } = await supabase
                                                .from('forum_posts')
                                                .delete()
                                                .eq('id', forum.id);
                                                
                                              if (error) {
                                                console.error('Error deleting forum post:', error);
                                                alert(`Failed to delete forum post: ${error.message}`);
                                                return;
                                              }
                                              
                                              // Remove from the UI
                                              setForums(forums.filter(f => f.id !== forum.id));
                                              alert('Forum post deleted successfully');
                                            } catch (error: any) {
                                              console.error('Error deleting forum post:', error);
                                              alert(`An unexpected error occurred: ${error?.message || 'Unknown error'}`);
                                            }
                                          }}
                                        >
                                        </Button>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {showForumComments && selectedForum && selectedForum.id === forum.id && (
                              <div className={styles.commentsSection}>
                                <NineSliceContainer variant='blue' className={styles.commentsList}>
                                  {isForumCommentLoading ? (
                                    <div className={styles.loadingComments}>Loading comments...</div>
                                  ) : forumComments.length === 0 ? (
                                    <div className={styles.noComments}>No comments yet. Be the first to comment!</div>
                                  ) : (
                                    forumComments.map(comment => (
                                      <NineSliceContainer key={comment.id} className={styles.comment}>
                                        <div className={styles.commentHeader}>
                                          <div className={styles.commentAuthor} onClick={() => router.push(`/profile/${comment.author?.id}`)}>
                                            {comment.author && (
                                              <div className={styles.commentAvatar}>
                                                <AvatarWithStatus
                                                  userId={comment.author?.id || comment.user_id}
                                                  avatarUrl={comment.author?.avatar_url}
                                                  username={comment.author?.username || 'User'}
                                                  size="small"
                                                />
                                              </div>
                                            )}
                                            <span className={styles.commentAuthorName}>
                                              {comment.author?.username || 'Unknown User'}
                                              {comment.author?.is_admin && (
                                                <span className={styles.adminBadge}>ADMIN</span>
                                              )}
                                            </span>
                                          </div>
                                          <span className={styles.commentTime}>
                                            {new Date(comment.created_at).toLocaleDateString('en-GB', {
                                              day: 'numeric',
                                              month: 'short',
                                              year: 'numeric',
                                            })}
                                          </span>
                                        </div>
                                        <div className={styles.commentContent}>{comment.content}</div>
                                        
                                        {/* Delete button if user is the author */}
                                        {user && (user.id === comment.user_id || currentUserIsAdmin) && (
                                          <Button
                                            variant="delete"
                                            size="small"
                                            className={styles.deleteCommentButton}
                                            onClick={() => handleDeleteForumComment(comment.id)}
                                          >
                                          </Button>
                                        )}
                                      </NineSliceContainer>
                                    ))
                                  )}
                                </NineSliceContainer>
                                
                                {/* Comment input form */}
                                {user ? (
                                  <form className={styles.commentForm} onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSubmitForumComment();
                                  }}>
                                    <Input
                                      label=""
                                      placeholder="Write a comment..."
                                      value={forumCommentContent}
                                      onChange={(e) => setForumCommentContent(e.target.value)}
                                      className={styles.commentInput}
                                    />
                                    <Button
                                      type="submit"
                                      variant="primary"
                                      size="small"
                                      disabled={!forumCommentContent.trim() || isForumCommentLoading}
                                      className={styles.commentSubmit}
                                    >
                                      <FaPaperPlane />
                                    </Button>
                                  </form>
                                ) : (
                                  <div className={styles.loginToComment}>
                                    <Button variant="primary" onClick={openLoginModal}>
                                      Sign in to comment
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </NineSliceContainer>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </NineSliceContainer>
    );
  };
        
  const renderFriendsContent = () => (
    <NineSliceContainer variant='blue' className={styles.friendsContent}>
      <NineSliceContainer className={styles.friendsHeader}>
        <h2 className={styles.sectionTitle}>Your Friends</h2>
      </NineSliceContainer>
      
      {user ? (
        friendships.length === 0 ? (
          <NineSliceContainer className={styles.emptyState}>
            <p>You don't have any friends yet. Find people to connect with!</p>
          </NineSliceContainer>
        ) : (
          friendships.map(friendship => (
            <FriendItem
              key={friendship.id}
              friendship={friendship}
              currentUserId={user?.id || ''}
              type="friend"
              onRemove={handleRemoveFriend}
            />
          ))
        )
      ) : (
        <div className={styles.authPrompt}>
          <h2>Connect with Friends</h2>
          <p>Sign in to view and manage your friendships!</p>
          <Button variant="primary" nineSlice={true} onClick={openLoginModal}>Sign In</Button>
        </div>
      )}
    </NineSliceContainer>
  );
        
  const renderRequestsContent = () => {
    return (
      <NineSliceContainer variant='blue' className={styles.requestsContent}>
        <NineSliceContainer className={styles.requestsHeader}>
          <h2 className={styles.sectionTitle}>Friend Requests</h2>
        </NineSliceContainer>
        
        {user ? (
          <>
            <UserSearch 
              currentUserId={user.id}
              onSendRequest={handleSendFriendRequest}
            />
            
            {friendRequests.length > 0 && (
              <>
                <h2 className={styles.sectionTitle}>Incoming Friend Requests</h2>
                <div className={styles.requestsList}>
                  {friendRequests.map(request => (
                    <FriendItem
                      key={request.id}
                      friendship={request}
                      currentUserId={user.id}
                      type="request"
                      onAccept={handleAcceptFriendRequest}
                      onReject={handleRejectFriendRequest}
                    />
                  ))}
                </div>
              </>
            )}
            
            {outgoingRequests.length > 0 && (
              <>
                <h2 className={styles.sectionTitle}>Outgoing Friend Requests</h2>
                <div className={styles.requestsList}>
                  {outgoingRequests.map(request => (
                    <FriendItem
                      key={request.id}
                      friendship={request}
                      currentUserId={user.id}
                      type="outgoing"
                      onCancel={handleCancelFriendRequest}
                    />
                  ))}
                </div>
              </>
            )}
            
            {friendRequests.length === 0 && outgoingRequests.length === 0 && (
              <NineSliceContainer className={styles.emptyState}>
                <p>You don't have any friend requests at the moment.</p>
              </NineSliceContainer>
            )}
          </>
        ) : (
          <div className={styles.authPrompt}>
            <h2>Manage Friend Requests</h2>
            <p>Sign in to send, accept, or reject friend requests!</p>
            <Button variant="primary" nineSlice={true} onClick={openLoginModal}>Sign In</Button>
          </div>
        )}
      </NineSliceContainer>
    );
  };
        
  const renderConversationsContent = () => {
    return (
      <NineSliceContainer variant='blue' className={styles.conversationsContent}>
        <NineSliceContainer className={styles.conversationsHeader}>
          <h2 className={styles.sectionTitle}>Your Conversations</h2>
          {user && (
            <Button
              variant="secondary"
              onClick={refreshConversations}
              className={styles.refreshButton}
              disabled={refreshingConversations}
              size="medium"
            >
              {refreshingConversations ? 'Refreshing...' : (<><FaSync /> Refresh</>)}
            </Button>
          )}
        </NineSliceContainer>
        
        {user ? (
          conversations.length === 0 ? (
            <NineSliceContainer className={styles.emptyState}>
              <p>You don't have any conversations yet. Start chatting with friends!</p>
            </NineSliceContainer>
          ) : (
            conversations.map(conversation => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                currentUserId={user.id}
              />
            ))
          )
        ) : (
          <div className={styles.authPrompt}>
            <h2>Start Conversations</h2>
            <p>Sign in to chat with other members of the community!</p>
            <Button variant="primary" nineSlice={true} onClick={openLoginModal}>Sign In</Button>
          </div>
        )}
      </NineSliceContainer>
    );
  };
  
  // Toggle create forum form
  const toggleCreateForum = () => {
    setShowCreateForum(!showCreateForum);
  };

  // Toggle create blog form
  const toggleCreateBlog = () => {
    setShowCreateBlog(!showCreateBlog);
    setSelectedBlog(null);
    setEditingBlog(null);
  };

  // Handle viewing a blog
  const handleViewBlog = (blog: any) => {
    setSelectedBlog(blog);
    setEditingBlog(null);
    setShowCreateBlog(false);
  };

  // Handle starting to edit a blog
  const handleEditBlog = (blog: any) => {
    setEditingBlog(blog);
    setSelectedBlog(null);
    setShowCreateBlog(false);
  };

  // Handle blog edit completed
  const handleBlogEdited = () => {
    setEditingBlog(null);
    fetchBlogs();
  };

  // Handle canceling blog edit
  const handleCancelEditBlog = () => {
    setEditingBlog(null);
  };

  // Handle back to blogs
  const handleBackToBlogs = () => {
    setSelectedBlog(null);
    setEditingBlog(null);
    setShowCreateBlog(false);
  };

  // Handle blog created
  const handleBlogCreated = () => {
    setShowCreateBlog(false);
    fetchBlogs();
  };

  // Handle forum created
  const handleForumCreated = () => {
    setShowCreateForum(false);
    fetchForums(); // Refresh the forums list
  };

  // Handle editing a forum post
  const handleEditForum = (forum: any) => {
    setEditingForum(forum);
    setShowCreateForum(false);
  };

  // Handle forum edit completed
  const handleForumEdited = () => {
    setEditingForum(null);
    fetchForums(); // Refresh the forums list
  };

  // Handle canceling forum edit
  const handleCancelEditForum = () => {
    setEditingForum(null);
  };
  
  // Toggle like for forum post
  const handleToggleForumLike = async (forum: any) => {
    if (!user) return;
    
    try {
      const result = await togglePostLike(forum.id, user.id);
      
      if (result.success) {
        // Update the likes count in the forums list
        setForums(forums.map(f => 
          f.id === forum.id 
            ? {...f, likes: result.liked ? (f.likes || 0) + 1 : (f.likes || 0) - 1} 
            : f
        ));
      }
    } catch (error) {
      console.error('Error toggling forum like:', error);
    }
  };
   
  // Show forum comments
  const handleViewForumComments = (forum: any) => {
    // If this forum's comments are already showing, hide them
    if (showForumComments && selectedForum && selectedForum.id === forum.id) {
      setShowForumComments(false);
      setSelectedForum(null);
      return;
    }
    
    // Set the forum for displaying comments
    setForumComments([]);
    setSelectedForum(forum);
    
    // Show loading state
    setIsForumCommentLoading(true);
    
    // Fetch the comments for this forum
    fetchForumComments(forum.id);
  };
  
  // Toggle visibility of forum comments
  const handleToggleForumComments = () => {
    setShowForumComments(!showForumComments);
  };
  
  // Fetch comments for a forum post
  const fetchForumComments = async (forumId: string) => {
    try {
      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('forum_comments')
        .select('*')
        .eq('post_id', forumId)
        .order('created_at', { ascending: true });
        
      if (commentsError) throw commentsError;
      
      // If we have comments, fetch their authors
      let commentsWithAuthors = [];
      if (commentsData && commentsData.length > 0) {
        // Get unique author IDs
        const authorIdMap: Record<string, boolean> = {};
        commentsData.forEach(comment => {
          if (comment.user_id) authorIdMap[comment.user_id] = true;
        });
        const authorIds = Object.keys(authorIdMap);
        
        // Fetch all authors in one query
        const { data: authorsData, error: authorsError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, minecraft_username, is_admin')
          .in('id', authorIds);
          
        // Create a map of author IDs to author data
        const authorsMap: Record<string, any> = {};
        if (!authorsError && authorsData) {
          authorsData.forEach(author => {
            authorsMap[author.id] = author;
          });
        }
        
        // Attach authors to comments
        commentsWithAuthors = commentsData.map(comment => ({
          ...comment,
          author: comment.user_id && authorsMap[comment.user_id] ? authorsMap[comment.user_id] : null
        }));
      } else {
        commentsWithAuthors = commentsData || [];
      }
      
      setForumComments(commentsWithAuthors);
      
      // Only show comments after they're loaded
      setShowForumComments(true);
    } catch (error) {
      console.error('Error fetching forum comments:', error);
    } finally {
      setIsForumCommentLoading(false);
    }
  };
  
  // Handle forum comment submission
  const handleSubmitForumComment = async () => {
    if (!user || !selectedForum || !forumCommentContent.trim()) return;
    
    try {
      setIsForumCommentLoading(true);
      
      // Insert the comment
      const { data, error } = await supabase
        .from('forum_comments')
        .insert({
          post_id: selectedForum.id,
          user_id: user.id,
          content: forumCommentContent.trim()
        })
        .select();
        
      if (error) throw error;
      
      // Clear the input and refresh comments
      setForumCommentContent('');
      if (selectedForum) {
        fetchForumComments(selectedForum.id);
      }
    } catch (error) {
      console.error('Error submitting forum comment:', error);
    } finally {
      setIsForumCommentLoading(false);
    }
  };
  
  // Handle forum comment deletion
  const handleDeleteForumComment = async (commentId: string) => {
    if (!user) return;
    
    try {
      // Delete the comment
      const { error } = await supabase
        .from('forum_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id); // Ensure only the author can delete
        
      if (error) throw error;
      
      // Refresh comments
      if (selectedForum) {
        fetchForumComments(selectedForum.id);
      }
    } catch (error) {
      console.error('Error deleting forum comment:', error);
    }
  };
  
  const renderContent = () => {
    if (loading) {
      return <div className={styles.loading}>Loading...</div>;
    }
    
    // Type-safe rendering of tab content
    if (activeTab === 'feed') return renderFeedContent();
    if (activeTab === 'friends') return renderFriendsContent();
    if (activeTab === 'requests') return renderRequestsContent();
    if (activeTab === 'conversations') return renderConversationsContent();
    
    return null;
  };
  
  // At the bottom of the component, just before the final return statement
  const openLoginModal = () => {
    setShowAuthModal(true);
  };

  return (
    <div className={styles.socialPage}>
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      )}
      <div className={styles.socialContainer}>
        <CollapsibleSidebar className={styles.sidebar}>
          {user ? (
            <>
              <NineSliceContainer className={styles.userProfile}>
                <Link href={`/profile/${user.id}`} className={styles.profileLink}>
                  <div className={styles.profileInfo}>
                    <AvatarWithStatus
                      userId={user.id}
                      avatarUrl={profile?.avatar_url}
                      username={profile?.username || 'User'}
                      size="xlarge"
                      className={styles.profileAvatar}
                    />
                    <div className={styles.profileDetails}>
                      <span className={styles.profileName}>
                        {profile?.username || 'User'}
                      </span>
                      <span className={styles.viewProfile}>View Profile</span>
                    </div>
                  </div>
                </Link>
              </NineSliceContainer>
              
              <Tabs
                tabs={getSidebarTabs().map(tab => ({
                  ...tab,
                  // Add count badges to the labels
                  label: tab.id === 'friends' 
                    ? `${tab.label} ${friendships.length}` 
                    : tab.id === 'requests' && (friendRequests.length > 0 || outgoingRequests.length > 0) 
                      ? `${tab.label} ${friendRequests.length + outgoingRequests.length}` 
                      : tab.id === 'conversations' 
                        ? `${tab.label} ${conversations.length}` 
                        : tab.label
                }))}
                activeTab={activeTab}
                onChange={handleSidebarTabChange}
                orientation="vertical"
                className={styles.sidebarNav}
              />
              
              <NineSliceContainer className={styles.recentFriends}>
                <h3 className={styles.sidebarHeading}>Recent Friends</h3>
                {friendships.length === 0 ? (
                  <p className={styles.emptyList}>No friends yet</p>
                ) : (
                  friendships.slice(0, 5).map(friendship => (
                    <Button
                      key={friendship.id}
                      variant='standard'
                      onClick={() => router.push(`/profile/${friendship.friend_id}`)}
                      className={styles.recentFriendItem}
                    >
                      <div className={styles.miniAvatar}>
                        <AvatarWithStatus
                          key={friendship.friend_id}
                          userId={friendship.friend_id}
                          avatarUrl={friendship.friend.avatar_url}
                          username={friendship.friend.username || 'User'}
                          size="small"
                        />
                      </div>
                      <span className={styles.recentFriendName}>
                        {friendship.friend.username || 'Unknown User'}
                      </span>
                    </Button>
                  ))
                )}
              </NineSliceContainer>
              
              <NineSliceContainer className={styles.recentConversations}>
                <h3 className={styles.sidebarHeading}>Recent Messages</h3>
                {conversations.length === 0 ? (
                  <p className={styles.emptyList}>No conversations yet</p>
                ) : (
                  conversations.slice(0, 3).map(conversation => (
                    <ConversationItem
                      key={conversation.id}
                      conversation={conversation}
                      currentUserId={user.id}
                    />
                  ))
                )}
              </NineSliceContainer>
            </>
          ) : (
            // Login prompt for not logged in users
            <NineSliceContainer className={styles.authSidebar}>
              <div className={styles.loginPromptSidebar}>
                <h3>Join Enderfall</h3>
                <p>Sign in to connect with friends, participate in discussions, and stay updated with the community.</p>
                <Button 
                  variant="primary" 
                  nineSlice={true}
                  size="medium" 
                  className={styles.loginButton}
                  onClick={() => setShowAuthModal(true)}
                >
                  Sign In
                </Button>
              </div>
            </NineSliceContainer>
          )}
        </CollapsibleSidebar>
        
        <main className={styles.main}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}