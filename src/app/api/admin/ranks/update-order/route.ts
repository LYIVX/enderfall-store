import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
  try {
    // Parse the request body
    const { ranks } = await request.json();

    if (!ranks || !Array.isArray(ranks)) {
      return NextResponse.json(
        { error: 'Invalid request: ranks array is required' },
        { status: 400 }
      );
    }

    // Update each rank individually to avoid not-null constraints
    for (const rank of ranks) {
      const { error: updateError } = await supabaseAdmin
        .from('shop_items')
        .update({
          category_id: rank.category_id,
          display_order: rank.display_order
        })
        .eq('id', rank.id);

      if (updateError) {
        console.error(`Error updating rank ${rank.id}:`, updateError);
        return NextResponse.json(
          { error: `Failed to update rank ${rank.id}`, details: updateError },
          { status: 500 }
        );
      }
    }

    // Fetch all updated ranks to return
    const { data: updatedRanks, error: fetchError } = await supabaseAdmin
      .from('shop_items')
      .select('*, categories(*)')
      .order('category_id', { ascending: true })
      .order('display_order', { ascending: true });

    if (fetchError) {
      console.error('Error fetching updated ranks:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch updated ranks', details: fetchError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Rank order updated successfully',
      ranks: updatedRanks || []
    });
  } catch (error) {
    console.error('Unexpected error in update-order API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error },
      { status: 500 }
    );
  }
} 