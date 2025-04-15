import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import styles from './Loading.module.css';

export interface LoadingProps {
  /**
   * The type of loading component to display
   * - fullscreen: covers the entire viewport
   * - overlay: covers its parent container (parent must have position: relative)
   * - inline: displays inline with text
   */
  type?: 'fullscreen' | 'overlay' | 'inline';
  
  /**
   * The size of the spinner
   */
  size?: 'small' | 'medium' | 'large';
  
  /**
   * Optional text to display beneath the spinner
   */
  text?: string;
  
  /**
   * Custom class name to apply
   */
  className?: string;
  
  /**
   * Whether to show a translucent overlay (only applies to fullscreen and overlay types)
   */
  withOverlay?: boolean;
}

const Loading: React.FC<LoadingProps> = ({
  type = 'inline',
  size = 'medium',
  text,
  className = '',
  withOverlay = true,
}) => {
  // For inline loading, just return the spinner with optional text
  if (type === 'inline') {
    return (
      <div className={`${styles.inlineLoading} ${className}`}>
        <LoadingSpinner size={size} />
        {text && <span className={styles.loadingText}>{text}</span>}
      </div>
    );
  }

  // For fullscreen or overlay, create a container with the spinner centered
  const containerClass = type === 'fullscreen' 
    ? styles.fullscreenLoading 
    : styles.overlayLoading;
  
  const overlayClass = withOverlay ? styles.withOverlay : '';

  return (
    <div className={`${containerClass} ${overlayClass} ${className}`}>
      <div className={styles.loadingContent}>
        <LoadingSpinner size={size} />
        {text && <div className={styles.loadingText}>{text}</div>}
      </div>
    </div>
  );
};

export default Loading; 