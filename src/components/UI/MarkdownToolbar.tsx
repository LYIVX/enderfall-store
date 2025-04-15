"use client";

import React, { useState, useRef, useEffect } from 'react';
import styles from './MarkdownToolbar.module.css';
import Button from './Button';
import TableSelector from './TableSelector';
import CodeBlockSelector from './CodeBlockSelector';
import ImageSelector from './ImageSelector';
import { 
  FaBold, 
  FaItalic, 
  FaStrikethrough, 
  FaHeading, 
  FaListUl, 
  FaListOl, 
  FaTasks, 
  FaQuoteRight, 
  FaCode, 
  FaLink, 
  FaImage, 
  FaTable, 
  FaGripLines,
  FaSuperscript,
  FaSubscript,
  FaFileCode,
  FaAlignLeft,
  FaAlignCenter,
  FaAlignRight,
  FaAlignJustify
} from 'react-icons/fa';

interface MarkdownToolbarProps {
  onFormatText: (formatType: string, options?: any) => void;
}

const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ onFormatText }) => {
  const [showTableSelector, setShowTableSelector] = useState(false);
  const [showCodeBlockSelector, setShowCodeBlockSelector] = useState(false);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const tableButtonRef = useRef<HTMLDivElement>(null);
  const tableSelectorRef = useRef<HTMLDivElement>(null);
  const codeBlockButtonRef = useRef<HTMLDivElement>(null);
  const codeBlockSelectorRef = useRef<HTMLDivElement>(null);
  const imageButtonRef = useRef<HTMLDivElement>(null);
  const imageSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Handle table selector
      if (
        showTableSelector &&
        tableButtonRef.current &&
        !tableButtonRef.current.contains(event.target as Node) &&
        tableSelectorRef.current &&
        !tableSelectorRef.current.contains(event.target as Node)
      ) {
        setShowTableSelector(false);
      }

      // Handle code block selector
      if (
        showCodeBlockSelector &&
        codeBlockButtonRef.current &&
        !codeBlockButtonRef.current.contains(event.target as Node) &&
        codeBlockSelectorRef.current &&
        !codeBlockSelectorRef.current.contains(event.target as Node)
      ) {
        setShowCodeBlockSelector(false);
      }

      // Handle image selector
      if (
        showImageSelector &&
        imageButtonRef.current &&
        !imageButtonRef.current.contains(event.target as Node) &&
        imageSelectorRef.current &&
        !imageSelectorRef.current.contains(event.target as Node)
      ) {
        setShowImageSelector(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showTableSelector, showCodeBlockSelector, showImageSelector]);

  const handleTableButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTableSelector(!showTableSelector);
    setShowCodeBlockSelector(false);
    setShowImageSelector(false);
  };

  const handleCodeBlockButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCodeBlockSelector(!showCodeBlockSelector);
    setShowTableSelector(false);
    setShowImageSelector(false);
  };

  const handleImageButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowImageSelector(!showImageSelector);
    setShowTableSelector(false);
    setShowCodeBlockSelector(false);
  };

  const handleTableSelect = (rows: number, cols: number) => {
    onFormatText('table', { rows, cols });
    setShowTableSelector(false);
  };

  const handleCodeBlockSelect = (language: string) => {
    onFormatText('codeblock', { language });
    setShowCodeBlockSelector(false);
  };

  const handleImageSelect = (url: string, alt: string, width: string, height: string) => {
    onFormatText('image', { url, alt, width, height });
    setShowImageSelector(false);
  };

  const handleTableSelectorCancel = () => {
    setShowTableSelector(false);
  };

  const handleCodeBlockSelectorCancel = () => {
    setShowCodeBlockSelector(false);
  };

  const handleImageSelectorCancel = () => {
    setShowImageSelector(false);
  };

  return (
    <div className={styles.toolbarContainer}>
      <div className={styles.toolbarGroup}>
        <Button 
          variant="ghost" 
          size="small" 
          onClick={() => onFormatText('bold')}
          title="Bold (Ctrl+B)"
          className={styles.toolbarButton}
        >
          <FaBold />
        </Button>
        
        <Button 
          variant="ghost" 
          size="small" 
          onClick={() => onFormatText('italic')}
          title="Italic (Ctrl+I)"
          className={styles.toolbarButton}
        >
          <FaItalic />
        </Button>
        
        <Button 
          variant="ghost" 
          size="small" 
          onClick={() => onFormatText('strikethrough')}
          title="Strikethrough"
          className={styles.toolbarButton}
        >
          <FaStrikethrough />
        </Button>
      </div>
      
      <div className={styles.divider} />
      
      <div className={styles.toolbarGroup}>
        <Button 
          variant="ghost" 
          size="small" 
          onClick={() => onFormatText('alignLeft')}
          title="Align Left"
          className={styles.toolbarButton}
        >
          <FaAlignLeft />
        </Button>
        
        <Button 
          variant="ghost" 
          size="small" 
          onClick={() => onFormatText('alignCenter')}
          title="Align Center"
          className={styles.toolbarButton}
        >
          <FaAlignCenter />
        </Button>
        
        <Button 
          variant="ghost" 
          size="small" 
          onClick={() => onFormatText('alignRight')}
          title="Align Right"
          className={styles.toolbarButton}
        >
          <FaAlignRight />
        </Button>
        
        <Button 
          variant="ghost" 
          size="small" 
          onClick={() => onFormatText('alignJustify')}
          title="Justify"
          className={styles.toolbarButton}
        >
          <FaAlignJustify />
        </Button>
      </div>
      
      <div className={styles.divider} />
      
      <div className={styles.toolbarGroup}>
        <Button 
          variant="ghost" 
          size="small" 
          onClick={() => onFormatText('heading')}
          title="Heading (H1)"
          className={styles.toolbarButton}
        >
          <FaHeading />
        </Button>
        
        <Button 
          variant="ghost" 
          size="small" 
          onClick={() => onFormatText('heading2')}
          title="Heading (H2)"
          className={styles.toolbarButton}
        >
          <span className={styles.headingText}>H2</span>
        </Button>
        
        <Button 
          variant="ghost" 
          size="small" 
          onClick={() => onFormatText('heading3')}
          title="Heading (H3)"
          className={styles.toolbarButton}
        >
          <span className={styles.headingText}>H3</span>
        </Button>
      </div>
      
      <div className={styles.divider} />
      
      <div className={styles.toolbarGroup}>
        <Button 
          variant="ghost" 
          size="small" 
          onClick={() => onFormatText('bullet')}
          title="Bullet List"
          className={styles.toolbarButton}
        >
          <FaListUl />
        </Button>
        
        <Button 
          variant="ghost" 
          size="small" 
          onClick={() => onFormatText('numbered')}
          title="Numbered List"
          className={styles.toolbarButton}
        >
          <FaListOl />
        </Button>

        <Button 
          variant="ghost" 
          size="small" 
          onClick={() => onFormatText('tasklist')}
          title="Task List"
          className={styles.toolbarButton}
        >
          <FaTasks />
        </Button>
        
        <Button 
          variant="ghost" 
          size="small" 
          onClick={() => onFormatText('blockquote')}
          title="Blockquote"
          className={styles.toolbarButton}
        >
          <FaQuoteRight />
        </Button>
      </div>
      
      <div className={styles.divider} />
      
      <div className={styles.toolbarGroup}>
        <Button 
          variant="ghost" 
          size="small" 
          onClick={() => onFormatText('code')}
          title="Inline Code"
          className={styles.toolbarButton}
        >
          <FaCode />
        </Button>
        
        <div ref={codeBlockButtonRef} className={styles.codeBlockButtonContainer}>
          <Button 
            variant="ghost" 
            size="small" 
            onClick={handleCodeBlockButtonClick}
            title="Code Block"
            className={styles.toolbarButton}
          >
            <FaFileCode />
          </Button>
          
          {showCodeBlockSelector && (
            <CodeBlockSelector
              ref={codeBlockSelectorRef}
              onSelect={handleCodeBlockSelect}
              onCancel={handleCodeBlockSelectorCancel}
            />
          )}
        </div>
        
        <Button 
          variant="ghost" 
          size="small" 
          onClick={() => onFormatText('link')}
          title="Link"
          className={styles.toolbarButton}
        >
          <FaLink />
        </Button>
        
        <div ref={imageButtonRef} className={styles.imageButtonContainer}>
          <Button 
            variant="ghost" 
            size="small" 
            onClick={handleImageButtonClick}
            title="Image"
            className={styles.toolbarButton}
          >
            <FaImage />
          </Button>
          
          {showImageSelector && (
            <ImageSelector
              ref={imageSelectorRef}
              onSelect={handleImageSelect}
              onCancel={handleImageSelectorCancel}
            />
          )}
        </div>
      </div>

      <div className={styles.divider} />
      
      <div className={styles.toolbarGroup}>
        <div ref={tableButtonRef} className={styles.tableButtonContainer}>
          <Button 
            variant="ghost" 
            size="small" 
            onClick={handleTableButtonClick}
            title="Table"
            className={styles.toolbarButton}
          >
            <FaTable />
          </Button>
          
          {showTableSelector && (
            <TableSelector
              ref={tableSelectorRef}
              onSelect={handleTableSelect}
              onCancel={handleTableSelectorCancel}
            />
          )}
        </div>

        <Button 
          variant="ghost" 
          size="small" 
          onClick={() => onFormatText('hr')}
          title="Horizontal Rule"
          className={styles.toolbarButton}
        >
          <FaGripLines />
        </Button>

        <Button 
          variant="ghost" 
          size="small" 
          onClick={() => onFormatText('superscript')}
          title="Superscript"
          className={styles.toolbarButton}
        >
          <FaSuperscript />
        </Button>

        <Button 
          variant="ghost" 
          size="small" 
          onClick={() => onFormatText('subscript')}
          title="Subscript"
          className={styles.toolbarButton}
        >
          <FaSubscript />
        </Button>
      </div>
    </div>
  );
};

export default MarkdownToolbar; 