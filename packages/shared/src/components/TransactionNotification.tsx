"use client";

import React, { useEffect, useState } from 'react';

export interface TransactionNotificationProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  txHash?: string;
  explorerUrl?: string;
  onDismiss?: () => void;
  autoDismiss?: boolean;
  autoDismissTime?: number;
}

export const TransactionNotification: React.FC<TransactionNotificationProps> = ({
  type,
  title,
  message,
  txHash,
  explorerUrl,
  onDismiss,
  autoDismiss = true,
  autoDismissTime = 10000,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (autoDismiss) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onDismiss) onDismiss();
      }, autoDismissTime);
      
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, autoDismissTime, onDismiss]);

  const handleDismiss = () => {
    setVisible(false);
    if (onDismiss) onDismiss();
  };

  if (!visible) return null;

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return '#d4edda';
      case 'error': return '#f8d7da';
      case 'warning': return '#fff3cd';
      case 'info': return '#d1ecf1';
      default: return '#f8f9fa';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success': return '#155724';
      case 'error': return '#721c24';
      case 'warning': return '#856404';
      case 'info': return '#0c5460';
      default: return '#212529';
    }
  };

  return (
    <div style={{
      padding: '16px',
      backgroundColor: getBackgroundColor(),
      color: getTextColor(),
      borderRadius: '4px',
      marginBottom: '16px',
      position: 'relative',
      animation: 'fadeIn 0.3s ease-in-out',
    }}>
      <h4 style={{ marginTop: 0 }}>{title}</h4>
      <p>{message}</p>
      
      {txHash && explorerUrl && (
        <p>
          Transaction Hash:{' '}
          <a 
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: getTextColor() }}
          >
            {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
          </a>
        </p>
      )}
      
      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: getTextColor(),
          textDecoration: 'underline',
          cursor: 'pointer',
          padding: '0',
          position: 'absolute',
          top: '12px',
          right: '12px',
        }}
      >
        Dismiss
      </button>
    </div>
  );
};

export default TransactionNotification;
