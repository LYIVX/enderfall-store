import React, { useEffect, useState } from 'react';
import { FaStar, FaCrown, FaBolt, FaFireAlt, FaPlus, FaMinus } from 'react-icons/fa';
import { ShopItem, ShopItemPerk } from '@/lib/supabase';
import styles from './RankCard.module.css';
import * as FaIcons from 'react-icons/fa';
import Button from '@/components/UI/Button';
import Tooltip from '@/components/UI/Tooltip';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { NineSliceContainer } from '../UI';

interface RankCardProps {
  rank: ShopItem;
  onAddToCart: (item: ShopItem) => void;
  category?: string;
  cartItems?: (ShopItem & { uniqueCartId?: string })[];
  onRemoveItem?: (itemId: string, uniqueCartId?: string) => void;
}

const RankCard: React.FC<RankCardProps> = ({ 
  rank, 
  onAddToCart, 
  category,
  cartItems = [],
  onRemoveItem,
}) => {
  const [tooltipPosition, setTooltipPosition] = useState<'right' | 'bottom'>('right');
  const supabase = createClientComponentClient();

  // Check if this item is in the cart and calculate quantity
  const itemsInCart = cartItems.filter(item => item.id === rank.id);
  const quantity = itemsInCart.length;
  const isInCart = quantity > 0;

  // Update tooltip position based on screen width
  useEffect(() => {
    const updateTooltipPosition = () => {
      setTooltipPosition(window.innerWidth < 1200 ? 'bottom' : 'right');
    };
    
    // Set initial position
    updateTooltipPosition();
    
    // Add event listener for window resize
    window.addEventListener('resize', updateTooltipPosition);
    
    // Clean up
    return () => window.removeEventListener('resize', updateTooltipPosition);
  }, []);

  // Function to get appropriate icon component from string name
  const getIconComponent = (iconName: string) => {
    const IconComponent = FaIcons[iconName as keyof typeof FaIcons] || FaStar;
    return <IconComponent />;
  };

  // Function to parse the color information from rank
  const getRankBackgroundStyle = () => {
    try {
      // Handle both string and object color formats
      if (typeof rank.color === 'string') {
        if (rank.color.startsWith('{')) {
          // Try to parse JSON color data
          const colorData = JSON.parse(rank.color);
          
          if (colorData.colors && colorData.colors.length > 0) {
            // Handle different gradient types
            if (colorData.gradientType === 'linear' && colorData.colors.length > 1) {
              // Extract the gradient angle
              const angle = colorData.gradientAngle !== undefined ? `${colorData.gradientAngle}deg` : 'to bottom right';
              const gradient = `linear-gradient(${angle}, ${colorData.colors.map((c: any) => 
                `${c.color} ${c.position}%`).join(', ')})`;
              return { background: gradient };
            } else if (colorData.gradientType === 'radial' && colorData.colors.length > 1) {
              // Get horizontal position from gradientAngle
              const horizontalPosition = colorData.gradientAngle !== undefined ? colorData.gradientAngle : 50;
              
              // Get vertical position - either use explicit value or default to 50%
              const verticalPosition = colorData.verticalPosition !== undefined ? colorData.verticalPosition : 50;
              
              const gradient = `radial-gradient(circle at ${horizontalPosition}% ${verticalPosition}%, ${colorData.colors.map((c: any) => 
                `${c.color} ${c.position}%`).join(', ')})`;
              return { background: gradient };
            } else {
              // Solid color (either no gradient type or just one color)
              return { backgroundColor: colorData.colors[0]?.color || '#4361EE' };
            }
          } else {
            // Fallback for invalid color data
            return { backgroundColor: '#4361EE' };
          }
        } else {
          // Simple color string
          return { backgroundColor: rank.color };
        }
      }
      
      // Fallback
      return { backgroundColor: '#4361EE' };
    } catch (e) {
      console.error('Error parsing rank color:', e);
      return { backgroundColor: '#4361EE' };
    }
  };

  // Handle click on the "Add to Cart" button
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    onAddToCart(rank);
  };

  // Handle removing one item from cart
  const handleDecreaseQuantity = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onRemoveItem && itemsInCart.length > 0) {
      // Remove the last added item of this type
      const lastItem = itemsInCart[itemsInCart.length - 1];
      onRemoveItem(lastItem.id, lastItem.uniqueCartId);
    }
  };

  return (
    <NineSliceContainer 
    className={styles.rankCard} 
    style={getRankBackgroundStyle()}
    variant='ghost'
    >
      {/* Status badges */}
      <div className={styles.badgeContainer}>
        {rank.is_exclusive && (
          <NineSliceContainer className={styles.exclusiveBadge} variant='warning'>
            <FaCrown /> Exclusive
          </NineSliceContainer>
        )}
        {rank.is_new && (
          <NineSliceContainer className={styles.newBadge} variant='info'>
            <FaBolt /> New
          </NineSliceContainer>
        )}
        {rank.is_popular && (
          <NineSliceContainer className={styles.popularBadge} variant='danger'>
            <FaFireAlt /> Popular
          </NineSliceContainer>
        )}
      </div>

      {/* Icon positioned in top right with overflow */}
      <NineSliceContainer className={styles.iconOverflow} variant='ghost-blur'>
        {rank.icon ? getIconComponent(rank.icon) : <FaStar />}
      </NineSliceContainer>

      {/* Card header with title and price */}
      <NineSliceContainer className={styles.cardHeader} variant='ghost-blur'>
        <h3 className={styles.rankTitle}>{rank.name}</h3>
        <NineSliceContainer className={styles.priceTag} variant='ghost-blur'>
          £{rank.price.toFixed(2)}
        </NineSliceContainer>
      </NineSliceContainer>

      {/* Card description */}
      <NineSliceContainer className={styles.rankDescription} variant='ghost-blur'>
        {rank.description.length > 120 
          ? `${rank.description.substring(0, 120)}...` 
          : rank.description}
      </NineSliceContainer>

      {/* Perks section */}
      {rank.perks && rank.perks.length > 0 && (
        <NineSliceContainer className={styles.perksSection} variant='ghost-blur'>
          <h4 className={styles.perksTitle}>Perks & Benefits</h4>
          <div className={styles.perksList}>
            {rank.perks.map((perk: ShopItemPerk, index: number) => (
              <Tooltip 
                key={index} 
                content={perk.tooltip}
                position={tooltipPosition}
              >
                <NineSliceContainer className={styles.perkItem} variant='ghost-blur'>
                  <span className={styles.perkIcon}>
                    {getIconComponent(perk.icon)}
                  </span>
                  <span className={styles.perkName}>{perk.name}</span>
                </NineSliceContainer>
              </Tooltip>
            ))}
          </div>
        </NineSliceContainer>
      )}

      {/* Card footer with CTA */}
      <div className={styles.cardFooter}>
        {!isInCart ? (
          <Button 
            className={styles.addToCartButton}
            onClick={handleAddToCart}
            variant="primary"
            nineSlice={true}
          >
            Add to Cart
          </Button>
        ) : (
          <div className={styles.quantityControls}>
            <Button 
              className={styles.quantityButton}
              onClick={handleDecreaseQuantity}
              variant="danger"
              aria-label="Decrease quantity"
            >
              <FaMinus />
            </Button>
            <span className={styles.quantityDisplay}>{quantity}</span>
            <Button 
              className={styles.quantityButton}
              onClick={handleAddToCart}
              variant="primary"
              aria-label="Increase quantity"
            >
              <FaPlus />
            </Button>
          </div>
        )}
      </div>
    </NineSliceContainer>
  );
};

export default RankCard; 