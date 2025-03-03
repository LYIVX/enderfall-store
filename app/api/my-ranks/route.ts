import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { ranksConfig } from "@/lib/ranks";

// Define user data type structure
interface UserData {
  users: {
    [username: string]: {
      ranks: string[];
    };
  };
}

// Function to get the minecraft username from the session
async function getMinecraftUsername(userId: string): Promise<string | null> {
  try {
    const dbPath = path.join(process.cwd(), "data", "minecraft-profiles.json");

    // Check if file exists
    if (!fs.existsSync(dbPath)) {
      return null;
    }

    // Read the file
    const data = fs.readFileSync(dbPath, "utf8");
    const profiles = JSON.parse(data);

    // Look for the user's profile
    if (profiles[userId] && profiles[userId].verified) {
      return profiles[userId].username;
    }

    return null;
  } catch (error) {
    console.error("Error getting minecraft username:", error);
    return null;
  }
}

// Function to get all usernames from user-data.json
async function getAllMinecraftUsernames(): Promise<string[]> {
  try {
    const dataFilePath = path.join(process.cwd(), "data", "user-data.json");

    // Check if file exists
    if (!fs.existsSync(dataFilePath)) {
      return [];
    }

    // Read the file
    const data = fs.readFileSync(dataFilePath, "utf8");
    const userData: UserData = JSON.parse(data);

    // Return all usernames in the data
    return Object.keys(userData.users);
  } catch (error) {
    console.error("Error getting all minecraft usernames:", error);
    return [];
  }
}

// Function to get user ranks from user-data.json
async function getUserRanks(username: string): Promise<string[]> {
  try {
    const dataFilePath = path.join(process.cwd(), "data", "user-data.json");

    // Check if file exists
    if (!fs.existsSync(dataFilePath)) {
      return [];
    }

    // Read the file
    const data = fs.readFileSync(dataFilePath, "utf8");
    const userData: UserData = JSON.parse(data);

    // Return the user's ranks (or empty array if user doesn't exist)
    return userData.users[username]?.ranks || [];
  } catch (error) {
    console.error("Error getting user ranks:", error);
    return [];
  }
}

export async function GET(req: Request) {
  try {
    // Get the user session
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get the user's minecraft username from profiles
    let minecraftUsername = await getMinecraftUsername(session.user.id);
    let usernameSource = "profile";

    // If no username was found in profiles, check if the user's Discord/login username
    // matches any username in the user-data.json file as a fallback
    if (!minecraftUsername && session.user.name) {
      const allUsernames = await getAllMinecraftUsernames();

      // First try exact match
      if (allUsernames.includes(session.user.name)) {
        minecraftUsername = session.user.name;
        usernameSource = "exact_match";
      }
      // Then try case-insensitive match
      else {
        const lowercaseUsername = session.user.name.toLowerCase();
        const matchingUsername = allUsernames.find(
          (username) => username.toLowerCase() === lowercaseUsername
        );

        if (matchingUsername) {
          minecraftUsername = matchingUsername;
          usernameSource = "case_insensitive_match";
        }
      }
    }

    if (!minecraftUsername) {
      return NextResponse.json({
        ranks: [],
        message: "Minecraft account not linked or verified",
        session_username: session.user.name || "unknown",
      });
    }

    // Get user's ranks from user-data.json
    const userRanks = await getUserRanks(minecraftUsername);

    // Get rank objects for display
    const rankObjects = userRanks
      .map((rankId) => ranksConfig.getRankById(rankId))
      .filter(Boolean);

    return NextResponse.json({
      username: minecraftUsername,
      usernameSource,
      ranks: userRanks,
      rankObjects,
    });
  } catch (error) {
    console.error("Error retrieving user ranks:", error);
    return NextResponse.json(
      { error: "Failed to retrieve user ranks" },
      { status: 500 }
    );
  }
}
