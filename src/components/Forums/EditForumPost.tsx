"use client";

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getCurrentUser } from '@/lib/supabase';
import Input from '@/components/UI/Input';
import Dropdown from '@/components/UI/Dropdown';
import TextArea from '@/components/UI/TextArea';
import Button from '@/components/UI/Button';
import TextEditor from '@/components/UI/TextEditor';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import styles from './CreateForumPost.module.css';
import Toggle from '../UI/Toggle';
import { useAuth } from '@/components/Auth/AuthContext';

interface EditForumPostProps {
  post: {
    id: string;
    title: string;
    summary: string;
    content: string;
    category: string;
    is_markdown?: boolean;
    is_pinned?: boolean;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function EditForumPost({ 
  post, 
  isOpen, 
  onClose 
}: EditForumPostProps) {
  
  const router = useRouter();
  const { isAdmin } = useAuth();
  
  const [title, setTitle] = useState(post.title || '');
  const [summary, setSummary] = useState(post.summary || '');
  const [content, setContent] = useState(post.content || '');
  const [category, setCategory] = useState(post.category || 'General');
  const [isMarkdown, setIsMarkdown] = useState<boolean>(post?.is_markdown ?? true); // Default to markdown
  const [isPinned, setIsPinned] = useState<boolean>(post?.is_pinned ?? false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    'Announcements',
    'General',
    'Towns',
    'Events',
    'Guides',
    'Support',
  ];

  if (!isOpen) return null;

  const openEditor = () => {
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
  };

  const handleSaveContent = (text: string) => {
    setContent(text);
  };

  const handleSubmit = async (e: FormEvent) => {
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

    setIsSubmitting(true);

    try {
      // Get current user
      const user = await getCurrentUser();
      
      if (!user) {
        setError('You must be logged in to edit a post');
        return;
      }

      // Verify post ownership
      const { data: postData, error: fetchError } = await supabase
        .from('forum_posts')
        .select('user_id')
        .eq('id', post.id)
        .single();
        
      if (fetchError) throw fetchError;
      
      // Verify post ownership
      if (postData.user_id !== user.id) {
        setError('You can only edit your own posts');
        return;
      }
      
      const forumData: {
        title: string;
        summary: string;
        content: string;
        category: string;
        updated_at: string;
        is_markdown: boolean;
        is_pinned?: boolean;
      } = {
        title,
        summary,
        content,
        category,
        updated_at: new Date().toISOString(),
        is_markdown: isMarkdown,
      };

      // If user is admin, include the pinned status
      if (isAdmin) {
        forumData.is_pinned = isPinned;
      }

      // Update existing post
      const { error: updateError } = await supabase
        .from('forum_posts')
        .update(forumData)
        .eq('id', post.id);

      if (updateError) throw updateError;

      onClose();
    } catch (error: any) {
      console.error('Error updating forum post:', error);
      setError(error.message || 'Failed to update forum post');
    } finally {
      setIsSubmitting(false);
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

      <div className={styles.togglesContainer}>
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
          <Button variant="secondary" onClick={openEditor} size="small">
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
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          variant="primary" 
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Update Post'}
        </Button>
      </div>

      <TextEditor
        isOpen={isEditorOpen}
        onClose={closeEditor}
        title="Edit Post Content"
        initialText={content}
        onSave={handleSaveContent}
      />
    </form>
  );
} 