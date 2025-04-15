"use client";

import React from 'react';
import Input from '@/components/UI/Input';
import styles from './ThumbnailSelector.module.css';

interface ThumbnailSelectorProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
}

const ThumbnailSelector: React.FC<ThumbnailSelectorProps> = ({
  value,
  onChange,
  placeholder = "Enter image URL"
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={styles.thumbnailSelector}>
      <div className={styles.inputGroup}>
        <Input
          label="Thumbnail URL"
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
        />
      </div>
      
      {value && (
        <div className={styles.preview}>
          <p className={styles.previewLabel}>Preview:</p>
          <div className={styles.imagePreview}>
            <img 
              src={value} 
              alt="Thumbnail preview" 
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
                (e.target as HTMLImageElement).classList.add(styles.errorImage);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ThumbnailSelector; 