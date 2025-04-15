"use client";

import React, { useState } from 'react';
import TextEditor from './TextEditor';

const TextEditorExample: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [savedText, setSavedText] = useState('');

  const openEditor = () => {
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
  };

  const handleSave = (text: string) => {
    setSavedText(text);
    console.log('Saved text:', text);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Text Editor Example</h1>
      
      <button onClick={openEditor}>
        Open Text Editor
      </button>
      
      {savedText && (
        <div style={{ marginTop: '20px' }}>
          <h3>Saved Text:</h3>
          <div style={{ 
            padding: '10px', 
            border: '1px solid #ddd', 
            borderRadius: '4px',
            whiteSpace: 'pre-wrap'
          }}>
            {savedText}
          </div>
        </div>
      )}

      <TextEditor
        isOpen={isEditorOpen}
        onClose={closeEditor}
        title="Edit Text"
        initialText={savedText}
        onSave={handleSave}
      />
    </div>
  );
};

export default TextEditorExample; 