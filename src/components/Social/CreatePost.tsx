"use client";

import { useState, useRef } from 'react';
import Image from 'next/image';
import { supabase, createSocialPost } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthContext';
import { FaImage, FaTimes, FaUpload } from 'react-icons/fa';
import Button from '@/components/UI/Button';
import TextArea from '@/components/UI/TextArea';
import styles from './CreatePost.module.css';

interface CreatePostProps {
  onPostCreated?: () => void;
}

const CreatePost = ({ onPostCreated }: CreatePostProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !content.trim()) return;
    
    setIsLoading(true);
    setUploadError(null);
    
    try {
      let finalImageUrl = imageUrl;
      
      // If there's a new image file, upload it first
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        // Upload to Supabase storage
        const { data, error: uploadError } = await supabase
          .storage
          .from('social_images')
          .upload(fileName, imageFile, {
            upsert: true
          });
          
        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          setUploadError('Failed to upload image. Please try again.');
          return;
        }
        
        // Get public URL
        const { data: publicUrlData } = supabase
          .storage
          .from('social_images')
          .getPublicUrl(fileName);
          
        finalImageUrl = publicUrlData.publicUrl;
      }
      
      // Create the post with the uploaded image URL
      const { success } = await createSocialPost(
        user.id,
        content.trim(),
        finalImageUrl,
        false // No markdown support
      );
      
      if (success) {
        setContent('');
        setImageUrl(null);
        setImageFile(null);
        setImagePreview(null);
        
        if (onPostCreated) {
          onPostCreated();
        }
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setUploadError('Failed to create post. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files are allowed.');
      return;
    }
    
    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB.');
      return;
    }
    
    setImageFile(file);
    setUploadError(null);
    
    // Create a preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const handleClearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl(null);
    setUploadError(null);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className={styles.createPost}>
      <form onSubmit={handleSubmit}>
        <div className={styles.textareaWrapper}>
          <TextArea
            label="Create Post"
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            disabled={isLoading}
            required
          />
        </div>
        
        {uploadError && (
          <div className={styles.errorMessage}>
            {uploadError}
          </div>
        )}
        
        {imagePreview && (
          <div className={styles.imagePreview}>
            <div className={styles.imageContainer}>
              <img src={imagePreview} alt="Preview" className={styles.previewImage} />
              <button 
                type="button" 
                className={styles.removeImageButton}
                onClick={handleClearImage}
              >
                <FaTimes />
              </button>
            </div>
          </div>
        )}
        
        <div className={styles.optionsRow}>
          <input
            type="file"
            id="imageUpload"
            ref={fileInputRef}
            className={styles.fileInput}
            accept="image/*"
            onChange={handleImageChange}
            disabled={isLoading}
          />
          
          <Button
            type="button"
            variant="secondary"
            size="small"
            className={styles.uploadButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <FaImage /> {imageFile ? 'Change Image' : 'Add Image'}
          </Button>
          
          <div className={styles.imageInfo}>
            {imageFile && (
              <span className={styles.fileName}>{imageFile.name}</span>
            )}
          </div>
        </div>
        
        <div className={styles.submitRow}>
          <Button
            type="submit"
            variant="primary"
            size="medium"
            disabled={!content.trim() || isLoading}
            className={styles.submitButton}
          >
            {isLoading ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost; 