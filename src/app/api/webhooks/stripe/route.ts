import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Create a Supabase client with the service role key for admin privileges
const createServiceRoleClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export async function POST(req: NextRequest) {
  console.log('Webhook received');
  const body = await req.text();
  const signature = headers().get('stripe-signature') as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
    console.log('Webhook verified, event type:', event.type);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle specific events
  if (event.type === 'checkout.session.completed') {
    console.log('Processing checkout.session.completed event');
    const session = event.data.object;
    try {
      await handleCompletedCheckout(session);
      console.log('Checkout handling completed successfully');
    } catch (error) {
      console.error('Error in handleCompletedCheckout:', error);
      // Continue to return success to Stripe so they don't retry
    }
  }

  // Return success response
  return NextResponse.json({ received: true });
}

// Helper function to determine rank based on price ID
const getRankFromPriceId = (priceId: string): string | null => {
  // Map price IDs to corresponding ranks
  const rankMap: Record<string, string> = {
    [process.env.STRIPE_PRICE_SHADOW_ENCHANTER as string]: 'shadow-enchanter',
    [process.env.STRIPE_PRICE_VOID_WALKER as string]: 'void-walker',
    [process.env.STRIPE_PRICE_ETHEREAL_WARDEN as string]: 'ethereal-warden',
    [process.env.STRIPE_PRICE_ASTRAL_GUARDIAN as string]: 'astral-guardian',
    [process.env.STRIPE_PRICE_CITIZEN as string]: 'citizen',
    [process.env.STRIPE_PRICE_MERCHANT as string]: 'merchant',
    [process.env.STRIPE_PRICE_COUNCILOR as string]: 'councilor',
    [process.env.STRIPE_PRICE_MAYOR as string]: 'mayor',
    [process.env.STRIPE_PRICE_GOVERNOR as string]: 'governor',
    [process.env.STRIPE_PRICE_NOBLE as string]: 'noble',
    [process.env.STRIPE_PRICE_DUKE as string]: 'duke',
    [process.env.STRIPE_PRICE_KING as string]: 'king',
    [process.env.STRIPE_PRICE_DIVINE as string]: 'divine-ruler',
    [process.env.STRIPE_PRICE_BETA as string]: 'beta',
    // Add upgrade price IDs if needed for special handling
  };

  return rankMap[priceId] || null;
};

// Helper function to update user profile with purchased ranks
const updateUserRanks = async (supabase: any, userId: string, priceIds: string[]) => {
  try {
    // First get current user profile
    const { data: userProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching user profile:', fetchError);
      return;
    }

    // Determine new ranks to add based on purchased items
    const newRanks = priceIds
      .map(priceId => getRankFromPriceId(priceId))
      .filter(rank => rank !== null) as string[];

    if (newRanks.length === 0) {
      console.log('No valid ranks to add for user');
      return;
    }

    // Update user profile with new ranks
    const currentRanks = userProfile.ranks || [];
    const updatedRanks = Array.from(new Set([...currentRanks, ...newRanks])); // Remove duplicates using Array.from
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        ranks: updatedRanks,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user ranks:', updateError);
      return;
    }

    console.log(`Successfully updated ranks for user ${userId}:`, updatedRanks);
  } catch (error) {
    console.error('Error in updateUserRanks:', error);
  }
};

async function handleCompletedCheckout(session: any) {
  try {
    console.log('Processing completed checkout with full session data:');
    console.log(JSON.stringify(session, null, 2));
    
    // Log metadata specifically for debugging
    console.log('Session metadata:', JSON.stringify(session.metadata, null, 2));
    
    // Connect to Supabase with service role for admin privileges
    // This is necessary for webhook operations that run outside of user context
    const supabase = createServiceRoleClient();
    
    // Get user ID from metadata - with enhanced logging and error handling
    const userId = session.metadata?.userId;
    const userEmail = session.customer_details?.email || session.metadata?.userEmail;
    
    console.log('User ID from metadata:', userId);
    console.log('User email:', userEmail);
    
    if (!userId) {
      console.warn('⚠️ No userId found in metadata! This is likely the issue.');
    }
    
    // If there's no userId but there is an email, we can try to find the user by email
    let finalUserId = userId;
    if (!userId && userEmail) {
      try {
        console.log('Attempting to find user by email:', userEmail);
        // Look up the user by email
        const { data: users, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', userEmail)
          .limit(1);
        
        if (error) {
          console.error('Error finding user by email:', error);
        }
          
        if (users && users.length > 0) {
          finalUserId = users[0].id;
          console.log(`Found user ID ${finalUserId} by email ${userEmail}`);
        } else {
          console.log(`No user found with email ${userEmail}`);
        }
      } catch (error) {
        console.error('Error finding user by email:', error);
      }
    }
    
    if (!finalUserId) {
      console.warn('No user ID available, will save purchase without user association');
      // We'll continue and just save the transaction info without a user ID
      // This way you can manually associate it later if needed
    }

    // Parse metadata for cart items if available
    let metadataItems = [];
    try {
      if (session.metadata?.cartItems) {
        metadataItems = JSON.parse(session.metadata.cartItems);
        console.log('Cart items from metadata:', metadataItems);
      }
    } catch (err) {
      console.error('Error parsing cartItems from metadata:', err);
    }

    // Get line items to know what was purchased
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    
    // Extract price IDs for permission updates
    const priceIds = lineItems.data
      .map(item => item.price?.id)
      .filter(id => id) as string[];
    
    console.log('Processing checkout for items:', JSON.stringify(lineItems.data, null, 2));
    
    // First check if this transaction has already been processed
    const { data: existingPurchases, error: checkError } = await supabase
      .from('user_purchases')
      .select('id')
      .eq('transaction_id', session.id)
      .limit(1);
    
    if (checkError) {
      console.error('Error checking for existing purchases:', checkError);
    }
      
    if (existingPurchases && existingPurchases.length > 0) {
      console.log('This transaction has already been processed, skipping');
      return;
    }
    
    // Save purchases to a standalone table that doesn't require user_id
    try {
      const transactionData = {
        transaction_id: session.id,
        amount: session.amount_total / 100,
        currency: session.currency,
        email: userEmail,
        user_id: finalUserId || null,
        payment_status: session.payment_status,
        created_at: new Date().toISOString(),
        items: lineItems.data.map(item => ({
          price_id: item.price?.id,
          amount: item.amount_total / 100,
          currency: item.currency,
          quantity: item.quantity,
          rank_name: getRankFromPriceId(item.price?.id || '')
        })),
        metadata: session.metadata || {}  // Store the original metadata for reference
      };
      
      console.log('Saving transaction record:', transactionData);
      
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select();
        
      if (txError) {
        console.error('Error saving to transactions table:', txError);
      } else {
        console.log('Successfully saved transaction record:', txData);
      }
    } catch (error) {
      console.error('Error in transaction save:', error);
    }
    
    // Save each purchased item individually to match the database schema
    // Only proceed with user_purchases if we have a user ID
    if (finalUserId) {
      for (const item of lineItems.data) {
        const priceId = item.price?.id;
        
        if (!priceId) {
          console.warn('Missing price ID for item, skipping');
          continue;
        }
        
        const purchaseData = {
          user_id: finalUserId,
          item_id: priceId, // Using price ID as a temporary solution
          purchase_date: new Date().toISOString(),
          transaction_id: session.id,
          amount: item.amount_total ? item.amount_total / 100 : null,
          currency: item.currency || null,
          metadata: session.metadata || {} // Store the metadata here too for reference
        };
        
        console.log('Saving purchase item:', purchaseData);
        
        const { data, error } = await supabase
          .from('user_purchases')
          .insert(purchaseData)
          .select();
        
        if (error) {
          console.error('Error saving purchase item to database:', error);
          console.error('Failed item:', item);
        } else {
          console.log('Successfully saved purchase item:', data);
        }
      }
      
      // Update user permissions based on purchased items
      await updateUserRanks(supabase, finalUserId, priceIds);
      
      console.log(`Payment successful for user ${finalUserId}, saved to database`);
    } else {
      console.log('Payment processed, but not associated with a user account');
    }
    
  } catch (error) {
    console.error('Error processing checkout completion:', error);
    throw error; // Rethrow to be caught by the caller
  }
} 