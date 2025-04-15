import React from 'react';
import Loading from './Loading';
import styles from './LoadingWrapper.module.css';

interface LoadingWrapperProps {
  /**
   * Whether the content is currently loading
   */
  isLoading: boolean;
  
  /**
   * The content to display when not loading
   */
  children: React.ReactNode;
  
  /**
   * The type of loading component to display
   */
  loadingType?: 'fullscreen' | 'overlay' | 'inline';
  
  /**
   * Text to display with the loading indicator
   */
  loadingText?: string;
  
  /**
   * Minimum height of the loading container
   */
  minHeight?: string;
  
  /**
   * Whether to show a translucent overlay (only applies to overlay type)
   */
  withOverlay?: boolean;
  
  /**
   * Size of the loading spinner
   */
  spinnerSize?: 'small' | 'medium' | 'large';
  
  /**
   * Custom class name for the wrapper
   */
  className?: string;
}

/**
 * A wrapper component that shows a loading indicator while content is loading
 */
const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  isLoading,
  children,
  loadingType = 'overlay',
  loadingText,
  minHeight = 'auto',
  withOverlay = true,
  spinnerSize = 'medium',
  className = '',
}) => {
  return (
    <div 
      className={`${styles.wrapper} ${className}`} 
      style={{ minHeight }}
    >
      {children}
      
      {isLoading && (
        <Loading 
          type={loadingType}
          text={loadingText}
          size={spinnerSize}
          withOverlay={withOverlay}
          className={styles.loadingOverlay}
        />
      )}
    </div>
  );
};

export default LoadingWrapper; 