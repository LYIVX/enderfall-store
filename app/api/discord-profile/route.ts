import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name?: string;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

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
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    const data: DiscordUser = await response.json();

    // Get the display name (prefer global_name if available)
    const displayName = data.global_name || data.username;

    // Construct the avatar URL with size parameter
    let avatarUrl;
    if (data.avatar) {
      const extension = data.avatar.startsWith("a_") ? "gif" : "png";
      avatarUrl = `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.${extension}?size=128`;
    } else {
      const defaultAvatarNumber = parseInt(data.discriminator) % 5;
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png?size=128`;
    }

    return NextResponse.json(
      {
        profile: {
          id: data.id,
          username: displayName,
          avatar: avatarUrl,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch Discord profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch Discord profile" },
      { status: 500 }
    );
  }
}
