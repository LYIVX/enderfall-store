"use client";

import { useState, useEffect, ReactNode, ChangeEvent, KeyboardEvent } from "react"; 
import Box from "@/components/UI/Box";
import Button from "@/components/UI/Button"; 
import styles from './LoungeChat.module.css';

// Simplified components for this page
interface CardProps {
  children: ReactNode;
  className?: string;
  [key: string]: any;
}

const Card = ({children, className, ...props}: CardProps) => (
  <div className={`bg-white rounded-lg shadow-md ${className || ''}`} {...props}>
    {children}
  </div>
);

const CardContent = ({children, className, ...props}: CardProps) => (
  <div className={`p-4 ${className || ''}`} {...props}>
    {children}
  </div>
);

interface InputProps {
  className?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  [key: string]: any;
}

const Input = ({className, ...props}: InputProps) => (
  <input 
    className={`border rounded-md p-2 w-full ${className || ''}`}
    {...props}
  />
);

interface IconProps {
  size: number;
}

const Bot = ({size}: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="10" x="3" y="11" rx="2" />
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" />
    <line x1="8" x2="8" y1="16" y2="16" />
    <line x1="16" x2="16" y1="16" y2="16" />
  </svg>
);

const Send = ({size}: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

const User = ({size}: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 0 0-16 0" />
  </svg>
);

// Simple alternative to framer-motion
interface MotionProps {
  children: ReactNode;
  className?: string;
  initial?: {[key: string]: any};
  animate?: {[key: string]: any};
  transition?: {[key: string]: any};
}

const MotionDiv = ({children, className, ...props}: MotionProps) => (
  <div className={className || ''}>
    {children}
  </div>
);

interface MessageType {
  sender: string;
  text: string;
  timestamp: Date;
}

type ThemeType = "pastel" | "neon" | "dark";

interface ThemeStyles {
  [key: string]: {
    user: string;
    bot: string;
  };
}

export default function LoungeChat() { 
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState(""); 
  const [isTyping, setIsTyping] = useState(false); 
  const [theme, setTheme] = useState<ThemeType>("pastel"); 
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  const getBubbleStyle = (sender: string) => {
    if (sender === 'user') {
      switch(theme) {
        case 'neon': return styles.neonUserBubble;
        case 'dark': return styles.darkUserBubble;
        default: return styles.pastelUserBubble;
      }
    } else {
      switch(theme) {
        case 'neon': return styles.neonBotBubble;
        case 'dark': return styles.darkBotBubble;
        default: return styles.pastelBotBubble;
      }
    }
  };

useEffect(() => { 
  const storedMessages = localStorage.getItem("loungechat-messages"); 
  const storedAvatar = localStorage.getItem("loungechat-avatar"); 
  if (storedMessages) setMessages(JSON.parse(storedMessages)); 
  else setMessages([{ sender: "bot", text: "Welcome to LoungeChat. Ask me anything!", timestamp: new Date() }]); 
  if (storedAvatar) setUserAvatar(storedAvatar); 
}, []);

useEffect(() => { 
  localStorage.setItem("loungechat-messages", JSON.stringify(messages)); 
}, [messages]);

useEffect(() => { 
  if (userAvatar) { 
    localStorage.setItem("loungechat-avatar", userAvatar); 
  } 
}, [userAvatar]);

const sendMessage = () => { 
  if (!input.trim()) return; 
  
  const userMsg: MessageType = { 
    sender: "user", 
    text: input, 
    timestamp: new Date() 
  }; 
  
  setMessages((prev) => [...prev, userMsg]); 
  setInput(""); 
  setIsTyping(true); 
  playSendSound();

  setTimeout(() => {
    const botReply: MessageType = {
      sender: "bot",
      text: `Echo: ${input}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, botReply]);
    setIsTyping(false);
    playReceiveSound();
  }, 1000);
};

const playSendSound = () => { 
  const audio = new Audio("/sounds/send.mp3"); 
  audio.play().catch(err => console.error("Failed to play sound:", err)); 
};

const playReceiveSound = () => { 
  const audio = new Audio("/sounds/receive.mp3"); 
  audio.play().catch(err => console.error("Failed to play sound:", err)); 
};

const formatTime = (date: Date) => { 
  return new Date(date).toLocaleTimeString([], { 
    hour: "2-digit", 
    minute: "2-digit", 
  }); 
};

const handleThemeChange = (e: ChangeEvent<HTMLSelectElement>) => setTheme(e.target.value as ThemeType);

const handleAvatarUpload = (e: ChangeEvent<HTMLInputElement>) => { 
  const file = e.target.files?.[0]; 
  if (file) { 
    const reader = new FileReader(); 
    reader.onloadend = () => { 
      const result = reader.result;
      if (typeof result === 'string') {
        setUserAvatar(result);
      }
    }; 
    reader.readAsDataURL(file); 
  } 
};

return ( 
<div className={styles.loungeContainer}> 
  <div className={styles.loungeContent}>
    <h1 className={styles.title}>LoungeChat</h1>

    <div className={styles.controlsContainer}>
      <select
        onChange={handleThemeChange}
        value={theme}
        className={styles.themeSelector}
      >
        <option value="pastel">Pastel</option>
        <option value="neon">Neon</option>
        <option value="dark">Dark</option>
      </select>
      <input
        type="file"
        accept="image/*"
        onChange={handleAvatarUpload}
        className={styles.avatarInput}
      />
    </div>

    <div className={styles.chatCard}>
      <div className={styles.chatContent}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`${styles.messageContainer} ${msg.sender === 'user' ? styles.userMessage : styles.botMessage}`}
          >
            {msg.sender === "bot" && (
              <div className={`${styles.avatarContainer} ${styles.botAvatar}`}>
                <Bot size={18} />
              </div>
            )}
            <div>
              <div className={`${styles.messageBubble} ${getBubbleStyle(msg.sender)}`}>
                {msg.text}
              </div>
              <div className={styles.timestamp}>
                {formatTime(msg.timestamp)}
              </div>
            </div>
            {msg.sender === "user" && (
              userAvatar ? (
                <div className={styles.avatarContainer}>
                  <img
                    src={userAvatar}
                    alt="User Avatar"
                    className={styles.userImage}
                  />
                </div>
              ) : (
                <div className={`${styles.avatarContainer} ${styles.userAvatar}`}>
                  <User size={18} />
                </div>
              )
            )}
          </div>
        ))}
        {isTyping && (
          <div className={styles.typingIndicator}>
            <div className={`${styles.avatarContainer} ${styles.botAvatar}`}>
              <Bot size={18} />
            </div>
            <div className={styles.typingBubble}>
              Typing...
            </div>
          </div>
        )}
      </div>
    </div>
    <div className={styles.inputContainer}>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your message..."
        className={styles.messageInput}
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
      />
      <Button onClick={sendMessage} className={styles.sendButton}>
        <Send size={18} />
      </Button>
    </div>
  </div>
</div>
); }