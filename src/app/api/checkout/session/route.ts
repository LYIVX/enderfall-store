import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id');
  
  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session ID is required' },
      { status: 400 }
    );
  }

  try {
    // Fetch session details from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price.product']
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Format the response to include only necessary information
    const formattedItems = session.line_items?.data.map(item => {
      const product = item.price?.product as any;
      return {
        id: item.id,
        name: product?.name || 'Unknown Item',
        description: product?.description || '',
        amount: item.amount_total ? item.amount_total / 100 : 0,
        currency: item.currency?.toUpperCase() || 'USD',
        quantity: item.quantity || 1
      };
    });

    return NextResponse.json({
      items: formattedItems || [],
      total: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency?.toUpperCase() || 'USD',
      paymentStatus: session.payment_status
    });

  } catch (error: any) {
    console.error('Error retrieving session:', error);
    return NextResponse.json(
      { error: 'Error retrieving session details' },
      { status: 500 }
    );
  }
} 