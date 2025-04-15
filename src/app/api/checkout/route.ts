import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { stripe, getPriceId } from '@/lib/stripe';
import { cookies } from 'next/headers';
import { ShopItem } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // Get cart items from request body
    const { cartItems, userId } = await req.json();
    
    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Get user session to attach customer data
    const cookieStore = cookies();
    
    // Log all cookies for debugging
    console.log('All cookies in checkout API:');
    cookieStore.getAll().forEach(cookie => {
      console.log(`${cookie.name}: ${cookie.value}`);
    });
    
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    let userEmail = '';
    let currentUserId = '';
    
    // Verify authentication
    try {
      // Try to get the session from the cookie
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth session error:', error.message);
        return NextResponse.json(
          { error: 'Authentication service error: ' + error.message },
          { status: 500 }
        );
      }
      
      if (session?.user) {
        currentUserId = session.user.id;
        userEmail = session.user.email || '';
        console.log('Found authenticated user:', currentUserId);
        console.log('User email:', userEmail);
      } else {
        // No session found, user is not authenticated
        console.error('No auth session found during checkout');
        
        // Also check the Authorization header if present
        const authHeader = req.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          try {
            // Try to get user from token
            const { data: { user }, error: tokenError } = await supabase.auth.getUser(token);
            if (!tokenError && user) {
              currentUserId = user.id;
              userEmail = user.email || '';
              console.log('Found user from token:', currentUserId);
            } else {
              console.error('Invalid token in Authorization header');
            }
          } catch (tokenErr) {
            console.error('Error validating token:', tokenErr);
          }
        }
        
        // If we still don't have a user, return 401
        if (!currentUserId) {
          return NextResponse.json(
            { error: 'Authentication required to checkout. Please sign in again.' },
            { status: 401 }
          );
        }
      }
    } catch (error) {
      console.error('Error getting user session:', error);
      return NextResponse.json(
        { error: 'Authentication error. Please try signing in again.' },
        { status: 401 }
      );
    }
    
    // Use provided userId or fall back to current user
    const finalUserId = userId || currentUserId;
    
    // Ensure we have a valid user ID at this point
    if (!finalUserId) {
      return NextResponse.json(
        { error: 'User ID is required for checkout' },
        { status: 400 }
      );
    }

    // Query Supabase for the complete shop items with price IDs
    const { data: shopItems, error: shopItemsError } = await supabase
      .from('shop_items')
      .select('id, name, price_id')
      .in('id', cartItems.map((item: ShopItem) => item.id));

    if (shopItemsError) {
      console.error('Error fetching shop items from Supabase:', shopItemsError);
      return NextResponse.json(
        { error: 'Error fetching product information' },
        { status: 500 }
      );
    }

    console.log('Shop items from Supabase:', shopItems);

    // Create a mapping of item IDs to their Stripe price IDs
    const priceIdMap = new Map();
    shopItems.forEach((item) => {
      if (item.price_id) {
        priceIdMap.set(item.id, item.price_id);
      }
    });

    // Create line items for Stripe checkout
    const lineItems = cartItems.map((item: ShopItem) => {
      // Use the price ID from Supabase, or fall back to the generic upgrade price
      const priceId = priceIdMap.get(item.id) || getPriceId(item.id);
      
      if (!priceId) {
        console.error(`No price ID found for item: ${item.id}, name: ${item.name}`);
      } else {
        console.log(`Mapped item ${item.id} (${item.name}) to price ID: ${priceId}`);
      }
      
      return {
        price: priceId,
        quantity: 1,
      };
    }).filter((item: { price: string }) => item.price); // Filter out any items with missing price IDs

    if (lineItems.length === 0) {
      console.error('No valid line items after filtering. Original cart items:', JSON.stringify(cartItems, null, 2));
      return NextResponse.json(
        { error: 'No valid items found in cart' },
        { status: 400 }
      );
    }

    console.log(`Created ${lineItems.length} valid line items for checkout`);
    console.log('Creating checkout session with items:', cartItems);
    console.log('User ID for checkout:', finalUserId);

    // Prepare metadata for the session
    const metadata = {
      userId: finalUserId,
      userEmail: userEmail,
      cartItems: JSON.stringify(cartItems.map((item: ShopItem) => ({
        id: item.id,
        name: item.name
      })))
    };

    console.log('Adding metadata to checkout session:', metadata);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/shop`,
      customer_email: userEmail || undefined,
      metadata: metadata,
    });

    console.log('Checkout session created with ID:', session.id);
    console.log('Session metadata:', session.metadata);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Error creating checkout session' },
      { status: 500 }
    );
  }
} 