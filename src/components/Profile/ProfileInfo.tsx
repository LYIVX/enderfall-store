"use client";

import React from 'react';
import Image from 'next/image';
import { FaCube, FaDiscord, FaGoogle, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';
import styles from './ProfileInfo.module.css';
import { Button, NineSliceContainer } from '../UI';

interface ProfileInfoProps {
  profile: {
    username: string;
    avatar_url: string;
    minecraft_username: string | null;
    minecraft_uuid: string | null;
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

const ProfileInfo: React.FC<ProfileInfoProps> = ({
  profile,
  onOpenMinecraftModal,
  onLinkDiscord,
  onLinkGoogle,
  onUnlinkAccount,
  unlinking
}) => {

  const minecraftAvatarUrl = profile.minecraft_uuid
    ? `https://mc-heads.net/avatar/${profile.minecraft_uuid}/40`
    : null;

  console.log('ProfileInfo received profile:', profile);

  return (
    <div className={styles.profileInfoContainer}>
      <div className={styles.profileHeader}>
        <h2>Linked Accounts</h2>
        <p className={styles.sectionDescription}>Manage your connected external accounts.</p>
      </div>

      <div className={styles.infoBox}>
        <FaInfoCircle />
        <p>Linking accounts allows you to sign in using different services and share relevant gaming profiles.</p>
      </div>

      <div className={styles.linkedAccounts}>
        {/* Minecraft */}
        <NineSliceContainer className={`${styles.accountCard} ${profile.minecraft_uuid ? styles.linked : ''}`}>
          {profile.minecraft_uuid && profile.minecraft_username && minecraftAvatarUrl ? (
            // --- Linked State ---
            <div className={styles.accountInfo}> {/* Main flex row, space-between */}
              {/* Left side group (Preview + Text) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md, 1rem)' }}> {/* Grouping div */}
                {/* Avatar Preview Block (Now first) */}
                <div className={styles.minecraftPreview}> {/* Keep the preview structure */}
                  <div className={styles.minecraftAvatarContainer}>
                    <Image
                      src={minecraftAvatarUrl}
                      alt={`${profile.minecraft_username}'s avatar`}
                      width={40} 
                      height={40}
                      className={styles.minecraftDisplayAvatar}
                      unoptimized
                    />
                    <span className={styles.minecraftDisplayName}>
                      {profile.minecraft_username}
                    </span>
                  </div>
                </div>
                {/* Text Details (Now second) */}
                <div> 
                  <h3>Minecraft</h3>
                  <p className={styles.accountDetail}>
                    Account Linked <FaCheckCircle className={styles.verifiedIcon} />
                  </p>
                </div>
              </div>
              {/* Right side: Button */}
              <div className={styles.accountActions}>
                <Button
                  onClick={onOpenMinecraftModal}
                  size='medium' 
                >
                  Edit
                </Button>
              </div>
            </div>
          ) : (
            // --- Unlinked State ---
            <>
              <div className={styles.accountIcon}>
                <FaCube />
              </div>
              <div className={styles.accountInfo}>
                <div>
                  <h3>Minecraft</h3>
                  <p className={styles.accountDetail}>Account not linked</p>
                </div>
                <div className={styles.accountActions}>
                  <Button
                    onClick={onOpenMinecraftModal}
                    size='medium' 
                  >
                    Link Account
                  </Button>
                </div>
              </div>
            </>
          )}
        </NineSliceContainer>

        {/* Discord */}
        <NineSliceContainer className={`${styles.accountCard} ${profile.discord_id ? styles.linked : ''}`}>
          <div className={styles.accountIcon}>
            <FaDiscord />
          </div>
          <div className={styles.accountInfo}>
            <div>
              <h3>Discord</h3>
              {profile.discord_id ? (
                <p className={styles.accountDetail}>
                  Account Linked <FaCheckCircle className={styles.verifiedIcon} />
                </p>
              ) : (
                <p className={styles.accountDetail}>Account not linked</p>
              )}
            </div>
            <div className={styles.accountActions}>
              {profile.discord_id ? (
                <Button
                  variant='danger'
                  onClick={() => onUnlinkAccount('discord')}
                  disabled={unlinking === 'discord'}  
                  size='medium' 
                >
                  {unlinking === 'discord' ? 'Unlinking...' : 'Unlink'}
                </Button>
              ) : (
                <Button
                  onClick={onLinkDiscord}
                  size='medium' 
                >
                  Link Account
                </Button>
              )}
            </div>
          </div>
        </NineSliceContainer>

        {/* Google */}
        <NineSliceContainer className={`${styles.accountCard} ${profile.google_id ? styles.linked : ''}`}>
          <div className={styles.accountIcon}>
            <FaGoogle />
          </div>
          <div className={styles.accountInfo}>
            <div>
              <h3>Google</h3>
              {profile.google_id ? (
                <p className={styles.accountDetail}>
                  Account Linked <FaCheckCircle className={styles.verifiedIcon} />
                </p>
              ) : (
                <p className={styles.accountDetail}>Account not linked</p>
              )}
            </div>
            <div className={styles.accountActions}>
              {profile.google_id ? (
                <Button
                  variant='danger'
                  onClick={() => onUnlinkAccount('google')}
                  disabled={unlinking === 'google'}
                  size='medium' 
                >
                  {unlinking === 'google' ? 'Unlinking...' : 'Unlink'}
                </Button>
              ) : (
                <Button
                  onClick={onLinkGoogle}
                  size='medium' 
                >
                  Link Account
                </Button>
              )}
            </div>
          </div>
        </NineSliceContainer>
      </div>
    </div>
  );
};

export default ProfileInfo;