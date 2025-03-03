import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { checkPlayerExists } from "@/lib/minecraft-server";

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

    // Step 1: Check if the player exists on the Minecraft server
    const playerExists = await checkPlayerExists(normalizedUsername);

    if (!playerExists) {
      return NextResponse.json({
        exists: false,
        message: "Player has never joined the server",
      });
    }

    // Step 2: Player exists on server, now check user-data for purchased ranks
    let ranks: string[] = [];

    // Check the local user data file
    try {
      const dataDir = path.join(process.cwd(), "data");
      const userDataPath = path.join(dataDir, "user-data.json");

      if (fs.existsSync(userDataPath)) {
        const fileContent = fs.readFileSync(userDataPath, "utf8");
        const userData = JSON.parse(fileContent);

        if (userData.users && userData.users[normalizedUsername]) {
          ranks = userData.users[normalizedUsername].ranks || [];
        }
      }
    } catch (error) {
      console.error("Error checking local user data:", error);
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
