import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";

// Interface for the saved Minecraft accounts
interface SavedAccountsData {
  [userId: string]: {
    accounts: string[];
  };
}

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

/**
 * Helper function to get saved accounts from the data file
 */
async function getSavedAccounts(userId: string): Promise<string[]> {
  try {
    const dataFilePath = path.join(
      process.cwd(),
      "data",
      "saved-minecraft-accounts.json"
    );

    // If the file doesn't exist, return an empty array
    if (!fs.existsSync(dataFilePath)) {
      return [];
    }

    // Read and parse the file
    const fileData = fs.readFileSync(dataFilePath, "utf8");
    const savedAccountsData: SavedAccountsData = JSON.parse(fileData);

    // Return the user's saved accounts if they exist
    if (savedAccountsData[userId]) {
      return savedAccountsData[userId].accounts || [];
    }

    return [];
  } catch (error) {
    console.error("Error getting saved accounts:", error);
    return [];
  }
}

/**
 * Helper function to add a saved account to the data file
 */
async function addSavedAccount(
  userId: string,
  username: string
): Promise<string[]> {
  try {
    const dataDir = path.join(process.cwd(), "data");
    const dataFilePath = path.join(dataDir, "saved-minecraft-accounts.json");

    // Ensure the data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialize with empty data if the file doesn't exist
    let savedAccountsData: SavedAccountsData = {};

    // Read existing data if available
    if (fs.existsSync(dataFilePath)) {
      try {
        const fileData = fs.readFileSync(dataFilePath, "utf8");
        savedAccountsData = JSON.parse(fileData);
      } catch {
        // Continue with empty structure if there's an error
      }
    }

    // Initialize user's accounts if not yet created
    if (!savedAccountsData[userId]) {
      savedAccountsData[userId] = { accounts: [] };
    }

    // Check if account already exists
    if (!savedAccountsData[userId].accounts.includes(username)) {
      // Add the account to the user's saved accounts
      savedAccountsData[userId].accounts.push(username);

      // Limit the number of saved accounts to 5
      if (savedAccountsData[userId].accounts.length > 5) {
        savedAccountsData[userId].accounts.shift(); // Remove the oldest account
      }
    }

    // Write the updated data back to the file
    fs.writeFileSync(dataFilePath, JSON.stringify(savedAccountsData, null, 2));

    return savedAccountsData[userId].accounts;
  } catch (error) {
    console.error("Error adding saved account:", error);
    return [];
  }
}

/**
 * Helper function to remove a saved account from the data file
 */
async function removeSavedAccount(
  userId: string,
  username: string
): Promise<string[]> {
  try {
    const dataFilePath = path.join(
      process.cwd(),
      "data",
      "saved-minecraft-accounts.json"
    );

    // If the file doesn't exist, return an empty array
    if (!fs.existsSync(dataFilePath)) {
      return [];
    }

    // Read and parse the file
    const fileData = fs.readFileSync(dataFilePath, "utf8");
    let savedAccountsData: SavedAccountsData = JSON.parse(fileData);

    // If the user doesn't have any saved accounts, return an empty array
    if (!savedAccountsData[userId]) {
      return [];
    }

    // Filter out the account to be removed
    savedAccountsData[userId].accounts = savedAccountsData[
      userId
    ].accounts.filter((account) => account !== username);

    // Write the updated data back to the file
    fs.writeFileSync(dataFilePath, JSON.stringify(savedAccountsData, null, 2));

    return savedAccountsData[userId].accounts;
  } catch (error) {
    console.error("Error removing saved account:", error);
    return [];
  }
}
