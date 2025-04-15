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
      // Get the user's token
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
    const timeframe = url.searchParams.get('timeframe') || 'all';
    const categoryFilter = url.searchParams.get('category') || '';
    
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
    
    // Fetch all Stripe sessions for this timeframe
    // We'll need to page through them since Stripe limits to 100 at a time
    const allSessions = [];
    let hasMore = true;
    let lastSession = null;
    
    while (hasMore) {
      const params: any = {
        limit: 100, // Max allowed by Stripe
        ...(unixCreatedAfter && { created: { gte: unixCreatedAfter } }),
        expand: ['data.line_items']
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
    
    // Format sessions into our transaction format for consistent processing
    const formattedSessions = allSessions.map(session => {
      // Convert line items to the format we need
      const lineItems = session.line_items?.data.map(item => ({
        price_id: item.price?.id,
        amount: item.amount_total ? item.amount_total / 100 : 0,
        currency: item.currency,
        quantity: item.quantity,
        rank_name: item.description || 'Unknown Item'
      })) || [];
      
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
        source: 'stripe' as const
      };
    });
    
    // Apply category filtering if provided
    let filteredTransactions = formattedSessions;
    if (categoryFilter && categoryFilter.length > 0) {
      filteredTransactions = formattedSessions.filter(tx => {
        // Check if any item has a matching category
        if (tx.items && tx.items.length > 0) {
          return tx.items.some(item => 
            item.rank_name?.toLowerCase().includes(categoryFilter.toLowerCase())
          );
        }
        return false;
      });
    }
    
    // Calculate total revenue for filtered transactions
    const totalRevenue = filteredTransactions.reduce(
      (sum, tx) => sum + (tx.amount || 0), 
      0
    );
    
    // Calculate yearly, monthly, and weekly revenue
    const now2 = new Date();
    const startOfYear = new Date(now2.getFullYear(), 0, 1).getTime();
    const startOfMonth = new Date(now2.getFullYear(), now2.getMonth(), 1).getTime();
    const startOfWeek = new Date(now2);
    startOfWeek.setDate(now2.getDate() - now2.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekTime = startOfWeek.getTime();
    
    const yearRevenue = filteredTransactions
      .filter(tx => new Date(tx.created_at).getTime() >= startOfYear)
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
      
    const monthRevenue = filteredTransactions
      .filter(tx => new Date(tx.created_at).getTime() >= startOfMonth)
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
      
    const weekRevenue = filteredTransactions
      .filter(tx => new Date(tx.created_at).getTime() >= startOfWeekTime)
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    return NextResponse.json({
      totalRevenue,
      yearRevenue,
      monthRevenue,
      weekRevenue
    });
    
  } catch (error: any) {
    console.error('Error in admin revenue API:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 