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
    const { name, icon } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Check if a category with this name already exists
    const { data: existingCategory, error: checkError } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('name', name.trim())
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing category:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing category', details: checkError },
        { status: 500 }
      );
    }

    if (existingCategory) {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 409 }
      );
    }

    // Get the current highest display_order
    const { data: maxOrderData, error: maxOrderError } = await supabaseAdmin
      .from('categories')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxOrderError) {
      console.error('Error getting max display order:', maxOrderError);
      return NextResponse.json(
        { error: 'Failed to determine display order', details: maxOrderError },
        { status: 500 }
      );
    }

    const newDisplayOrder = (maxOrderData?.display_order || 0) + 1;

    // Insert the new category
    const { error: insertError } = await supabaseAdmin
      .from('categories')
      .insert([
        {
          name: name.trim(),
          icon: icon || 'FaFolder',
          display_order: newDisplayOrder
        }
      ]);

    if (insertError) {
      console.error('Error inserting category:', insertError);
      return NextResponse.json(
        { error: 'Failed to create category', details: insertError },
        { status: 500 }
      );
    }

    // Fetch all categories to return
    const { data: categories, error: fetchError } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (fetchError) {
      console.error('Error fetching categories:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch categories', details: fetchError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Category created successfully',
      categories
    });
  } catch (error) {
    console.error('Unexpected error in create category API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error },
      { status: 500 }
    );
  }
} 