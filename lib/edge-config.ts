import { get } from "@vercel/edge-config";

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
    // Get Edge Config ID and token from environment variables
    const edgeConfigId = process.env.EDGE_CONFIG_ID;
    const token = process.env.EDGE_CONFIG_TOKEN;

    if (!edgeConfigId || !token) {
      throw new Error(
        "Edge Config ID or token is missing in environment variables"
      );
    }

    const response = await fetch(
      `https://edge-config.vercel.com/${edgeConfigId}/items?token=${token}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              operation: "upsert",
              key,
              value,
            },
          ],
        }),
      }
    );

    // Check if the response is ok but don't try to parse it as JSON
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Edge Config update error:", errorText);
      throw new Error(
        `Failed to update Edge Config: Status ${response.status}`
      );
    }
  } catch (error) {
    console.error("Edge Config update error:", error);
    throw error;
  }
}
