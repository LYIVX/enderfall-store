import { NextResponse } from "next/server";
import { checkPlayerExists } from "@/lib/minecraft-server";
import { getUserRanks } from "@/lib/supabase";
import { getMinecraftServerHostname } from "@/lib/minecraft-api";

export const dynamic = "force-dynamic";

/**
 * API Route: GET /api/check-minecraft-user
 * Checks if a Minecraft player exists and returns their details
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    const normalizedUsername = username.trim().toLowerCase();
    const exists = await checkPlayerExists(normalizedUsername);

    if (!exists) {
      return NextResponse.json({
        exists: false,
        message: "Player has never joined the server",
        serverHostname: getMinecraftServerHostname(),
      });
    }

    // Get user's ranks from Supabase
    const ranks = await getUserRanks(normalizedUsername);

    const result = {
      exists: true,
      username: normalizedUsername,
      ranks,
      serverHostname: getMinecraftServerHostname(),
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
