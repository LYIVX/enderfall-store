import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import axios from "axios";
import Stripe from "stripe";
import { ranksConfig } from "@/lib/ranks";
import { v4 as uuidv4 } from "uuid";
import { getRankById } from "@/lib/ranks";
import crypto from "crypto";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  saveUserRankData as saveRankToSupabase,
  removePendingPurchase as removeSupabasePendingPurchase,
  normalizeUsername,
} from "@/lib/supabase";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!.trim();

// Define types for better type safety
interface PendingRank {
  username: string;
  rank_id: string;
  created_at: string;
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
  try {
    // Call Supabase library function to save the rank
    const savedRank = await saveRankToSupabase(minecraftUsername, rankId);

    if (!savedRank) {
      return {
        success: false,
        message: "Failed to save rank data in Supabase",
      };
    }

    // Call the Minecraft plugin's API to apply the rank
    try {
      const apiKey = process.env.MINECRAFT_SERVER_API_KEY;
      console.log("Debug - API Key details:", {
        keyExists: !!apiKey,
        keyLength: apiKey?.length,
        firstFewChars: apiKey?.substring(0, 5),
      });

      console.log("Calling Minecraft server API:", {
        url: `${process.env.MINECRAFT_SERVER_API_URL}/api/apply-rank`,
        username: minecraftUsername.toLowerCase(),
        rank: rankId,
        authHeader: `Bearer ${apiKey}`,
      });

      const response = await axios.post(
        `${process.env.MINECRAFT_SERVER_API_URL}/api/apply-rank`,
        {
          username: minecraftUsername.toLowerCase(),
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

    // Get the user's ranks from Supabase to return in the response
    const { data: userRanks } = await supabase
      .from("user_ranks")
      .select("rank_id")
      .eq("minecraft_username", minecraftUsername.toLowerCase());

    return {
      success: true,
      message: "Rank successfully saved and applied",
      userData: {
        username: minecraftUsername.toLowerCase(),
        ranks: userRanks?.map((rank) => rank.rank_id) || [],
      },
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
    // Call the Supabase function to remove the pending purchase
    const result = await removeSupabasePendingPurchase(
      sessionId,
      rankId,
      username
    );

    return result;
  } catch (error) {
    console.error("Error removing pending purchase:", error);
    return {
      success: false,
      message: "Failed to remove pending purchase due to an unexpected error",
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
        const result: any = {
          pendingRanks: [],
          pendingPurchases: [],
          userData: {},
        };

        // Check pending ranks in Supabase
        const { data: pendingRanksData, error: pendingRanksError } =
          await supabase.from("pending_ranks_backup").select("*");

        if (!pendingRanksError) {
          result.pendingRanks = pendingRanksData || [];
        } else {
          console.error("Error fetching pending ranks:", pendingRanksError);
        }

        // Check pending purchases in Supabase
        const { data: pendingPurchases, error: purchasesError } = await supabase
          .from("pending_purchases")
          .select("*");

        if (!purchasesError) {
          result.pendingPurchases = pendingPurchases || [];
        } else {
          console.error("Error fetching pending purchases:", purchasesError);
        }

        // Check user data for a specific user if provided
        if (username) {
          const { data: userRanks, error: userRanksError } = await supabase
            .from("user_ranks")
            .select("*")
            .eq("minecraft_username", username.toLowerCase());

          if (!userRanksError && userRanks) {
            result.userData = { ranks: userRanks.map((rank) => rank.rank_id) };
          } else {
            result.userData = { message: "User not found in user data" };
          }
        }

        // Get server config
        const servers = {
          lobby: {
            ip: process.env.LOBBY_SERVER_IP || "unknown",
            apiPort: process.env.LOBBY_SERVER_API_PORT || "unknown",
          },
          survival: {
            ip: process.env.SURVIVAL_SERVER_IP || "unknown",
            apiPort: process.env.SURVIVAL_SERVER_API_PORT || "unknown",
          },
        };

        return NextResponse.json({
          message: "Diagnostic information retrieved",
          ...result,
          serverConfig: {
            lobby: {
              ip: servers.lobby.ip,
              apiPort: servers.lobby.apiPort,
            },
            survival: {
              ip: servers.survival.ip,
              apiPort: servers.survival.apiPort,
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

    // Get user ranks from Supabase
    const { data: userRanks, error: userRanksError } = await supabase
      .from("user_ranks")
      .select("*")
      .eq("minecraft_username", normalizedUsername);

    if (userRanksError) {
      return NextResponse.json(
        {
          message: "Failed to fetch user ranks from database",
          error: userRanksError.message,
        },
        { status: 500 }
      );
    }

    // Check if the user exists
    if (!userRanks || userRanks.length === 0) {
      return NextResponse.json(
        { message: "User not found or has no ranks" },
        { status: 404 }
      );
    }

    // Get the user's current ranks
    const currentRanks = userRanks.map((rank) => rank.rank_id);

    // If reset is requested, clear the ranks
    if (shouldReset) {
      // Delete the user's ranks from Supabase
      const { error: deleteError } = await supabase
        .from("user_ranks")
        .delete()
        .eq("minecraft_username", normalizedUsername);

      if (deleteError) {
        return NextResponse.json(
          { message: "Failed to reset user ranks", error: deleteError.message },
          { status: 500 }
        );
      }

      // Also clear any pending ranks
      await supabase
        .from("pending_ranks_backup")
        .delete()
        .eq("username", normalizedUsername);

      // Clear pending purchases
      await supabase
        .from("pending_purchases")
        .delete()
        .eq("minecraft_username", normalizedUsername);

      // Clear applied ranks
      await supabase
        .from("applied_ranks")
        .delete()
        .eq("minecraft_username", normalizedUsername);

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
  survival: {
    name: "Survival",
    ip: envConfig.useLocalServers
      ? "localhost"
      : process.env.MINECRAFT_SURVIVAL_IP || "localhost",
    apiPort: parseInt(process.env.MINECRAFT_SURVIVAL_API_PORT || "8137"),
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
  survival: {
    ip: servers.survival.ip,
    apiPort: servers.survival.apiPort,
    hasIp: !!process.env.MINECRAFT_SURVIVAL_IP,
    hasPort: !!process.env.MINECRAFT_SURVIVAL_API_PORT,
  },
});

// Helper function to determine if a rank is a towny rank
function isTownyRank(rankId: string): boolean {
  // First check if this is a known survival rank
  if (rankId.toLowerCase() === "shadow_enchanter") {
    console.log(
      `Rank '${rankId}' identified as a survival rank, not a towny rank`
    );
    return false;
  }

  // First check if it's a towny prefix rank
  if (rankId.toLowerCase().startsWith("towny_")) {
    return true;
  }

  // List of known towny ranks
  const townyRanks = [
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
  ];

  // Check if it's in the towny ranks list
  if (townyRanks.includes(rankId.toLowerCase())) {
    return true;
  }

  // List of known survival ranks
  const survivalRanks = [
    "shadow_enchanter",
    "crystal_master",
    "elemental_guardian",
    "void_walker",
    "celestial_sovereign",
  ];

  // If it's a survival rank, it's not a towny rank
  if (survivalRanks.includes(rankId.toLowerCase())) {
    return false;
  }

  // Default to false if not explicitly identified
  console.log(`Rank '${rankId}' not recognized, defaulting to non-towny`);
  return false;
}

// Helper function to apply rank to a specific server
async function applyRankToServer(
  server: ServerConfig,
  username: string,
  rankId: string
): Promise<boolean> {
  const correlationId = Math.random().toString(36).substring(7);
  const apiUrl = `http://${server.ip}:${server.apiPort}/api/apply-rank`;

  console.log(
    `[${correlationId}][Rank Application] Applying rank to server ${server.name}:`,
    {
      username,
      rankId,
      serverName: server.name,
      apiUrl: apiUrl,
    }
  );

  // Get API key from environment
  const apiKey = process.env.MINECRAFT_SERVER_API_KEY;
  if (!apiKey) {
    console.error(
      `[${correlationId}][Rank Application] MINECRAFT_SERVER_API_KEY is not configured`
    );
    return false;
  }

  console.log(`[${correlationId}][Rank Application] Using API key:`, {
    keyExists: !!apiKey,
    keyLength: apiKey.length,
    keyPreview: `${apiKey.substring(0, 5)}...`,
  });

  try {
    // Added timeout to prevent requests from hanging indefinitely
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased timeout to 15 seconds

    // Apply the rank via the API
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Correlation-ID": correlationId,
      },
      body: JSON.stringify({
        username,
        rankId,
        rank: rankId, // Include for backward compatibility
        server: server.name.toLowerCase(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Log the status code
    console.log(
      `[${correlationId}][Rank Application] Response status:`,
      response.status
    );

    // Attempt to parse as JSON, but handle non-JSON responses as well
    let responseData;
    const responseText = await response.text();

    try {
      if (responseText) {
        responseData = JSON.parse(responseText);
        console.log(
          `[${correlationId}][Rank Application] Response data:`,
          responseData
        );
      } else {
        console.log(`[${correlationId}][Rank Application] Empty response body`);
      }
    } catch (error) {
      console.log(
        `[${correlationId}][Rank Application] Non-JSON response:`,
        responseText
      );
    }

    // Consider anything in the 200-299 range as successful
    return response.status >= 200 && response.status < 300;
  } catch (error: any) {
    // Provide detailed error information to help diagnose connection issues
    console.error(
      `[${correlationId}][Rank Application] Error applying rank to server:`,
      {
        message: error.message,
        stack: error.stack,
        type: error.name,
        isTimeout: error.name === "AbortError",
        server: server.name,
        ip: server.ip,
        port: server.apiPort,
      }
    );
    return false;
  }
}

// Function to apply rank across servers
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
        // Added timeout to prevent requests from hanging indefinitely
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased timeout to 15 seconds

        try {
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
              signal: controller.signal,
            }
          );

          clearTimeout(timeoutId);

          // Log full response details
          const responseText = await response.text();
          console.log(
            `[${correlationId}][Rank Application] Response details:`,
            {
              status: response.status,
              statusText: response.statusText,
              body: responseText,
              ok: response.ok,
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
                body: responseText,
              }
            );
          }
        } catch (error: any) {
          clearTimeout(timeoutId);
          console.error(
            `[${correlationId}][Rank Application] Error applying rank directly to main API endpoint:`,
            {
              message: error.message,
              stack: error.stack,
              type: error.name,
              isTimeout: error.name === "AbortError",
            }
          );
        }
      }
    }
  } catch (error: any) {
    console.error(
      `[${correlationId}][Rank Application] Error applying rank directly to main API endpoint:`,
      {
        message: error.message,
        stack: error.stack,
        type: error.name,
        isTimeout: error.name === "AbortError",
      }
    );
  }

  // Fall back to server-specific applications if direct application fails
  const isTowny = isTownyRank(rankId);
  console.log(
    `[${correlationId}][Rank Application] Rank type:`,
    isTowny ? "Towny" : "Regular"
  );

  // Add the rank to Supabase storage first (for backup in case server communication fails)
  try {
    // Import the Supabase client inside the function to avoid circular dependencies
    const { supabase } = await import("@/lib/supabase");

    // Add this rank to pending ranks as a backup
    const { error } = await supabase.from("pending_ranks_backup").insert({
      username: username.toLowerCase(),
      rank_id: rankId,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error(
        `[${correlationId}][Rank Application] Error saving to Supabase pending ranks:`,
        error
      );
    } else {
      console.log(
        `[${correlationId}][Rank Application] Added rank to Supabase pending ranks backup`
      );
    }
  } catch (error) {
    console.error(
      `[${correlationId}][Rank Application] Error saving to Supabase pending ranks:`,
      error
    );
    // Continue processing even if backup fails
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
          `[${correlationId}][Rank Application] Applying Towny rank to Survival server only (attempt ${attempts})`
        );
        success = await applyRankToServer(servers.survival, username, rankId);
      } else {
        // For non-towny ranks (like shadow_enchanter), apply to all servers
        console.log(
          `[${correlationId}][Rank Application] Applying rank '${rankId}' to all servers (attempt ${attempts})`
        );

        // Always apply to both servers for non-towny ranks
        const lobbyPromise = applyRankToServer(servers.lobby, username, rankId);
        const survivalPromise = applyRankToServer(
          servers.survival,
          username,
          rankId
        );

        // Wait for both requests to complete
        const [lobbySuccess, survivalSuccess] = await Promise.all([
          lobbyPromise,
          survivalPromise,
        ]);

        // Even if one server succeeds, we consider it a success and continue
        // This prevents one server being down from blocking rank application
        success = lobbySuccess || survivalSuccess;

        console.log(
          `[${correlationId}][Rank Application] Application results (attempt ${attempts}):`,
          {
            lobby: lobbySuccess,
            survival: survivalSuccess,
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

  // Add detailed debug logging
  try {
    const eventJson = JSON.stringify(event);
    console.log(
      `[${correlationId}][Stripe Webhook] FULL EVENT DATA: ${eventJson.substring(0, 1000)}...`
    );

    if (event.data && event.data.object) {
      console.log(
        `[${correlationId}][Stripe Webhook] Session ID: ${event.data.object.id}`
      );
      console.log(
        `[${correlationId}][Stripe Webhook] Payment Status: ${event.data.object.payment_status}`
      );

      if (event.data.object.metadata) {
        console.log(
          `[${correlationId}][Stripe Webhook] Metadata:`,
          event.data.object.metadata
        );
      }
    }
  } catch (err) {
    console.error(
      `[${correlationId}][Stripe Webhook] Error logging event:`,
      err
    );
  }

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

      // First save the user's rank data - do this regardless of server availability
      // This ensures the rank is saved even if servers are temporarily down
      const saveResult = await saveUserRankData(username, rankId);
      console.log(`[${correlationId}][Stripe Webhook] User rank data saved`, {
        success: saveResult.success,
        message: saveResult.message,
      });

      // Load the existing pending purchases and remove this one
      await removePendingPurchase(session.id, rankId, username);

      // Apply the rank to the user's Minecraft account
      let rankApplied = false;
      let retryCount = 0;
      const MAX_APPLICATION_RETRIES = 3;

      while (!rankApplied && retryCount < MAX_APPLICATION_RETRIES) {
        console.log(
          `[${correlationId}][Stripe Webhook] Attempt ${retryCount + 1} to apply rank to user`
        );

        rankApplied = await applyRankAcrossServers(username, rankId);

        if (!rankApplied && retryCount < MAX_APPLICATION_RETRIES - 1) {
          const waitTime = Math.pow(2, retryCount) * 1000;
          console.log(
            `[${correlationId}][Stripe Webhook] Server communication failed, waiting ${waitTime}ms before retry`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }

        retryCount++;
      }

      if (rankApplied) {
        console.log(
          `[${correlationId}][Stripe Webhook] Successfully applied rank`,
          {
            username,
            rankId,
          }
        );

        return {
          success: true,
          message: "Rank purchase processed successfully",
        };
      } else {
        console.error(
          `[${correlationId}][Stripe Webhook] Failed to apply rank to servers`,
          {
            username,
            rankId,
          }
        );

        // Even if server communication failed, we still saved the rank data
        // so consider it a partial success that will be reconciled later
        return {
          success: true, // Consider this a success since we saved the rank data
          message:
            "Rank saved, but server communication failed. Rank will be applied when user next joins.",
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

// Add a backup of the pending rank to Supabase
async function savePendingRankBackup(pendingRank: PendingRank) {
  try {
    const { error } = await supabase.from("pending_ranks_backup").insert({
      username: pendingRank.username,
      rank_id: pendingRank.rank_id,
      created_at: pendingRank.created_at,
    });

    if (error) {
      console.error("Error saving pending rank backup:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Exception saving pending rank backup:", error);
    return false;
  }
}
