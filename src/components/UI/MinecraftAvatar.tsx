"use client";

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/Auth/AuthContext';
import styles from './MinecraftAvatar.module.css';
import Box from './Box';
import { FaHourglassHalf, FaGamepad } from 'react-icons/fa';
import { NineSliceContainer } from '.';

interface MinecraftAvatarProps {
  username?: string;
}

const MinecraftAvatar = ({ username }: MinecraftAvatarProps) => {
  const { profile } = useAuth();
  const [minecraftUsername, setMinecraftUsername] = useState<string | null>(username || null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If a username was provided as a prop, use that
    if (username) {
      setMinecraftUsername(username);
    } 
    // If no prop was provided but we have a profile with minecraft_username, use that
    else if (profile?.minecraft_username) {
      setMinecraftUsername(profile.minecraft_username);
    }
    // Otherwise, we'll fall back to the loading/fallback state
  }, [username, profile]);

  return (
    <NineSliceContainer className={styles.avatarSection} variant="blue">
      <NineSliceContainer className={styles.sectionHeader} variant="standard">
        <h2 className={styles.sectionTitle}>Your Minecraft Character</h2>
      </NineSliceContainer>

        <NineSliceContainer className={styles.avatarBox} variant="standard">
          {minecraftUsername ? (
            <>
              <NineSliceContainer className={styles.avatarTitle}>{minecraftUsername}</NineSliceContainer>
              <NineSliceContainer className={styles.avatarImageWrapper} variant="standard">
                <Image 
                  src={`https://mc-heads.net/body/${minecraftUsername}`}
                  alt={`${minecraftUsername}'s Minecraft avatar`}
                  width={150}
                  height={300}
                  className={styles.avatarBody}
                  priority
                />
              </NineSliceContainer>
            </>
          ) : isLoading ? (
            <>
              <div className={styles.avatarIcon}>
                <FaHourglassHalf size={40} />
              </div>
              <h3 className={styles.avatarTitle}>Loading...</h3>
              <p className={styles.avatarDescription}>Please wait while we fetch your character</p>
            </>
          ) : (
            <>
              <div className={styles.avatarIcon}>
                <FaGamepad size={40} />
              </div>
              <h3 className={styles.avatarTitle}>No Account Linked</h3>
              <p className={styles.avatarDescription}>
                Connect your Minecraft account in profile settings
              </p>
            </>
          )}
        </NineSliceContainer>
    </NineSliceContainer>
  );
};

export default MinecraftAvatar; 