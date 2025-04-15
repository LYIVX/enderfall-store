"use client";

import React, { useState, useEffect, ReactNode } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';
import Button from '@/components/UI/Button';
import styles from './CollapsibleSidebar.module.css';
import NineSliceContainer from './NineSliceContainer';

interface CollapsibleSidebarProps {
  children: ReactNode;
  className?: string;
  cartItemCount?: number;
}

const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({ 
  children,
  className = '',
  cartItemCount = 0,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  
  const toggleSidebar = () => {
    // Check if navbar is open
    const navMenu = document.querySelector('.Navbar_navMenu__PMy7K');
    if (navMenu?.classList.contains('Navbar_active__ZDf7Z')) {
      return; // Don't toggle if navbar menu is open
    }
    setIsVisible(!isVisible);
  };

  // Handle nav menu visibility changes
  useEffect(() => {
    const checkNavbar = () => {
      const navMenu = document.querySelector('.Navbar_navMenu__PMy7K');
      if (navMenu?.classList.contains('Navbar_active__ZDf7Z') && isVisible) {
        setIsVisible(false);
      }
    };
    
    // Run initially
    checkNavbar();
    
    // Add mutation observer to detect class changes on navbar
    const observer = new MutationObserver(checkNavbar);
    const navMenu = document.querySelector('.Navbar_navMenu__PMy7K');
    
    if (navMenu) {
      observer.observe(navMenu, { 
        attributes: true, 
        attributeFilter: ['class'] 
      });
    }
    
    return () => observer.disconnect();
  }, [isVisible]);

  // Media query listener to handle responsiveness
  useEffect(() => {
    const handleResize = () => {
      // Default to collapsed on smaller screens
      if (window.innerWidth <= 1200) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    };

    // Initial check
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <>
      <Button 
        className={`${styles.sidebarToggle} ${isVisible ? styles.toggleActive : ''}`}
        onClick={toggleSidebar}
        aria-label={isVisible ? "Hide sidebar" : "Show sidebar"}
        variant='primary'
      >
        {isVisible ? <FaTimes size={20} /> : <FaBars size={20} />}
        {!isVisible && cartItemCount > 0 && (
          <span className={styles.cartBadge}>{cartItemCount}</span>
        )}
      </Button>
      
      <NineSliceContainer 
      variant='blue'
      className={`${styles.sidebar} ${isVisible ? 
      styles.sidebarVisible : 
      styles.sidebarHidden} ${className}`}>
        {children}
      </NineSliceContainer>
    </>
  );
};

export default CollapsibleSidebar; 