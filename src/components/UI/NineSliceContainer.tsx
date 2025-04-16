"use client";

import { HTMLAttributes, ReactNode, forwardRef, Ref } from 'react';
import styles from './NineSliceContainer.module.css';

export interface NineSliceContainerProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'ghost-blur' | 'danger' | 'info' | 'warning' | 'success' | 'standard' | 'container' | 'panel' | 'blue' | 'gold';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  className?: string;
  active?: boolean;
}

const NineSliceContainer = forwardRef(({
  children,
  variant = 'standard',
  size = 'medium',
  fullWidth = false,
  className = '',
  active = false,
  ...props
}: NineSliceContainerProps, ref: Ref<HTMLDivElement>) => {
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
      ref={ref}
      className={containerClasses} 
      data-variant={variant}
      data-active={active ? "true" : "false"}
      {...props}
    >
      {children}
    </div>
  );
});

NineSliceContainer.displayName = 'NineSliceContainer';

export default NineSliceContainer; 