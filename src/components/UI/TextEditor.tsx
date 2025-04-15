"use client";

import React, { useState, useRef, useEffect } from 'react';
import Modal from './Modal';
import styles from './TextEditor.module.css';
import MarkdownToolbar from './MarkdownToolbar';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import dark from 'react-syntax-highlighter/dist/cjs/styles/prism/dark';
import { vs } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import Button from './Button';
import Toggle from './Toggle';
import TextArea from './TextArea';
import { visit } from 'unist-util-visit';

interface TextEditorProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  initialText?: string;
  onSave: (text: string) => void;
}

const TextEditor: React.FC<TextEditorProps> = ({
  isOpen,
  onClose,
  title,
  initialText = '',
  onSave,
}) => {
  const [text, setText] = useState(initialText);
  const [showMarkdownTools, setShowMarkdownTools] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper function to detect if text contains markdown
  const containsMarkdown = (text: string): boolean => {
    // Check for common markdown patterns
    const markdownPatterns = [
      /[*_]{1,2}[^*_]+[*_]{1,2}/,  // Bold or italic
      /#{1,6}\s+.+/,                // Headers
      /\[.+\]\(.+\)/,               // Links
      /!\[.+\]\(.+\)/,              // Images
      /```[^`]*```/,                // Code blocks
      />\s+.+/,                     // Blockquotes
      /- \[ \]/,                    // Task lists
      /\|\s*-+\s*\|/,               // Tables
      /^\s*-\s+.+/m,                // Unordered lists
      /^\s*\d+\.\s+.+/m,            // Ordered lists
      /~~.+~~/,                     // Strikethrough
      /`[^`]+`/,                    // Inline code
    ];

    return markdownPatterns.some(pattern => pattern.test(text));
  };

  // Update text state when initialText changes or modal is opened
  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      
      // Auto-enable markdown tools if content contains markdown
      if (initialText && containsMarkdown(initialText)) {
        setShowMarkdownTools(true);
      }
    }
  }, [initialText, isOpen]);

  // Detect dark mode
  useEffect(() => {
    // Check if dark mode is active (using CSS variables or class on body/html)
    const isDark = document.documentElement.classList.contains('dark-theme') || 
                  window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(isDark);
    
    // Listen for theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleSave = () => {
    onSave(text);
    onClose();
  };

  const toggleMarkdownTools = () => {
    setShowMarkdownTools(!showMarkdownTools);
  };

  // Custom components for ReactMarkdown
  const components = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={isDarkMode ? dark : vs}
          language={match[1]}
          PreTag="div"
          codeTagProps={{ 'data-language': match[1] }}
          customStyle={{ 
            background: 'var(--theme-tab-background)',
            color: 'var(--theme-text-primary)',
            borderRadius: 'var(--border-radius-sm)',
            padding: 'var(--spacing-md)',
            fontSize: 'var(--font-size-sm)',
            textShadow: 'none',
          }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
  };

  // Custom remark plugin to process image dimensions
  const remarkImageDimensions = () => {
    return (tree: any) => {
      if (!tree || typeof tree !== 'object') return;
      
      try {
        visit(tree, 'image', (node: any) => {
          if (!node || !node.url) return;
          
          // Extract dimensions from the URL if it contains the format
          const imageUrl = node.url;
          const dimensionMatch = imageUrl.match(/^(.*?)#(?:width=([^&]+))?(?:&height=([^&]+))?$/);
          if (dimensionMatch) {
            // Update the URL to remove dimensions
            node.url = dimensionMatch[1];
            
            // Add width and height properties - decode URL encoding first (e.g., %25 -> %)
            const width = dimensionMatch[2] ? decodeURIComponent(dimensionMatch[2]) : '';
            const height = dimensionMatch[3] ? decodeURIComponent(dimensionMatch[3]) : '';
            
            if (width || height) {
              if (!node.data) node.data = {};
              if (!node.data.hProperties) node.data.hProperties = {};
              
              // Set dimensions as attributes for the img element
              if (width) {
                node.data.hProperties.width = width;
                // If width contains px or %, use as is, otherwise add px
                const widthWithUnit = /^\d+(%|px|em|rem|vh|vw)$/.test(width) ? width : `${width}px`;
                
                // Allow oversized images if explicitly requested (e.g., width > 100%)
                if (width.includes('%') && parseInt(width, 10) > 100) {
                  // Remove max-width constraint for user-specified large widths
                  node.data.hProperties.style = `width: ${widthWithUnit};`;
                } else {
                  // For regular sizes, keep the max-width constraint
                  node.data.hProperties.style = `max-width: 100%; width: ${widthWithUnit};`;
                }
              } else {
                node.data.hProperties.style = 'max-width: 100%;';
              }
              
              if (height) {
                node.data.hProperties.height = height;
                // Only set explicit height if required
                if (height !== 'auto') {
                  const heightWithUnit = /^\d+(%|px|em|rem|vh|vw)$/.test(height) ? height : `${height}px`;
                  node.data.hProperties.style += ` height: ${heightWithUnit};`;
                }
              }
              
              // Add special class for styled images
              node.data.hProperties.className = 'markdown-image';
            }
          }
        });
      } catch (error) {
        console.error('Error in remarkImageDimensions:', error);
      }
    };
  };

  // Helper function to handle alignment of different types of content
  const applyAlignment = (text: string, alignment: string) => {
    // For headers, we need to handle them specially
    const headerMatch = text.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      const headerLevel = headerMatch[1].length;
      const headerText = headerMatch[2];
      return `<h${headerLevel} style="text-align: ${alignment};">${headerText}</h${headerLevel}>`;
    }
    
    // Regular text and other elements
    return `<div style="text-align: ${alignment};">${text}</div>`;
  };

  const handleFormatText = (formatType: string, options?: any) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = text.substring(start, end);
    let formattedText = '';
    let cursorOffset = 0;

    switch (formatType) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        cursorOffset = 2;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        cursorOffset = 1;
        break;
      case 'strikethrough':
        formattedText = `~~${selectedText}~~`;
        cursorOffset = 2;
        break;
      case 'heading':
        formattedText = `# ${selectedText}`;
        cursorOffset = 2;
        break;
      case 'heading2':
        formattedText = `## ${selectedText}`;
        cursorOffset = 3;
        break;
      case 'heading3':
        formattedText = `### ${selectedText}`;
        cursorOffset = 4;
        break;
      case 'bullet':
        formattedText = `- ${selectedText}`;
        cursorOffset = 2;
        break;
      case 'numbered':
        formattedText = `1. ${selectedText}`;
        cursorOffset = 3;
        break;
      case 'tasklist':
        formattedText = `- [ ] ${selectedText}`;
        cursorOffset = 6;
        break;
      case 'blockquote':
        formattedText = `> ${selectedText}`;
        cursorOffset = 2;
        break;
      case 'code':
        formattedText = `\`${selectedText}\``;
        cursorOffset = 1;
        break;
      case 'codeblock': {
        const language = options?.language || '';
        formattedText = `\`\`\`${language}\n${selectedText}\n\`\`\``;
        cursorOffset = language.length + 4;
        break;
      }
      case 'link':
        formattedText = `[${selectedText || 'Link text'}](url)`;
        cursorOffset = selectedText.length ? selectedText.length + 3 : 10;
        break;
      case 'image':
        // Use a URL hash parameter approach for dimensions
        const alt = options?.alt || selectedText || 'Alt text';
        const url = options?.url || 'image-url';
        const width = options?.width || '';
        const height = options?.height || '';
        
        // Build the image markdown with dimensions in the URL
        let imageUrl = url;
        
        // Add dimension attributes if provided
        if (width || height) {
          imageUrl += '#';
          if (width) imageUrl += `width=${width}`;
          if (width && height) imageUrl += '&';
          if (height) imageUrl += `height=${height}`;
        }
        
        formattedText = `![${alt}](${imageUrl})`;
        cursorOffset = 2 + alt.length; // Position cursor after the alt text
        break;
      case 'table':
        // Create a table with the specified rows and columns
        const rows = options?.rows || 3;
        const cols = options?.cols || 2;
        
        // Create header row
        let headerRow = '|';
        let separatorRow = '|';
        
        for (let i = 0; i < cols; i++) {
          headerRow += ' Header |';
          separatorRow += ' ------ |';
        }
        
        // Create data rows
        let dataRows = '';
        for (let i = 0; i < rows; i++) {
          let row = '|';
          for (let j = 0; j < cols; j++) {
            row += ' Cell |';
          }
          dataRows += row + '\n';
        }
        
        formattedText = `\n\n${headerRow}\n${separatorRow}\n${dataRows}\n`;
        
        // Position cursor at the first cell for easier editing
        cursorOffset = formattedText.indexOf("Cell");
        break;
      case 'hr':
        formattedText = `\n---\n`;
        cursorOffset = 0;
        break;
      case 'alignLeft':
        if (selectedText.includes('\n')) {
          const lines = selectedText.split('\n');
          const alignedLines = lines.map(line => {
            if (line.trim() === '') return '';
            return applyAlignment(line, 'left');
          });
          formattedText = alignedLines.join('\n');
        } else {
          formattedText = applyAlignment(selectedText, 'left');
        }
        cursorOffset = 29; // Length of opening tag
        break;
      case 'alignCenter':
        if (selectedText.includes('\n')) {
          const lines = selectedText.split('\n');
          const alignedLines = lines.map(line => {
            if (line.trim() === '') return '';
            return applyAlignment(line, 'center');
          });
          formattedText = alignedLines.join('\n');
        } else {
          formattedText = applyAlignment(selectedText, 'center');
        }
        cursorOffset = 31; // Length of opening tag
        break;
      case 'alignRight':
        if (selectedText.includes('\n')) {
          const lines = selectedText.split('\n');
          const alignedLines = lines.map(line => {
            if (line.trim() === '') return '';
            return applyAlignment(line, 'right');
          });
          formattedText = alignedLines.join('\n');
        } else {
          formattedText = applyAlignment(selectedText, 'right');
        }
        cursorOffset = 30; // Length of opening tag
        break;
      case 'alignJustify':
        if (selectedText.includes('\n')) {
          const lines = selectedText.split('\n');
          const alignedLines = lines.map(line => {
            if (line.trim() === '') return '';
            return applyAlignment(line, 'justify');
          });
          formattedText = alignedLines.join('\n');
        } else {
          formattedText = applyAlignment(selectedText, 'justify');
        }
        cursorOffset = 32; // Length of opening tag
        break;
      case 'superscript':
        formattedText = `<sup>${selectedText}</sup>`;
        cursorOffset = 5;
        break;
      case 'subscript':
        formattedText = `<sub>${selectedText}</sub>`;
        cursorOffset = 5;
        break;
      default:
        return;
    }

    const newText = text.substring(0, start) + formattedText + text.substring(end);
    setText(newText);

    // Set cursor position after formatting
    setTimeout(() => {
      textarea.focus();
      if (selectedText.length === 0) {
        textarea.selectionStart = start + cursorOffset;
        textarea.selectionEnd = start + cursorOffset;
      } else {
        textarea.selectionStart = start;
        textarea.selectionEnd = start + formattedText.length;
      }
    }, 0);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className={styles.textEditorContainer}>
        <div className={styles.toolbarToggleContainer}>
          <Toggle
            isEnabled={showMarkdownTools}
            onChange={toggleMarkdownTools}
            label="Markdown Tools"
            labelPosition="right"
            size="small"
          />
        </div>

        {showMarkdownTools && (
          <MarkdownToolbar onFormatText={handleFormatText} />
        )}

        <TextArea
          label=""
          ref={textareaRef}
          className={styles.textArea}
          value={text}
          onChange={handleTextChange}
          placeholder="Enter your text here..."
          rows={10}
          resizable={true}
        />
        
        <div className={styles.previewContainer}>
          <h3 className={styles.previewTitle}>Preview</h3>
          <div className={styles.previewBox}>
            {!text ? (
              <span className={styles.previewPlaceholder}>Preview will appear here...</span>
            ) : showMarkdownTools ? (
              <div className={styles.markdownPreview}>
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm, remarkImageDimensions()]}
                  rehypePlugins={[rehypeRaw]}
                  components={components}
                >
                  {text}
                </ReactMarkdown>
              </div>
            ) : (
              text
            )}
          </div>
        </div>
        
        <div className={styles.buttonContainer}>
          <Button 
            variant="secondary" 
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default TextEditor; 