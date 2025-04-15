import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    // Get user session to verify authentication
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      // No session found, user is not authenticated
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Fetch transactions from the transactions table
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }
    
    // Format transactions data for the frontend
    const formattedTransactions = transactions.map(transaction => {
      // Extract item details from the JSON field
      const items = transaction.items || [];
      
      return {
        id: transaction.id,
        transactionId: transaction.transaction_id,
        amount: transaction.amount,
        currency: transaction.currency,
        date: transaction.created_at,
        status: transaction.payment_status,
        rankNames: transaction.rank_names || [],
        items: items.map((item: any) => ({
          id: item.price_id,
          amount: item.amount,
          currency: item.currency,
          quantity: item.quantity,
          rankName: item.rank_name || null
        }))
      };
    });
    
    return NextResponse.json({
      transactions: formattedTransactions
    });
    
  } catch (error: any) {
    console.error('Error in transactions API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 