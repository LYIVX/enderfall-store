import { createClient } from "@supabase/supabase-js";

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase credentials. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for our Supabase tables
export type MinecraftAccount = {
  id: string;
  user_id: string;
  username: string;
  added_at: string;
};

export type UserRank = {
  id: string;
  minecraft_username: string;
  rank_id: string;
  created_at: string;
};

export type PendingPurchase = {
  id: string;
  user_id: string;
  rank_id: string;
  minecraft_username: string;
  timestamp: number;
  session_id: string;
  is_gift: boolean;
  recipient?: string;
  created_at?: string;
};

// Helper function to normalize usernames
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

// Minecraft Accounts Functions
export async function getSavedAccounts(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("minecraft_accounts")
      .select("username")
      .eq("user_id", userId);

    if (error) {
      console.error("Error getting saved accounts:", error);
      return [];
    }

    return data.map((account) => account.username);
  } catch (error) {
    console.error("Exception getting saved accounts:", error);
    return [];
  }
}

export async function addSavedAccount(
  userId: string,
  username: string
): Promise<{ success: boolean; accounts: string[]; error?: string }> {
  try {
    // Get current accounts
    const currentAccounts = await getSavedAccounts(userId);

    // Check if account already exists
    if (!currentAccounts.includes(username)) {
      // Add the account to the user's saved accounts
      const updatedAccounts = [...currentAccounts, username];

      // Limit to 5 accounts
      if (updatedAccounts.length > 5) {
        // Find the oldest account to remove
        const { data: oldestAccount } = await supabase
          .from("minecraft_accounts")
          .select("*")
          .eq("user_id", userId)
          .order("added_at", { ascending: true })
          .limit(1);

        if (oldestAccount && oldestAccount.length > 0) {
          // Delete the oldest account
          await supabase
            .from("minecraft_accounts")
            .delete()
            .eq("id", oldestAccount[0].id);
        }
      }

      // Insert the new account
      const { error } = await supabase.from("minecraft_accounts").insert({
        user_id: userId,
        username: username,
        added_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Failed to add account:", error);
        return {
          success: false,
          accounts: currentAccounts,
          error: error.message || "Failed to save account",
        };
      }

      // Return updated accounts (fetch again to get the current state)
      const updatedAccountsList = await getSavedAccounts(userId);
      return { success: true, accounts: updatedAccountsList };
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
    console.log(`Attempting to remove account ${username} for user ${userId}`);

    // Delete the account
    const { error, count } = await supabase
      .from("minecraft_accounts")
      .delete()
      .eq("user_id", userId)
      .eq("username", username)
      .select();

    if (error) {
      console.error("Failed to remove account:", error);
      return {
        success: false,
        accounts: await getSavedAccounts(userId),
        error: error.message || "Failed to remove account",
      };
    }

    console.log(`Successfully removed ${count} account(s)`);

    // Return updated accounts
    const updatedAccounts = await getSavedAccounts(userId);
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
export async function getUserRanks(
  minecraftUsername: string
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("user_ranks")
      .select("rank_id")
      .eq("minecraft_username", minecraftUsername.toLowerCase());

    if (error) {
      console.error("Error getting user ranks:", error);
      return [];
    }

    return data.map((rank) => rank.rank_id);
  } catch (error) {
    console.error("Exception getting user ranks:", error);
    return [];
  }
}

export async function saveUserRankData(
  minecraftUsername: string,
  rankId: string
): Promise<boolean> {
  try {
    const normalizedUsername = minecraftUsername.toLowerCase();

    // Process rank properly, especially for upgrades
    if (rankId.includes("_to_")) {
      const [sourceRankId, destinationRankId] = rankId.split("_to_");

      // 1. Get current ranks
      const userRanks = await getUserRanks(normalizedUsername);

      // 2. Remove the source rank if exists
      if (userRanks.includes(sourceRankId)) {
        await supabase
          .from("user_ranks")
          .delete()
          .eq("minecraft_username", normalizedUsername)
          .eq("rank_id", sourceRankId);
      }

      // 3. Add the destination rank if not already owned
      if (!userRanks.includes(destinationRankId)) {
        await supabase.from("user_ranks").insert({
          minecraft_username: normalizedUsername,
          rank_id: destinationRankId,
          created_at: new Date().toISOString(),
        });
      }
    } else {
      // Regular rank - add if not already owned
      const userRanks = await getUserRanks(normalizedUsername);
      if (!userRanks.includes(rankId)) {
        await supabase.from("user_ranks").insert({
          minecraft_username: normalizedUsername,
          rank_id: rankId,
          created_at: new Date().toISOString(),
        });
      }
    }

    return true;
  } catch (error) {
    console.error("Error saving user rank data:", error);
    return false;
  }
}

// Pending Purchases Functions
export async function getPendingPurchases(): Promise<PendingPurchase[]> {
  try {
    const { data, error } = await supabase
      .from("pending_purchases")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error getting pending purchases:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Exception getting pending purchases:", error);
    return [];
  }
}

export async function addPendingPurchase(
  purchase: Omit<PendingPurchase, "id" | "created_at">
): Promise<boolean> {
  try {
    const { error } = await supabase.from("pending_purchases").insert({
      user_id: purchase.user_id,
      rank_id: purchase.rank_id,
      minecraft_username: purchase.minecraft_username,
      timestamp: purchase.timestamp,
      session_id: purchase.session_id,
      is_gift: purchase.is_gift,
      recipient: purchase.recipient,
    });

    if (error) {
      console.error("Error adding pending purchase:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Exception adding pending purchase:", error);
    return false;
  }
}

export async function removePendingPurchase(
  sessionId: string,
  rankId?: string,
  username?: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Build the query
    let query = supabase.from("pending_purchases").delete();

    // Filter by session ID
    query = query.eq("session_id", sessionId);

    // Add additional filters if provided
    if (rankId) {
      query = query.eq("rank_id", rankId);
    }

    if (username) {
      query = query.eq("minecraft_username", normalizeUsername(username));
    }

    const { error } = await query;

    if (error) {
      console.error("Error removing pending purchase:", error);
      return {
        success: false,
        message: "Failed to remove pending purchase from database",
      };
    }

    return {
      success: true,
      message: "Pending purchase removed successfully",
    };
  } catch (error) {
    console.error("Exception removing pending purchase:", error);
    return {
      success: false,
      message: "Failed to remove pending purchase due to an unexpected error",
    };
  }
}
