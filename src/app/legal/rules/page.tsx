"use client";

import React, { useState } from 'react';
import Box from '@/components/UI/Box';
import Button from '@/components/UI/Button';
import styles from './page.module.css';
import { FaCheck, FaCopy, FaCheckCircle, FaDiscord } from 'react-icons/fa';

const ServerRules = () => {
  const [notification, setNotification] = useState<{message: string} | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setNotification({ message: "Email copied to clipboard!" });
    
    // Auto-hide notification after 2 seconds
    setTimeout(() => {
      setNotification(null);
    }, 2000);
  };

  // Close notification when clicked
  const handleCloseNotification = () => {
    setNotification(null);
  };

  return (
    <Box>
      <div className={styles.container}>
        <h1 className={styles.title}>Server Rules</h1>
        <div className={styles.content}>
          <section className={styles.section}>
            <h2>1. General Conduct</h2>
            <p>All users must:</p>
            <ul>
              <li>Treat others with respect and courtesy</li>
              <li>Use appropriate language</li>
              <li>Follow moderator instructions</li>
              <li>Report violations to staff</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>2. Chat Rules</h2>
            <p>In all chat channels:</p>
            <ul>
              <li>No spam or excessive caps</li>
              <li>No harassment or bullying</li>
              <li>No inappropriate content</li>
              <li>Stay on topic in designated channels</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>3. Gameplay Rules</h2>
            <p>While playing:</p>
            <ul>
              <li>No cheating or exploiting bugs</li>
              <li>No griefing or harassment</li>
              <li>No unauthorized modifications</li>
              <li>Follow fair play guidelines</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>4. Account Security</h2>
            <p>Users are responsible for:</p>
            <ul>
              <li>Maintaining account security</li>
              <li>Not sharing account credentials</li>
              <li>Reporting suspicious activity</li>
              <li>Keeping contact information updated</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>5. Consequences</h2>
            <p>Violations may result in:</p>
            <ul>
              <li>Warnings</li>
              <li>Temporary suspension</li>
              <li>Permanent ban</li>
              <li>Account termination</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>6. Appeals Process</h2>
            <p>If you believe a punishment was unjust:</p>
            <ul>
              <li>Submit an appeal through our website</li>
              <li>Include relevant evidence</li>
              <li>Be respectful and professional</li>
              <li>Accept the final decision</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>7. Rule Changes</h2>
            <p>We reserve the right to:</p>
            <ul>
              <li>Modify rules at any time</li>
              <li>Enforce rules as needed</li>
              <li>Make exceptions when appropriate</li>
              <li>Update punishments as necessary</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>8. Contact</h2>
            <p>For questions about rules or to report violations:</p>
            <div className={styles.buttonGroup}>
              <Button 
                variant="primary" 
                size="small"
                onClick={() => copyToClipboard("enderfall@gmail.com")}
              >
                {notification ? <><FaCheck /> Copied!</> : <><FaCopy /> Copy Email</>}
              </Button>
              <Button 
                variant="secondary" 
                size="small"
                onClick={() => window.open("https://discord.gg/enderfall", "_blank")}
              >
                <FaDiscord /> Join Discord
              </Button>
            </div>
          </section>
        </div>
        
        {notification && (
          <div className={styles.notification} onClick={handleCloseNotification}>
            <FaCheckCircle />
            <p>{notification.message}</p>
          </div>
        )}
      </div>
    </Box>
  );
};

export default ServerRules; 