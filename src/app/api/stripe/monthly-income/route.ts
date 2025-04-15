import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    // Verify that the request is authorized - in a real app, you would have better auth
    // This is a simple example of server-side protection
    const origin = req.headers.get('origin');
    if (origin !== process.env.NEXT_PUBLIC_SITE_URL && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get date range from request
    const body = await req.json();
    const { start, end } = body;

    if (!start || !end) {
      return NextResponse.json(
        { error: 'Start and end dates are required' },
        { status: 400 }
      );
    }

    // Get all successful payments in the date range
    const payments = await stripe.paymentIntents.list({
      created: {
        gte: start, // Greater than or equal to start date
        lte: end,   // Less than or equal to end date
      },
      limit: 100, // Adjust as needed
    });

    // Filter for successful payments only and sum the amounts
    const successfulPayments = payments.data.filter(
      payment => payment.status === 'succeeded'
    );

    // Calculate total amount (Stripe stores amounts in cents/smallest currency unit)
    const totalAmount = successfulPayments.reduce(
      (sum, payment) => sum + (payment.amount_received / 100), // Convert to pounds
      0
    );

    // Return the total amount for the period
    return NextResponse.json({
      totalAmount,
      currency: 'gbp', // Assuming your currency is GBP based on the £ symbol in requirements
      period: {
        start: new Date(start * 1000).toISOString(),
        end: new Date(end * 1000).toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching Stripe monthly income:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payment data' },
      { status: 500 }
    );
  }
} 