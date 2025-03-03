import { get as edgeConfigGet, createClient } from "@vercel/edge-config";

// Re-export the get function
export const get = edgeConfigGet;

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
): Promise<{ success: boolean; accounts: string[]; error?: string }> {
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
      const updateResult = await updateEdgeConfig("minecraft-accounts", {
        ...allAccounts,
        [userId]: { accounts: updatedAccounts },
      });

      if (!updateResult.success) {
        console.error("Failed to update Edge Config:", updateResult.error);
        return {
          success: false,
          accounts: currentAccounts,
          error: updateResult.error || "Failed to save account",
        };
      }

      return { success: true, accounts: updatedAccounts };
    }

    return { success: true, accounts: currentAccounts };
  } catch (error) {
    console.error("Error adding saved account:", error);
    return {
      success: false,
      accounts: [],
      error:
        error instanceof Error ? error.message : "Unknown error saving account",
    };
  }
}

export async function removeSavedAccount(
  userId: string,
  username: string
): Promise<{ success: boolean; accounts: string[]; error?: string }> {
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
    const updateResult = await updateEdgeConfig("minecraft-accounts", {
      ...allAccounts,
      [userId]: { accounts: updatedAccounts },
    });

    if (!updateResult.success) {
      console.error("Failed to update Edge Config:", updateResult.error);
      return {
        success: false,
        accounts: currentAccounts,
        error: updateResult.error || "Failed to remove account",
      };
    }

    return { success: true, accounts: updatedAccounts };
  } catch (error) {
    console.error("Error removing saved account:", error);
    return {
      success: false,
      accounts: [],
      error:
        error instanceof Error
          ? error.message
          : "Unknown error removing account",
    };
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

    const initialLength = pendingPurchases.pendingPurchases.length;

    pendingPurchases.pendingPurchases =
      pendingPurchases.pendingPurchases.filter((purchase) => {
        // First check by session ID which is the primary identifier
        if (purchase.sessionId !== sessionId) {
          return true;
        }

        // If additional filters are provided, make sure they match too
        if (rankId && rankId !== purchase.rankId) {
          return true;
        }

        if (
          username &&
          normalizeUsername(username) !==
            normalizeUsername(purchase.minecraftUsername)
        ) {
          return true;
        }

        // If we get here, this purchase matches the filters and should be removed
        return false;
      });

    if (pendingPurchases.pendingPurchases.length === initialLength) {
      // No purchases were removed
      return {
        success: true,
        message: "No matching purchases found to remove",
      };
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

// Helper function to update Edge Config
export async function updateEdgeConfig(
  key: string,
  value: any
): Promise<{
  success: boolean;
  error?: string;
  status?: number;
  message?: string;
}> {
  try {
    console.log(`Attempting to update Edge Config key: ${key}`);

    // Now try to use the Vercel Edge Config API
    console.log("Attempting to update Edge Config using API...");

    // Only keys that the Edge Config API supports can be updated
    // minecraft-accounts, user-data, pending-purchases
    if (
      !["minecraft-accounts", "user-data", "pending-purchases"].includes(key)
    ) {
      console.error(`Key ${key} is not supported by Edge Config`);
      return {
        success: false,
        error: `Key ${key} is not supported by Edge Config`,
        status: 400,
      };
    }

    // First, get the current data
    const currentEdgeConfig = await get<any>(key);
    if (currentEdgeConfig === null || currentEdgeConfig === undefined) {
      console.error(`Could not read current value for key: ${key}`);
      return {
        success: false,
        error: `Could not read current value for key: ${key}`,
        status: 500,
      };
    }

    // Update the key manually in the Vercel dashboard
    console.log(
      "Please update the Edge Config key manually in the Vercel dashboard:"
    );
    console.log(`Key: ${key}`);
    console.log(`Value: ${JSON.stringify(value, null, 2)}`);

    return {
      success: true,
      message:
        "Please update the Edge Config key manually in the Vercel dashboard",
    };
  } catch (error) {
    console.error("Error in updateEdgeConfig:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during Edge Config update",
      status: 500,
    };
  }
}
