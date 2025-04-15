"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/Auth/AuthContext';
import Modal from '@/components/UI/Modal';
import Button from '@/components/UI/Button';
import { FaCube, FaCheck, FaTimes } from 'react-icons/fa';
import styles from './LinkAccountModal.module.css';

interface LinkMinecraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (username: string) => void;
}

const LinkMinecraftModal: React.FC<LinkMinecraftModalProps> = ({ 
  isOpen, 
  onClose,
  onSuccess
}) => {
  const { updateMinecraftUsername, validateMinecraftUsername, loading, error, clearError } = useAuth();
  const [username, setUsername] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{valid: boolean, message: string} | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setValidationResult(null);
      setShowSuccess(false);
      clearError();
    }
  }, [isOpen, clearError]);

  const handleValidate = async () => {
    if (!username.trim()) return;
    
    setIsValidating(true);
    setValidationResult(null);
    
    try {
      const result = await validateMinecraftUsername(username);
      setValidationResult(result);
    } catch (err) {
      console.error('Error validating username:', err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || loading) return;
    
    try {
      const profile = await updateMinecraftUsername(username);
      
      if (profile) {
        setShowSuccess(true);
        if (onSuccess) {
          onSuccess(username);
        }
        
        // Auto close after success
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (err) {
      console.error('Error updating username:', err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Link Minecraft Account">
      <div className={styles.modalContent}>
        {showSuccess ? (
          <div className={styles.successMessage}>
            <FaCheck className={styles.successIcon} />
            <p>Minecraft account linked successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className={styles.modalText}>
              Enter your Minecraft username to link it to your Enderfall account.
              This will allow us to verify your identity in-game.
            </p>
            
            <div className={styles.inputGroup}>
              <label htmlFor="minecraft-username">Minecraft Username</label>
              <div className={styles.inputWrapper}>
                <input
                  id="minecraft-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your Minecraft username"
                  className={styles.input}
                />
                <Button 
                  variant="secondary"
                  onClick={handleValidate}
                  disabled={isValidating || !username.trim()}
                  type="button"
                >
                  Validate
                </Button>
              </div>
              
              {validationResult && (
                <div className={`${styles.validationResult} ${validationResult.valid ? styles.valid : styles.invalid}`}>
                  {validationResult.valid ? (
                    <FaCheck className={styles.validIcon} />
                  ) : (
                    <FaTimes className={styles.invalidIcon} />
                  )}
                  <span>{validationResult.message}</span>
                </div>
              )}
              
              {error && (
                <div className={styles.errorMessage}>
                  {error}
                </div>
              )}
            </div>
            
            <div className={styles.buttonGroup}>
              <Button 
                variant="secondary"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                variant="primary"
                type="submit"
                disabled={loading || !username.trim() || (validationResult ? !validationResult.valid : false)}
              >
                {loading ? 'Linking...' : 'Link Account'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default LinkMinecraftModal; 