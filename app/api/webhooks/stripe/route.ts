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
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!.trim();

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
          rankId: rankId,
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
    const checkWebhook = searchParams.get("check_webhook") === "true";
    const checkPendingRanks =
      searchParams.get("check_pending_ranks") === "true";

    // Get the session from the server component
    const session = await getServerSession(authOptions);

    // Check admin permission
    if (!session?.user?.email?.endsWith("@example.com")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Special mode to check pending ranks
    if (checkPendingRanks) {
      try {
        const dataDir = path.join(process.cwd(), "data");
        const pendingRanksPath = path.join(dataDir, "pending-ranks.json");
        const pendingPurchasesPath = path.join(
          dataDir,
          "pending-purchases.json"
        );
        const userDataPath = path.join(dataDir, "user-data.json");

        const result: any = {
          pendingRanks: [],
          pendingPurchases: [],
          userData: {},
        };

        // Check pending ranks
        if (fs.existsSync(pendingRanksPath)) {
          const pendingRanksContent = fs.readFileSync(pendingRanksPath, "utf8");
          const pendingRanksData = JSON.parse(pendingRanksContent);
          result.pendingRanks = pendingRanksData.pendingRanks || [];
        }

        // Check pending purchases
        if (fs.existsSync(pendingPurchasesPath)) {
          const pendingPurchasesContent = fs.readFileSync(
            pendingPurchasesPath,
            "utf8"
          );
          const pendingPurchasesData = JSON.parse(pendingPurchasesContent);
          result.pendingPurchases = pendingPurchasesData.pendingPurchases || [];
        }

        // Check user data for a specific user if provided
        if (username && fs.existsSync(userDataPath)) {
          const userDataContent = fs.readFileSync(userDataPath, "utf8");
          const userData = JSON.parse(userDataContent);

          if (userData.users && userData.users[username.toLowerCase()]) {
            result.userData = userData.users[username.toLowerCase()];
          } else {
            result.userData = { message: "User not found in user data" };
          }
        }

        return NextResponse.json({
          message: "Diagnostic information retrieved",
          ...result,
          serverConfig: {
            lobby: {
              ip: servers.lobby.ip,
              apiPort: servers.lobby.apiPort,
            },
            towny: {
              ip: servers.towny.ip,
              apiPort: servers.towny.apiPort,
            },
          },
        });
      } catch (errorUnknown: unknown) {
        const error = errorUnknown as Error;
        return NextResponse.json(
          {
            message: "Failed to check pending ranks",
            error: error.message,
          },
          { status: 500 }
        );
      }
    }

    // Special mode to check webhook status
    if (checkWebhook) {
      try {
        // List recent Stripe events
        const events = await stripe.events.list({
          limit: 10,
          type: "checkout.session.completed",
        });

        // Check if we have any recent successful checkout sessions
        const successfulCheckouts = events.data.filter((event) => {
          const session = event.data.object as Stripe.Checkout.Session;
          return session.payment_status === "paid";
        });

        // Return information about recent checkouts
        return NextResponse.json({
          message: "Webhook status check",
          recentEvents: events.data.map((event) => {
            const session = event.data.object as Stripe.Checkout.Session;
            return {
              id: event.id,
              type: event.type,
              created: new Date(event.created * 1000).toISOString(),
              sessionId: session.id,
              paymentStatus: session.payment_status,
              metadata: session.metadata,
            };
          }),
        });
      } catch (errorUnknown) {
        const error = errorUnknown as Error;
        return NextResponse.json(
          {
            message: "Failed to check webhook status",
            error: error.message,
          },
          { status: 500 }
        );
      }
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

/**
 * Determines the current environment and provides environment-specific configuration
 */
function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || "development";
  const isTest = env === "test";
  const isDev = env === "development";
  const isProd = env === "production";

  return {
    env,
    isTest,
    isDev,
    isProd,
    useLocalServers:
      isTest || (isDev && process.env.USE_LOCAL_SERVERS === "true"),
    logFullData: isTest || isDev,
  };
}

const envConfig = getEnvironmentConfig();

const servers = {
  lobby: {
    name: "Lobby",
    ip: envConfig.useLocalServers
      ? "localhost"
      : process.env.MINECRAFT_LOBBY_IP || "localhost",
    apiPort: parseInt(process.env.MINECRAFT_LOBBY_API_PORT || "8090"),
  },
  towny: {
    name: "Towny",
    ip: envConfig.useLocalServers
      ? "localhost"
      : process.env.MINECRAFT_TOWNY_IP || "localhost",
    apiPort: parseInt(process.env.MINECRAFT_TOWNY_API_PORT || "8137"),
  },
};

// Log environment configuration
console.log("Environment configuration:", {
  environment: envConfig.env,
  isTest: envConfig.isTest,
  isDev: envConfig.isDev,
  isProd: envConfig.isProd,
  useLocalServers: envConfig.useLocalServers,
});

// Log server configuration for debugging
console.log("Server configuration loaded:", {
  lobby: {
    ip: servers.lobby.ip,
    apiPort: servers.lobby.apiPort,
    hasIp: !!process.env.MINECRAFT_LOBBY_IP,
    hasPort: !!process.env.MINECRAFT_LOBBY_API_PORT,
  },
  towny: {
    ip: servers.towny.ip,
    apiPort: servers.towny.apiPort,
    hasIp: !!process.env.MINECRAFT_TOWNY_IP,
    hasPort: !!process.env.MINECRAFT_TOWNY_API_PORT,
  },
});

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

    // Always use the main Minecraft server API URL
    const apiUrl = `${process.env.MINECRAFT_SERVER_API_URL}/api/apply-rank`;

    console.log(
      `[${correlationId}][Server: ${server.name}] Attempting to apply rank using main API URL:`,
      {
        username,
        rankId,
        apiUrl,
        serverName: server.name,
      }
    );

    // Get API key from environment
    const apiKey = process.env.MINECRAFT_SERVER_API_KEY;
    if (!apiKey) {
      console.error(
        `[${correlationId}][Server: ${server.name}] API key not configured in environment`
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
        "X-Server-Name": server.name.toLowerCase(), // Add server name to header so API knows which server this is for
      },
      body: JSON.stringify({
        username,
        rankId: rankId,
        rank: rankId,
        server: server.name.toLowerCase(), // Include server name in the request body
      }),
    });

    console.log(
      `[${correlationId}][Server: ${server.name}] Response status:`,
      response.status
    );

    // Improved response handling with better error logging
    let responseData;
    const responseText = await response.text();

    try {
      // Try to parse response as JSON
      responseData = JSON.parse(responseText);
      console.log(
        `[${correlationId}][Server: ${server.name}] Response data:`,
        responseData
      );
    } catch (parseError) {
      // If not valid JSON, log the raw text
      console.error(
        `[${correlationId}][Server: ${server.name}] Invalid JSON response:`,
        responseText
      );
      return false;
    }

    if (!response.ok) {
      console.error(
        `[${correlationId}][Server: ${server.name}] Server returned error status:`,
        {
          status: response.status,
          statusText: response.statusText,
          data: responseData,
        }
      );
      return false;
    }

    // Validate the response structure
    if (!responseData.success) {
      console.error(
        `[${correlationId}][Server: ${server.name}] Server indicated failure:`,
        responseData
      );
      return false;
    }

    console.log(
      `[${correlationId}][Server: ${server.name}] Rank successfully applied`
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
  const correlationId = Math.random().toString(36).substring(7);
  console.log(
    `[${correlationId}][Rank Application] Starting rank application across servers:`,
    {
      username,
      rankId,
    }
  );

  // Add additional direct application to the main plugin API (this is our most reliable method)
  try {
    if (!process.env.MINECRAFT_SERVER_API_URL) {
      console.error(
        `[${correlationId}][Rank Application] MINECRAFT_SERVER_API_URL is not configured`
      );
    } else {
      console.log(
        `[${correlationId}][Rank Application] Directly applying rank to main API endpoint`,
        {
          url: `${process.env.MINECRAFT_SERVER_API_URL}/api/apply-rank`,
          username,
          rankId,
        }
      );

      const apiKey = process.env.MINECRAFT_SERVER_API_KEY;
      if (!apiKey) {
        console.error(
          `[${correlationId}][Rank Application] MINECRAFT_SERVER_API_KEY is not configured`
        );
      } else {
        // Direct application to the main API endpoint
        const response = await fetch(
          `${process.env.MINECRAFT_SERVER_API_URL}/api/apply-rank`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "X-Correlation-ID": correlationId,
            },
            body: JSON.stringify({
              username,
              rankId,
              rank: rankId,
              applyGlobally: true, // Signal that this should be applied to all servers
            }),
          }
        );

        if (response.ok) {
          console.log(
            `[${correlationId}][Rank Application] Successfully applied rank directly to main API endpoint`
          );
          return true;
        } else {
          console.error(
            `[${correlationId}][Rank Application] Failed to apply rank directly to main API endpoint:`,
            {
              status: response.status,
              statusText: response.statusText,
            }
          );
        }
      }
    }
  } catch (error) {
    console.error(
      `[${correlationId}][Rank Application] Error applying rank directly to main API endpoint:`,
      error
    );
  }

  // Fall back to server-specific applications if direct application fails
  const isTowny = isTownyRank(rankId);
  console.log(
    `[${correlationId}][Rank Application] Rank type:`,
    isTowny ? "Towny" : "Regular"
  );

  // Add the rank to local storage first (for backup in case server communication fails)
  try {
    const dataDir = path.join(process.cwd(), "data");
    const pendingRanksPath = path.join(dataDir, "pending-ranks.json");

    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Create or read the pending ranks file
    let pendingRanksData: {
      pendingRanks: Array<{
        username: string;
        rankId: string;
        timestamp: string;
      }>;
    } = { pendingRanks: [] };

    if (fs.existsSync(pendingRanksPath)) {
      try {
        const pendingRanksContent = fs.readFileSync(pendingRanksPath, "utf8");
        pendingRanksData = JSON.parse(pendingRanksContent);
      } catch (error) {
        // Continue with empty array if parsing fails
        console.error(
          `[${correlationId}][Rank Application] Error parsing pending ranks:`,
          error
        );
      }
    }

    // Add this rank to pending ranks as a backup
    pendingRanksData.pendingRanks.push({
      username: username.toLowerCase(),
      rankId,
      timestamp: new Date().toISOString(),
    });

    // Write back to file
    fs.writeFileSync(
      pendingRanksPath,
      JSON.stringify(pendingRanksData, null, 2),
      "utf8"
    );
    console.log(
      `[${correlationId}][Rank Application] Added rank to pending ranks backup file`
    );
  } catch (error) {
    console.error(
      `[${correlationId}][Rank Application] Error saving to pending ranks:`,
      error
    );
    // Continue processing even if local backup fails
  }

  // Try with retry logic
  const MAX_RETRIES = 3;
  let success = false;
  let attempts = 0;

  while (!success && attempts < MAX_RETRIES) {
    attempts++;
    try {
      if (isTowny) {
        console.log(
          `[${correlationId}][Rank Application] Applying Towny rank to Towny server only (attempt ${attempts})`
        );
        success = await applyRankToServer(servers.towny, username, rankId);
      } else {
        console.log(
          `[${correlationId}][Rank Application] Applying regular rank to all servers (attempt ${attempts})`
        );
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

        console.log(
          `[${correlationId}][Rank Application] Application results (attempt ${attempts}):`,
          {
            lobby: lobbySuccess,
            towny: townySuccess,
            overall: success,
          }
        );
      }

      if (!success && attempts < MAX_RETRIES) {
        // Wait before retrying (exponential backoff)
        const waitTime = Math.pow(2, attempts) * 1000;
        console.log(
          `[${correlationId}][Rank Application] Retry in ${waitTime}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    } catch (error) {
      console.error(
        `[${correlationId}][Rank Application] Error in attempt ${attempts}:`,
        error
      );
      if (attempts < MAX_RETRIES) {
        const waitTime = Math.pow(2, attempts) * 1000;
        console.log(
          `[${correlationId}][Rank Application] Retry in ${waitTime}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  if (!success) {
    console.error(
      `[${correlationId}][Rank Application] Failed after ${MAX_RETRIES} attempts`
    );
  }

  return success;
}

// Extract the event processing logic into an exportable function
export async function processStripeEvent(
  event: any,
  correlationId: string
): Promise<{ success: boolean; message: string }> {
  console.log(`[${correlationId}][Stripe Webhook] Processing event:`, {
    id: event.id,
    type: event.type,
    hasData: !!event.data,
    hasObject: !!(event.data && event.data.object),
  });

  // Process the specific event type
  if (event.type === "checkout.session.completed") {
    console.log(
      `[${correlationId}][Stripe Webhook] Processing checkout.session.completed event`
    );

    try {
      const session = event.data.object;

      // Verify that this is a paid session
      if (session.payment_status !== "paid") {
        console.log(
          `[${correlationId}][Stripe Webhook] Skipping unpaid session`,
          {
            sessionId: session.id,
            paymentStatus: session.payment_status,
          }
        );
        return {
          success: false,
          message: "Payment not completed",
        };
      }

      // Extract metadata
      const metadata = session.metadata || {};
      const type = metadata.type;
      const username = metadata.minecraft_username;
      const rankId = metadata.rank_id;
      const isGift = metadata.is_gift === "true";
      const userId = metadata.user_id;

      console.log(
        `[${correlationId}][Stripe Webhook] Processing payment for ${type}`,
        {
          sessionId: session.id,
          username,
          rankId,
          isGift,
          userId,
        }
      );

      if (type !== "rank_purchase") {
        return {
          success: false,
          message: `Unsupported purchase type: ${type}`,
        };
      }

      // Process rank purchase
      if (!username || !rankId) {
        console.error(
          `[${correlationId}][Stripe Webhook] Missing required metadata for rank purchase`,
          { username, rankId }
        );
        return {
          success: false,
          message: "Missing required metadata",
        };
      }

      // Load the existing pending purchases
      await removePendingPurchase(session.id, rankId, username);

      // Apply the rank to the user's Minecraft account
      const rankApplied = await applyRankAcrossServers(username, rankId);

      if (rankApplied) {
        console.log(
          `[${correlationId}][Stripe Webhook] Successfully applied rank`,
          {
            username,
            rankId,
          }
        );

        // Save the user's rank data
        const result = await saveUserRankData(username, rankId);

        console.log(`[${correlationId}][Stripe Webhook] User rank data saved`, {
          success: result.success,
          message: result.message,
        });

        return {
          success: true,
          message: "Rank purchase processed successfully",
        };
      } else {
        console.error(
          `[${correlationId}][Stripe Webhook] Failed to apply rank`,
          {
            username,
            rankId,
          }
        );
        return {
          success: false,
          message: "Failed to apply rank to any server",
        };
      }
    } catch (error: any) {
      console.error(
        `[${correlationId}][Stripe Webhook] Error processing checkout session:`,
        error
      );
      return {
        success: false,
        message: `Error processing checkout session: ${error.message}`,
      };
    }
  } else {
    // Unsupported event type
    console.log(
      `[${correlationId}][Stripe Webhook] Unsupported event type: ${event.type}`
    );
    return {
      success: false,
      message: `Unsupported event type: ${event.type}`,
    };
  }
}

export async function POST(req: Request) {
  // Generate a correlation ID for tracking this request
  const correlationId = uuidv4().substring(0, 8);

  console.log(`[${correlationId}][Stripe Webhook] Received webhook event`);

  try {
    // Log raw request details
    const rawHeaders = Object.fromEntries(req.headers.entries());
    console.log(`[${correlationId}][Stripe Webhook] Raw request headers:`, {
      headers: rawHeaders,
      method: req.method,
      url: req.url,
    });

    const body = await req.text();
    const headersList = headers();
    const signature = headersList.get("stripe-signature");

    // Ensure webhook secret is properly formatted
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

    // Log webhook secret details (safely)
    console.log(`[${correlationId}][Stripe Webhook] Webhook secret details:`, {
      length: webhookSecret?.length,
      start: webhookSecret?.substring(0, 10) + "...",
      containsNewlines: webhookSecret?.includes("\n"),
      containsSpaces: webhookSecret?.includes(" "),
      containsCarriageReturn: webhookSecret?.includes("\r"),
      charCodes: webhookSecret
        ? Array.from(webhookSecret)
            .slice(0, 5)
            .map((c) => c.charCodeAt(0))
        : [],
    });

    console.log(`[${correlationId}][Stripe Webhook] Request details:`, {
      bodyLength: body.length,
      bodyPreview: body.substring(0, 100) + "...",
      signature,
      hasWebhookSecret: !!webhookSecret,
      webhookSecretLength: webhookSecret?.length,
      signatureLength: signature?.length,
      contentType: headersList.get("content-type"),
      contentLength: headersList.get("content-length"),
    });

    if (!signature || !webhookSecret) {
      console.error(
        `[${correlationId}][Stripe Webhook] Missing signature or webhook secret`,
        {
          hasSignature: !!signature,
          hasWebhookSecret: !!webhookSecret,
        }
      );
      return NextResponse.json(
        { error: "Missing signature or webhook secret" },
        { status: 400 }
      );
    }

    console.log(
      `[${correlationId}][Stripe Webhook] Verifying webhook signature`
    );

    try {
      // Parse the signature header
      const signatureParts = signature.split(",");
      const timestampPart = signatureParts.find((part) =>
        part.startsWith("t=")
      );
      const signaturePart = signatureParts.find((part) =>
        part.startsWith("v1=")
      );

      if (!timestampPart || !signaturePart) {
        throw new Error("Invalid signature format");
      }

      const timestamp = timestampPart.substring(2);
      const receivedSignature = signaturePart.substring(3);

      // Reconstruct the signed payload exactly as in the test script
      const signedPayload = `${timestamp}.${body}`;

      // Log the exact values we're using for verification
      console.log(`[${correlationId}][Stripe Webhook] Verification details:`, {
        timestamp,
        receivedSignature,
        signedPayloadLength: signedPayload.length,
        signedPayloadPreview: signedPayload.substring(0, 100) + "...",
        webhookSecretLength: webhookSecret.length,
        webhookSecretStart: webhookSecret.substring(0, 10) + "...",
        bodyLength: body.length,
        bodyPreview: body.substring(0, 100) + "...",
      });

      // Generate our own signature using the same method as the test script
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(signedPayload)
        .digest("hex");

      // Log the comparison
      console.log(`[${correlationId}][Stripe Webhook] Signature comparison:`, {
        receivedSignature,
        expectedSignature,
        match: receivedSignature === expectedSignature,
        signedPayloadLength: signedPayload.length,
      });

      if (receivedSignature !== expectedSignature) {
        throw new Error("Signature mismatch");
      }

      // Try to parse and validate the event structure
      let event;
      try {
        event = JSON.parse(body);

        // Validate event structure
        if (!event.type) {
          throw new Error("Invalid event: missing event type");
        }

        if (!event.data || !event.data.object) {
          throw new Error("Invalid event: missing event data");
        }

        console.log(
          `[${correlationId}][Stripe Webhook] Event parsed successfully:`,
          {
            id: event.id,
            type: event.type,
            hasData: !!event.data,
            hasObject: !!(event.data && event.data.object),
            dataKeys: Object.keys(event.data),
            objectKeys: event.data.object ? Object.keys(event.data.object) : [],
          }
        );

        // Process the event using the extracted function
        const result = await processStripeEvent(event, correlationId);

        return NextResponse.json(
          {
            received: true,
            message: result.message,
            success: result.success,
            eventType: event.type,
            eventId: event.id,
          },
          { status: 200 }
        );
      } catch (parseErr: any) {
        console.error(
          `[${correlationId}][Stripe Webhook] Event parsing failed:`,
          {
            error: parseErr.message,
            bodyPreview: body.substring(0, 200) + "...",
          }
        );
        throw parseErr;
      }
    } catch (err: any) {
      console.error(
        `[${correlationId}][Stripe Webhook] Signature verification failed:`,
        {
          error: err.message,
          type: err.type,
          stack: err.stack,
          bodyLength: body.length,
          bodyPreview: body.substring(0, 100) + "...",
          signature,
          webhookSecretLength: webhookSecret.length,
          webhookSecretStart: webhookSecret.substring(0, 10) + "...",
        }
      );
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error(`[${correlationId}][Stripe Webhook] Error:`, {
      message: error.message,
      stack: error.stack,
      type: error.type || error.constructor.name,
      code: error.code,
      cause: error.cause,
    });
    return NextResponse.json(
      {
        error: "Webhook handler failed",
        message: error.message,
        correlationId,
      },
      { status: 400 }
    );
  }
}
