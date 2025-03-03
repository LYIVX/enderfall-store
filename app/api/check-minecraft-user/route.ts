import { NextResponse } from "next/server";
import { checkPlayerExists } from "@/lib/minecraft-server";
import { getUserRanks } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * API Route: GET /api/check-minecraft-user
 * Checks if a Minecraft player exists and returns their details
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    // Log the incoming request
    console.log(
      `[check-minecraft-user] Received request for username: ${username}`
    );

    if (!username) {
      console.log("[check-minecraft-user] No username provided");
      return NextResponse.json(
        { error: "No username provided" },
        { status: 400 }
      );
    }

    // Normalize the username for consistency
    const normalizedUsername = username.trim().toLowerCase();

    console.log(
      `[check-minecraft-user] Checking if player exists: ${normalizedUsername}`
    );

    // Step 1: Check if the player exists on the Minecraft server
    let playerExists = false;
    try {
      playerExists = await checkPlayerExists(normalizedUsername);
      console.log(
        `[check-minecraft-user] Player exists check result: ${playerExists}`
      );
    } catch (checkError) {
      console.error(
        "[check-minecraft-user] Error checking player existence:",
        checkError
      );
      // For development purposes, consider the player exists
      playerExists = process.env.NODE_ENV === "development";
      console.log(
        `[check-minecraft-user] Using development fallback: ${playerExists}`
      );
    }

    if (!playerExists) {
      console.log(
        `[check-minecraft-user] Player does not exist: ${normalizedUsername}`
      );
      return NextResponse.json({
        exists: false,
        message: "Player has never joined the server",
      });
    }

    // Step 2: Player exists on server, now check for purchased ranks in Supabase
    let ranks: string[] = [];
    try {
      ranks = await getUserRanks(normalizedUsername);
      console.log(
        `[check-minecraft-user] Found ranks for player: ${JSON.stringify(ranks)}`
      );
    } catch (ranksError) {
      console.error(
        "[check-minecraft-user] Error getting player ranks:",
        ranksError
      );
      // Continue with empty ranks
    }

    // Return the result
    const result = {
      exists: true,
      username: normalizedUsername,
      ranks,
    };
    console.log(
      `[check-minecraft-user] Returning result: ${JSON.stringify(result)}`
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("[check-minecraft-user] Error in API:", error);
    return NextResponse.json(
      {
        error:
          "Error searching for player. Please check your connection and try again.",
      },
      { status: 500 }
    );
  }
}
