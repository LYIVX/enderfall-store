import { NextResponse } from "next/server";
import { getPendingPurchases } from "@/lib/edge-config";
import { updateEdgeConfig } from "@/lib/edge-config";

// Define the maximum age for pending purchases (in hours)
const MAX_PENDING_AGE_HOURS = 24;

export async function GET(req: Request) {
  try {
    // Get all pending purchases
    const pendingPurchases = await getPendingPurchases();

    const now = new Date();
    const maxAgeMs = MAX_PENDING_AGE_HOURS * 60 * 60 * 1000; // Convert hours to milliseconds

    // Filter out stale pending purchases
    const originalLength = pendingPurchases.pendingPurchases.length;

    pendingPurchases.pendingPurchases =
      pendingPurchases.pendingPurchases.filter((purchase) => {
        const purchaseDate = new Date(purchase.timestamp);
        const ageMs = now.getTime() - purchaseDate.getTime();
        return ageMs < maxAgeMs; // Keep if not stale
      });

    // Update Edge Config with the filtered purchases
    await updateEdgeConfig("pending-purchases", pendingPurchases);

    const removedCount =
      originalLength - pendingPurchases.pendingPurchases.length;

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${removedCount} stale pending purchases`,
      remainingCount: pendingPurchases.pendingPurchases.length,
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
