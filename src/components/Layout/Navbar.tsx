"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/Auth/AuthContext';
import LoginModal from '@/components/Auth/LoginModal';
import ThemeToggle from '@/components/Theme/ThemeToggle';
import Button from '../UI/Button';
import { FaChevronDown } from 'react-icons/fa';
import styles from './Navbar.module.css';
import StatusSwitcher from '@/components/UI/StatusSwitcher';
import AvatarWithStatus from '@/components/UI/AvatarWithStatus';
import { NineSliceContainer } from '@/components/UI';

interface NavLink {
  label: string;
  href: string;
}

interface NavbarProps {
  navLinks: NavLink[];
}

const Navbar: React.FC<NavbarProps> = ({ navLinks }) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { user, profile, logout, isLoading } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Convert a string to a URL-friendly slug
  const titleToSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')     // Replace spaces with dashes
      .replace(/-+/g, '-')      // Consolidate multiple dashes
      .trim();                  // Trim whitespace
  };

  // Check if current page is in navLinks
  const isCurrentPageInNavLinks = pathname ? navLinks.some(link => link.href === pathname) : false;
  
  // Get current page name from path for dynamic nav link
  const getCurrentPageName = () => {
    if (!pathname) return 'Page';
    
    // Remove leading slash and split by slashes
    const pathSegments = pathname.substring(1).split('/');
    
    // Special handling for legal pages
    if (pathSegments[0] === 'legal' && pathSegments.length > 1) {
      // Get the specific legal page name (rules, privacy, etc.)
      const legalPageName = pathSegments[1];
      // Capitalize first letter
      return legalPageName.charAt(0).toUpperCase() + legalPageName.slice(1);
    }

    if (pathSegments[0] === 'admin' && pathSegments.length === 1) {
      // Get the specific admin page name (users, forums, etc.)

      return 'Admin Dashboard';
    }

    if (pathSegments[0] === 'admin' && pathSegments.length > 1) {
      // Get the specific admin page name (users, forums, etc.)
      const adminPageName = pathSegments[1];
      // Capitalize first letter
      return 'Admin ' + adminPageName.charAt(0).toUpperCase() + adminPageName.slice(1);
    }

    if (pathSegments[0] === 'forums' && pathSegments.length > 1) {
      // Get the specific forum page name (create, edit, etc.)
      const forumPageName = pathSegments[1];
      // Capitalize first letter
      return forumPageName.charAt(0).toUpperCase() + forumPageName.slice(1);
    }

    if (pathSegments[0] === 'blogs' && pathSegments.length > 1) {
      // Get the specific blog page name (create, edit, etc.)
      const blogPageName = pathSegments[1];
      // Capitalize first letter
      return blogPageName.charAt(0).toUpperCase() + blogPageName.slice(1);
    }
    
    // Regular handling for other pages
    const pageName = pathSegments[0];
    // Capitalize first letter
    return pageName ? pageName.charAt(0).toUpperCase() + pageName.slice(1) : 'Page';
  };

  const toggleMenu = () => {
    // When opening the menu, ensure sidebar is hidden
    if (!isOpen) {
      // Try to hide sidebar if it exists and is visible
      const sidebarVisible = document.querySelector('.sidebarVisible');
      if (sidebarVisible) {
        // Find the closest container that might have a state setter
        const homePage = document.querySelector('.homePage');
        const shopContainer = document.querySelector('.shopContainer');
        
        // Force sidebar to use hidden class
        sidebarVisible.classList.remove('sidebarVisible');
        sidebarVisible.classList.add('sidebarHidden');
      }
    }
    
    setIsOpen(!isOpen);
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleLoginClick = () => {
    // Store the current path for redirect after login
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname + window.location.search;
      console.log('Navbar: Storing current path for login redirect:', currentPath);
      localStorage.setItem('auth_redirect_after_login', currentPath);
    }
    
    setShowLoginModal(true);
    // Close the mobile menu if it's open
    if (isOpen) {
      setIsOpen(false);
    }
  };

  const handleLogoutClick = async () => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
    await logout(currentPath);
    // Close the dropdown and mobile menu if open
    setShowDropdown(false);
    if (isOpen) {
      setIsOpen(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className={styles.navbar}>
    <NineSliceContainer className={styles.navbarNineSlice} variant="standard">
      <div className={`${styles.navbarContainer} container`}>
        <div className={styles.logoContainer}>
          <img className={styles.logoImage} src="/images/logo.png" alt="Enderfall Logo" width={150} height={150} />
          <Link href="/" className={`${styles.title} pixel-font`}>
            Enderfall
          </Link>
        </div>

        <Button 
          className={styles.menuButton} 
          onClick={toggleMenu} 
          variant="standard" 
          nineSlice 
          size="medium"
          aria-label="Toggle menu"
          data-active={isOpen ? "true" : "false"}
        >
          <div className={styles.hamburgerIcon}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </Button>

        <NineSliceContainer 
          className={`${styles.navMenu} ${isOpen ? styles.active : ''}`}
          variant="standard"
        >
          <div>
            <ul className={`${styles.navLinks} pixel-font`}>
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} passHref>
                    <Button 
                      variant="standard" 
                      size="medium"
                      data-active={pathname === link.href ? "true" : "false"}
                    >
                      {link.label}
                    </Button>
                  </Link>
                </li>
              ))}
              {!isCurrentPageInNavLinks && pathname && pathname !== '/' && (
                <li key={pathname}>
                  <Link href={pathname} passHref>
                    <Button 
                      variant="standard" 
                      size="medium"
                      data-active="true"
                    >
                      {getCurrentPageName()}
                    </Button>
                  </Link>
                </li>
              )}
            </ul>

            <div className={styles.navDivider}></div>

            <div className={styles.themeToggleContainer}>
              <ThemeToggle />
            </div>

            <div className={styles.navDivider}></div>

            <div className={styles.authButtons}>

              {!isLoading && (
                user ? (
                  <div className={styles.userSection} ref={dropdownRef} data-open={showDropdown ? "true" : "false"}>
                    <Button 
                      variant="standard"
                      size="medium"
                      className={`${styles.userInfoButton} pixel-font`} 
                      onClick={toggleDropdown}
                      data-active={showDropdown ? "true" : "false"}
                    >
                      <div className={styles.userInfoContent}>
                        {profile?.avatar_url ? (
                          <AvatarWithStatus
                            userId={user.id}
                            avatarUrl={profile.avatar_url}
                            username={profile.username || 'User'}
                            size="medium"
                            className={styles.navbarAvatar}
                          />
                        ) : profile?.username ? (
                          <div className={styles.avatarContainer}>
                            <div className={styles.avatar}>
                              {profile.username[0].toUpperCase()}
                            </div>
                          </div>
                        ) : null}
                        {profile?.username && (
                          <span className={`${styles.username} pixel-font`}>{profile.username}</span>
                        )}
                        <span className={styles.dropdownArrow}><FaChevronDown /></span>
                      </div>
                    </Button>
                    {showDropdown && (
                      <div className={`${styles.dropdown} pixel-font`}>
                        <div className={styles.statusSwitcherContainer}>
                          <StatusSwitcher className={styles.statusSwitcher} />
                        </div>
                        <Link href="/profile" className={`${styles.dropdownItem} pixel-font`}>
                          Profile
                        </Link>
                        <Link href="/profile?tab=settings" className={`${styles.dropdownItem} pixel-font`}>
                          Settings
                        </Link>
                        {profile?.is_admin && (
                          <Link href="/admin" className={`${styles.dropdownItem} pixel-font`}>
                            Admin Dashboard
                          </Link>
                        )}
                        <button 
                          onClick={handleLogoutClick} 
                          className={`${styles.dropdownItem} pixel-font`}
                        >
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button 
                  onClick={handleLoginClick} 
                  className={`${styles.loginButton} pixel-font`}
                  variant="primary"
                  size="medium"
                  >
                    Login
                  </Button>
                )
              )}
            </div>
          </div>
        </NineSliceContainer>
      </div>

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        redirectPath={typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/'}
      />
    </NineSliceContainer>
    </nav>
  );
};

export default Navbar; 