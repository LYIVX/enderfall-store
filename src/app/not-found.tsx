"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import NineSliceContainer from '@/components/UI/NineSliceContainer';
import Button from '@/components/UI/Button';
import styles from './not-found.module.css';
import { FaArrowLeft, FaHome, FaDizzy } from 'react-icons/fa';

export default function NotFound() {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);

  return (
    <div className={styles.notFoundPage}>
      <div className={styles.container}>
        <NineSliceContainer variant="blue" className={styles.notFoundContainer}>
          <div className={styles.notFoundContent}>
            <div className={styles.errorCode}>404</div>
            <h1 className={styles.title}>Page Not Found</h1>
            
            <NineSliceContainer variant="standard" className={styles.messageContainer}>
              <div className={styles.message}>
                <p>Hmm, it seems you've ventured too far into the unknown.</p>
                <p>This area hasn't been generated yet!</p>
              </div>
            </NineSliceContainer>
            
            <div className={styles.imageContainer}>
              {!imageError ? (
                <Image 
                  src="/images/404-enderman.png" 
                  alt="404 Lost Enderman" 
                  width={200} 
                  height={200}
                  className={styles.notFoundImage}
                  priority
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className={styles.fallbackIcon}>
                  <FaDizzy size={100} />
                </div>
              )}
            </div>
            
            <div className={styles.actionButtons}>
              <Button 
                variant="primary" 
                nineSlice 
                onClick={() => router.back()}
                className={styles.actionButton}
              >
                <FaArrowLeft />
                <span>Go Back</span>
              </Button>
              
              <Button 
                variant="secondary" 
                nineSlice 
                onClick={() => router.push('/')}
                className={styles.actionButton}
              >
                <FaHome />
                <span>Return Home</span>
              </Button>
            </div>
          </div>
        </NineSliceContainer>
      </div>
    </div>
  );
} 