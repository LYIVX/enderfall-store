"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getCurrentUser } from '@/lib/supabase';
import Input from '@/components/UI/Input';
import Dropdown from '@/components/UI/Dropdown';
import TextArea from '@/components/UI/TextArea';
import Button from '@/components/UI/Button';
import TextEditor from '@/components/UI/TextEditor';
import ThumbnailSelector from '@/components/Blog/ThumbnailSelector';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import Toggle from '@/components/UI/Toggle';
import { useAuth } from '@/components/Auth/AuthContext';
import styles from '@/components/Forums/CreateForumPost.module.css';

interface BlogPost {
  id: string;
  title: string;
  summary: string;
  content: string;
  thumbnail_url: string | null;
  is_published: boolean;
  is_pinned: boolean;
  is_markdown?: boolean;
}

interface CreateBlogPostProps {
  post?: BlogPost;
  isOpen: boolean;
  onClose: () => void;
  isEditing?: boolean;
}

export default function CreateBlogPost({ 
  post, 
  isOpen, 
  onClose,
  isEditing = false
}: CreateBlogPostProps) {
  
  const router = useRouter();
  const { profile, user } = useAuth();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>('general');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [isMarkdown, setIsMarkdown] = useState(false);
  const [error, setError] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const categories = [
    'News',
    'Updates',
    'Announcements',
    'Tutorials',
    'Features',
    'Blogs',
  ];

  const isAdmin = profile?.is_admin || false;

  useEffect(() => {
    if (post && isEditing) {
      setTitle(post.title || '');
      setSummary(post.summary || '');
      setContent(post.content || '');
      if (post.thumbnail_url !== null) {
        setThumbnailUrl(post.thumbnail_url);
      }
      setIsPublished(post.is_published);
      setIsPinned(post.is_pinned);
      setIsMarkdown(post.is_markdown || false);
    }
  }, [post, isEditing]);

  const openEditor = () => {
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
  };

  const handleSaveContent = (text: string) => {
    setContent(text);
  };

  const handleThumbnailSelect = (url: string) => {
    setThumbnailUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    setShowPreview(true);

    try {
      // Get current user
      if (!user) {
        setError('You must be logged in to create a blog post');
        return;
      }

      const blogData: any = {
        title,
        content,
        summary,
        thumbnail_url: thumbnailUrl || null,
        is_published: isPublished,
        is_markdown: isMarkdown,
        category,
      };

      // Only add pinned status if user is admin
      if (isAdmin) {
        blogData.is_pinned = isPinned;
      }

      if (isEditing && post) {
        // Update existing post
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update({
            ...blogData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id);

        if (updateError) throw updateError;
      } else {
        // Create new post
        const { error: insertError } = await supabase
          .from('blog_posts')
          .insert({
            ...blogData,
            user_id: user.id,
          });

        if (insertError) throw insertError;
      }

      onClose();
    } catch (error: any) {
      console.error('Error submitting blog post:', error);
      setError(error.message || 'Failed to submit blog post');
    }
  };

  const renderContentPreview = () => {
    if (!content) {
      return <div className={styles.placeholderText}>Click to open the editor and write your post...</div>;
    }

    if (isMarkdown) {
      return (
        <div className={styles.markdownPreview}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
          >
            {content.length > 300 ? `${content.substring(0, 300)}...` : content}
          </ReactMarkdown>
        </div>
      );
    }

    return (
      <div className={styles.contentText}>
        {content.substring(0, 150)}...
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <form onSubmit={handleSubmit} className={styles.forumForm}>
      <Input
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <Dropdown
        label="Category"
        options={categories}
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      />

      <TextArea
        label="Summary (optional)"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="Brief summary of your post (optional)"
        rows={2}
      />
      
      <div className={styles.formGroup}>
        <ThumbnailSelector
          value={thumbnailUrl || ''}
          onChange={handleThumbnailSelect}
          placeholder="Enter a URL for the thumbnail image"
        />
      </div>

      <div className={styles.togglesContainer}>
        <div className={styles.toggleGroup}>
          <label className={styles.toggleLabel}>Published</label>
          <Toggle 
            isEnabled={isPublished}
            onChange={() => setIsPublished(!isPublished)}
            label={isPublished ? 'Yes' : 'No'}
          />
        </div>
        
        {isAdmin && (
          <div className={styles.toggleGroup}>
            <label className={styles.toggleLabel}>Pinned</label>
            <Toggle 
              isEnabled={isPinned}
              onChange={() => setIsPinned(!isPinned)}
              label={isPinned ? 'Yes' : 'No'}
            />
          </div>
        )}

        <div className={styles.toggleGroup}>
          <label className={styles.toggleLabel}>Markdown</label>
          <Toggle 
            isEnabled={isMarkdown}
            onChange={() => setIsMarkdown(!isMarkdown)}
            label={isMarkdown ? 'Yes' : 'No'}
          />
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.contentLabel}>Content</label>
        <div className={styles.contentPreview} onClick={openEditor}>
          {renderContentPreview()}
        </div>
        <div className={styles.contentActions}>
          <Button variant="secondary" onClick={openEditor} type="button" size="small">
            {content ? 'Edit Content' : 'Add Content'}
          </Button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.formActions}>
        <Button 
          type="button" 
          variant="secondary" 
          onClick={onClose}
          disabled={showPreview}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          variant="primary" 
          disabled={showPreview}
        >
          {showPreview ? 'Submitting...' : isEditing ? 'Update' : 'Create'}
        </Button>
      </div>
      
      {showEditor && (
        <div className={styles.editorOverlay}>
          <div className={styles.editorContainer}>
            <div className={styles.editorHeader}>
              <h3>Edit Content</h3>
              <Button variant="secondary" onClick={closeEditor} size="small">Close</Button>
            </div>
            <TextEditor
              initialText={content}
              onSave={handleSaveContent}
              onClose={closeEditor}
              isOpen={showEditor}
              title="Edit Content"
            />
          </div>
        </div>
      )}
    </form>
  );
} 