"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

// Available chat style options
export type MessageStyleOption = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export type TextSizeOption = 'x-small' | 'small' | 'medium' | 'large' | 'x-large' | 'xx-large';
export type ChatBackgroundOption = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export interface ChatPreferencesContextType {
  // Message styling
  messageStyle: MessageStyleOption;
  changeMessageStyle: (style: MessageStyleOption) => void;
  
  // Text size
  textSize: TextSizeOption;
  changeTextSize: (size: TextSizeOption) => void;
  
  // Chat background
  chatBackground: ChatBackgroundOption;
  changeChatBackground: (background: ChatBackgroundOption) => void;
  
  // Utility functions
  resetToDefaults: () => void;
  getMessageStyleClass: (isOwnMessage: boolean) => string;
  getChatBackgroundClass: () => string;
  getTextSizeClass: () => string;
}

const defaultPreferences = {
  messageStyle: 1 as MessageStyleOption,
  textSize: 'medium' as TextSizeOption,
  chatBackground: 1 as ChatBackgroundOption,
};

const ChatPreferencesContext = createContext<ChatPreferencesContextType>({
  messageStyle: defaultPreferences.messageStyle,
  changeMessageStyle: () => {},
  textSize: defaultPreferences.textSize,
  changeTextSize: () => {},
  chatBackground: defaultPreferences.chatBackground,
  changeChatBackground: () => {},
  resetToDefaults: () => {},
  getMessageStyleClass: () => '',
  getChatBackgroundClass: () => '',
  getTextSizeClass: () => '',
});

export const useChatPreferences = () => useContext(ChatPreferencesContext);

export const ChatPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messageStyle, setMessageStyle] = useState<MessageStyleOption>(defaultPreferences.messageStyle);
  const [textSize, setTextSize] = useState<TextSizeOption>(defaultPreferences.textSize);
  const [chatBackground, setChatBackground] = useState<ChatBackgroundOption>(defaultPreferences.chatBackground);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize preferences from localStorage
  useEffect(() => {
    const storedMessageStyle = localStorage.getItem('chat_message_style');
    const storedTextSize = localStorage.getItem('chat_text_size');
    const storedChatBackground = localStorage.getItem('chat_background');
    
    if (storedMessageStyle) {
      setMessageStyle(Number(storedMessageStyle) as MessageStyleOption);
    }
    
    if (storedTextSize) {
      setTextSize(storedTextSize as TextSizeOption);
    }
    
    if (storedChatBackground) {
      setChatBackground(Number(storedChatBackground) as ChatBackgroundOption);
    }
    
    setIsInitialized(true);
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    if (!isInitialized) return;
    
    localStorage.setItem('chat_message_style', messageStyle.toString());
    localStorage.setItem('chat_text_size', textSize);
    localStorage.setItem('chat_background', chatBackground.toString());
  }, [messageStyle, textSize, chatBackground, isInitialized]);

  // Change message style
  const changeMessageStyle = (style: MessageStyleOption) => {
    setMessageStyle(style);
  };

  // Change text size
  const changeTextSize = (size: TextSizeOption) => {
    setTextSize(size);
  };

  // Change chat background
  const changeChatBackground = (background: ChatBackgroundOption) => {
    setChatBackground(background);
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setMessageStyle(defaultPreferences.messageStyle);
    setTextSize(defaultPreferences.textSize);
    setChatBackground(defaultPreferences.chatBackground);
  };

  // Get CSS class for current message style
  const getMessageStyleClass = (isOwnMessage: boolean) => {
    if (isOwnMessage) {
      // For user's own messages
      switch (messageStyle) {
        case 1: return '';  // Default style
        case 2: return 'bgColorOption1';
        case 3: return 'bgColorOption2';
        case 4: return 'bgColorOption3';
        case 5: return 'bgColorOption4';
        case 6: return 'bgColorOption5';
        case 7: return 'bgColorOption6';
        case 8: return 'bgColorOption7';
        case 9: return 'bgColorOption8';
        case 10: return 'bgColorOption9';
        case 11: return 'bgColorOption10';
        default: return '';
      }
    } else {
      // For other users' messages
      switch (messageStyle) {
        case 1: return '';  // Default style
        case 2: return 'otherMessageGradient1';
        case 3: return 'otherMessageGradient2';
        case 4: return 'otherMessageGradient3';
        case 5: return 'otherMessageGradient4';
        case 6: return 'otherMessageGradient5';
        case 7: return 'otherMessageGradient6';
        case 8: return 'otherMessageGradient7';
        case 9: return 'otherMessageGradient8';
        case 10: return 'otherMessageGradient9';
        case 11: return 'otherMessageGradient10';
        default: return '';
      }
    }
  };

  // Get CSS class for current background
  const getChatBackgroundClass = () => {
    switch (chatBackground) {
      case 1: return '';  // Default background
      case 2: return 'chatBackground1';
      case 3: return 'chatBackground2';
      case 4: return 'chatBackground3';
      case 5: return 'chatBackground4';
      case 6: return 'chatBackground5';
      case 7: return 'chatBackground6';
      case 8: return 'chatBackground7';
      case 9: return 'chatBackground8';
      case 10: return 'chatBackground9';
      case 11: return 'chatBackground10';
      default: return '';
    }
  };

  // Get CSS class for text size
  const getTextSizeClass = () => {
    switch (textSize) {
      case 'x-small': return 'textSizeXSmall';
      case 'small': return 'textSizeSmall';
      case 'medium': return '';  // Default size
      case 'large': return 'textSizeLarge';
      case 'x-large': return 'textSizeXLarge';
      case 'xx-large': return 'textSizeXXLarge';
      default: return '';
    }
  };

  return (
    <ChatPreferencesContext.Provider 
      value={{ 
        messageStyle, 
        changeMessageStyle, 
        textSize, 
        changeTextSize, 
        chatBackground, 
        changeChatBackground, 
        resetToDefaults,
        getMessageStyleClass,
        getChatBackgroundClass,
        getTextSizeClass,
      }}
    >
      {children}
    </ChatPreferencesContext.Provider>
  );
};

export default ChatPreferencesContext; 