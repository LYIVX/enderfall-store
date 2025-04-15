import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function DELETE(request: Request) {
  try {
    // Parse the URL to get the category ID
    const url = new URL(request.url);
    const categoryId = url.searchParams.get('id');

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    // Check if any ranks are using this category
    const { data: ranksUsingCategory, error: checkError } = await supabaseAdmin
      .from('shop_items')
      .select('id')
      .eq('category_id', categoryId);

    if (checkError) {
      console.error('Error checking ranks using category:', checkError);
      return NextResponse.json(
        { error: 'Failed to check if category is in use', details: checkError },
        { status: 500 }
      );
    }

    // Warn if ranks are using this category
    if (ranksUsingCategory && ranksUsingCategory.length > 0) {
      // You might want to prevent deletion or handle this differently
      console.warn(`Category ${categoryId} is used by ${ranksUsingCategory.length} ranks`);
    }

    // Delete the category
    const { error: deleteError } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (deleteError) {
      console.error('Error deleting category:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete category', details: deleteError },
        { status: 500 }
      );
    }

    // Fetch all remaining categories
    const { data: remainingCategories, error: fetchError } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (fetchError) {
      console.error('Error fetching remaining categories:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch remaining categories', details: fetchError },
        { status: 500 }
      );
    }

    // Reindex the display_order values to be sequential (0, 1, 2, ...)
    const updates = (remainingCategories || []).map((category, index) => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      display_order: index
    }));

    if (updates.length > 0) {
      // Update all categories with new display_order values
      const { error: updateError } = await supabaseAdmin
        .from('categories')
        .upsert(updates, { onConflict: 'id' });

      if (updateError) {
        console.error('Error updating category display orders:', updateError);
        return NextResponse.json(
          { error: 'Failed to update category display orders', details: updateError },
          { status: 500 }
        );
      }
    }

    // Fetch the updated categories again
    const { data: updatedCategories, error: finalFetchError } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (finalFetchError) {
      console.error('Error fetching updated categories:', finalFetchError);
      return NextResponse.json(
        { error: 'Failed to fetch updated categories', details: finalFetchError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully and display order updated',
      categories: updatedCategories || []
    });
  } catch (error) {
    console.error('Unexpected error in delete category API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error },
      { status: 500 }
    );
  }
} 