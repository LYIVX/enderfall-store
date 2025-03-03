import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { checkPlayerExists } from "@/lib/minecraft-server";
import { getUserRanks } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * API Route: GET /api/check-minecraft-player
 * Checks if a Minecraft player exists and returns their details
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { error: "No username provided" },
        { status: 400 }
      );
    }

    // Normalize the username for consistency
    const normalizedUsername = username.trim().toLowerCase();

    console.log(
      `[check-minecraft-player] Checking if player exists: ${normalizedUsername}`
    );

    // Step 1: Check if the player exists on the Minecraft server
    const playerExists = await checkPlayerExists(normalizedUsername);

    if (!playerExists) {
      return NextResponse.json({
        exists: false,
        message: "Player has never joined the server",
      });
    }

    // Step 2: Player exists on server, now get ranks from Supabase
    let ranks: string[] = [];
    try {
      ranks = await getUserRanks(normalizedUsername);
      console.log(
        `[check-minecraft-player] Got ranks: ${JSON.stringify(ranks)}`
      );
    } catch (error) {
      console.error(
        "[check-minecraft-player] Error getting user ranks:",
        error
      );
      // Continue with empty ranks
    }

    // Return the result
    return NextResponse.json({
      exists: true,
      username: normalizedUsername,
      ranks,
    });
  } catch (error) {
    console.error("Error in check-minecraft-player API:", error);
    return NextResponse.json(
      {
        error:
          "Error searching for player. Please check your connection and try again.",
      },
      { status: 500 }
    );
  }
}
