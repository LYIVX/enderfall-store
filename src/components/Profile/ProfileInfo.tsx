"use client";

import React from 'react';
import { FaCube, FaDiscord, FaGoogle, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';
import styles from './ProfileInfo.module.css';
import { Button, NineSliceContainer } from '../UI';

interface ProfileInfoProps {
  profile: {
    username: string;
    avatar_url: string;
    minecraft_username: string | null;
    discord_id: string | null;
    google_id: string | null;
    created_at: string;
  };
  onOpenMinecraftModal: () => void;
  onLinkDiscord: () => void;
  onLinkGoogle: () => void;
  onUnlinkAccount: (provider: 'discord' | 'google') => void;
  unlinking: string | null;
}

export default function ProfileInfo({
  profile,
  onOpenMinecraftModal,
  onLinkDiscord,
  onLinkGoogle,
  onUnlinkAccount,
  unlinking
}: ProfileInfoProps) {
  return (
    <>
      <div className={styles.profileHeader}>
        <h2>Linked Accounts</h2>
        <p className={styles.sectionDescription}>
          Connect your accounts to access additional features and manage your Enderfall experience.
        </p>
      </div>
      
      <div className={styles.linkedAccounts}>
        <NineSliceContainer className={`${styles.accountCard} ${profile.minecraft_username ? styles.linked : ''}`}>
          <div className={styles.accountIcon}>
            <FaCube />
          </div>
          <div className={styles.accountInfo}>
            <h3>Minecraft</h3>
            {profile.minecraft_username ? (
              <>
                <p className={styles.accountDetail}>{profile.minecraft_username}</p>
                <Button 
                  onClick={onOpenMinecraftModal}
                >
                  Edit
                </Button>
              </>
            ) : (
              <Button 
                onClick={onOpenMinecraftModal}
              >
                Link Account
              </Button>
            )}
          </div>
        </NineSliceContainer>
        
        <NineSliceContainer className={`${styles.accountCard} ${profile.discord_id ? styles.linked : ''}`}>
          <div className={styles.accountIcon}>
            <FaDiscord />
          </div>
          <div className={styles.accountInfo}>
            <h3>Discord</h3>
            {profile.discord_id ? (
              <>
                <p className={styles.accountDetail}>
                  Account Linked <FaCheckCircle className={styles.verifiedIcon} />
                </p>
                <Button 
                  variant='danger'
                  onClick={() => onUnlinkAccount('discord')}
                  disabled={unlinking === 'discord'}
                >
                  {unlinking === 'discord' ? 'Unlinking...' : 'Unlink'}
                </Button>
              </>
            ) : (
              <Button 
                onClick={onLinkDiscord}
              >
                Link Discord
              </Button>
            )}
          </div>
        </NineSliceContainer>
        
        <NineSliceContainer className={`${styles.accountCard} ${profile.google_id ? styles.linked : ''}`}>
          <div className={styles.accountIcon}>
            <FaGoogle />
          </div>
          <div className={styles.accountInfo}>
            <h3>Google</h3>
            {profile.google_id ? (
              <>
                <p className={styles.accountDetail}>
                  Account Linked <FaCheckCircle className={styles.verifiedIcon} />
                </p>
                <Button 
                  variant='danger'
                  onClick={() => onUnlinkAccount('google')}
                  disabled={unlinking === 'google'}
                >
                  {unlinking === 'google' ? 'Unlinking...' : 'Unlink'}
                </Button>
              </>
            ) : (
              <Button 
                onClick={onLinkGoogle}
              >
                Link Google
              </Button>
            )}
          </div>
        </NineSliceContainer>
      </div>
      
      <NineSliceContainer className={styles.infoBox}>
        <FaInfoCircle />
        <p>
          Linking your Minecraft account allows us to identify you on our servers. 
          Discord and Google accounts provide additional login options and access to community features.
        </p>
      </NineSliceContainer>
    </>
  );
} 