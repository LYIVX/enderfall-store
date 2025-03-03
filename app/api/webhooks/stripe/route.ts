import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import axios from "axios";
import Stripe from "stripe";
import { ranksConfig } from "@/lib/ranks";
import fs from "fs";
import path from "path";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Define types for better type safety
interface UserRanks {
  ranks: string[];
}

interface UserData {
  users: Record<string, UserRanks>;
}

interface PendingPurchase {
  userId: string;
  rankId: string;
  minecraftUsername: string;
  timestamp: number;
  sessionId: string;
  isGift: boolean;
}

interface PendingPurchasesData {
  pendingPurchases: PendingPurchase[];
}

// Helper function to normalize Minecraft usernames for consistent storage and lookup
function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

// Function to save user rank data
async function saveUserRankData(
  minecraftUsername: string,
  rankId: string
): Promise<{
  success: boolean;
  message: string;
  userData?: any;
}> {
  // IMPORTANT: This function handles rank upgrades by:
  // 1. Removing upgrade paths (e.g., vip_to_mvp) from user ranks
  // 2. Removing the source rank (e.g., vip)
  // 3. Adding only the destination rank (e.g., mvp)
  // This ensures users have only their highest rank per category.
  try {
    const dataDir = path.join(process.cwd(), "data");
    const dataFilePath = path.join(dataDir, "user-data.json");

    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialize with empty data by default
    let userData: UserData = { users: {} };

    // Read existing data (if file exists)
    if (fs.existsSync(dataFilePath)) {
      try {
        const data = fs.readFileSync(dataFilePath, "utf8");
        userData = JSON.parse(data) as UserData;
      } catch (error) {
        // Continue with empty structure if there's an error
      }
    }

    // Normalize username to lowercase for consistency
    const normalizedUsername = normalizeUsername(minecraftUsername);

    // Initialize user entry if needed
    if (!userData.users[normalizedUsername]) {
      userData.users[normalizedUsername] = { ranks: [] };
    }

    // ----- RANK PROCESSING LOGIC -----

    // Get the current user ranks
    let userRanks = [...userData.users[normalizedUsername].ranks];

    // First, process any existing upgrade paths in the user's ranks
    // This is a cleanup step to ensure no upgrade paths remain
    const upgradePathsToRemove: string[] = [];
    const sourceRanksToRemove: string[] = [];
    const destinationRanksToAdd: string[] = [];

    // First pass: identify upgrade paths to cleanup
    userRanks.forEach((existingRankId) => {
      if (existingRankId.includes("_to_")) {
        upgradePathsToRemove.push(existingRankId);

        // Also extract source and destination to handle them
        const [sourceRank, destRank] = existingRankId.split("_to_");
        sourceRanksToRemove.push(sourceRank);
        destinationRanksToAdd.push(destRank);
      }
    });

    // Apply cleanup: remove upgrade paths
    userRanks = userRanks.filter(
      (rank) => !upgradePathsToRemove.includes(rank)
    );

    // Remove source ranks (that are being upgraded from)
    userRanks = userRanks.filter((rank) => !sourceRanksToRemove.includes(rank));

    // Add destination ranks (that are being upgraded to)
    destinationRanksToAdd.forEach((destRank) => {
      if (!userRanks.includes(destRank)) {
        userRanks.push(destRank);
      }
    });

    // Now process the new rank being added
    if (rankId.includes("_to_")) {
      // This is an upgrade process
      // Extract source and destination ranks
      const [sourceRankId, destinationRankId] = rankId.split("_to_");

      // 1. Remove the source rank
      userRanks = userRanks.filter((rank) => rank !== sourceRankId);

      // 2. Add the destination rank if not already present
      if (!userRanks.includes(destinationRankId)) {
        userRanks.push(destinationRankId);
      }
    } else {
      // This is a normal rank, just add it if not already present
      if (!userRanks.includes(rankId)) {
        userRanks.push(rankId);
      }
    }

    // Update the user's ranks
    userData.users[normalizedUsername].ranks = userRanks;

    // Call the Minecraft plugin's API to apply the rank
    try {
      const apiKey = process.env.MINECRAFT_SERVER_API_KEY;
      console.log("Debug - API Key details:", {
        keyExists: !!apiKey,
        keyLength: apiKey?.length,
        firstFewChars: apiKey?.substring(0, 5),
        fullKey: apiKey, // Only log this during development!
      });

      console.log("Calling Minecraft server API:", {
        url: `${process.env.MINECRAFT_SERVER_API_URL}/api/apply-rank`,
        username: normalizedUsername,
        rank: rankId,
        authHeader: `Bearer ${apiKey}`,
      });

      const response = await axios.post(
        `${process.env.MINECRAFT_SERVER_API_URL}/api/apply-rank`,
        {
          username: normalizedUsername,
          rank: rankId,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      console.log("Minecraft server API response:", response.data);

      if (!response.data.success) {
        console.error(
          "Failed to apply rank on Minecraft server:",
          response.data
        );
        return {
          success: false,
          message: "Failed to apply rank on Minecraft server",
        };
      }
    } catch (error) {
      console.error("Error calling Minecraft server API:", {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      return {
        success: false,
        message: "Error communicating with Minecraft server",
      };
    }

    // Write the updated data back to the file
    try {
      fs.writeFileSync(dataFilePath, JSON.stringify(userData, null, 2), "utf8");
    } catch (writeError) {
      return {
        success: false,
        message: "Failed to save user data to file",
      };
    }

    return {
      success: true,
      message: "Rank successfully saved and applied",
      userData: { username: normalizedUsername, ranks: userRanks },
    };
  } catch (error) {
    console.error("Error in saveUserRankData:", error);
    return {
      success: false,
      message: "Error processing rank data",
    };
  }
}

// Function to remove a pending purchase
async function removePendingPurchase(
  sessionId: string,
  rankId?: string,
  username?: string
) {
  try {
    const dataDir = path.join(process.cwd(), "data");
    const pendingPurchasesPath = path.join(dataDir, "pending-purchases.json");

    // If no pending purchases file exists, there's nothing to remove
    if (!fs.existsSync(pendingPurchasesPath)) {
      return {
        success: false,
        message: "No pending purchases to remove",
      };
    }

    // Read existing pending purchases
    const pendingPurchasesData = fs.readFileSync(pendingPurchasesPath, "utf8");
    const purchasesData: PendingPurchasesData =
      JSON.parse(pendingPurchasesData);

    // Define the pending purchase type as used in the file
    type PendingPurchase = {
      sessionId: string;
      rankId: string;
      minecraftUsername: string;
      userId: string;
      timestamp: string;
      isGift: boolean;
    };

    // Define failed cleanup type for storing failures
    type FailedCleanup = {
      timestamp: string;
      sessionId: string;
      pendingPurchases: PendingPurchase[];
    };

    // Store original length for comparison
    const originalLength = purchasesData.pendingPurchases.length;

    // Clean the session ID by removing any prefixes (if necessary)
    const normalizeSessionId = (id: string): string => {
      return id.replace(/^(cs_test_|cs_live_)/, "");
    };

    // First try an exact match
    let exactMatch = false;
    purchasesData.pendingPurchases = purchasesData.pendingPurchases.filter(
      (purchase) => {
        const isMatch = purchase.sessionId === sessionId;
        if (isMatch) exactMatch = true;
        return !isMatch;
      }
    );

    // If no exact match, try a normalized version
    if (originalLength === purchasesData.pendingPurchases.length && sessionId) {
      const normalizedSessionId = normalizeSessionId(sessionId);

      purchasesData.pendingPurchases = purchasesData.pendingPurchases.filter(
        (purchase) => {
          // Try match on normalized session ID
          const normalizedPurchaseId = normalizeSessionId(purchase.sessionId);
          return normalizedPurchaseId !== normalizedSessionId;
        }
      );
    }

    // If still no match, try a partial match (Stripe sometimes truncates session IDs)
    if (originalLength === purchasesData.pendingPurchases.length && sessionId) {
      // Try a partial match on the first portion of the ID
      const partialSessionId = sessionId.substring(0, 20); // First 20 chars

      purchasesData.pendingPurchases = purchasesData.pendingPurchases.filter(
        (purchase) => {
          return !purchase.sessionId.startsWith(partialSessionId);
        }
      );
    }

    // If still no match and we have a rank ID + username, try matching those
    if (
      originalLength === purchasesData.pendingPurchases.length &&
      rankId &&
      username
    ) {
      const normalizedUsername = normalizeUsername(username);

      purchasesData.pendingPurchases = purchasesData.pendingPurchases.filter(
        (purchase) => {
          return !(
            purchase.rankId === rankId &&
            normalizeUsername(purchase.minecraftUsername) === normalizedUsername
          );
        }
      );
    }

    // If we still haven't found a match, record the failed cleanup for manual processing
    if (originalLength === purchasesData.pendingPurchases.length) {
      // Create metadata for diagnosis
      const metadata = {
        sessionId,
        rankId,
        username,
        timestamp: new Date().toISOString(),
      };

      // Store failed cleanups for manual review
      const failedCleanupsPath = path.join(dataDir, "failed-cleanups.json");

      let failedCleanups: FailedCleanup[] = [];

      // Read existing failed cleanups if available
      if (fs.existsSync(failedCleanupsPath)) {
        try {
          const failedData = fs.readFileSync(failedCleanupsPath, "utf8");
          failedCleanups = JSON.parse(failedData);
        } catch (e) {
          // If error reading, start with empty array
          failedCleanups = [];
        }
      }

      // Add this failure and write back
      failedCleanups.push({
        timestamp: new Date().toISOString(),
        sessionId: sessionId || "unknown",
        pendingPurchases: purchasesData.pendingPurchases as any,
      });

      // Write updated failed cleanups
      fs.writeFileSync(
        failedCleanupsPath,
        JSON.stringify(failedCleanups, null, 2),
        "utf8"
      );

      return {
        success: false,
        message: "Could not find matching purchase to remove",
        metadata,
      };
    }

    // Write the updated data back to file
    fs.writeFileSync(
      pendingPurchasesPath,
      JSON.stringify(purchasesData, null, 2),
      "utf8"
    );

    return {
      success: true,
      message: "Pending purchase removed successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to remove pending purchase",
    };
  }
}

// Manual cleanup function for webhook
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    const shouldReset = searchParams.get("reset") === "true";

    // Get the session from the server component
    const session = await getServerSession(authOptions);

    // Check admin permission
    if (!session?.user?.email?.endsWith("@example.com")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!username) {
      return NextResponse.json(
        { message: "No username provided" },
        { status: 400 }
      );
    }

    // Normalize the username to lowercase
    const normalizedUsername = normalizeUsername(username);

    // Path to the user data file
    const dataDir = path.join(process.cwd(), "data");
    const userDataPath = path.join(dataDir, "user-data.json");

    // Check if the user data file exists
    if (!fs.existsSync(userDataPath)) {
      return NextResponse.json(
        { message: "No user data file exists" },
        { status: 404 }
      );
    }

    // Read the user data
    let userData: UserData;
    try {
      const data = fs.readFileSync(userDataPath, "utf8");
      userData = JSON.parse(data);
    } catch (error) {
      return NextResponse.json(
        { message: "Failed to read user data file" },
        { status: 500 }
      );
    }

    // Check if the user exists
    if (!userData.users[normalizedUsername]) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Get the user's current ranks
    const currentRanks = userData.users[normalizedUsername].ranks || [];

    // If reset is requested, clear the ranks
    if (shouldReset) {
      userData.users[normalizedUsername].ranks = [];

      // Write the updated data back to the file
      try {
        fs.writeFileSync(
          userDataPath,
          JSON.stringify(userData, null, 2),
          "utf8"
        );
      } catch (error) {
        return NextResponse.json(
          { message: "Failed to update user data" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "User ranks reset successfully",
        previousRanks: currentRanks,
        currentRanks: [],
      });
    }

    // If not resetting, just return the current ranks
    return NextResponse.json({
      message: "User data retrieved",
      username: normalizedUsername,
      ranks: currentRanks,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to process request" },
      { status: 500 }
    );
  }
}

// Helper function for safe JSON parsing
function safeJsonParse<T>(input: string, defaultValue: T): T {
  try {
    return JSON.parse(input) as T;
  } catch (error) {
    return defaultValue;
  }
}

// Utility for diagnostic logging - replaced with no-op
function logDiagnostic(message: string, data?: any) {
  // Removed console logging
}

// The main webhook handler
export async function POST(req: Request) {
  const startTime = new Date().toISOString();
  console.log(`[${startTime}] Stripe webhook received - starting processing`);

  try {
    const payload = await req.text();
    console.log(
      `[${startTime}] Webhook payload received:`,
      payload.substring(0, 100) + "..."
    );

    const signature = req.headers.get("stripe-signature") as string;
    console.log(
      `[${startTime}] Stripe signature:`,
      signature?.substring(0, 20) + "..."
    );

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      console.log(`[${startTime}] Event constructed:`, {
        type: event.type,
        id: event.id,
      });
    } catch (err) {
      console.error(
        `[${startTime}] Webhook signature verification failed:`,
        err
      );
      return NextResponse.json(
        { message: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    // Process the event
    if (event.type === "checkout.session.completed") {
      console.log(`[${startTime}] Processing checkout.session.completed event`);
      const session = event.data.object as Stripe.Checkout.Session;

      // Extract metadata from the completed checkout session
      const metadata = session.metadata || {};
      console.log(`[${startTime}] Session metadata:`, metadata);

      const rankId = metadata.rank_id;
      const minecraftUsername = metadata.minecraft_username;
      const isGift = metadata.is_gift === "true";

      // Validate required metadata
      if (!rankId || !minecraftUsername) {
        console.error(`[${startTime}] Missing required metadata:`, {
          rankId,
          minecraftUsername,
        });
        return NextResponse.json(
          { message: "Missing required metadata" },
          { status: 400 }
        );
      }

      // Save the user's rank data
      console.log(`[${startTime}] Calling saveUserRankData with:`, {
        minecraftUsername,
        rankId,
      });
      const saveResult = await saveUserRankData(minecraftUsername, rankId);
      console.log(`[${startTime}] saveUserRankData result:`, saveResult);

      if (!saveResult.success) {
        console.error(
          `[${startTime}] Failed to save user rank data:`,
          saveResult.message
        );
        return NextResponse.json(
          { message: saveResult.message },
          { status: 500 }
        );
      }

      // Try to clean up the pending purchase
      console.log(`[${startTime}] Cleaning up pending purchase:`, {
        sessionId: session.id,
      });
      const cleanupResult = await removePendingPurchase(
        session.id,
        rankId,
        minecraftUsername
      );
      console.log(`[${startTime}] Cleanup result:`, cleanupResult);

      return NextResponse.json({
        success: true,
        message: "Rank applied successfully",
        metadata: {
          username: minecraftUsername,
          rank: rankId,
          timestamp: startTime,
        },
      });
    }

    console.log(`[${startTime}] Ignoring non-checkout event:`, event.type);
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`[${startTime}] Webhook processing error:`, {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { message: "Webhook processing error" },
      { status: 500 }
    );
  }
}

// Ensure data directory exists
function ensureDataDirectoryExists() {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

export const dynamic = "force-dynamic";
