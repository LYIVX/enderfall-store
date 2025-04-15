"use client";

import React, { useState, useEffect } from 'react';
import Box from '@/components/UI/Box';
import Button from '@/components/UI/Button';
import styles from './page.module.css';
import { FaChevronDown, FaChevronUp, FaCopy, FaDiscord, FaCheck, FaCheckCircle } from 'react-icons/fa';

interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [notification, setNotification] = useState<{message: string} | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setNotification({ message: "Email copied to clipboard!" });
    
    // Auto-hide notification after 2 seconds
    setTimeout(() => {
      setNotification(null);
    }, 2000);
  };
  
  // Close notification when clicked
  const handleCloseNotification = () => {
    setNotification(null);
  };

  const faqData: FAQItem[] = [
    {
      question: "What is Enderfall?",
      answer: "Enderfall is a premium Minecraft server offering unique gameplay experiences including custom survival worlds, mini-games, and exclusive player events. Our server features high-performance infrastructure, custom-built plugins, and an active community of players from around the world."
    },
    {
      question: "How do I create an account?",
      answer: "You can create an account by clicking the 'Login' button in the navigation bar at the top of our website. We offer multiple sign-in options for your convenience, including email registration, Google authentication, and Discord integration."
    },
    {
      question: "What are the system requirements?",
      answer: "Our platform is web-based and works on most modern browsers. For the best experience, we recommend using Chrome, Firefox, or Edge with JavaScript enabled."
    },
    {
      question: "How do I reset my password?",
      answer: "Click the 'Forgot Password' link on the login page. Enter your email address, and we'll send you instructions to reset your password."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We use Stripe as our payment processor, which accepts all major credit/debit cards (Visa, Mastercard, American Express, Discover), Apple Pay, Google Pay, and various local payment methods. All transactions are secured with industry-standard encryption for your safety."
    },
    {
      question: "How do I contact support?",
      answer: (
        <>
          <p>You can reach our support team via email or join our Discord community for real-time assistance. Our team typically responds within 24 hours.</p>
          <div className={styles.buttonGroup}>
            <Button 
              variant="primary" 
              size="small"
              onClick={() => copyToClipboard("enderfall@gmail.com")}
            >
              {notification ? <><FaCheck /> Copied!</> : <><FaCopy /> Copy Email</>}
            </Button>
            <Button 
              variant="secondary" 
              size="small"
              onClick={() => window.open("https://discord.gg/ellrijord", "_blank")}
            >
              <FaDiscord /> Join Discord
            </Button>
          </div>
        </>
      )
    },
    {
      question: "What is your refund policy?",
      answer: "We do not offer refunds for any purchases made on the Enderfall platform. All sales are final. Please carefully consider your purchase before completing the transaction."
    },
    {
      question: "How do I report a bug?",
      answer: "Bugs can be reported either by emailing us at enderfall@gmail.com with detailed information about the issue, or by using the dedicated bug-report channel in our Discord community. Please include as much information as possible, such as screenshots and steps to reproduce the bug."
    }
  ];

  return (
    <Box>
      <div className={styles.container}>
        <h1 className={styles.title}>Frequently Asked Questions</h1>
        <div className={styles.content}>
          {faqData.map((faq, index) => (
            <div 
              key={index} 
              className={styles.faqItem} 
              data-open={openIndex === index ? "true" : "false"}
            >
              <button
                className={styles.questionButton}
                onClick={() => toggleFAQ(index)}
              >
                <span>{faq.question}</span>
                <FaChevronDown />
              </button>
              <div className={styles.answer}>
                {faq.answer}
              </div>
            </div>
          ))}
        </div>
        
        {notification && (
          <div className={styles.notification} onClick={handleCloseNotification}>
            <FaCheckCircle />
            <p>{notification.message}</p>
          </div>
        )}
      </div>
    </Box>
  );
};

export default FAQ; 