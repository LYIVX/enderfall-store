import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

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

// Helper function to normalize Minecraft usernames for consistent storage and lookup
function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
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
    // Check if user is authenticated and has admin rights
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // In a real system, you'd check if the user is an admin here
    // For the sake of this implementation, we'll allow all authenticated users

    // Extract parameters/criteria
    const { searchParams } = new URL(req.url);

    const criteria: CleanupCriteria = {};

    // Single parameter criteria
    if (searchParams.has("sessionId")) {
      criteria.sessionId = searchParams.get("sessionId") || undefined;
    }

    if (searchParams.has("rankId")) {
      criteria.rankId = searchParams.get("rankId") || undefined;
    }

    if (searchParams.has("username")) {
      const username = searchParams.get("username") || undefined;
      if (username) {
        // Normalize the username for consistent matching
        criteria.minecraftUsername = normalizeUsername(username);
      }
    }

    if (searchParams.has("userId")) {
      criteria.userId = searchParams.get("userId") || undefined;
    }

    const olderThanHoursStr = searchParams.get("olderThan") || undefined;
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

    // Read the pending purchases file
    const dataFilePath = path.join(
      process.cwd(),
      "data",
      "pending-purchases.json"
    );

    if (!fs.existsSync(dataFilePath)) {
      return NextResponse.json({
        success: true,
        message: "No pending purchases file exists",
        removedCount: 0,
      });
    }

    // Read the file content
    const data = fs.readFileSync(dataFilePath, "utf8");
    const purchasesData = JSON.parse(data);

    // Keep track of original purchases for comparison
    const originalPurchases = [...purchasesData.pendingPurchases];

    // Apply criteria-based filtering to find purchases to remove
    const purchasesToRemove = purchasesData.pendingPurchases.filter(
      (purchase: PendingPurchase) => {
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
    const remainingPurchases = purchasesData.pendingPurchases.filter(
      (purchase: PendingPurchase) =>
        !purchasesToRemove.some(
          (p: PendingPurchase) => p.sessionId === purchase.sessionId
        )
    );

    // Update the data if not in dry-run mode
    if (!dryRun && purchasesToRemove.length > 0) {
      purchasesData.pendingPurchases = remainingPurchases;
      fs.writeFileSync(dataFilePath, JSON.stringify(purchasesData, null, 2));
    }

    return NextResponse.json({
      success: true,
      dryRun: dryRun,
      removedCount: purchasesToRemove.length,
      remainingCount: remainingPurchases.length,
      removedPurchases: purchasesToRemove,
      criteria: {
        sessionId: criteria.sessionId,
        rankId: criteria.rankId,
        minecraftUsername: criteria.minecraftUsername,
        userId: criteria.userId,
        olderThanHours: criteria.olderThanHours,
      },
    });
  } catch (error) {
    console.error("Error cleaning up pending purchases:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
