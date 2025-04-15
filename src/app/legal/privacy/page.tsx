"use client";

import React, { useState } from 'react';
import Box from '@/components/UI/Box';
import styles from './page.module.css';
import Button from '@/components/UI/Button';
import { FaCheck, FaCopy, FaCheckCircle, FaDiscord } from 'react-icons/fa';

// Rename this to ClientPrivacyPolicy
const ClientPrivacyPolicy = () => {
  
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
        <h1 className={styles.title}>Privacy Policy</h1>
        <div className={styles.content}>
          <section className={styles.section}>
            <h2>1. Information We Collect</h2>
            <p>We collect information that you provide directly to us, including:</p>
            <ul>
              <li>Account information (username, email address)</li>
              <li>Profile information</li>
              <li>Communication preferences</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide and maintain our services</li>
              <li>Process your transactions</li>
              <li>Send you technical notices and support messages</li>
              <li>Communicate with you about products, services, and events</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>3. Information Sharing</h2>
            <p>We do not sell or rent your personal information to third parties. We may share your information with:</p>
            <ul>
              <li>Service providers who assist in our operations</li>
              <li>Law enforcement when required by law</li>
              <li>Other users with your consent</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>4. Data Security</h2>
            <p>We implement appropriate security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction.</p>
          </section>

          <section className={styles.section}>
            <h2>5. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your information</li>
              <li>Opt-out of marketing communications</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>6. Cookies</h2>
            <p>We use cookies and similar tracking technologies to track activity on our website and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.</p>
          </section>

          <section className={styles.section}>
            <h2>7. Changes to This Policy</h2>
            <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page and updating the "Last Updated" date.</p>
          </section>

          <section className={styles.section}>
            <h2>8. Contact Us</h2>
            <p>If you have any questions about this privacy policy, please contact us at:</p>
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
                onClick={() => window.open("https://discord.gg/ellrijord", "_blank")}
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

export default ClientPrivacyPolicy; 