"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthContext';
import TextEditor from '@/components/UI/TextEditor';
import Input from '@/components/UI/Input';
import TextArea from '@/components/UI/TextArea';
import Button from '@/components/UI/Button';
import ThumbnailSelector from './ThumbnailSelector';
import Toggle from '@/components/UI/Toggle';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import styles from './CreateBlogPost.module.css';

interface CreateBlogPostProps {
  onClose: () => void;
  isOpen: boolean;
  initialData?: {
    id: string;
    title: string;
    summary: string;
    content: string;
    thumbnail_url: string | null;
    is_published: boolean;
    is_pinned: boolean;
    is_markdown?: boolean;
  };
  isEditing?: boolean;
}

const CreateBlogPost = ({ onClose, isOpen, initialData, isEditing = false }: CreateBlogPostProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState(initialData?.title || '');
  const [summary, setSummary] = useState(initialData?.summary || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(initialData?.thumbnail_url || '');
  const [isPublished, setIsPublished] = useState(initialData?.is_published || false);
  const [isPinned, setIsPinned] = useState(initialData?.is_pinned || false);
  const [isMarkdown, setIsMarkdown] = useState<boolean>(initialData?.is_markdown ?? false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Helper function to detect if text contains markdown
  const containsMarkdown = (text: string): boolean => {
    // Check for common markdown patterns
    const markdownPatterns = [
      /[*_]{1,2}[^*_]+[*_]{1,2}/,  // Bold or italic
      /#{1,6}\s+.+/,                // Headers
      /\[.+\]\(.+\)/,               // Links
      /!\[.+\]\(.+\)/,              // Images
      /```[^`]*```/,                // Code blocks
      />\s+.+/,                     // Blockquotes
      /- \[ \]/,                    // Task lists
      /\|\s*-+\s*\|/,               // Tables
      /^\s*-\s+.+/m,                // Unordered lists
      /^\s*\d+\.\s+.+/m,            // Ordered lists
      /~~.+~~/,                     // Strikethrough
      /`[^`]+`/,                    // Inline code
    ];

    return markdownPatterns.some(pattern => pattern.test(text));
  };

  // Update form data when initialData changes (for editing mode)
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setSummary(initialData.summary);
      setContent(initialData.content);
      setThumbnailUrl(initialData.thumbnail_url || '');
      setIsPublished(initialData.is_published || false);
      setIsPinned(initialData.is_pinned || false);
      setIsMarkdown(initialData.is_markdown ?? false);
    }
  }, [initialData]);

  const openEditor = () => {
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
  };

  const handleSaveContent = (text: string) => {
    setContent(text);
    // No longer auto-determine markdown status, since we have a toggle now
  };

  const handleImageSelect = (url: string) => {
    setThumbnailUrl(url);
  };

  const handleSubmit = async () => {
    // Validate inputs
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    if (!summary.trim()) {
      setError('Please enter a summary');
      return;
    }

    if (!content.trim()) {
      setError('Please enter content for your blog post');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (!user) {
        setError('You must be logged in to create a blog post');
        setIsSubmitting(false);
        return;
      }

      const blogPostData = {
        title,
        content,
        summary,
        thumbnail_url: thumbnailUrl || null,
        is_published: isPublished,
        is_pinned: isPinned,
        is_markdown: isMarkdown,
        updated_at: new Date().toISOString()
      };

      if (isEditing && initialData) {
        // Update existing post
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update(blogPostData)
          .eq('id', initialData.id);

        if (updateError) throw updateError;

        // Refresh the current page
        router.refresh();
      } else {
        // Create new post
        const { data, error: insertError } = await supabase
          .from('blog_posts')
          .insert({
            ...blogPostData,
            user_id: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Redirect to the newly created post
        if (data) {
          router.push(`/blogs/${data.id}`);
          router.refresh();
        }
      }
      
      onClose();
    } catch (err) {
      console.error('Error with blog post:', err);
      setError(isEditing ? 'Failed to update blog post. Please try again.' : 'Failed to create blog post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContentPreview = () => {
    if (!content) {
      return <div className={styles.placeholderText}>Click to open the editor and write your blog post...</div>;
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
    <div className={styles.createPostContainer}>
      {error && <div className={styles.errorMessage}>{error}</div>}
      
      <div className={styles.formGroup}>
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a title for your blog post"
          required
        />
      </div>
      
      <div className={styles.formGroup}>
        <TextArea
          label="Summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Write a brief summary of your blog post (will appear in previews)"
          rows={3}
          required
        />
      </div>
      
      <div className={styles.formGroup}>
        <ThumbnailSelector
          value={thumbnailUrl}
          onChange={handleImageSelect}
          placeholder="Enter a URL for the thumbnail image"
        />
      </div>
      
      <div className={styles.togglesContainer}>
        <div className={styles.toggleGroup}>
          <label>Published</label>
          <Toggle 
            isEnabled={isPublished}
            onChange={() => setIsPublished(!isPublished)}
            label={isPublished ? 'Yes' : 'No'}
          />
        </div>
        
        <div className={styles.toggleGroup}>
          <label>Pinned</label>
          <Toggle 
            isEnabled={isPinned}
            onChange={() => setIsPinned(!isPinned)}
            label={isPinned ? 'Yes' : 'No'}
          />
        </div>
        
        <div className={styles.toggleGroup}>
          <label>Markdown</label>
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
        <div className={styles.contentInfo}>
          <Button variant="secondary" onClick={openEditor} size="small">
            {content ? 'Edit Content' : 'Add Content'}
          </Button>
        </div>
      </div>
      
      <div className={styles.formActions}>
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Post' : 'Create Post')}
        </Button>
      </div>
      
      <TextEditor
        isOpen={isEditorOpen}
        onClose={closeEditor}
        title={isEditing ? "Edit Blog Content" : "Create Blog Content"}
        initialText={content}
        onSave={handleSaveContent}
      />
    </div>
  );
};

export default CreateBlogPost; 