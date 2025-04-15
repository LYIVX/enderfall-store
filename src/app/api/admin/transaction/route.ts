import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe';

// Create a Supabase client with the service role key for admin operations
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

export async function GET(req: NextRequest) {
  try {
    // For development, bypass authentication temporarily
    if (process.env.NODE_ENV !== 'development') {
      // In production, we'd check for admin authentication here
      const supabase = createRouteHandlerClient({ cookies });
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // Check if the user is an admin
      const adminSupabase = createServiceRoleClient();
      const { data: userData, error: userError } = await adminSupabase
        .from('users')
        .select('role')
        .eq('auth_id', session.user.id)
        .single();
      
      if (userError || (userData && userData.role !== 'admin')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    
    // Extract query parameters
    const url = new URL(req.url);
    const transactionId = url.searchParams.get('id');
    
    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }
    
    // Create Supabase client for fetching user data
    const supabase = createServiceRoleClient();
    
    // Fetch transaction details from Stripe
    const [source, id] = transactionId.endsWith('stripe') 
      ? ['stripe', transactionId.replace('stripe', '')] 
      : ['database', transactionId.replace('database', '')];
    
    if (source === 'stripe') {
      try {
        // Get session details from Stripe
        const session = await stripe.checkout.sessions.retrieve(id, {
          expand: ['line_items', 'payment_intent']
        });
        
        // Get line items for this session
        const lineItems = session.line_items?.data.map(item => ({
          price_id: item.price?.id,
          amount: item.amount_total ? item.amount_total / 100 : 0,
          currency: item.currency,
          quantity: item.quantity,
          rank_name: item.description || 'Unknown Item'
        })) || [];
        
        // Fetch user information from Supabase if we have a userId
        let userData = null;
        const userId = session.metadata?.userId;
        const userEmail = session.customer_details?.email || session.metadata?.userEmail;
        
        if (userId) {
          try {
            // First try to get the profile directly by UUID
            const { data, error } = await supabase
              .from('profiles')
              .select('username, email, avatar_url')
              .eq('id', userId)
              .single();
            
            if (!error && data) {
              userData = data;
            } else {
              // If not found, try getting the user by auth_id and then get their profile
              const { data: userResult, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('auth_id', userId)
                .single();
              
              if (!userError && userResult) {
                const { data: profileData, error: profileError } = await supabase
                  .from('profiles')
                  .select('username, email, avatar_url')
                  .eq('id', userResult.id)
                  .single();
                
                if (!profileError && profileData) {
                  userData = profileData;
                }
              }
            }
          } catch (err) {
            console.error('Error fetching user data:', err);
          }
        } 
        // If no user found by userId but we have an email, try to find by email
        else if (userEmail) {
          try {
            // Try to find user by email
            const { data: userByEmail, error: emailError } = await supabase
              .from('users')
              .select('id')
              .eq('email', userEmail)
              .single();
            
            if (!emailError && userByEmail) {
              // Get profile data using the user's ID
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('username, email, avatar_url')
                .eq('id', userByEmail.id)
                .single();
              
              if (!profileError && profileData) {
                userData = profileData;
              }
            }
          } catch (err) {
            console.error('Error fetching user data by email:', err);
          }
        }
        
        return NextResponse.json({
          transaction: {
            id: session.id,
            user_id: session.metadata?.userId || null,
            email: session.customer_details?.email || session.metadata?.userEmail || null,
            transaction_id: session.id,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency,
            payment_status: session.payment_status,
            created_at: new Date(session.created * 1000).toISOString(),
            items: lineItems,
            metadata: session.metadata || {},
            source: 'stripe',
            user: userData,
            detailsLoaded: true
          }
        });
      } catch (error) {
        console.error('Error fetching Stripe transaction details:', error);
        return NextResponse.json(
          { error: 'Failed to fetch transaction details from Stripe' },
          { status: 500 }
        );
      }
    } else {
      // Handle database transactions (if needed in the future)
      return NextResponse.json(
        { error: 'Database transactions are not currently supported' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error in transaction details API:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 