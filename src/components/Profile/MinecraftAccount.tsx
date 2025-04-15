"use client";

import React from 'react';
import Image from 'next/image';
import Box from '@/components/UI/Box';
import styles from './MinecraftAccount.module.css';

interface MinecraftAccountProps {
  username: string;
  joinDate: string;
}

const MinecraftAccount: React.FC<MinecraftAccountProps> = ({ username, joinDate }) => {
  // Function to format date to a more readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <Box>
      <div className={styles.accountHeader}>
        <h3 className={styles.headerTitle}>Minecraft Account</h3>
      </div>
      
      <div className={styles.accountContent}>
        <div className={styles.avatarSection}>
          <div className={styles.avatarWrapper}>
            <Image 
              src={`https://mc-heads.net/avatar/${username}/100`}
              alt={`${username}'s Minecraft avatar`}
              width={100}
              height={100}
              className={styles.avatar}
            />
          </div>
          <div className={styles.username}>{username}</div>
          <div className={styles.joinDate}>Joined {formatDate(joinDate)}</div>
        </div>
        
        <div className={styles.statsSection}>
          <div className={styles.statItem}>
            <div className={styles.statValue}>42</div>
            <div className={styles.statLabel}>Hours Played</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>3</div>
            <div className={styles.statLabel}>Towns Joined</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>128</div>
            <div className={styles.statLabel}>Blocks Placed</div>
          </div>
        </div>
        
        <div className={styles.rankSection}>
          <div className={styles.rankHeader}>Current Rank</div>
          <div className={styles.rankBadge}>Guardian</div>
          <div className={styles.rankExpiry}>Valid until Dec 31, 2023</div>
        </div>
      </div>
    </Box>
  );
};

export default MinecraftAccount; 