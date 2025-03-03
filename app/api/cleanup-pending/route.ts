import { NextResponse } from "next/server";
import { getPendingPurchases } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";

// Define the maximum age for pending purchases (in hours)
const MAX_PENDING_AGE_HOURS = 24;

export async function GET(req: Request) {
  try {
    // Get the current timestamp minus MAX_PENDING_AGE_HOURS
    const now = new Date();
    const maxAgeMs = MAX_PENDING_AGE_HOURS * 60 * 60 * 1000; // Convert hours to milliseconds
    const cutoffTimestamp = now.getTime() - maxAgeMs;

    // Get all pending purchases before deletion to count them
    const pendingPurchases = await getPendingPurchases();
    const originalCount = pendingPurchases.length;

    // Delete old entries directly from the database
    const { error, count } = await supabase
      .from("pending_purchases")
      .delete({ count: "exact" })
      .lt("timestamp", cutoffTimestamp);

    if (error) {
      throw new Error(`Failed to delete stale purchases: ${error.message}`);
    }

    const deletedCount = count || 0;

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} stale pending purchases`,
      remainingCount: originalCount - deletedCount,
    });
  } catch (error) {
    console.error("Failed to clean up pending purchases:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
