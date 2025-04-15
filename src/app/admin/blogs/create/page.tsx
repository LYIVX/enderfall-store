"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CreateBlogPost from '@/components/Social/CreateBlogPost';
import styles from '../../admin.module.css';

export default function CreateBlogPage() {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(true);

  const handleClose = () => {
    setIsFormOpen(false);
    router.push('/admin/blogs');
  };

  return (
    <div className={styles.contentSection}>
      <div className={styles.contentHeader}>
        <h2 className={styles.contentTitle}>Create Blog Post</h2>
      </div>
      
      <div className={styles.contentContainer}>
        <CreateBlogPost 
          isOpen={isFormOpen}
          onClose={handleClose}
        />
      </div>
    </div>
  );
} 