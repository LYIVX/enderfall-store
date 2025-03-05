import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import axios from "axios";
import { supabase } from "@/lib/supabase";

// Helper function to normalize Minecraft usernames for consistent storage and lookup
function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/**
 * API Route: GET /api/minecraft/player-exists
 * This endpoint checks if a Minecraft player exists on the server
 * and returns their ranks, either from the server API or Supabase data
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Get the session from the server component
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get the username from the request
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { error: "No username provided" },
        { status: 400 }
      );
    }

    // Normalize the username
    const normalizedUsername = username.trim().toLowerCase();

    // For development purposes, always return that the player exists
    // This avoids issues with connecting to a Minecraft server that might not be running
    return NextResponse.json({
      exists: true,
      username: normalizedUsername,
      userData: {
        ranks: [], // Empty ranks by default
      },
    });

    /* Original implementation with Supabase:
    let exists = false;
    let userData = null;

    // First, try the Minecraft Server API
    try {
      const apiUrl = `${process.env.MINECRAFT_API_URL}/player/${normalizedUsername}`;

      const apiResponse = await axios.get(apiUrl, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Minecraft Shop API/1.0",
        },
      });

      // Check if the API indicates the player exists
      if (apiResponse.data && !apiResponse.data.error) {
        exists = true;
        userData = apiResponse.data;
      }
    } catch (error) {
      // Fall back to Supabase approach if API call fails
      // Continue to the next method, don't exit
    }

    // If API approach failed, try the Supabase approach
    if (!exists) {
      // Check user data in Supabase
      const { data: userRanks, error } = await supabase
        .from("user_ranks")
        .select("rank_id")
        .eq("minecraft_username", normalizedUsername);

      if (!error && userRanks && userRanks.length > 0) {
        exists = true;
        userData = {
          ranks: userRanks.map(rank => rank.rank_id)
        };
      }
    }

    // Return the result
    return NextResponse.json({
      exists,
      username: normalizedUsername,
      userData,
    });
    */
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check if player exists" },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get user data from Supabase
 */
async function getUserDataFromSupabase(username: string) {
  try {
    // Normalize username for consistency
    const normalizedUsername = normalizeUsername(username);

    // Get ranks from Supabase
    const { data: userRanks, error } = await supabase
      .from("user_ranks")
      .select("rank_id")
      .eq("minecraft_username", normalizedUsername);

    if (error) {
      console.error("Error getting user ranks from Supabase:", error);
      return null;
    }

    if (userRanks && userRanks.length > 0) {
      return {
        ranks: userRanks.map((rank) => rank.rank_id),
      };
    }

    return null;
  } catch (error) {
    console.error("Error getting user data from Supabase:", error);
    return null;
  }
}

/**
 * Helper function to update user data with ranks in Supabase
 */
async function updateUserDataInSupabase(username: string, ranks: string[]) {
  try {
    // Normalize username for consistency
    const normalizedUsername = normalizeUsername(username);

    // Process ranks to handle upgrades efficiently
    const cleanedRanks = processRanks(ranks);

    // First, delete existing ranks for this user
    const { error: deleteError } = await supabase
      .from("user_ranks")
      .delete()
      .eq("minecraft_username", normalizedUsername);

    if (deleteError) {
      console.error("Error deleting existing user ranks:", deleteError);
      return false;
    }

    // Now insert the new ranks
    if (cleanedRanks.length > 0) {
      const ranksToInsert = cleanedRanks.map((rankId) => ({
        minecraft_username: normalizedUsername,
        rank_id: rankId,
        created_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from("user_ranks")
        .insert(ranksToInsert);

      if (insertError) {
        console.error("Error inserting user ranks:", insertError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error updating user data in Supabase:", error);
    return false;
  }
}

/**
 * Helper function to process ranks and handle upgrades
 */
function processRanks(ranks: string[]): string[] {
  let cleanedRanks = [...ranks];

  // 1. Extract information from upgrade paths
  const upgradePathsToRemove: string[] = [];
  const sourceRanksToRemove: string[] = [];
  const destinationRanksToAdd: string[] = [];

  cleanedRanks.forEach((rankId) => {
    if (rankId.includes("_to_")) {
      upgradePathsToRemove.push(rankId);
      const [sourceRank, destRank] = rankId.split("_to_");
      sourceRanksToRemove.push(sourceRank);
      destinationRanksToAdd.push(destRank);
    }
  });

  // Only process if we found upgrade paths
  if (upgradePathsToRemove.length > 0) {
    // 2. Remove all upgrade paths
    cleanedRanks = cleanedRanks.filter(
      (r) => !upgradePathsToRemove.includes(r)
    );

    // 3. Remove all source ranks
    cleanedRanks = cleanedRanks.filter((r) => !sourceRanksToRemove.includes(r));

    // 4. Add all destination ranks
    destinationRanksToAdd.forEach((destRank) => {
      if (!cleanedRanks.includes(destRank)) {
        cleanedRanks.push(destRank);
      }
    });
  }

  return cleanedRanks;
}
