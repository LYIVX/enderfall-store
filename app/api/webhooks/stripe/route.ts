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
import { getRankById } from "@/lib/ranks";

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
    } catch (error: any) {
      console.error("Error calling Minecraft server API:", {
        error: error?.message || "Unknown error",
        response: error?.response?.data,
        status: error?.response?.status,
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

export const dynamic = "force-dynamic";

interface ServerConfig {
  name: string;
  ip: string | undefined;
  apiPort: number;
}

const servers = {
  lobby: {
    name: "Lobby",
    ip: process.env.MINECRAFT_LOBBY_IP,
    apiPort: parseInt(process.env.MINECRAFT_LOBBY_API_PORT || "8090"),
  },
  towny: {
    name: "Towny",
    ip: process.env.MINECRAFT_TOWNY_IP,
    apiPort: parseInt(process.env.MINECRAFT_TOWNY_API_PORT || "8137"),
  },
};

// Helper function to determine if a rank is a towny rank
function isTownyRank(rankId: string): boolean {
  return (
    rankId.toLowerCase().startsWith("towny_") ||
    [
      "citizen",
      "merchant",
      "councilor",
      "mayor",
      "governor",
      "noble",
      "duke",
      "king",
      "emperor",
      "divine",
    ].includes(rankId.toLowerCase())
  );
}

// Helper function to apply rank to a specific server
async function applyRankToServer(
  server: ServerConfig,
  username: string,
  rankId: string
): Promise<boolean> {
  try {
    const correlationId = Math.random().toString(36).substring(7);

    // Check if server IP is configured
    if (!server.ip) {
      console.error(
        `[${correlationId}][Server: ${server.name}] Server IP not configured`
      );
      return false;
    }

    console.log(
      `[${correlationId}][Server: ${server.name}] Attempting to apply rank:`,
      {
        username,
        rankId,
        serverIp: server.ip,
        serverPort: server.apiPort,
      }
    );

    const apiUrl = `http://${server.ip}:${server.apiPort}/api/apply-rank`;
    console.log(
      `[${correlationId}][Server: ${server.name}] Making request to:`,
      apiUrl
    );

    const apiKey = process.env.MINECRAFT_SERVER_API_KEY;
    if (!apiKey) {
      console.error(
        `[${correlationId}][Server: ${server.name}] API key not configured`
      );
      return false;
    }

    console.log(`[${correlationId}][Server: ${server.name}] Using API key:`, {
      exists: !!apiKey,
      length: apiKey?.length,
      preview: apiKey?.substring(0, 5) + "...",
    });

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Correlation-ID": correlationId,
      },
      body: JSON.stringify({
        username,
        rank: rankId,
      }),
    });

    console.log(
      `[${correlationId}][Server: ${server.name}] Response status:`,
      response.status
    );
    const responseText = await response.text();
    console.log(
      `[${correlationId}][Server: ${server.name}] Response body:`,
      responseText
    );

    if (!response.ok) {
      console.error(
        `[${correlationId}][Server: ${server.name}] Failed to apply rank:`,
        responseText
      );
      return false;
    }

    console.log(
      `[${correlationId}][Server: ${server.name}] Successfully applied rank`
    );
    return true;
  } catch (error) {
    console.error(`[Server: ${server.name}] Error applying rank:`, error);
    return false;
  }
}

// Function to apply rank across appropriate servers
async function applyRankAcrossServers(
  username: string,
  rankId: string
): Promise<boolean> {
  console.log("[Rank Application] Starting rank application across servers:", {
    username,
    rankId,
  });

  const isTowny = isTownyRank(rankId);
  console.log("[Rank Application] Rank type:", isTowny ? "Towny" : "Regular");

  let success = true;

  if (isTowny) {
    console.log("[Rank Application] Applying Towny rank to Towny server only");
    success = await applyRankToServer(servers.towny, username, rankId);
  } else {
    console.log("[Rank Application] Applying regular rank to all servers");
    const lobbySuccess = await applyRankToServer(
      servers.lobby,
      username,
      rankId
    );
    const townySuccess = await applyRankToServer(
      servers.towny,
      username,
      rankId
    );
    success = lobbySuccess && townySuccess;

    console.log("[Rank Application] Application results:", {
      lobby: lobbySuccess,
      towny: townySuccess,
      overall: success,
    });
  }

  return success;
}

export async function POST(req: Request) {
  try {
    console.log("[Stripe Webhook] Received webhook request");
    const body = await req.text();
    const headersList = headers();
    const signature = headersList.get("stripe-signature");

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("[Stripe Webhook] Missing signature or webhook secret");
      return NextResponse.json(
        { error: "Missing signature or webhook secret" },
        { status: 400 }
      );
    }

    console.log("[Stripe Webhook] Verifying webhook signature");
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log("[Stripe Webhook] Event type:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const metadata = session.metadata;

      console.log("[Stripe Webhook] Session metadata:", metadata);

      if (!metadata) {
        console.error("[Stripe Webhook] No metadata found in session");
        throw new Error("No metadata found in session");
      }

      const { minecraft_username, rank_id } = metadata;

      if (!minecraft_username || !rank_id) {
        console.error("[Stripe Webhook] Missing required metadata");
        throw new Error("Missing required metadata");
      }

      console.log("[Stripe Webhook] Applying rank:", {
        username: minecraft_username,
        rankId: rank_id,
      });

      // Apply the rank across appropriate servers
      const success = await applyRankAcrossServers(minecraft_username, rank_id);

      if (!success) {
        console.error(
          "[Stripe Webhook] Failed to apply rank across all required servers"
        );
        return NextResponse.json(
          { error: "Failed to apply rank" },
          { status: 500 }
        );
      }

      console.log("[Stripe Webhook] Successfully applied rank");
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 400 }
    );
  }
}
