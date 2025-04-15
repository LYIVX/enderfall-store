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
    const { id, name, icon } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Check if a category with this name already exists (excluding the current category)
    const { data: existingCategory, error: checkError } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('name', name.trim())
      .neq('id', id)
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

    // Update the category
    const { error: updateError } = await supabaseAdmin
      .from('categories')
      .update({
        name: name.trim(),
        icon: icon || 'FaFolder'
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating category:', updateError);
      return NextResponse.json(
        { error: 'Failed to update category', details: updateError },
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
      message: 'Category updated successfully',
      categories
    });
  } catch (error) {
    console.error('Unexpected error in update category API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error },
      { status: 500 }
    );
  }
} 