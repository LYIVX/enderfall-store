"use client";

import React, { forwardRef } from 'react';
import styles from './ImageSelector.module.css';
import Button from './Button';
import Input from './Input';

interface ImageSelectorProps {
  onSelect: (url: string, alt: string, width: string, height: string) => void;
  onCancel: () => void;
}

const ImageSelector = forwardRef<HTMLDivElement, ImageSelectorProps>(
  ({ onSelect, onCancel }, ref) => {
    const [url, setUrl] = React.useState('');
    const [alt, setAlt] = React.useState('');
    const [width, setWidth] = React.useState('');
    const [height, setHeight] = React.useState('');

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setUrl(e.target.value);
    };

    const handleAltChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setAlt(e.target.value);
    };

    const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setWidth(e.target.value);
    };

    const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHeight(e.target.value);
    };

    const handleApply = () => {
      onSelect(url, alt, width, height);
    };

    return (
      <div 
        ref={ref} 
        className={styles.imageSelectorContainer}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.imageSelectorHeader}>
          Insert Image
        </div>
        
        <div className={styles.imageSelectorBody}>
          <div className={styles.inputGroup}>
            <Input
              label="Image URL"
              type="text"
              layout="horizontal"
              placeholder="https://example.com/image.jpg"
              value={url}
              onChange={handleUrlChange}
            />
          </div>
          
          <div className={styles.inputGroup}>
            <Input
              label="Alt Text"
              type="text"
              layout="horizontal"
              placeholder="Description of the image"
              value={alt}
              onChange={handleAltChange}
            />
          </div>
          
          <div className={styles.dimensionsContainer}>
            <h4 className={styles.dimensionsTitle}>Dimensions (optional)</h4>
            <div className={styles.dimensionsGrid}>
              <div className={styles.dimensionInput}>
                <Input
                  label="Width"
                  type="text"
                  layout="horizontal"
                  placeholder="e.g., 300 or 50%"
                  value={width}
                  onChange={handleWidthChange}
                />
              </div>
              <div className={styles.dimensionInput}>
                <Input
                  label="Height"
                  type="text"
                  layout="horizontal"
                  placeholder="e.g., 200 or auto"
                  value={height}
                  onChange={handleHeightChange}
                />
              </div>
            </div>
            <div className={styles.helpText}>
              Numbers will be treated as pixels. Use % for percentage.
            </div>
          </div>
        </div>
        
        <div className={styles.imageSelectorFooter}>
          <Button
            variant="secondary"
            size="small"
            onClick={onCancel}
            className={styles.cancelButton}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={handleApply}
            className={styles.applyButton}
            disabled={!url.trim()}
            title={!url.trim() ? "Image URL is required" : ""}
          >
            Insert
          </Button>
        </div>
      </div>
    );
  }
);

ImageSelector.displayName = 'ImageSelector';

export default ImageSelector; 