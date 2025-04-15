"use client";

import { HTMLAttributes, ReactNode } from 'react';
import styles from './ScrollbarContainer.module.css';

interface ScrollbarContainerProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  variant?: 'background' | 'handle' | 'horizontal-background' | 'horizontal-handle';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  className?: string;
  active?: boolean;
}

const ScrollbarContainer = ({
  children,
  variant = 'horizontal-background',
  size = 'medium',
  fullWidth = false,
  className = '',
  active = false,
  ...props
}: ScrollbarContainerProps) => {
  const containerClasses = [
    styles.container,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    'pixel-font',
    className,
  ].join(' ');

  return (
    <div 
      className={containerClasses} 
      data-variant={variant}
      data-active={active ? "true" : "false"}
      {...props}
    >
      {children}
    </div>
  );
};

export default ScrollbarContainer; 