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
    const { categories } = await request.json();

    if (!categories || !Array.isArray(categories)) {
      return NextResponse.json(
        { error: 'Invalid request: categories array is required' },
        { status: 400 }
      );
    }

    // Use the service role client to update categories
    const { error: updateError } = await supabaseAdmin
      .from('categories')
      .upsert(categories, { onConflict: 'id' });

    if (updateError) {
      console.error('Error updating category order:', updateError);
      return NextResponse.json(
        { error: 'Failed to update category order', details: updateError },
        { status: 500 }
      );
    }

    // Fetch the updated categories
    const { data: updatedCategories, error: fetchError } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (fetchError) {
      console.error('Error fetching updated categories:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch updated categories', details: fetchError },
        { status: 500 }
      );
    }

    // Return the updated categories
    return NextResponse.json({
      success: true,
      message: 'Categories order updated successfully',
      categories: updatedCategories
    });
  } catch (error) {
    console.error('Unexpected error in update-order API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error },
      { status: 500 }
    );
  }
} 