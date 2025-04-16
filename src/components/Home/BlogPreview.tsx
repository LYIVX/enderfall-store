"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import styles from './BlogPreview.module.css';
import Button from '@/components/UI/Button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import AvatarWithStatus from '@/components/UI/AvatarWithStatus';
import { NineSliceContainer } from '../UI';

interface BlogPost {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  created_at: string;
  is_published: boolean;
  is_pinned: boolean;
  author_id: string;
  author?: {
    username: string;
    is_admin: boolean;
    avatar_url?: string | null;
  };
  thumbnail_url?: string;
  is_markdown?: boolean;
}

export default function BlogPreview() {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBlogPost() {
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching featured blog post...');
        
        // First try to get a pinned post
        console.log('Checking for pinned posts...');
        const { data: pinnedPost, error: pinnedError } = await supabase
          .from('blog_posts')
          .select(`
            *,
            profiles (*)
          `)
          .eq('is_published', true)
          .eq('is_pinned', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (pinnedError && pinnedError.code !== 'PGRST116') {
          console.error('Error fetching pinned post:', pinnedError);
          throw pinnedError;
        }

        // If we found a pinned post, use it
        if (pinnedPost) {
          console.log('Found pinned post:', pinnedPost);
          
          // Transform the data to match our component's expected structure
          const formattedPost: BlogPost = {
            ...pinnedPost,
            author: pinnedPost.profiles
              ? { 
                  username: pinnedPost.profiles.username || 'Unknown User', 
                  is_admin: pinnedPost.profiles.is_admin || false,
                  avatar_url: pinnedPost.profiles.avatar_url
                }
              : { username: 'Unknown User', is_admin: false, avatar_url: null },
            thumbnail_url: pinnedPost.thumbnail_url || undefined,
            is_markdown: pinnedPost.is_markdown || false
          };
          
          setPost(formattedPost);
        } else {
          // Otherwise, get the most recent post
          console.log('No pinned posts found, fetching most recent post...');
          const { data: recentPost, error: recentError } = await supabase
            .from('blog_posts')
            .select(`
              *,
              profiles (*)
            `)
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (recentError) {
            console.error('Error fetching recent post:', recentError);
            throw recentError;
          }

          if (recentPost) {
            console.log('Found recent post:', recentPost);
            
            // Transform the data to match our component's expected structure
            const formattedPost: BlogPost = {
              ...recentPost,
              author: recentPost.profiles
                ? { 
                    username: recentPost.profiles.username || 'Unknown User', 
                    is_admin: recentPost.profiles.is_admin || false,
                    avatar_url: recentPost.profiles.avatar_url
                  }
                : { username: 'Unknown User', is_admin: false, avatar_url: null },
              thumbnail_url: recentPost.thumbnail_url || undefined,
              is_markdown: recentPost.is_markdown || false
            };
            
            setPost(formattedPost);
          } else {
            console.log('No blog posts found.');
          }
        }
      } catch (err) {
        console.error('Error in fetchBlogPost:', err);
        setError('Failed to load blog post');
      } finally {
        setLoading(false);
      }
    }

    fetchBlogPost();
  }, []);

  if (error) {
    return (
      <NineSliceContainer className={styles.blogSection} variant="blue">
        <NineSliceContainer className={styles.sectionHeader} variant="standard">
          <h2 className={styles.sectionTitle}>Latest News</h2>
          <Link href="/blogs" className={styles.viewAllLink}>
            View All Posts
          </Link>
        </NineSliceContainer>
        <div className={styles.noPosts}>
          <h3>Something went wrong</h3>
          <p>{error}</p>
        </div>
      </NineSliceContainer>
    );
  }

  if (loading) {
    return (
      <NineSliceContainer className={styles.blogSection} variant="blue">
        <NineSliceContainer className={styles.sectionHeader} variant="standard">
          <h2 className={styles.sectionTitle}>Latest News</h2>
          <Button variant="primary" size="medium" nineSlice={true}>
            <Link href="/social?tab=blogs" className={styles.viewAllLink}>
              View All Posts
            </Link>
          </Button>
        </NineSliceContainer>
        <div className={styles.loading}>Loading latest blog post...</div>
      </NineSliceContainer>
    );
  }

  if (!post) {
    return (
      <NineSliceContainer className={styles.blogSection} variant="blue">
        <NineSliceContainer className={styles.sectionHeader} variant="standard">
          <h2 className={styles.sectionTitle}>Latest News</h2>
          <Button variant="primary" size="medium" nineSlice={true}>
            <Link href="/social?tab=blogs" className={styles.viewAllLink}>
              View All Posts
            </Link>
          </Button>
        </NineSliceContainer>
        <div className={styles.noPosts}>
          <h3>No posts yet</h3>
          <p>Check back soon for the latest news!</p>
        </div>
      </NineSliceContainer>
    );
  }
  
  // Format the date using built-in methods
  const formattedDate = new Date(post.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <NineSliceContainer className={styles.blogSection} variant="blue">
      <NineSliceContainer className={styles.sectionHeader} variant="standard">
        <h2 className={styles.sectionTitle}>Latest News</h2>
        <Button variant="primary" size="medium" nineSlice={true}>
            <Link href="/social?tab=blogs" className={styles.viewAllLink}>
              View All Posts
            </Link>
          </Button>
      </NineSliceContainer>

      <NineSliceContainer className={styles.blogPostCard} variant="standard">
        {post.thumbnail_url && (
          <div className={styles.thumbnailContainer}>
            <Image
              src={post.thumbnail_url}
              alt={post.title}
              className={styles.thumbnail}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        )}
        
        <div className={styles.contentContainer}>
          <div className={styles.blogMeta}>
            <span className={styles.category}>News</span>
            <span className={styles.date}>{formattedDate}</span>
          </div>
          <NineSliceContainer className={styles.blogTitle} variant="standard">
            <h3>{post.title}</h3>
          </NineSliceContainer>
          
          {post.summary && (
            <NineSliceContainer className={styles.summary} variant="standard">
              <p>{post.summary}</p>
            </NineSliceContainer>
          )}
          
          {post.content && (
            <NineSliceContainer className={styles.postContent} variant="standard">
              {post.is_markdown ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                >
                  {post.content}
                </ReactMarkdown>
              ) : (
                post.content
              )}
            </NineSliceContainer>
          )}
          
          <div className={styles.blogFooter}>
            <NineSliceContainer className={styles.authorInfo} variant="standard">
              {post.author?.avatar_url && (
                <div className={styles.authorAvatar}>
                  <AvatarWithStatus
                    userId={post.author_id}
                    avatarUrl={post.author.avatar_url}
                    username={post.author.username || 'User'}
                    size="small"
                  />
                </div>
              )}
              <span className={styles.author}>
                {post.author?.username || 'Unknown User'}
                {post.author?.is_admin && (
                  <span className={styles.adminBadge}>ADMIN</span>
                )}
              </span>
            </NineSliceContainer>
            <div>
              {post.is_pinned && (
                <span className={styles.category}>Featured</span>
              )}
            </div>
          </div>
        </div>
      </NineSliceContainer>
    </NineSliceContainer>
  );
} 