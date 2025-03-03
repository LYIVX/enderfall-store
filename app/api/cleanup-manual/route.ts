import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  getPendingPurchases,
  updateEdgeConfig,
  normalizeUsername,
} from "@/lib/edge-config";

// Define the purchase type
interface PendingPurchase {
  sessionId: string;
  rankId: string;
  minecraftUsername: string;
  userId: string;
  timestamp: string;
  isGift: boolean;
}

// Type for cleanup criteria
interface CleanupCriteria {
  sessionId?: string;
  rankId?: string;
  minecraftUsername?: string;
  userId?: string;
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
      criteria.sessionId = sessionId;
    }

    if (rankId) {
      criteria.rankId = rankId;
    }

    if (username) {
      criteria.minecraftUsername = normalizeUsername(username);
    }

    if (userId) {
      criteria.userId = userId;
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
      !criteria.sessionId &&
      !criteria.rankId &&
      !criteria.minecraftUsername &&
      !criteria.userId &&
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

    // Get all pending purchases
    const pendingPurchases = await getPendingPurchases();

    // Keep track of original purchases for comparison
    const originalPurchases = [...pendingPurchases.pendingPurchases];

    // Apply criteria-based filtering to find purchases to remove
    const purchasesToRemove = pendingPurchases.pendingPurchases.filter(
      (purchase) => {
        // For each criteria, if it's provided and doesn't match, this purchase shouldn't be removed

        // Session ID matching
        if (criteria.sessionId && purchase.sessionId !== criteria.sessionId) {
          return false;
        }

        // Rank ID matching
        if (criteria.rankId && purchase.rankId !== criteria.rankId) {
          return false;
        }

        // Username matching (normalized)
        if (
          criteria.minecraftUsername &&
          normalizeUsername(purchase.minecraftUsername) !==
            criteria.minecraftUsername
        ) {
          return false;
        }

        // User ID matching
        if (criteria.userId && purchase.userId !== criteria.userId) {
          return false;
        }

        // Age-based matching
        if (criteria.olderThanHours) {
          const purchaseTime = new Date(purchase.timestamp).getTime();
          const cutoffTime =
            Date.now() - criteria.olderThanHours * 60 * 60 * 1000;

          // Keep purchases that are newer than the cutoff (don't remove them)
          if (purchaseTime > cutoffTime) {
            return false;
          }
        }

        // If we get here, this purchase matches all provided criteria and should be removed
        return true;
      }
    );

    // Keep purchases that don't match the removal criteria
    const remainingPurchases = pendingPurchases.pendingPurchases.filter(
      (purchase) =>
        !purchasesToRemove.some((p) => p.sessionId === purchase.sessionId)
    );

    // Update the data if not in dry-run mode
    if (!dryRun && purchasesToRemove.length > 0) {
      pendingPurchases.pendingPurchases = remainingPurchases;
      await updateEdgeConfig("pending-purchases", pendingPurchases);
    }

    return NextResponse.json({
      success: true,
      mode: dryRun ? "dry-run" : "live",
      message: `Found ${purchasesToRemove.length} purchases matching criteria`,
      removedCount: purchasesToRemove.length,
      remainingCount: remainingPurchases.length,
      removedPurchases: purchasesToRemove,
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
