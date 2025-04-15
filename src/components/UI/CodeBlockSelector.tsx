"use client";

import React, { forwardRef, useState } from 'react';
import styles from './CodeBlockSelector.module.css';
import Button from './Button';
import Input from '@/components/UI/Input';


interface CodeBlockSelectorProps {
  onSelect: (language: string) => void;
  onCancel: () => void;
}

// Popular programming languages (first in the list, highlighted)
const popularLanguages = [
  { id: 'javascript', name: 'JavaScript' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'html', name: 'HTML' },
  { id: 'css', name: 'CSS' },
  { id: 'python', name: 'Python' },
  { id: 'java', name: 'Java' },
];

// Additional programming languages
const additionalLanguages = [
  { id: 'csharp', name: 'C#' },
  { id: 'cpp', name: 'C++' },
  { id: 'go', name: 'Go' },
  { id: 'rust', name: 'Rust' },
  { id: 'php', name: 'PHP' },
  { id: 'ruby', name: 'Ruby' },
  { id: 'swift', name: 'Swift' },
  { id: 'kotlin', name: 'Kotlin' },
  { id: 'sql', name: 'SQL' },
  { id: 'bash', name: 'Bash' },
  { id: 'json', name: 'JSON' },
  { id: 'markdown', name: 'Markdown' },
  { id: 'yaml', name: 'YAML' },
  { id: 'xml', name: 'XML' },
  { id: 'graphql', name: 'GraphQL' },
  { id: 'jsx', name: 'JSX' },
  { id: 'tsx', name: 'TSX' },
  { id: 'scss', name: 'SCSS' },
  { id: 'less', name: 'Less' },
  { id: 'haskell', name: 'Haskell' },
  { id: 'elixir', name: 'Elixir' },
  { id: 'scala', name: 'Scala' },
  { id: 'r', name: 'R' },
  { id: 'dart', name: 'Dart' },
];

const CodeBlockSelector = forwardRef<HTMLDivElement, CodeBlockSelectorProps>(
  ({ onSelect, onCancel }, ref) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredLanguages = [...popularLanguages, ...additionalLanguages].filter(lang => 
      lang.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    };

    return (
      <div
        ref={ref}
        className={styles.codeBlockSelectorContainer}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.codeBlockSelectorHeader}>
          Select Language
        </div>
        
        <div className={styles.searchContainer}>
          <Input
            label="Search"
            placeholder="Search language..."
            className={styles.searchInput}
            layout="horizontal"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>       
        
        <div className={styles.languageList}>
          {filteredLanguages.map(lang => (
            <div 
              key={lang.id} 
              className={`${styles.languageItem} ${
                popularLanguages.some(pl => pl.id === lang.id) ? styles.popular : ''
              }`}
              onClick={() => onSelect(lang.id)}
            >
              {lang.name}
            </div>
          ))}
          {filteredLanguages.length === 0 && (
            <div className={styles.noResults}>No languages found</div>
          )}
        </div>
        
        <div className={styles.codeBlockSelectorFooter}>
          <Button
            variant="secondary"
            size="small"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }
);

CodeBlockSelector.displayName = 'CodeBlockSelector';

export default CodeBlockSelector; 