import { Stripe } from 'stripe';
import { supabase } from './supabase';

// Initialize Stripe with the secret key from environment variables
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any, // Type assertion to any to bypass type checking for now
});

// Function to get the price ID based on item ID
export function getPriceId(itemId: string): string {
  // Use the generic upgrade price as fallback for any item
  // This should only be used when the DB item doesn't have a specific price ID
  return process.env.STRIPE_PRICE_UPGRADE as string;
}

// Async function to get the price ID from Supabase
export async function getPriceIdFromSupabase(itemId: string): Promise<string | null> {
  try {
    // Query the shop_items table to get the price_id for the given item
    const { data, error } = await supabase
      .from('shop_items')
      .select('price_id')
      .eq('id', itemId)
      .single();
    
    if (error) {
      console.error('Error fetching price ID from Supabase:', error);
      return null;
    }
    
    if (data && data.price_id) {
      return data.price_id;
    }
    
    // Fallback to the generic upgrade price if no specific price ID is found
    return process.env.STRIPE_PRICE_UPGRADE as string;
  } catch (error) {
    console.error('Exception fetching price ID:', error);
    return null;
  }
} 