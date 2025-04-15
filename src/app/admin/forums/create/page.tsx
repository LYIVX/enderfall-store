"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CreateForumPost from '@/components/Forums/CreateForumPost';
import styles from '../../admin.module.css';

export default function CreateForumPage() {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(true);

  const handleClose = () => {
    setIsFormOpen(false);
    router.push('/admin/forums');
  };

  return (
    <div className={styles.contentSection}>
      <div className={styles.contentHeader}>
        <h2 className={styles.contentTitle}>Create Forum Post</h2>
      </div>
      
      <div className={styles.contentContainer}>
        <CreateForumPost 
          isOpen={isFormOpen}
          onClose={handleClose}
        />
      </div>
    </div>
  );
} 