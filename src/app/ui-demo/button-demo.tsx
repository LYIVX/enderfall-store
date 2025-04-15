"use client";

import React from 'react';
import Button from '@/components/UI/Button';
import NineSliceButtonExample from '@/components/examples/NineSliceButtonExample';
import styles from './ui-demo.module.css';

const ButtonDemo = () => {
  return (
    <section className={styles.demoSection}>
      <h2 className={styles.sectionTitle}>Button Components</h2>
      <p className={styles.demoDescription}>
        Various button styles and variants available in the UI system.
      </p>
      
      <div className={styles.demoContainer}>
        <div className={styles.buttonGroup}>
          <h3>Standard Buttons</h3>
          <div className={styles.buttonRow}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="success">Success</Button>
            <Button variant="warning">Warning</Button>
            <Button variant="info">Info</Button>
          </div>
        </div>
        
        <div className={styles.buttonGroup}>
          <h3>Icon Buttons</h3>
          <div className={styles.buttonRow}>
            <Button variant="edit">Edit</Button>
            <Button variant="delete">Delete</Button>
            <Button variant="view">View</Button>
            <Button variant="friend">Friend</Button>
          </div>
        </div>
        
        <div className={styles.buttonGroup}>
          <h3>Nine Slice Buttons</h3>
          <p className={styles.buttonNote}>These buttons use pixel-perfect rendering and the MinecraftSeven font.</p>
          <NineSliceButtonExample />
        </div>
      </div>
    </section>
  );
};

export default ButtonDemo; 