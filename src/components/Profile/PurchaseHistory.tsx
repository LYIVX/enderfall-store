"use client";

import { useState, useEffect } from 'react';
import Box from '@/components/UI/Box';
import styles from './PurchaseHistory.module.css';

interface TransactionItem {
  id: string;
  amount: number;
  currency: string;
  quantity: number;
  rankName: string | null;
}

interface Transaction {
  id: string;
  transactionId: string;
  amount: number;
  currency: string;
  date: string;
  status: string;
  rankNames: string[]; // Array of rank names
  items: TransactionItem[];
}

const PurchaseHistory = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/user/transactions');
        
        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }
        
        const data = await response.json();
        setTransactions(data.transactions || []);
      } catch (err: any) {
        console.error('Error fetching transactions:', err);
        setError(err.message || 'An error occurred while fetching your transactions');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTransactions();
  }, []);

  // Format date to a more readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Format price with currency symbol
  const formatPrice = (price: number, currency: string) => {
    // Get currency symbol
    const currencySymbol = currency === 'gbp' ? '£' : 
                          currency === 'eur' ? '€' : 
                          currency === 'usd' ? '$' : currency.toUpperCase();
                          
    return `${currencySymbol}${price.toFixed(2)}`;
  };

  // Format status to be more user-friendly
  const formatStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded':
      case 'complete':
      case 'paid':
        return 'Completed';
      case 'requires_payment_method':
        return 'Payment Failed';
      case 'requires_action':
        return 'Action Required';
      case 'processing':
        return 'Processing';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Get status color class
  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded':
      case 'complete':
      case 'paid':
        return styles.statusSuccess;
      case 'requires_payment_method':
        return styles.statusError;
      case 'requires_action':
        return styles.statusWarning;
      case 'processing':
        return styles.statusProcessing;
      default:
        return '';
    }
  };

  // Get display name for an item
  const getItemDisplayName = (item: TransactionItem) => {
    // Use the stored rank name if available
    if (item.rankName) {
      return item.rankName;
    }
    
    // Fallback to showing the price ID
    return `Purchase (${item.id.slice(0, 10)}...)`;
  };

  // Format multiple rank names for display
  const formatRankNames = (rankNames: string[]) => {
    if (!rankNames || rankNames.length === 0) {
      return null;
    }
    
    // Always return the full list of ranks as a comma-separated list
    return rankNames.join(', ');
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading your purchases...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.historyContent}>
      {transactions.length > 0 ? (
        <div className={styles.purchasesList}>
          {transactions.map(transaction => (
            <div key={transaction.id} className={styles.purchaseItem}>
              <div className={styles.purchaseInfo}>
                {transaction.rankNames && transaction.rankNames.length > 0 ? (
                  <div className={styles.itemsList}>
                    {transaction.rankNames.map((rankName, index) => (
                      <div key={`${transaction.id}-rank-${index}`} className={styles.purchaseItemDetail}>
                        {rankName}
                      </div>
                    ))}
                  </div>
                ) : transaction.items.length > 0 ? (
                  <div className={styles.rankName}>
                    {getItemDisplayName(transaction.items[0])}
                  </div>
                ) : (
                  <div className={styles.purchaseId}>
                    Transaction ID: {transaction.transactionId.slice(0, 8)}...
                  </div>
                )}
              </div>
              <div className={styles.purchaseDetails}>
                <div className={styles.purchasePrice}>
                  {formatPrice(transaction.amount, transaction.currency)}
                </div>
                <div className={styles.purchaseDate}>
                  {formatDate(transaction.date)}
                </div>
                <div className={`${styles.purchaseStatus} ${getStatusClass(transaction.status)}`}>
                  {formatStatus(transaction.status)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.noPurchases}>
          You haven't made any purchases yet.
        </div>
      )}
    </div>
  );
};

export default PurchaseHistory; 