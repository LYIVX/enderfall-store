"use client";

import { useState } from 'react';
import Tabs, { Tab } from '@/components/UI/Tabs';
import { FaHome, FaUser, FaEnvelope, FaCog } from 'react-icons/fa';
import styles from './tabs-demo.module.css';

export default function TabsDemo() {
  // Horizontal tabs example
  const [activeHorizontalTab, setActiveHorizontalTab] = useState('tab1');
  
  const horizontalTabs: Tab[] = [
    { 
      id: 'tab1', 
      label: 'Home', 
      icon: <FaHome />,
      content: <div className={styles.tabContent}>Home content goes here</div>
    },
    { 
      id: 'tab2', 
      label: 'Profile', 
      icon: <FaUser />,
      content: <div className={styles.tabContent}>Profile content goes here</div>
    },
    { 
      id: 'tab3', 
      label: 'Messages', 
      icon: <FaEnvelope />,
      content: <div className={styles.tabContent}>Messages content goes here</div>
    },
    { 
      id: 'tab4', 
      label: 'Settings', 
      icon: <FaCog />,
      content: <div className={styles.tabContent}>Settings content goes here</div>
    }
  ];
  
  // Vertical tabs example
  const [activeVerticalTab, setActiveVerticalTab] = useState('tab1');
  
  const verticalTabs: Tab[] = [
    { 
      id: 'tab1', 
      label: 'Dashboard', 
      icon: <FaHome />,
      content: <div className={styles.tabContent}>Dashboard content goes here</div>
    },
    { 
      id: 'tab2', 
      label: 'User Settings', 
      icon: <FaUser />,
      content: <div className={styles.tabContent}>User settings content goes here</div>
    },
    { 
      id: 'tab3', 
      label: 'Notifications', 
      icon: <FaEnvelope />,
      content: <div className={styles.tabContent}>Notifications content goes here</div>
    },
    { 
      id: 'tab4', 
      label: 'Advanced', 
      icon: <FaCog />,
      content: <div className={styles.tabContent}>Advanced settings content goes here</div>
    }
  ];
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Tabs Component Demo</h1>
      
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Horizontal Tabs</h2>
        <p className={styles.description}>Default horizontal tabs with content background</p>
        
        <Tabs
          tabs={horizontalTabs}
          activeTab={activeHorizontalTab}
          onChange={setActiveHorizontalTab}
          showContentBackground={true}
        />
      </section>
      
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Horizontal Tabs (No Background)</h2>
        <p className={styles.description}>Horizontal tabs without content background</p>
        
        <Tabs
          tabs={horizontalTabs}
          activeTab={activeHorizontalTab}
          onChange={setActiveHorizontalTab}
          showContentBackground={false}
        />
      </section>
      
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Horizontal Tabs with Container Background</h2>
        <p className={styles.description}>Horizontal tabs with a background around the entire container</p>
        
        <Tabs
          tabs={horizontalTabs}
          activeTab={activeHorizontalTab}
          onChange={setActiveHorizontalTab}
          showContainerBackground={true}
        />
      </section>
      
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Both Background Types</h2>
        <p className={styles.description}>Using both container and content backgrounds together</p>
        
        <Tabs
          tabs={horizontalTabs}
          activeTab={activeHorizontalTab}
          onChange={setActiveHorizontalTab}
          showContainerBackground={true}
          showContentBackground={true}
        />
      </section>
      
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Vertical Tabs</h2>
        <p className={styles.description}>Vertical tabs with content background</p>
        
        <Tabs
          tabs={verticalTabs}
          activeTab={activeVerticalTab}
          onChange={setActiveVerticalTab}
          orientation="vertical"
          showContentBackground={true}
        />
      </section>
      
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Vertical Tabs (No Background)</h2>
        <p className={styles.description}>Vertical tabs without content background</p>
        
        <Tabs
          tabs={verticalTabs}
          activeTab={activeVerticalTab}
          onChange={setActiveVerticalTab}
          orientation="vertical"
          showContentBackground={false}
        />
      </section>
      
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Vertical Tabs with Container Background</h2>
        <p className={styles.description}>Vertical tabs with a background around the entire container</p>
        
        <Tabs
          tabs={verticalTabs}
          activeTab={activeVerticalTab}
          onChange={setActiveVerticalTab}
          orientation="vertical"
          showContainerBackground={true}
        />
      </section>
      
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Vertical Tabs with Both Backgrounds</h2>
        <p className={styles.description}>Vertical tabs with both container and content backgrounds</p>
        
        <Tabs
          tabs={verticalTabs}
          activeTab={activeVerticalTab}
          onChange={setActiveVerticalTab}
          orientation="vertical"
          showContainerBackground={true}
          showContentBackground={true}
        />
      </section>
      
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Custom Render Function</h2>
        <p className={styles.description}>Using a custom render function for tab content</p>
        
        <Tabs
          tabs={horizontalTabs}
          activeTab={activeHorizontalTab}
          onChange={setActiveHorizontalTab}
          showContentBackground={true}
          renderTabContent={(tab) => (
            <div className={styles.customRender}>
              <h3>Custom Rendered: {tab.label}</h3>
              <div className={styles.iconWrapper}>{tab.icon}</div>
              {tab.content}
            </div>
          )}
        />
      </section>
    </div>
  );
} 