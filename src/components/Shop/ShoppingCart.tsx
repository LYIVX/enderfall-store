"use client";

import { useState, useEffect } from 'react';
import { ShopItem, supabase } from '@/lib/supabase';
import Box from '@/components/UI/Box';
import Button from '@/components/UI/Button';
import styles from './ShoppingCart.module.css';
import { useAuth } from '@/components/Auth/AuthContext';
import LoginModal from '@/components/Auth/LoginModal';
import { FaShoppingCart, FaShoppingBag, FaTimes } from 'react-icons/fa';
import { NineSliceContainer } from '../UI';

interface ShoppingCartProps {
  cartItems: (ShopItem & { uniqueCartId?: string })[];
  onRemoveItem: (itemId: string, uniqueCartId?: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
}

const ShoppingCart = ({
  cartItems,
  onRemoveItem,
  onClearCart,
  onCheckout,
}: ShoppingCartProps) => {
  const [totalPrice, setTotalPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const calculatedTotal = cartItems.reduce(
      (total, item) => total + item.price,
      0
    );
    setTotalPrice(calculatedTotal);
  }, [cartItems]);

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      setError('Your cart is empty');
      return;
    }

    // Check if the user is authenticated
    if (!isAuthenticated || !user) {
      // Open login modal if not authenticated
      setIsLoginModalOpen(true);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('Starting checkout with user:', user.id);
      console.log('Cart items for checkout:', JSON.stringify(cartItems, null, 2));

      // Get current session to include auth token
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      // Prepare headers with auth token if available
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      // Call the checkout API endpoint
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cartItems,
          userId: user.id,
        }),
        // Add credentials to ensure cookies are sent
        credentials: 'include',
        // Prevent caching
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Checkout error response:', errorData.error);
        setError(errorData.error || 'Something went wrong');
        setIsLoading(false);
        return;
      }

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else if (response.status === 401) {
        // Authentication error - prompt user to re-login
        console.error('Authentication error during checkout:', data.error);
        setError('Please sign in again to complete your purchase');
        setIsLoginModalOpen(true);
      } else {
        console.error('Checkout error response:', data.error);
        setError(data.error || 'Something went wrong');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Failed to initiate checkout. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <>
      <NineSliceContainer className={styles.cartSection} variant='blue'>
        <NineSliceContainer className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Shopping Cart</h2>
        </NineSliceContainer>

          <NineSliceContainer className={styles.cartBox}>
            {cartItems.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.cartIcon}>
                  <FaShoppingCart size={40} />
                </div>
                <NineSliceContainer className={styles.cartTitle}>
                  <h3 className={styles.cartTitle}>Your Cart is Empty</h3>
                  <p className={styles.cartDescription}>
                    Add items from the shop to get started
                  </p>
                </NineSliceContainer>
              </div>
            ) : (
              <div className={styles.cartContent}>
                <div className={styles.cartIcon}>
                  <FaShoppingBag size={40} />
                </div>
                <NineSliceContainer className={styles.cartTitle}>
                  <h3 className={styles.cartTitle}>Your Items</h3>
                </NineSliceContainer>
                
                <NineSliceContainer className={styles.cartItemsList}>
                  {cartItems.map((item) => (
                    <NineSliceContainer key={item.uniqueCartId || item.id} className={styles.cartItem}>
                      <div className={styles.itemDetails}>
                        <span className={styles.itemName}>{item.name}</span>
                        <span className={styles.itemPrice}>£{item.price.toFixed(2)}</span>
                      </div>
                      <Button
                        className={styles.removeButton}
                        variant="danger"
                        nineSlice={true}
                        onClick={() => {
                          console.log('Remove button clicked for item:', item.id, item.name);
                          onRemoveItem(item.id, item.uniqueCartId);
                        }}
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        <FaTimes />
                      </Button>
                    </NineSliceContainer>
                  ))}
                </NineSliceContainer>

                <NineSliceContainer className={styles.cartSummary}>
                  <div className={styles.totalLine}>
                    <span>Total:</span>
                    <span className={styles.totalPrice}>£{totalPrice.toFixed(2)}</span>
                  </div>
                  {error && <NineSliceContainer className={styles.errorMessage} variant='danger'>{error}</NineSliceContainer>}
                  {!isAuthenticated && (
                    <div className={styles.loginPrompt}>
                      You must be logged in to checkout
                    </div>
                  )}
                </NineSliceContainer>

                <NineSliceContainer className={styles.cartActions}>
                  <Button
                    variant="danger"
                    nineSlice={true}
                    onClick={onClearCart}
                    className={styles.clearButton}
                    disabled={isLoading}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="primary"
                    nineSlice={true}
                    onClick={handleCheckout}
                    className={styles.checkoutButton}
                    disabled={isLoading || cartItems.length === 0}
                  >
                    {isLoading ? 'Processing...' : (isAuthenticated ? 'Checkout' : 'Login')}
                  </Button>
                </NineSliceContainer>
              </div>
            )}
          </NineSliceContainer>
      </NineSliceContainer>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        redirectPath={typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/shop'} // Redirect back to current page after login
      />
    </>
  );
};

export default ShoppingCart; 