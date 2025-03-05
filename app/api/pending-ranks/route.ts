import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

interface PendingRank {
  username: string;
  rankId: string;
  timestamp: string;
}

export async function POST(req: Request) {
  const correlationId = uuidv4().substring(0, 8);
  console.log(`[${correlationId}][Pending Ranks] Request received`);

  try {
    // Verify API key
    const authHeader = req.headers.get("authorization");
    const apiKey = process.env.MINECRAFT_SERVER_API_KEY;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ") ||
      authHeader.substring(7) !== apiKey
    ) {
      console.error(`[${correlationId}][Pending Ranks] Invalid API key`);
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the username from the request body
    const body = await req.json();
    const username = body.username?.toLowerCase();

    if (!username) {
      console.error(`[${correlationId}][Pending Ranks] Missing username`);
      return NextResponse.json(
        { success: false, message: "Missing username" },
        { status: 400 }
      );
    }

    console.log(
      `[${correlationId}][Pending Ranks] Checking pending ranks for ${username}`
    );

    // Get pending ranks from the file
    const dataDir = path.join(process.cwd(), "data");
    const pendingRanksPath = path.join(dataDir, "pending-ranks.json");
    const pendingRanks: PendingRank[] = [];

    // Check if the file exists
    if (fs.existsSync(pendingRanksPath)) {
      try {
        const pendingRanksContent = fs.readFileSync(pendingRanksPath, "utf8");
        const pendingRanksData = JSON.parse(pendingRanksContent);
        const allPendingRanks = pendingRanksData.pendingRanks || [];

        // Filter for this username
        for (const rank of allPendingRanks) {
          if (rank.username.toLowerCase() === username) {
            pendingRanks.push(rank);
          }
        }

        // If found pending ranks, remove them from the file
        if (pendingRanks.length > 0) {
          console.log(
            `[${correlationId}][Pending Ranks] Found ${pendingRanks.length} pending ranks for ${username}`
          );

          // Filter out the ranks for this username
          const updatedPendingRanks = allPendingRanks.filter(
            (rank: PendingRank) => rank.username.toLowerCase() !== username
          );

          // Write back the updated list
          fs.writeFileSync(
            pendingRanksPath,
            JSON.stringify({ pendingRanks: updatedPendingRanks }, null, 2),
            "utf8"
          );
        } else {
          console.log(
            `[${correlationId}][Pending Ranks] No pending ranks found for ${username}`
          );
        }
      } catch (error) {
        console.error(
          `[${correlationId}][Pending Ranks] Error reading pending ranks file:`,
          error
        );
      }
    } else {
      console.log(
        `[${correlationId}][Pending Ranks] Pending ranks file does not exist`
      );
    }

    // Check user data store too
    const userDataPath = path.join(dataDir, "user-data.json");
    if (fs.existsSync(userDataPath)) {
      try {
        const userDataContent = fs.readFileSync(userDataPath, "utf8");
        const userData = JSON.parse(userDataContent);

        // Check if the user has ranks saved but not yet applied
        if (userData.users && userData.users[username]) {
          const userRanks = userData.users[username].ranks || [];
          const appliedRanks = userData.users[username].appliedRanks || [];

          // Find ranks that are saved but not marked as applied
          for (const rankId of userRanks) {
            if (!appliedRanks.includes(rankId)) {
              pendingRanks.push({
                username,
                rankId,
                timestamp: new Date().toISOString(),
              });

              // Mark as applied
              if (!userData.users[username].appliedRanks) {
                userData.users[username].appliedRanks = [];
              }
              userData.users[username].appliedRanks.push(rankId);
            }
          }

          // If found pending ranks from user data, save the updates
          if (pendingRanks.length > 0) {
            fs.writeFileSync(
              userDataPath,
              JSON.stringify(userData, null, 2),
              "utf8"
            );
          }
        }
      } catch (error) {
        console.error(
          `[${correlationId}][Pending Ranks] Error reading user data file:`,
          error
        );
      }
    }

    return NextResponse.json({
      success: true,
      pendingRanks,
    });
  } catch (error: any) {
    console.error(`[${correlationId}][Pending Ranks] Error:`, error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
