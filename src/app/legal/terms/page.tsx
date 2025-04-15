"use client";

import React from 'react';
import Box from '@/components/UI/Box';
import styles from './page.module.css';

const TermsOfService = () => {
  return (
    <Box>
      <div className={styles.container}>
        <h1 className={styles.title}>Terms of Service</h1>
        <div className={styles.content}>
          <section className={styles.section}>
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing and using this website, you accept and agree to be bound by the terms and conditions of this agreement.</p>
          </section>

          <section className={styles.section}>
            <h2>2. Use License</h2>
            <p>Permission is granted to temporarily download one copy of the materials (information or software) on Enderfall's website for personal, non-commercial transitory viewing only.</p>
          </section>

          <section className={styles.section}>
            <h2>3. User Account</h2>
            <p>To access certain features of the website, you may be required to create an account. You are responsible for maintaining the confidentiality of your account and password.</p>
          </section>

          <section className={styles.section}>
            <h2>4. User Conduct</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Violate any applicable laws or regulations</li>
              <li>Impersonate any person or entity</li>
              <li>Interfere with the proper functioning of the website</li>
              <li>Engage in any harmful or malicious activities</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>5. Intellectual Property</h2>
            <p>All content on this website, including but not limited to text, graphics, logos, and software, is the property of Enderfall and is protected by copyright laws.</p>
          </section>

          <section className={styles.section}>
            <h2>6. Limitation of Liability</h2>
            <p>Enderfall shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the website.</p>
          </section>

          <section className={styles.section}>
            <h2>7. Changes to Terms</h2>
            <p>Enderfall reserves the right to modify these terms at any time. We will notify users of any material changes via email or through the website.</p>
          </section>
        </div>
      </div>
    </Box>
  );
};

export default TermsOfService; 