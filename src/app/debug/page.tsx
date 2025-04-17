"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/Auth/AuthContext';
import { Category, ShopItem } from '@/lib/supabase';

export default function DebugPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { supabase } = useAuth();

  useEffect(() => {
    async function fetchData() {
      if (!supabase) {
        console.log('Debug page: Supabase client not available yet.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      
      try {
        // Test categories fetch
        console.log("Testing categories fetch...");
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*');
          
        if (categoriesError) {
          console.error("Categories error:", categoriesError);
          setError(`Categories error: ${categoriesError.message}`);
        } else {
          console.log("Categories success:", categoriesData);
          setCategories(categoriesData || []);
        }
        
        // Test shop_items fetch
        console.log("Testing shop_items fetch...");
        const { data: itemsData, error: itemsError } = await supabase
          .from('shop_items')
          .select('*');
          
        if (itemsError) {
          console.error("Shop items error:", itemsError);
          setError((prev) => `${prev ? prev + '; ' : ''}Shop items error: ${itemsError.message}`);
        } else {
          console.log("Shop items success:", itemsData);
          setShopItems(itemsData || []);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [supabase]);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Supabase Debug Page</h1>
      
      {loading && <p>Loading data...</p>}
      
      {error && (
        <div style={{ color: 'red', padding: '1rem', border: '1px solid red', marginBottom: '1rem' }}>
          <h2>Error:</h2>
          <pre>{error}</pre>
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '2rem' }}>
        <div>
          <h2>Categories ({categories.length})</h2>
          {categories.length === 0 ? (
            <p>No categories found</p>
          ) : (
            <ul>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <strong>{cat.name}</strong> (ID: {cat.id})
                  <br />
                  Icon: {cat.icon}, Order: {cat.display_order}
                  {cat.color && <div>Color: <span style={{ 
                    display: 'inline-block', 
                    width: '20px', 
                    height: '20px', 
                    backgroundColor: cat.color,
                    marginLeft: '5px',
                    border: '1px solid #ccc',
                    verticalAlign: 'middle'
                  }}></span></div>}
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div>
          <h2>Shop Items ({shopItems.length})</h2>
          {shopItems.length === 0 ? (
            <p>No shop items found</p>
          ) : (
            <ul>
              {shopItems.map((item) => (
                <li key={item.id}>
                  <strong>{item.name}</strong> (ID: {item.id})
                  <br />
                  Category ID: {item.category_id}
                  <br />
                  Price: {item.price}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
} 