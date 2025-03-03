import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!session.accessToken) {
      return NextResponse.json(
        { error: "Discord access token not found" },
        { status: 401 }
      );
    }

    // Fetch user data from Discord API
    const response = await fetch("https://discord.com/api/v10/users/@me", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      profile: {
        username: data.username,
        discriminator: data.discriminator,
        avatar: data.avatar
          ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
          : null,
      },
    });
  } catch (error) {
    console.error("Failed to fetch Discord profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch Discord profile" },
      { status: 500 }
    );
  }
}
