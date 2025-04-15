"use client";

import { useState, useEffect } from 'react';
import MinecraftAvatar from '@/components/UI/MinecraftAvatar';
import PaymentGoal from '@/components/UI/PaymentGoal';
import FeaturedRanks from '@/components/Home/FeaturedRanks';
import HeroSection from '@/components/Home/HeroSection';
import ServerFeatures from '@/components/Home/ServerFeatures';
import StaffSection from '@/components/Home/StaffSection';
import CommunitySection from '@/components/Home/CommunitySection';
import BlogPreview from '@/components/Home/BlogPreview';
import CollapsibleSidebar from '@/components/UI/CollapsibleSidebar';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.homePage}>
      <div className={styles.mainContent}>
        <HeroSection />
        <ServerFeatures />
        <BlogPreview />
        <StaffSection />
        <CommunitySection />
      </div>
      
      <CollapsibleSidebar className={styles.sidebar}>
        <MinecraftAvatar />
        <FeaturedRanks />
        <PaymentGoal />
      </CollapsibleSidebar>
    </div>
  );
} 