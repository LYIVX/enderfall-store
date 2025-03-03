import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";
import axios from "axios";
import { checkPlayerExists as checkLocalPlayerExists } from "@/lib/minecraft-server";

// Interface for the user data stored in the local file
interface UserData {
  users: {
    [username: string]: {
      ranks: string[];
    };
  };
}

// Helper function to normalize Minecraft usernames for consistent storage and lookup
function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/**
 * API Route: GET /api/minecraft/player-exists
 * This endpoint checks if a Minecraft player exists on the server
 * and returns their ranks, either from the server API or locally cached data
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

    /* Original implementation:
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
      // Fall back to local approach if API call fails
      // Continue to the next method, don't exit
    }

    // If API approach failed, try the local file approach
    if (!exists) {
      // Check local user data file
      const dataDir = path.join(process.cwd(), "data");
      const userDataPath = path.join(dataDir, "user-data.json");

      if (fs.existsSync(userDataPath)) {
        const localData = JSON.parse(fs.readFileSync(userDataPath, "utf8"));

        // Check if username exists in local data
        if (localData.users && localData.users[normalizedUsername]) {
          exists = true;
          userData = localData.users[normalizedUsername];
        }
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
 * Helper function to get user data from the local JSON file
 */
async function getLocalUserData(username: string) {
  try {
    const dataFilePath = path.join(process.cwd(), "data", "user-data.json");

    // If the file doesn't exist, return null
    if (!fs.existsSync(dataFilePath)) {
      return null;
    }

    // Read and parse the file
    const fileData = fs.readFileSync(dataFilePath, "utf8");
    const userData: UserData = JSON.parse(fileData);

    // Normalize username for consistency
    const normalizedUsername = normalizeUsername(username);

    // Return the user data if it exists
    if (userData.users[normalizedUsername]) {
      return userData.users[normalizedUsername];
    }

    return null;
  } catch (error) {
    console.error("Error getting local user data:", error);
    return null;
  }
}

/**
 * Helper function to update local user data with ranks from the server
 */
async function updateLocalUserData(username: string, ranks: string[]) {
  try {
    const dataDir = path.join(process.cwd(), "data");
    const dataFilePath = path.join(dataDir, "user-data.json");

    // Ensure the data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialize with empty data if the file doesn't exist
    let userData: UserData = { users: {} };

    // Read existing data if available
    if (fs.existsSync(dataFilePath)) {
      try {
        const fileData = fs.readFileSync(dataFilePath, "utf8");
        userData = JSON.parse(fileData);
      } catch {
        // Continue with empty structure if there's an error
      }
    }

    // Normalize username for consistency
    const normalizedUsername = normalizeUsername(username);

    // Process ranks to handle upgrades efficiently
    const cleanedRanks = processRanks(ranks);

    // Update the user data with cleaned ranks
    userData.users[normalizedUsername] = {
      ranks: cleanedRanks,
    };

    // Write the updated data back to the file
    fs.writeFileSync(dataFilePath, JSON.stringify(userData, null, 2));

    return true;
  } catch (error) {
    console.error("Error updating local user data:", error);
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
