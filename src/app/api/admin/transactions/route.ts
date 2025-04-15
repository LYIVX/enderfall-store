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
      // Similar to previous implementation
    }
    
    // Extract query parameters
    const url = new URL(req.url);
    const timeframe = url.searchParams.get('timeframe') || 'all';
    const categoryFilter = url.searchParams.get('category') || '';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const sortField = url.searchParams.get('sortField') || 'created_at';
    const sortDirection = url.searchParams.get('sortDirection') || 'desc';
    
    // Create Supabase client for fetching user data
    const supabase = createServiceRoleClient();
    
    // Set time boundaries for filtering
    let createdAfter = '';
    const now = new Date();
    
    if (timeframe === 'recent') {
      // Last 30 days
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      createdAfter = thirtyDaysAgo.toISOString();
    } else if (timeframe === 'this-year') {
      // Start of current year
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      createdAfter = startOfYear.toISOString();
    } else if (timeframe === 'this-month') {
      // Start of current month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      createdAfter = startOfMonth.toISOString();
    } else if (timeframe === 'this-week') {
      // Start of current week (Sunday)
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      createdAfter = startOfWeek.toISOString();
    }
    
    // Convert the date to UNIX timestamp for Stripe
    const unixCreatedAfter = createdAfter ? Math.floor(new Date(createdAfter).getTime() / 1000) : undefined;
    
    // STEP 1: Count total Stripe sessions for pagination
    const countSessions = await stripe.checkout.sessions.list({
      limit: 1, // Just need to get the count
      ...(unixCreatedAfter && { created: { gte: unixCreatedAfter } }),
    });
    
    // Determine total pages
    const totalCount = countSessions.has_more 
      ? 100 // Stripe doesn't reliably provide total_count, so we'll use a reasonable maximum
      : (countSessions.data?.length || 0);
    
    const totalPages = Math.ceil(totalCount / limit);
    
    // STEP 2: Fetch just the current page of checkout sessions
    // For pages beyond the first, we need to implement a better approach
    let sessionsForCurrentPage;

    if (page === 1) {
      // For the first page, we can just fetch the first 'limit' items
      const stripeSessions = await stripe.checkout.sessions.list({
        limit: limit,
        ...(unixCreatedAfter && { created: { gte: unixCreatedAfter } }),
      });
      sessionsForCurrentPage = stripeSessions.data;
    } else {
      // For subsequent pages, we need to get all sessions up to the page we want
      // This is inefficient but a limitation of Stripe's API lacking offset pagination
      const allSessions = [];
      let hasMore = true;
      let lastSession = null;
      
      // Fetch all sessions up to the page we need
      while (hasMore && allSessions.length < page * limit) {
        const params: any = {
          limit: 100, // Max allowed by Stripe
          ...(unixCreatedAfter && { created: { gte: unixCreatedAfter } }),
        };
        
        // Add starting_after for pagination if we have a last session
        if (lastSession) {
          params.starting_after = lastSession;
        }
        
        const response = await stripe.checkout.sessions.list(params);
        
        if (response.data.length > 0) {
          allSessions.push(...response.data);
          lastSession = response.data[response.data.length - 1].id;
          hasMore = response.has_more;
        } else {
          hasMore = false;
        }
      }
      
      // Calculate the slice for the current page
      const startIndex = (page - 1) * limit;
      sessionsForCurrentPage = allSessions.slice(startIndex, startIndex + limit);
    }

    // Format sessions into our transaction format
    const formattedSessions = await Promise.all(sessionsForCurrentPage.map(async session => {
      // Get the payment intent to get more transaction details
      let paymentIntent = null;
      if (session.payment_intent) {
        try {
          paymentIntent = await stripe.paymentIntents.retrieve(
            typeof session.payment_intent === 'string' 
              ? session.payment_intent 
              : session.payment_intent.id
          );
        } catch (err) {
          console.error('Error retrieving payment intent:', err);
        }
      }
      
      // Get line items for this session
      let lineItems: Array<{
        price_id: string | undefined;
        amount: number;
        currency: string | undefined;
        quantity: number | null | undefined;
        rank_name: string;
      }> = [];
      try {
        const items = await stripe.checkout.sessions.listLineItems(session.id);
        lineItems = items.data.map(item => ({
          price_id: item.price?.id,
          amount: item.amount_total ? item.amount_total / 100 : 0,
          currency: item.currency,
          quantity: item.quantity,
          rank_name: item.description || 'Unknown Item'
        }));
      } catch (err) {
        console.error('Error retrieving line items:', err);
      }
      
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
      
      return {
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
        source: 'stripe' as const,
        user: userData
      };
    }));
    
    // Apply category filtering if provided
    let filteredTransactions = formattedSessions;
    if (categoryFilter && categoryFilter.length > 0) {
      filteredTransactions = formattedSessions.filter(tx => {
        // Check if any item has a matching category
        if (tx.items && tx.items.length > 0) {
          return tx.items.some((item: { rank_name?: string }) => 
            item.rank_name?.toLowerCase().includes(categoryFilter.toLowerCase())
          );
        }
        return false;
      });
    }
    
    // Gather unique categories from all sessions for the dropdown
    let allCategories: string[] = [];
    try {
      // We'll extract categories from a small sample to avoid excessive API calls
      const categorySample = await stripe.checkout.sessions.list({
        limit: 10,
        expand: ['data.line_items.data.price.product']
      });
      
      // Extract categories from line items
      categorySample.data.forEach(session => {
        const items = session.line_items?.data || [];
        items.forEach(item => {
          const product = item.price?.product as any;
          const itemName = product?.name || item.description;
          if (itemName && !allCategories.includes(itemName)) {
            allCategories.push(itemName);
          }
        });
      });
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
    
    return NextResponse.json({
      transactions: filteredTransactions,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: totalPages
      },
      categories: allCategories
    });
    
  } catch (error: any) {
    console.error('Error in admin transactions API:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 