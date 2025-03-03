import { get, createClient } from "@vercel/edge-config";

// Interfaces
export interface SavedAccountsData {
  [userId: string]: {
    accounts: string[];
  };
}

export interface UserRanks {
  ranks: string[];
}

export interface UserData {
  users: Record<string, UserRanks>;
}

export interface PendingPurchase {
  userId: string;
  rankId: string;
  minecraftUsername: string;
  timestamp: number;
  sessionId: string;
  isGift: boolean;
  recipient?: string;
}

export interface PendingPurchasesData {
  pendingPurchases: PendingPurchase[];
}

export interface ResetData {
  [userId: string]: {
    resetAt: string;
    sessionIds: string[];
    active: boolean;
  };
}

// Helper function to normalize usernames
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

// Minecraft Accounts Functions
export async function getSavedAccounts(userId: string): Promise<string[]> {
  try {
    const accounts = await get<SavedAccountsData>("minecraft-accounts");
    return accounts?.[userId]?.accounts || [];
  } catch (error) {
    console.error("Error getting saved accounts:", error);
    return [];
  }
}

export async function addSavedAccount(
  userId: string,
  username: string
): Promise<string[]> {
  try {
    // Get all accounts first
    const allAccounts =
      (await get<SavedAccountsData>("minecraft-accounts")) || {};

    // Get current user accounts
    const currentAccounts = allAccounts[userId]?.accounts || [];

    // Check if account already exists
    if (!currentAccounts.includes(username)) {
      // Add the account to the user's saved accounts
      const updatedAccounts = [...currentAccounts, username];

      // Limit to 5 accounts
      if (updatedAccounts.length > 5) {
        updatedAccounts.shift(); // Remove oldest account
      }

      // Update in Edge Config through API
      await updateEdgeConfig("minecraft-accounts", {
        ...allAccounts,
        [userId]: { accounts: updatedAccounts },
      });

      return updatedAccounts;
    }

    return currentAccounts;
  } catch (error) {
    console.error("Error adding saved account:", error);
    return [];
  }
}

export async function removeSavedAccount(
  userId: string,
  username: string
): Promise<string[]> {
  try {
    // Get all accounts first
    const allAccounts =
      (await get<SavedAccountsData>("minecraft-accounts")) || {};

    // Get current user accounts
    const currentAccounts = allAccounts[userId]?.accounts || [];

    // Filter out the account to be removed
    const updatedAccounts = currentAccounts.filter(
      (account) => account !== username
    );

    // Update in Edge Config through API
    await updateEdgeConfig("minecraft-accounts", {
      ...allAccounts,
      [userId]: { accounts: updatedAccounts },
    });

    return updatedAccounts;
  } catch (error) {
    console.error("Error removing saved account:", error);
    return [];
  }
}

// User Data Functions
export async function getUserData(): Promise<UserData> {
  try {
    const userData = await get<UserData>("user-data");
    return userData || { users: {} };
  } catch (error) {
    console.error("Error getting user data:", error);
    return { users: {} };
  }
}

export async function saveUserRankData(
  minecraftUsername: string,
  rankId: string
): Promise<boolean> {
  try {
    const userData = await getUserData();
    const normalizedUsername = normalizeUsername(minecraftUsername);

    if (!userData.users[normalizedUsername]) {
      userData.users[normalizedUsername] = { ranks: [] };
    }

    // Process rank properly, especially for upgrades
    if (rankId.includes("_to_")) {
      const [sourceRankId, destinationRankId] = rankId.split("_to_");
      let userRanks = [...userData.users[normalizedUsername].ranks];

      // 1. Remove all upgrade paths
      userRanks = userRanks.filter((r) => !r.includes("_to_"));
      // 2. Remove the source rank
      userRanks = userRanks.filter((r) => r !== sourceRankId);
      // 3. Add the destination rank if not already there
      if (!userRanks.includes(destinationRankId)) {
        userRanks.push(destinationRankId);
      }

      userData.users[normalizedUsername].ranks = userRanks;
    } else {
      // Regular rank - add if not already owned
      if (!userData.users[normalizedUsername].ranks.includes(rankId)) {
        userData.users[normalizedUsername].ranks.push(rankId);
      }
    }

    await updateEdgeConfig("user-data", userData);
    return true;
  } catch (error) {
    console.error("Error saving user rank data:", error);
    return false;
  }
}

// Pending Purchases Functions
export async function getPendingPurchases(): Promise<PendingPurchasesData> {
  try {
    const pendingPurchases =
      await get<PendingPurchasesData>("pending-purchases");
    return pendingPurchases || { pendingPurchases: [] };
  } catch (error) {
    console.error("Error getting pending purchases:", error);
    return { pendingPurchases: [] };
  }
}

export async function addPendingPurchase(
  purchase: PendingPurchase
): Promise<boolean> {
  try {
    const pendingPurchases = await getPendingPurchases();
    pendingPurchases.pendingPurchases.push(purchase);
    await updateEdgeConfig("pending-purchases", pendingPurchases);
    return true;
  } catch (error) {
    console.error("Error adding pending purchase:", error);
    return false;
  }
}

export async function removePendingPurchase(
  sessionId: string,
  rankId?: string,
  username?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const pendingPurchases = await getPendingPurchases();
    const originalLength = pendingPurchases.pendingPurchases.length;

    // First try exact session ID match
    pendingPurchases.pendingPurchases =
      pendingPurchases.pendingPurchases.filter(
        (purchase) => purchase.sessionId !== sessionId
      );

    // If no match and we have rank ID + username, try matching those
    if (
      originalLength === pendingPurchases.pendingPurchases.length &&
      rankId &&
      username
    ) {
      const normalizedUsername = normalizeUsername(username);
      pendingPurchases.pendingPurchases =
        pendingPurchases.pendingPurchases.filter(
          (purchase) =>
            !(
              purchase.rankId === rankId &&
              normalizeUsername(purchase.minecraftUsername) ===
                normalizedUsername
            )
        );
    }

    await updateEdgeConfig("pending-purchases", pendingPurchases);

    return {
      success: true,
      message: "Pending purchase removed successfully",
    };
  } catch (error) {
    console.error("Error removing pending purchase:", error);
    return {
      success: false,
      message: "Failed to remove pending purchase",
    };
  }
}

// Reset Functions
export async function getResetData(): Promise<ResetData> {
  try {
    const resetData = await get<ResetData>("resets");
    return resetData || {};
  } catch (error) {
    console.error("Error getting reset data:", error);
    return {};
  }
}

export async function updateResetData(
  userId: string,
  resetActive: boolean,
  sessionIds?: string[]
): Promise<boolean> {
  try {
    const resets = await getResetData();

    if (resetActive) {
      resets[userId] = {
        resetAt: new Date().toISOString(),
        sessionIds: sessionIds || [],
        active: true,
      };
    } else if (resets[userId]) {
      resets[userId].active = false;
    }

    await updateEdgeConfig("resets", resets);
    return true;
  } catch (error) {
    console.error("Error updating reset data:", error);
    return false;
  }
}

// Helper function to update Edge Config
export async function updateEdgeConfig(key: string, value: any): Promise<void> {
  try {
    console.log(`Attempting to update Edge Config key: ${key}`);

    // The current version of @vercel/edge-config (1.4.0) doesn't support 'set'
    // We need to use a direct API approach instead
    const edgeConfigString = process.env.EDGE_CONFIG;

    if (!edgeConfigString) {
      throw new Error("EDGE_CONFIG environment variable is missing");
    }

    // Remove @ prefix if present
    const cleanConfigString = edgeConfigString.startsWith("@")
      ? edgeConfigString.substring(1)
      : edgeConfigString;

    console.log("Using Edge Config from:", cleanConfigString);

    // Extract Edge Config ID and token from the connection string
    // Format: https://edge-config.vercel.com/ecfg_xxx?token=yyy
    const match = cleanConfigString.match(
      /edge-config\.vercel\.com\/([^?]+)\?token=([^&]+)/
    );

    if (!match || match.length < 3) {
      console.error("Failed to parse Edge Config URL:", cleanConfigString);
      throw new Error("Invalid EDGE_CONFIG format");
    }

    const edgeConfigId = match[1];
    const token = match[2];

    console.log("Extracted Edge Config ID:", edgeConfigId);

    // First attempt to use the SDK to validate we can read data
    try {
      const edgeConfig = createClient(process.env.EDGE_CONFIG || "");
      const exists = await edgeConfig.has(key);
      console.log(`Key ${key} exists in Edge Config: ${exists}`);
    } catch (readError) {
      console.error("Error reading from Edge Config:", readError);
    }

    // Now try to update using API directly with correct URL pattern
    console.log("Updating Edge Config via direct API call");

    // The URL must include the /items endpoint for Edge Config updates
    const response = await fetch(
      `https://edge-config.vercel.com/${edgeConfigId}/items?token=${token}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [key]: value }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Edge Config update error:", errorText);
      console.error("Response status:", response.status);

      throw new Error(
        `Unable to update Edge Config (Status: ${response.status}). Please run 'vercel env pull' to update your environment variables with proper write access.`
      );
    }

    console.log(`Successfully updated Edge Config key: ${key}`);
  } catch (error) {
    console.error("Edge Config update error:", error);
    throw error;
  }
}
