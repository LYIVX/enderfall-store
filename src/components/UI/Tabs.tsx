"use client";

import { ReactNode } from 'react';
import styles from './Tabs.module.css';
import NineSliceContainer from './NineSliceContainer';
import Button from './Button';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content?: ReactNode;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  orientation?: 'horizontal' | 'vertical';
  showContentBackground?: boolean;
  showContainerBackground?: boolean;
  className?: string;
  tabContentClassName?: string;
  renderTabContent?: (tab: Tab) => ReactNode;
}

export default function Tabs({ 
  tabs, 
  activeTab, 
  onChange, 
  orientation = 'horizontal',
  showContentBackground = false,
  showContainerBackground = false,
  className = '',
  tabContentClassName = '',
  renderTabContent
}: TabsProps) {
  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;
  const isVertical = orientation === 'vertical';
  
  const content = (
    <>
      <NineSliceContainer className={`${isVertical ? styles.tabsListVertical : styles.tabsList} ${className}`}>
        {tabs.map(tab => (
          <Button
            key={tab.id}
            className={`${styles.tab} ${isVertical ? styles.tabVertical : ''} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => onChange(tab.id)}
            variant='standard'
            nineSlice={true}
          >
            {tab.icon && <span className={styles.tabIcon}>{tab.icon}</span>}
            <span className={styles.tabText}>{tab.label}</span>
            {isVertical && tab.id === activeTab && <span className={styles.activeIndicator} />}
          </Button>
        ))}
      </NineSliceContainer>
      
      {(activeTabContent || renderTabContent) && (
        <NineSliceContainer className={`${styles.tabContent} ${showContentBackground ? styles.withBackground : ''} ${tabContentClassName}`}>
          {renderTabContent 
            ? renderTabContent(tabs.find(tab => tab.id === activeTab)!)
            : activeTabContent}
        </NineSliceContainer>
      )}
    </>
  );
  
  if (showContainerBackground) {
    return (
      <NineSliceContainer variant='blue' className={`${styles.tabContainer} ${isVertical ? styles.tabContainerVertical : ''}`}>
        {content}
      </NineSliceContainer>
    );
  }
  
  return content;
} 