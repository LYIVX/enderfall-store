import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ranksConfig } from "@/lib/ranks";
import { supabase } from "@/lib/supabase";

// Function to get the minecraft username from Supabase
async function getMinecraftUsername(userId: string): Promise<string | null> {
  try {
    const { data: profile, error } = await supabase
      .from("minecraft_profiles")
      .select("username, verified")
      .eq("user_id", userId)
      .single();

    if (error || !profile) {
      return null;
    }

    // Return the username only if verified
    return profile.verified ? profile.username : null;
  } catch (error) {
    console.error("Error getting minecraft username:", error);
    return null;
  }
}

// Function to get all usernames from Supabase
async function getAllMinecraftUsernames(): Promise<string[]> {
  try {
    const { data: userRanks, error } = await supabase
      .from("user_ranks")
      .select("minecraft_username")
      .order("minecraft_username");

    if (error || !userRanks) {
      return [];
    }

    // Extract unique usernames
    const uniqueUsernames = Array.from(
      new Set(userRanks.map((row) => row.minecraft_username))
    );

    return uniqueUsernames;
  } catch (error) {
    console.error("Error getting all minecraft usernames:", error);
    return [];
  }
}

// Function to get user ranks from Supabase
async function getUserRanks(username: string): Promise<string[]> {
  try {
    const { data: userRanks, error } = await supabase
      .from("user_ranks")
      .select("rank_id")
      .eq("minecraft_username", username.toLowerCase());

    if (error || !userRanks) {
      return [];
    }

    // Extract rank IDs
    return userRanks.map((row) => row.rank_id);
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
    // matches any username in the user ranks as a fallback
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

    // Get user's ranks from Supabase
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
