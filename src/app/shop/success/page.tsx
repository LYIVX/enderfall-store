"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Box from '@/components/UI/Box';
import Button from '@/components/UI/Button';
import styles from './page.module.css';
import { NineSliceContainer } from '@/components/UI';

// Define types for session data
interface PurchasedItem {
  id: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  quantity: number;
}

interface SessionData {
  items: PurchasedItem[];
  total: number;
  currency: string;
  paymentStatus: string;
}

export default function CheckoutSuccess() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams?.get('session_id') || null;

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      setError('Invalid session ID');
      return;
    }

    // Fetch the session details from our API
    const fetchSessionDetails = async () => {
      try {
        const response = await fetch(`/api/checkout/session?session_id=${sessionId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch session details');
        }
        
        const data = await response.json();
        setSessionData(data);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching session details:', err);
        setError('Failed to load purchase details');
        setIsLoading(false);
      }
    };

    fetchSessionDetails();
  }, [sessionId]);

  const handleReturnToShop = () => {
    router.push('/shop');
  };

  // Format currency display
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  return (
    <div className={styles.shopContainer}>
      <NineSliceContainer className={styles.successContainer} variant='blue'>
        <NineSliceContainer title="Payment Successful!" className={styles.successBox}>
          {isLoading ? (
            <div className={styles.loadingMessage}>
              Processing your payment...
            </div>
          ) : error ? (
            <div className={styles.errorMessage}>
              {error}
            </div>
          ) : (
            <div className={styles.successMessage}>
              <NineSliceContainer className={styles.successTitleContainer}>
                <NineSliceContainer className={styles.successTitle}>Thank you for your purchase!</NineSliceContainer>
                <p>
                  Your transaction has been completed successfully. You will receive
                  an email confirmation shortly, and your items will be applied to your
                  account immediately.
                </p>
                
              </NineSliceContainer>

              {sessionData && sessionData.items.length > 0 && (
                <NineSliceContainer className={styles.purchaseSummary}>
                  <h3>Purchase Summary</h3>
                  <ul className={styles.purchaseItemsList}>
                    {sessionData.items.map((item) => (
                      <li key={item.id} className={styles.purchaseItem}>
                        <div className={styles.itemDetails}>
                          <span className={styles.itemName}>{item.name}</span>
                          {item.quantity > 1 && (
                            <span className={styles.itemQuantity}>x{item.quantity}</span>
                          )}
                          <span className={styles.itemPrice}>
                            {formatCurrency(item.amount, item.currency)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className={styles.purchaseTotal}>
                    <span>Total:</span>
                    <span className={styles.totalAmount}>
                      {sessionData.total && sessionData.currency
                        ? formatCurrency(sessionData.total, sessionData.currency)
                        : 'N/A'}
                    </span>
                  </div>
                </NineSliceContainer>
              )}

              <Button
                variant="primary"
                nineSlice={true}
                onClick={handleReturnToShop}
                className={styles.returnButton}
              >
                Return to Shop
              </Button>
            </div>
          )}
        </NineSliceContainer>
      </NineSliceContainer>
    </div>
  );
} 