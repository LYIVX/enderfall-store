"use client";

import React, { useState, useEffect } from 'react';
import Button from '../UI/Button';
import Modal from '../UI/Modal';
import { FaGoogle, FaCheckCircle } from 'react-icons/fa';
import { useAuth } from '../Auth/AuthContext';
import styles from './LinkAccountModal.module.css';

interface LinkGoogleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const LinkGoogleModal: React.FC<LinkGoogleModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { loginWithGoogle, error: authError } = useAuth();
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

  const handleLinkGoogle = async () => {
    setError(null);
    setLoading(true);
    
    try {
      console.log('Starting Google account linking flow');
      // Use the same loginWithGoogle function, but with link=google parameter
      // that will signal to the callback handler that this is a linking flow
      await loginWithGoogle('/profile?link=google');
      
      // Note: The actual linking will happen in the callback handler
      // This is just to initiate the OAuth flow
    } catch (err: any) {
      console.error('Error linking Google account:', err);
      setError(err.message || 'Failed to link Google account');
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Link Google Account">
      <div className={styles.modalContent}>
        {success ? (
          <div className={styles.successMessage}>
            <FaCheckCircle className={styles.successIcon} />
            <p>Google account successfully linked!</p>
          </div>
        ) : (
          <>
            <p className={styles.modalText}>
              Linking your Google account gives you an additional login option and helps secure your Enderfall account.
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
                onClick={handleLinkGoogle}
                disabled={loading}
              >
                {loading ? 'Connecting...' : 'Link Google Account'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default LinkGoogleModal; 