import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ranksConfig } from "@/lib/ranks";
import fs from "fs";
import path from "path";

// Define user data type structure
interface UserData {
  users: {
    [username: string]: {
      ranks: string[];
    };
  };
}

export async function GET(req: Request) {
  try {
    // Verify admin status
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is admin
    // This is a simple check - you should implement proper admin verification
    if (!session.user.email?.endsWith("@your-admin-domain.com")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const dataFilePath = path.join(process.cwd(), "data", "user-data.json");

    // Check if file exists
    if (!fs.existsSync(dataFilePath)) {
      return NextResponse.json({
        success: false,
        message: "User data file does not exist",
      });
    }

    // Read existing data
    const data = fs.readFileSync(dataFilePath, "utf8");
    const userData = JSON.parse(data) as UserData;

    const cleanupResults: Record<
      string,
      {
        removed: string[];
        kept: string[];
      }
    > = {};

    // Process each user's ranks
    for (const username in userData.users) {
      const userRanks = userData.users[username].ranks;
      const originalRanks = [...userRanks];
      const upgradeIds: string[] = [];
      const upgradeSources: string[] = [];
      const upgradeDestinations: string[] = [];

      // Find all upgrade IDs and their source/destination ranks
      userRanks.forEach((rankId) => {
        if (rankId.includes("_to_")) {
          upgradeIds.push(rankId);
          const [source, destination] = rankId.split("_to_");
          upgradeSources.push(source);
          upgradeDestinations.push(destination);
        }
      });

      if (upgradeIds.length > 0) {
        // Filter out all upgrade IDs
        const filteredRanks = userRanks.filter(
          (rankId) => !rankId.includes("_to_")
        );

        // Add all destination ranks if they're not already in the list
        upgradeDestinations.forEach((destination) => {
          if (!filteredRanks.includes(destination)) {
            filteredRanks.push(destination);
          }
        });

        // Remove source ranks that have been upgraded
        const finalRanks = filteredRanks.filter((rankId) => {
          if (upgradeSources.includes(rankId)) {
            // Check if we need to keep this rank
            // Only keep if there's no matching upgrade destination for this category
            const sourceRank = ranksConfig.getRankById(rankId);
            if (!sourceRank) return true; // Keep if we can't find rank info (safety)

            // Check if there's a destination rank in the same category
            for (const destRankId of upgradeDestinations) {
              const destRank = ranksConfig.getRankById(destRankId);
              if (destRank && destRank.categoryId === sourceRank.categoryId) {
                // Found a destination rank in the same category, so we can remove the source
                return false;
              }
            }
            return true;
          }
          return true;
        });

        // Update the user's ranks
        userData.users[username].ranks = finalRanks;

        // Record the changes
        cleanupResults[username] = {
          removed: originalRanks.filter((r) => !finalRanks.includes(r)),
          kept: finalRanks,
        };
      }
    }

    // Write updated data back to file
    fs.writeFileSync(dataFilePath, JSON.stringify(userData, null, 2), "utf8");

    return NextResponse.json({
      success: true,
      message: `Cleaned up rank data for ${Object.keys(cleanupResults).length} users`,
      cleanupResults,
    });
  } catch (error) {
    console.error("Failed to clean up user ranks:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
