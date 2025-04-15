import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function GET(req: NextRequest) {
  try {
    // Verify that the request is authorized
    const origin = req.headers.get('origin');
    if (origin !== process.env.NEXT_PUBLIC_SITE_URL && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Extract filter from query parameters
    const url = new URL(req.url);
    const timeframe = url.searchParams.get('timeframe') || 'all'; // 'all', 'recent', 'this-year', 'this-month', 'this-week'
    const categoryFilter = url.searchParams.get('category') || '';
    
    // Set time boundaries for filtering
    let createdAfter: number | undefined;
    const now = new Date();
    
    if (timeframe === 'recent') {
      // Last 30 days
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      createdAfter = Math.floor(thirtyDaysAgo.getTime() / 1000);
    } else if (timeframe === 'this-year') {
      // Start of current year
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      createdAfter = Math.floor(startOfYear.getTime() / 1000);
    } else if (timeframe === 'this-month') {
      // Start of current month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      createdAfter = Math.floor(startOfMonth.getTime() / 1000);
    } else if (timeframe === 'this-week') {
      // Start of current week (Sunday)
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      createdAfter = Math.floor(startOfWeek.getTime() / 1000);
    }
    
    // Get all payment intents (transactions)
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 100,
      ...(createdAfter && { created: { gte: createdAfter } }),
    });
    
    // Map payment intents to our transaction format
    const transactions = paymentIntents.data
      .filter(payment => payment.status === 'succeeded')
      .map(payment => {
        // Extract product information from metadata if available
        const productName = payment.metadata?.product_name || 'Unknown Item';
        
        return {
          id: payment.id,
          user_id: payment.metadata?.user_id || null,
          email: payment.receipt_email || payment.metadata?.customer_email,
          transaction_id: payment.id,
          amount: payment.amount / 100, // Convert from cents to dollars/pounds
          currency: payment.currency,
          payment_status: payment.status,
          created_at: new Date(payment.created * 1000).toISOString(),
          items: [{
            rank_name: productName,
            price: payment.amount / 100,
            quantity: 1
          }],
          source: 'stripe'
        };
      });
    
    // Apply category filtering if provided
    let filteredTransactions = transactions;
    if (categoryFilter && categoryFilter.length > 0) {
      // This would require item metadata from Stripe to include category
      // For simplicity, we're assuming items don't have categories in Stripe
      // In a real implementation, you might store category info in metadata
    }
    
    return NextResponse.json({
      transactions: filteredTransactions,
      totalRevenue: filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0)
    });
  } catch (error: any) {
    console.error('Error fetching Stripe transactions:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transaction data' },
      { status: 500 }
    );
  }
} 