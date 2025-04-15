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
import Toggle from '@/components/UI/Toggle';
import { useAuth } from '@/components/Auth/AuthContext';

interface ForumPostProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    id?: string;
    title: string;
    summary: string;
    content: string;
    category: string;
    is_markdown?: boolean;
    is_pinned?: boolean;
  };
  isEditing?: boolean;
}

export default function CreateForumPost({ 
  isOpen, 
  onClose,
  initialData,
  isEditing = false
}: ForumPostProps) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  
  const [title, setTitle] = useState(initialData?.title || '');
  const [summary, setSummary] = useState(initialData?.summary || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [category, setCategory] = useState(initialData?.category || 'General');
  const [isMarkdown, setIsMarkdown] = useState<boolean>(initialData?.is_markdown ?? true); // Default to markdown
  const [isPinned, setIsPinned] = useState<boolean>(initialData?.is_pinned ?? false);
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
        setError('You must be logged in to create a post');
        return;
      }

      const forumData = {
        title,
        summary,
        content,
        category,
        user_id: user.id,
        is_pinned: isPinned, // Include the pinned status
        is_markdown: isMarkdown, // Add markdown flag
      };

      let result;

      if (isEditing && initialData?.id) {
        // Update existing post
        result = await supabase
          .from('forum_posts')
          .update(forumData)
          .eq('id', initialData.id);
      } else {
        // Create new post
        result = await supabase
          .from('forum_posts')
          .insert(forumData);
      }

      if (result.error) {
        throw result.error;
      }

      // Call the onClose callback to notify the parent component
      onClose();
    } catch (error: any) {
      console.error('Error saving forum post:', error);
      setError(error.message || 'Failed to save forum post');
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
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Post' : 'Create Post'}
        </Button>
      </div>

      <TextEditor
        isOpen={isEditorOpen}
        onClose={closeEditor}
        title={isEditing ? "Edit Post Content" : "Create Post Content"}
        initialText={content}
        onSave={handleSaveContent}
      />
    </form>
  );
} 