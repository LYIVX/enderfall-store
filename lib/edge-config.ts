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

        // Custom error message for permission issues
        if (updateResult.status === 403) {
          return {
            success: false,
            accounts: currentAccounts,
            error:
              "Server configuration error: Edge Config write access is restricted. Please contact an administrator.",
          };
        }

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

      // Custom error message for permission issues
      if (updateResult.status === 403) {
        return {
          success: false,
          accounts: currentAccounts,
          error:
            "Server configuration error: Edge Config write access is restricted. Please contact an administrator.",
        };
      }

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
export async function updateEdgeConfig(
  key: string,
  value: any
): Promise<{ success: boolean; error?: string; status?: number }> {
  try {
    console.log(`Attempting to update Edge Config key: ${key}`);

    // Check if EDGE_CONFIG environment variable is set
    if (!process.env.EDGE_CONFIG) {
      console.error("EDGE_CONFIG environment variable is not set");
      return { success: false, error: "Edge Config is not configured" };
    }

    // Extract the Edge Config ID and token from the connection string
    const connectionString = process.env.EDGE_CONFIG;
    console.log(`Using Edge Config from: ${connectionString}`);

    const edgeConfigId = connectionString.match(/ecfg_[a-zA-Z0-9]+/)?.[0];
    const token = connectionString.match(/token=([^&]+)/)?.[1];

    console.log(`Extracted Edge Config ID: ${edgeConfigId}`);

    if (!edgeConfigId || !token) {
      console.error(
        "Failed to extract Edge Config ID or token from connection string"
      );
      return { success: false, error: "Invalid Edge Config connection string" };
    }

    // Check if the key exists in Edge Config
    try {
      const edgeConfig = createClient(connectionString);
      const keyExists = await edgeConfig.has(key);
      console.log(`Key ${key} exists in Edge Config: ${keyExists}`);
    } catch (error) {
      console.error(`Error checking if key exists: ${error}`);
    }

    // Read the current data to get the digest for optimistic concurrency control
    try {
      const getResponse = await fetch(
        `https://edge-config.vercel.com/${edgeConfigId}?token=${token}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (getResponse.ok) {
        console.log(
          "Successfully read Edge Config data - read access is working"
        );
        const currentData = await getResponse.json();
        console.log(`Current Edge Config digest: ${currentData.digest}`);

        console.log(
          "*** IMPORTANT: The token can READ Edge Config data but CANNOT WRITE. ***"
        );
        console.log("*** To resolve this issue: ***");
        console.log(
          "*** 1. Go to Vercel Dashboard > Your Project > Settings > Environment Variables ***"
        );
        console.log(
          "*** 2. Create a new Edge Config token with WRITE permissions ***"
        );
        console.log(
          "*** 3. Update your EDGE_CONFIG environment variable with the new token ***"
        );
        console.log("*** For testing, try different URLs: ***");

        // Try multiple URL patterns with different attempts

        // Attempt 1: Simple direct URL
        const url1 = `https://edge-config.vercel.com/${edgeConfigId}?token=${token}`;
        console.log(`PATCH URL (attempt 1): ${url1}`);

        const response1 = await fetch(url1, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ [key]: value }),
        });

        if (response1.ok) {
          console.log(
            `Edge Config key ${key} updated successfully with attempt 1`
          );
          return { success: true };
        }

        console.log(`Attempt 1 failed with status ${response1.status}`);

        // Attempt 2: V1 projects URL format
        const url2 = `https://edge-config.vercel.com/v1/projects/${edgeConfigId}/items?token=${token}`;
        console.log(`PATCH URL (attempt 2): ${url2}`);

        const response2 = await fetch(url2, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ [key]: value }),
        });

        if (response2.ok) {
          console.log(
            `Edge Config key ${key} updated successfully with attempt 2`
          );
          return { success: true };
        }

        console.log(`Attempt 2 failed with status ${response2.status}`);

        // All attempts failed, return the most likely error
        return {
          success: false,
          error:
            "Edge Config token likely only has READ permissions. Please create a new token with WRITE permissions in the Vercel dashboard.",
          status: 403,
        };
      } else {
        const errorText = await getResponse.text();
        console.error(`Failed to get current Edge Config data: ${errorText}`);
        return {
          success: false,
          error: `Failed to get current Edge Config data: ${errorText}`,
          status: getResponse.status,
        };
      }
    } catch (error) {
      console.error(`Error updating Edge Config: ${error}`);
      return { success: false, error: `Error updating Edge Config: ${error}` };
    }
  } catch (error) {
    console.error(`Error in updateEdgeConfig: ${error}`);
    return { success: false, error: `Error in updateEdgeConfig: ${error}` };
  }
}
