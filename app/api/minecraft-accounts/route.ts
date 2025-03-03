import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import {
  addSavedAccount,
  getSavedAccounts,
  removeSavedAccount,
} from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * API Route: GET /api/minecraft-accounts
 * This endpoint retrieves saved Minecraft accounts for the authenticated user
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const accounts = await getSavedAccounts(userId);

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Error getting Minecraft accounts:", error);
    return NextResponse.json(
      { error: "Failed to retrieve accounts" },
      { status: 500 }
    );
  }
}

/**
 * API Route: POST /api/minecraft-accounts
 * This endpoint adds a new Minecraft account to the user's saved accounts
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: "Minecraft username is required" },
        { status: 400 }
      );
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]{2,16}$/.test(username)) {
      return NextResponse.json(
        {
          error:
            "Invalid Minecraft username. Must be 2-16 characters and only contain letters, numbers, and underscores.",
        },
        { status: 400 }
      );
    }

    const result = await addSavedAccount(userId, username);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to add account" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      accounts: result.accounts,
    });
  } catch (error) {
    console.error("Error adding Minecraft account:", error);
    return NextResponse.json(
      { error: "Failed to add account" },
      { status: 500 }
    );
  }
}

/**
 * API Route: DELETE /api/minecraft-accounts
 * This endpoint removes a Minecraft account from the user's saved accounts
 */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Try to get username from query parameters
    const { searchParams } = new URL(request.url);
    let username = searchParams.get("username");

    // If not in query parameters, try to get from request body
    if (!username) {
      try {
        const body = await request.json();
        username = body.username;
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    if (!username) {
      return NextResponse.json(
        { error: "Minecraft username is required" },
        { status: 400 }
      );
    }

    console.log(`Attempting to delete account ${username} for user ${userId}`);

    const result = await removeSavedAccount(userId, username);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to remove account" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      accounts: result.accounts,
    });
  } catch (error) {
    console.error("Error removing Minecraft account:", error);
    return NextResponse.json(
      { error: "Failed to remove account" },
      { status: 500 }
    );
  }
}
