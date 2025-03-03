import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  getPendingPurchases,
  normalizeUsername,
  supabase,
  type PendingPurchase,
} from "@/lib/supabase";

// Type for cleanup criteria
interface CleanupCriteria {
  session_id?: string;
  rank_id?: string;
  minecraft_username?: string;
  user_id?: string;
  olderThanHours?: number;
}

/**
 * Manually clean up pending purchases by various criteria
 * This can be used by admins to remove stuck pending purchases
 *
 * Query parameters:
 * - sessionId: The session ID to match (optional)
 * - rankId: The rank ID to match (optional)
 * - username: The Minecraft username to match (optional)
 * - userId: The user ID to match (optional)
 * - olderThan: Remove entries older than this many hours (optional)
 * - mode: "dry-run" to just see what would be removed without actually removing it (optional)
 */
export async function GET(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const criteria: CleanupCriteria = {};

    // Get criteria from query parameters
    const sessionId = searchParams.get("sessionId");
    const rankId = searchParams.get("rankId");
    const username = searchParams.get("username");
    const userId = searchParams.get("userId");
    const olderThanHoursStr = searchParams.get("olderThan");

    if (sessionId) {
      criteria.session_id = sessionId;
    }

    if (rankId) {
      criteria.rank_id = rankId;
    }

    if (username) {
      criteria.minecraft_username = normalizeUsername(username);
    }

    if (userId) {
      criteria.user_id = userId;
    }

    if (olderThanHoursStr) {
      const olderThanHours = parseInt(olderThanHoursStr, 10);
      if (!isNaN(olderThanHours) && olderThanHours > 0) {
        criteria.olderThanHours = olderThanHours;
      }
    }

    const dryRun = searchParams.get("mode") === "dry-run";

    // Validate that at least one criteria is provided
    if (
      !criteria.session_id &&
      !criteria.rank_id &&
      !criteria.minecraft_username &&
      !criteria.user_id &&
      !criteria.olderThanHours
    ) {
      return NextResponse.json(
        {
          error:
            "You must specify at least one filter criteria (sessionId, rankId, username, userId, or olderThan)",
        },
        { status: 400 }
      );
    }

    // Build the query
    let query = supabase.from("pending_purchases").select("*");

    // Apply filters
    if (criteria.session_id) {
      query = query.eq("session_id", criteria.session_id);
    }

    if (criteria.rank_id) {
      query = query.eq("rank_id", criteria.rank_id);
    }

    if (criteria.minecraft_username) {
      query = query.eq("minecraft_username", criteria.minecraft_username);
    }

    if (criteria.user_id) {
      query = query.eq("user_id", criteria.user_id);
    }

    if (criteria.olderThanHours) {
      const cutoffTime = Date.now() - criteria.olderThanHours * 60 * 60 * 1000;
      query = query.lt("timestamp", cutoffTime);
    }

    // Get matching purchases
    const { data: purchasesToRemove, error } = await query;

    if (error) {
      throw new Error(`Failed to query purchases: ${error.message}`);
    }

    // If not dry run, delete the purchases
    let deletedCount = 0;
    if (!dryRun && purchasesToRemove && purchasesToRemove.length > 0) {
      // Create a delete query with the same filters
      let deleteQuery = supabase.from("pending_purchases").delete();

      if (criteria.session_id) {
        deleteQuery = deleteQuery.eq("session_id", criteria.session_id);
      }

      if (criteria.rank_id) {
        deleteQuery = deleteQuery.eq("rank_id", criteria.rank_id);
      }

      if (criteria.minecraft_username) {
        deleteQuery = deleteQuery.eq(
          "minecraft_username",
          criteria.minecraft_username
        );
      }

      if (criteria.user_id) {
        deleteQuery = deleteQuery.eq("user_id", criteria.user_id);
      }

      if (criteria.olderThanHours) {
        const cutoffTime =
          Date.now() - criteria.olderThanHours * 60 * 60 * 1000;
        deleteQuery = deleteQuery.lt("timestamp", cutoffTime);
      }

      const { error: deleteError, count } = await deleteQuery.select();

      if (deleteError) {
        throw new Error(`Failed to delete purchases: ${deleteError.message}`);
      }

      deletedCount = count || 0;
    }

    // Get the total count of remaining purchases
    const { count: remainingCount } = await supabase
      .from("pending_purchases")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      success: true,
      mode: dryRun ? "dry-run" : "live",
      message: `Found ${purchasesToRemove?.length || 0} purchases matching criteria`,
      removedCount: dryRun ? 0 : deletedCount,
      remainingCount: remainingCount || 0,
      removedPurchases: purchasesToRemove || [],
    });
  } catch (error) {
    console.error("Failed to clean up pending purchases:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
