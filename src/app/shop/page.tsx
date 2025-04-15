"use client";

import { Metadata } from 'next';
import { useState, useEffect } from 'react';
import { ShopItem, Category } from '@/lib/supabase';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import RankCard from '@/components/Shop/RankCard';
import ShoppingCart from '@/components/Shop/ShoppingCart';
import MinecraftAvatar from '@/components/UI/MinecraftAvatar';
import PaymentGoal from '@/components/UI/PaymentGoal';
import CollapsibleSidebar from '@/components/UI/CollapsibleSidebar';
import Tabs from '@/components/UI/Tabs';
import styles from './page.module.css';

// Metadata needs to be in a separate file for client components in Next.js 14
// This is just for demonstration purposes
const metadata = {
  title: 'Shop - Enderfall',
  description: 'Purchase ranks and upgrades for the Enderfall Minecraft server',
};

export default function Shop() {
  // Use extended type for cart items to include uniqueCartId
  type CartItem = ShopItem & { uniqueCartId?: string };
  
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState('');
  const [shopItems, setShopItems] = useState<Record<string, ShopItem[]>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();
  
  // Fetch shop items and categories from Supabase
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      
      // Fetch categories
      console.log("Fetching categories from Supabase...");
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('display_order');
        
      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
      } else if (categoriesData.length > 0) {
        console.log("Categories loaded:", categoriesData);
        setCategories(categoriesData);
        // Set the first category as active by default
        setActiveTab(categoriesData[0].id);
      } else {
        console.log("No categories found in the database");
      }
      
      // Fetch shop items
      console.log("Fetching shop items from Supabase...");
      const { data: itemsData, error: itemsError } = await supabase
        .from('shop_items')
        .select('*')
        .order('display_order', { ascending: true }); // Order by display_order
        
      if (itemsError) {
        console.error('Error fetching shop items:', itemsError);
      } else if (itemsData.length > 0) {
        console.log("Shop items loaded:", itemsData);
        // Group items by category_id
        const groupedItems: Record<string, ShopItem[]> = {};
        
        itemsData.forEach(item => {
          if (!groupedItems[item.category_id]) {
            groupedItems[item.category_id] = [];
          }
          groupedItems[item.category_id].push(item);
        });
        
        // Sort each category's items by display_order
        Object.keys(groupedItems).forEach(categoryId => {
          groupedItems[categoryId].sort((a, b) => {
            // First sort by is_upgrade (upgrades first)
            if (a.is_upgrade && !b.is_upgrade) return -1;
            if (!a.is_upgrade && b.is_upgrade) return 1;
            
            // Then sort by display_order for items with the same upgrade status
            const orderA = a.display_order !== undefined ? a.display_order : Infinity;
            const orderB = b.display_order !== undefined ? b.display_order : Infinity;
            return orderA - orderB;
          });
        });
        
        console.log("Grouped and sorted items by category:", groupedItems);
        setShopItems(groupedItems);
      } else {
        console.log("No shop items found in the database");
      }
      
      setIsLoading(false);
    }
    
    fetchData();
  }, [supabase]);

  const handleAddToCart = (item: ShopItem) => {
    // Add the item to the cart with a unique ID
    const cartItem: CartItem = { 
      ...item, 
      uniqueCartId: `${item.id}-${Date.now()}` 
    };
    setCartItems([...cartItems, cartItem]);
  };

  const handleRemoveFromCart = (itemId: string, uniqueCartId?: string) => {
    console.log('Removing item with ID:', itemId, 'uniqueCartId:', uniqueCartId);
    
    // If we have a uniqueCartId, remove just that specific item
    if (uniqueCartId) {
      setCartItems(cartItems.filter(item => 
        (item as any).uniqueCartId !== uniqueCartId
      ));
    } else {
      // Legacy behavior - remove all with this item.id (this should not be used anymore)
      setCartItems(cartItems.filter(item => item.id !== itemId));
    }
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // Map category IDs to friendly category types for RankCard
  const getCategoryType = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return 'serverwide';
    
    const name = category.name.toLowerCase();
    if (name.includes('serverwide')) return 'serverwide';
    if (name.includes('towny')) return 'towny';
    if (name.includes('beta')) return 'beta';
    return 'serverwide'; // Default
  };

  // Create tabs based on fetched categories
  const tabs = categories.map(category => ({
    id: category.id,
    label: category.name,
    content: (
      <div className={styles.itemsGrid}>
        {shopItems[category.id]?.map((item) => (
          <RankCard
            key={item.id}
            rank={item}
            onAddToCart={() => handleAddToCart(item)}
            category={getCategoryType(category.id)}
            cartItems={cartItems}
            onRemoveItem={handleRemoveFromCart}
          />
        )) || (
          <div className={styles.emptyState}>No items found in this category</div>
        )}
      </div>
    ),
  }));

  if (isLoading) {
    return <div className={styles.loading}>Loading shop items...</div>;
  }

  return (
    <div className={styles.shopContainer}>
      <div className={styles.shopContent}>
        <Tabs 
          tabs={tabs} 
          activeTab={activeTab} 
          onChange={(tabId) => setActiveTab(tabId)} 
          showContentBackground={true}
          showContainerBackground={true}
        />
      </div>
      
      <CollapsibleSidebar cartItemCount={cartItems.length}>
        <MinecraftAvatar />
        <ShoppingCart
          cartItems={cartItems}
          onRemoveItem={handleRemoveFromCart}
          onClearCart={handleClearCart}
          onCheckout={() => {}}
        />
        <PaymentGoal />
      </CollapsibleSidebar>
    </div>
  );
} 