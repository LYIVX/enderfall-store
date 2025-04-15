"use client";

import { ButtonHTMLAttributes, ReactNode, MouseEvent } from 'react';
import styles from './Button.module.css';
import { FaEdit, FaTrash, FaEye, FaUserFriends } from 'react-icons/fa';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'info' | 'warning' | 'success' | 'edit' | 'delete' | 'view' | 'friend' | 'standard';
  nineSlice?: boolean;
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  className?: string;
  stopPropagation?: boolean;
}

const Button = ({
  children,
  icon,
  variant = 'primary',
  nineSlice = true,
  size = 'medium',
  fullWidth = false,
  className = '',
  stopPropagation = false,
  onClick,
  ...props
}: ButtonProps) => {
  // Get built-in icon based on variant
  const getBuiltInIcon = () => {
    switch (variant) {
      case 'edit':
        return <FaEdit />;
      case 'delete':
        return <FaTrash />;
      case 'view':
        return <FaEye />;
      case 'friend':
        return <FaUserFriends />;
      default:
        return null;
    }
  };

  // Use built-in icon if no custom icon is provided and variant has a built-in icon
  const displayIcon = icon || getBuiltInIcon();

  const buttonClasses = [
    styles.button,
    nineSlice ? styles.nineSliceBase : styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    // Add icon-only class if there's an icon but no children
    displayIcon && !children ? styles.iconOnly : '',
    // Add pixel-font class for nineSlice buttons
    nineSlice ? 'pixel-font' : '',
    // Add data-variant attribute for custom nine-slice image selection
    nineSlice ? styles[`nineSlice-${variant}`] : '',
    className,
  ].join(' ');

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    onClick?.(e);
  };

  return (
    <button 
      className={buttonClasses} 
      onClick={handleClick}
      data-variant={nineSlice ? variant : undefined}
      {...props}
    >
      {displayIcon && <span className={styles.buttonIcon}>{displayIcon}</span>}
      {children}
    </button>
  );
};

export default Button; 