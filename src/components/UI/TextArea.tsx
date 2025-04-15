import React, { forwardRef } from 'react';
import styles from './TextArea.module.css';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  layout?: 'vertical' | 'horizontal';
  rows?: number;
  resizable?: boolean;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(({ 
  label, 
  error, 
  className, 
  layout = 'vertical',
  rows = 4,
  resizable = true,
  ...props 
}, ref) => {
  return (
    <div className={`${styles.textAreaWrapper} ${layout === 'horizontal' ? styles.horizontal : ''}`}>
      {label && <label className={styles.label}>{label}</label>}
      <textarea
        ref={ref}
        className={`${styles.textArea} ${error ? styles.error : ''} ${!resizable ? styles.noResize : ''} ${className || ''}`}
        rows={rows}
        {...props}
      />
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
});

TextArea.displayName = 'TextArea';

export default TextArea; 