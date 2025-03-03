import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Define the maximum age for pending purchases (in hours)
const MAX_PENDING_AGE_HOURS = 24;

export async function GET(req: Request) {
  try {
    const dataFilePath = path.join(
      process.cwd(),
      "data",
      "pending-purchases.json"
    );

    // Check if file exists
    if (!fs.existsSync(dataFilePath)) {
      return NextResponse.json({
        success: true,
        message: "No pending purchases file exists",
      });
    }

    // Read existing data
    const data = fs.readFileSync(dataFilePath, "utf8");
    const purchasesData = JSON.parse(data) as {
      pendingPurchases: Array<{
        sessionId: string;
        timestamp: string;
      }>;
    };

    const now = new Date();
    const maxAgeMs = MAX_PENDING_AGE_HOURS * 60 * 60 * 1000; // Convert hours to milliseconds

    // Filter out stale pending purchases
    const originalLength = purchasesData.pendingPurchases.length;

    purchasesData.pendingPurchases = purchasesData.pendingPurchases.filter(
      (purchase) => {
        const purchaseDate = new Date(purchase.timestamp);
        const ageMs = now.getTime() - purchaseDate.getTime();
        return ageMs < maxAgeMs; // Keep if not stale
      }
    );

    // Write updated data back to file
    fs.writeFileSync(
      dataFilePath,
      JSON.stringify(purchasesData, null, 2),
      "utf8"
    );

    const removedCount = originalLength - purchasesData.pendingPurchases.length;

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${removedCount} stale pending purchases`,
      remainingCount: purchasesData.pendingPurchases.length,
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
