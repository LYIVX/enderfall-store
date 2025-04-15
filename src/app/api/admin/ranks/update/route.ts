import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Check if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a Supabase client with the admin key for server operations
const supabase = createClient(
  supabaseUrl || '',
  supabaseKey || ''
);

export async function POST(request: Request) {
  try {
    // Check if environment variables are set
    if (!supabaseUrl || !supabaseKey) {
      console.error("Required environment variables are missing: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY");
      return NextResponse.json(
        { error: 'Server configuration error: missing required environment variables' }, 
        { status: 500 }
      );
    }
    
    // Get the rank data from the request
    const data = await request.json();
    
    console.log("Server API received update request for rank:", data.id);
    
    if (!data.id) {
      return NextResponse.json(
        { error: 'Rank ID is required' }, 
        { status: 400 }
      );
    }
    
    // Simplified approach: just update the rank without extra validation first
    console.log("Updating rank with data:", {
      id: data.id,
      name: data.name,
      is_upgrade: data.is_upgrade,
      from_rank_id: data.is_upgrade ? data.from_rank_id : null,
      to_rank_id: data.is_upgrade ? data.to_rank_id : null
    });
    
    // Update the rank in the database
    const { data: updatedRank, error } = await supabase
      .from('shop_items')
      .update({
        name: data.name,
        category_id: data.category_id,
        description: data.description,
        price: data.price,
        icon: data.icon,
        color: data.color,
        perks: data.perks,
        is_exclusive: data.is_exclusive,
        is_new: data.is_new,
        is_popular: data.is_popular, 
        is_upgrade: data.is_upgrade,
        from_rank_id: data.is_upgrade ? data.from_rank_id : null,
        to_rank_id: data.is_upgrade ? data.to_rank_id : null
      })
      .eq('id', data.id)
      .select();
    
    if (error) {
      console.error("Server API error updating rank:", error);
      
      // Handle specific constraint errors with user-friendly messages
      if (error.message && error.message.includes('check_upgrade_rank_ids')) {
        return NextResponse.json(
          { error: 'For upgrade ranks, both source and target ranks must be valid and have the proper relationship' }, 
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: error.message || 'Unknown database error' }, 
        { status: 500 }
      );
    }
    
    console.log("Server API successfully updated rank:", updatedRank);
    
    return NextResponse.json(
      { 
        message: 'Rank updated successfully',
        rank: updatedRank 
      }, 
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Server API error:", error);
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred' }, 
      { status: 500 }
    );
  }
} 