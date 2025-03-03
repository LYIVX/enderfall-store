import { kv } from "@vercel/kv";

export interface SavedAccountsData {
  [userId: string]: {
    accounts: string[];
  };
}

export async function getSavedAccounts(userId: string): Promise<string[]> {
  try {
    const savedAccounts = await kv.hget<{ accounts: string[] }>(
      "minecraft-accounts",
      userId
    );
    return savedAccounts?.accounts || [];
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
    // Get current accounts
    const currentAccounts = await getSavedAccounts(userId);

    // Check if account already exists
    if (!currentAccounts.includes(username)) {
      // Add the account to the user's saved accounts
      const updatedAccounts = [...currentAccounts, username];

      // Limit to 5 accounts
      if (updatedAccounts.length > 5) {
        updatedAccounts.shift(); // Remove oldest account
      }

      // Update in KV store
      await kv.hset("minecraft-accounts", {
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
    // Get current accounts
    const currentAccounts = await getSavedAccounts(userId);

    // Filter out the account to be removed
    const updatedAccounts = currentAccounts.filter(
      (account) => account !== username
    );

    // Update in KV store
    await kv.hset("minecraft-accounts", {
      [userId]: { accounts: updatedAccounts },
    });

    return updatedAccounts;
  } catch (error) {
    console.error("Error removing saved account:", error);
    return [];
  }
}
