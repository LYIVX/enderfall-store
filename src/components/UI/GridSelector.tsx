"use client";

import React, { useState } from 'react';
import styles from './GridSelector.module.css';
import Input from './Input';
import Button from './Button';

export interface GridItem<T> {
  id: string;
  label?: string;
  value: T;
  content: React.ReactNode;
}

interface GridSelectorProps<T> {
  items: GridItem<T>[];
  selectedValue: T | null;
  onChange: (value: T) => void;
  label?: string;
  columns?: number;
  searchable?: boolean;
  maxHeight?: string;
  itemSize?: 'small' | 'medium' | 'large';
}

export function GridSelector<T>({
  items,
  selectedValue,
  onChange,
  label,
  columns = 6,
  searchable = true,
  maxHeight = '300px',
  itemSize = 'medium'
}: GridSelectorProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter items based on search query
  const filteredItems = searchable && searchQuery
    ? items.filter(item => 
        item.label?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        String(item.id).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;
  
  return (
    <div className={styles.gridSelectorContainer}>
      {label && <div className={styles.gridSelectorLabel}>{label}</div>}
      
      {searchable && (
        <div className={styles.searchContainer}>
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            label=""
            className={styles.searchInput}
          />
          {searchQuery && (
            <Button 
              className={styles.clearButton}
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              variant="primary"
              size="small"
            >
              ×
            </Button>
          )}
        </div>
      )}
      
      <div 
        className={`${styles.gridContainer} ${styles[`size-${itemSize}`]}`} 
        style={{ 
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          maxHeight
        }}
      >
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <Button
              key={item.id}
              className={`${styles.gridItem} ${String(selectedValue) === String(item.value) ? styles.selected : ''}`}
              onClick={() => onChange(item.value)}
              title={item.label || String(item.value)}
              type="button"
              variant="primary"
              icon={item.content}
            >
              {item.label && <div className={styles.gridItemLabel}>{item.label}</div>}
            </Button>
          ))
        ) : (
          <div className={styles.noResults}>No items found</div>
        )}
      </div>
    </div>
  );
}

export default GridSelector; 