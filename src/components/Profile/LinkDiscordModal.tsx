"use client";

import React, { useState, useEffect } from 'react';
import Button from '../UI/Button';
import Modal from '../UI/Modal';
import { FaDiscord, FaCheckCircle } from 'react-icons/fa';
import { useAuth } from '../Auth/AuthContext';
import styles from './LinkAccountModal.module.css';

interface LinkDiscordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const LinkDiscordModal: React.FC<LinkDiscordModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { loginWithDiscord, error: authError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Reset state when modal opens or closes
    if (!isOpen) {
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  // Update local error state when auth context error changes
  useEffect(() => {
    if (authError) {
      setError(authError);
      setLoading(false);
    }
  }, [authError]);

  const handleClose = () => {
    if (success && onSuccess) {
      onSuccess();
    }
    onClose();
  };

  const handleLinkDiscord = async () => {
    setError(null);
    setLoading(true);
    
    try {
      console.log('Starting Discord account linking flow');
      // Use the same loginWithDiscord function, but with a special redirect path
      // that will handle the account linking process
      await loginWithDiscord('/profile?link=discord');
      
      // Note: The actual linking will happen in the callback handler
      // This is just to initiate the OAuth flow
    } catch (err: any) {
      console.error('Error linking Discord account:', err);
      setError(err.message || 'Failed to link Discord account');
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Link Discord Account">
      <div className={styles.modalContent}>
        {success ? (
          <div className={styles.successMessage}>
            <FaCheckCircle className={styles.successIcon} />
            <p>Discord account successfully linked!</p>
          </div>
        ) : (
          <>
            <p className={styles.modalText}>
              Linking your Discord account will allow you to participate in exclusive community events and receive special roles on our Discord server.
            </p>
            
            {error && (
              <div className={styles.errorMessage}>
                {error}
              </div>
            )}
            
            <div className={styles.buttonGroup}>
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleLinkDiscord}
                disabled={loading}
              >
                {loading ? 'Connecting...' : 'Link Discord Account'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default LinkDiscordModal; 