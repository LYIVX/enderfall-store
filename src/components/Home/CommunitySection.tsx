"use client";

import { useState } from 'react';
import Button from '@/components/UI/Button';
import styles from './CommunitySection.module.css';
import { NineSliceContainer } from '../UI';
import { FaDiscord, FaTwitter, FaInstagram } from 'react-icons/fa';

const CommunitySection = () => {
  const [copyText, setCopyText] = useState("Copy");
  
  const handleCopy = () => {
    navigator.clipboard.writeText("play.enderfall.co.uk");
    setCopyText("Copied!");
    setTimeout(() => setCopyText("Copy"), 2000);
  };

  return (
    <NineSliceContainer className={styles.communitySection} variant='blue'>
      <NineSliceContainer className={styles.sectionHeader} variant='standard'>
        <h2 className={styles.sectionTitle}>Join Our Community</h2>
        <p className={styles.sectionDescription}>
          Connect with other players, get help, and stay updated on the latest server news and events.
        </p>
      </NineSliceContainer>
      <div className={styles.sectionContent}>
        <div className={styles.socialLinks}>
          <Button 
            variant="primary"
            size="medium"
            nineSlice={true}
            onClick={() => window.open("https://discord.gg/enderfall", "_blank")}
            rel="noopener noreferrer"
            className={`${styles.socialButton} ${styles.discordButton}`}
          >
            <span className={styles.socialIcon}><FaDiscord /></span>
            <span className={styles.socialText}>Discord</span>
          </Button>
          
          <Button 
            variant="secondary"
            size="medium"
            nineSlice={true}
            onClick={() => window.open("https://twitter.com/enderfall", "_blank")}
            rel="noopener noreferrer"
            className={`${styles.socialButton} ${styles.twitterButton}`}
          >
            <span className={styles.socialIcon}><FaTwitter /></span>
            <span className={styles.socialText}>Twitter</span>
          </Button>
          
          <Button 
            variant="warning"
            size="medium"
            nineSlice={true}
            onClick={() => window.open("https://instagram.com/enderfall", "_blank")}
            rel="noopener noreferrer"
            className={`${styles.socialButton} ${styles.instagramButton}`}
          >
            <span className={styles.socialIcon}><FaInstagram /></span>
            <span className={styles.socialText}>Instagram</span>
          </Button>
        </div>
        
        <NineSliceContainer className={styles.serverInfo} variant='standard'>
          <div className={styles.serverAddress}>
            <span className={styles.serverLabel}>Server Address:</span>
            <span className={styles.serverValue}>play.enderfall.co.uk</span>
            <Button 
            variant="primary" 
            size="small" 
            nineSlice={true}
            className={styles.copyButton} 
            onClick={handleCopy}>
              {copyText}
            </Button>
          </div>
          
          <div className={styles.serverVersion}>
            <span className={styles.serverLabel}>Minecraft Version:</span>
            <span className={styles.serverValue}>1.21.4</span>
          </div>
        </NineSliceContainer>
      </div>
    </NineSliceContainer>
  );
};

export default CommunitySection; 