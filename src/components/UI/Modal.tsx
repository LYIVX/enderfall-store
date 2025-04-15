"use client";

import React from 'react';
import styles from './Modal.module.css';
import NineSliceContainer from './NineSliceContainer';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <NineSliceContainer variant='blue' className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <NineSliceContainer className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <Button className={styles.closeButton} onClick={onClose}>&times;</Button>
        </NineSliceContainer>
        {children}
      </NineSliceContainer>
    </div>
  );
};

export default Modal; 