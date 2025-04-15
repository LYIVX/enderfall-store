"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/Auth/AuthContext';
import Link from 'next/link';
import styles from './admin.module.css';
import Tabs, { Tab } from '@/components/UI/Tabs';
import { 
  FaHome, FaHistory, FaCreditCard, FaUsers, 
  FaComments, FaNewspaper, FaStream, FaThList
} from 'react-icons/fa';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminClientLayout({ children }: AdminLayoutProps) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!isAuthenticated || !isAdmin)) {
      router.push('/');
    }
  }, [isAuthenticated, isAdmin, loading, router]);

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  const isActive = (path: string) => {
    if (!pathname) return false;
    
    if (path === '/admin' && pathname === '/admin') {
      return true;
    }
    if (path !== '/admin' && pathname.startsWith(path)) {
      return true;
    }
    return false;
  };
  
  // Get the current active tab ID based on pathname
  const getActiveTabId = (pathname: string) => {
    if (!pathname) return 'overview';
    if (pathname === '/admin') return 'overview';
    if (pathname.startsWith('/admin/activity')) return 'activity';
    if (pathname.startsWith('/admin/transactions')) return 'transactions';
    if (pathname.startsWith('/admin/users')) return 'users';
    if (pathname.startsWith('/admin/forums')) return 'forums';
    if (pathname.startsWith('/admin/blogs')) return 'blogs';
    if (pathname.startsWith('/admin/social-posts')) return 'social-posts';
    if (pathname.startsWith('/admin/ranks')) return 'ranks';
    return 'overview';
  };
  
  // Handle tab change by navigating to the corresponding page
  const handleNavChange = (tabId: string) => {
    switch (tabId) {
      case 'overview':
        router.push('/admin');
        break;
      default:
        router.push(`/admin/${tabId}`);
        break;
    }
  };
  
  // Define the navigation tabs
  const navigationTabs: Tab[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <FaHome />
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: <FaHistory />
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: <FaCreditCard />
    },
    {
      id: 'users',
      label: 'Users',
      icon: <FaUsers />
    },
    {
      id: 'forums',
      label: 'Forums',
      icon: <FaComments />
    },
    {
      id: 'blogs',
      label: 'Blogs',
      icon: <FaNewspaper />
    },
    {
      id: 'social-posts',
      label: 'Social Posts',
      icon: <FaStream />
    },
    {
      id: 'ranks',
      label: 'Ranks',
      icon: <FaThList />
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Admin Dashboard</h1>
      </div>

      <Tabs 
        tabs={navigationTabs}
        orientation="horizontal"
        showContentBackground={true}
        activeTab={getActiveTabId(pathname || '')}
        onChange={handleNavChange}
        className={styles.adminNavigation}
      />

      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
} 