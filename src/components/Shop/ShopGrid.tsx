import React from 'react';
import { ShopItem } from '@/lib/supabase';
import RankCard from './RankCard';
import styles from './ShopGrid.module.css';

interface ShopGridProps {
  items: ShopItem[];
  onAddToCart: (item: ShopItem) => void;
  activeCategory?: string;
}

const ShopGrid: React.FC<ShopGridProps> = ({ items, onAddToCart, activeCategory }) => {
  return (
    <div className={styles.shopGrid}>
      {items.map((item) => (
        <div key={item.id} className={styles.shopGridItem}>
          <RankCard 
            rank={item} 
            onAddToCart={onAddToCart}
            category={activeCategory}
          />
        </div>
      ))}
    </div>
  );
};

export default ShopGrid; 