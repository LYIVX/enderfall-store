import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  getSavedAccounts,
  addSavedAccount,
  removeSavedAccount,
} from "@/lib/edge-config";

export const dynamic = "force-dynamic";

/**
 * API Route: GET /api/minecraft-accounts
 * This endpoint retrieves saved Minecraft accounts for the authenticated user
 */
export async function GET(request: Request) {
  try {
    // Check if the user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be logged in to access saved accounts" },
        { status: 401 }
      );
    }

    // Get the saved accounts for the user
    const userId = session.user.id;
    const savedAccounts = await getSavedAccounts(userId);

    return NextResponse.json({
      accounts: savedAccounts,
    });
  } catch (error: any) {
    console.error("Error retrieving saved accounts:", error.message);
    return NextResponse.json(
      { error: "Failed to retrieve saved accounts" },
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
    // Check if the user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be logged in to save accounts" },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const { username } = body;

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "Valid Minecraft username is required" },
        { status: 400 }
      );
    }

    // Clean the username
    const cleanUsername = username.trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 16) {
      return NextResponse.json(
        { error: "Minecraft username must be between 3 and 16 characters" },
        { status: 400 }
      );
    }

    // Get the user ID
    const userId = session.user.id;

    // Add the account to the user's saved accounts
    const updatedAccounts = await addSavedAccount(userId, cleanUsername);

    return NextResponse.json({
      accounts: updatedAccounts,
      message: "Account saved successfully",
    });
  } catch (error: any) {
    console.error("Error saving Minecraft account:", error.message);
    return NextResponse.json(
      { error: "Failed to save Minecraft account" },
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
    // Check if the user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be logged in to remove accounts" },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const { username } = body;

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "Valid Minecraft username is required" },
        { status: 400 }
      );
    }

    // Get the user ID
    const userId = session.user.id;

    // Remove the account from the user's saved accounts
    const updatedAccounts = await removeSavedAccount(userId, username);

    return NextResponse.json({
      accounts: updatedAccounts,
      message: "Account removed successfully",
    });
  } catch (error: any) {
    console.error("Error removing Minecraft account:", error.message);
    return NextResponse.json(
      { error: "Failed to remove Minecraft account" },
      { status: 500 }
    );
  }
}
