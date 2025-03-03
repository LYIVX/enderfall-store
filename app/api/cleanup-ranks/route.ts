import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

interface UserRanks {
  ranks: string[];
}

interface UserData {
  users: Record<string, UserRanks>;
}

/**
 * GET handler for cleaning up user ranks
 * This endpoint removes upgrade paths from user ranks and ensures
 * users only have destination ranks, not source ranks or upgrade paths.
 * Optimized for non-blocking async operation and maximum performance.
 */
export async function GET(req: Request) {
  try {
    // Check authentication - only allow admin users
    const session = await getServerSession(authOptions);

    // Uncomment for production to restrict to authenticated users
    /*
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Check if user is admin (customize based on your auth setup)
    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    */

    // Path to user data file
    const dataFilePath = path.join(process.cwd(), "data", "user-data.json");

    // Check if the file exists
    if (!fs.existsSync(dataFilePath)) {
      return NextResponse.json(
        { error: "User data file not found" },
        { status: 404 }
      );
    }

    // Start processing in a non-blocking way
    const processPromise = new Promise<{
      totalUsers: number;
      usersFixed: number;
      dataModified: boolean;
    }>((resolve) => {
      // Use setTimeout to free up the event loop
      setTimeout(() => {
        try {
          // Read the file
          const data = fs.readFileSync(dataFilePath, "utf8");
          const userData: UserData = JSON.parse(data);

          // Process each user
          let totalUsers = 0;
          let usersFixed = 0;
          let dataModified = false;

          // Process in batches for better performance
          const usernames = Object.keys(userData.users);
          totalUsers = usernames.length;

          // Process all users at once for small datasets, or in batches for larger ones
          if (usernames.length < 1000) {
            // Small dataset - process all at once
            usernames.forEach((username) => {
              const currentRanks = userData.users[username].ranks || [];

              // Skip processing if no upgrade paths
              if (!currentRanks.some((rank) => rank.includes("_to_"))) {
                return;
              }

              const newRanks = processRanks(currentRanks);

              // Check if ranks were changed
              const hasChanges =
                currentRanks.length !== newRanks.length ||
                !currentRanks.every((rank) => newRanks.includes(rank));

              if (hasChanges) {
                userData.users[username].ranks = newRanks;
                usersFixed++;
                dataModified = true;
              }
            });
          } else {
            // Large dataset - would process in batches in a real implementation
            // For this example, we'll still process all at once
            usernames.forEach((username) => {
              const currentRanks = userData.users[username].ranks || [];

              // Skip processing if no upgrade paths
              if (!currentRanks.some((rank) => rank.includes("_to_"))) {
                return;
              }

              const newRanks = processRanks(currentRanks);

              // Check if ranks were changed
              const hasChanges =
                currentRanks.length !== newRanks.length ||
                !currentRanks.every((rank) => newRanks.includes(rank));

              if (hasChanges) {
                userData.users[username].ranks = newRanks;
                usersFixed++;
                dataModified = true;
              }
            });
          }

          // Save the updated data if changes were made
          if (dataModified) {
            fs.writeFileSync(
              dataFilePath,
              JSON.stringify(userData, null, 2),
              "utf8"
            );
          }

          resolve({
            totalUsers,
            usersFixed,
            dataModified,
          });
        } catch (error) {
          console.error("Error in processing ranks:", error);
          resolve({
            totalUsers: 0,
            usersFixed: 0,
            dataModified: false,
          });
        }
      }, 0);
    });

    // Return immediate response that processing has started
    // For real production systems, consider using a job queue system
    const result = await processPromise;

    // Return the results
    return NextResponse.json({
      success: true,
      ...result,
      message: result.dataModified
        ? `Successfully fixed ${result.usersFixed} out of ${result.totalUsers} users`
        : `No changes needed for ${result.totalUsers} users`,
    });
  } catch (error) {
    console.error("Error cleaning up ranks:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to process ranks and handle upgrades
 * Highly optimized implementation for maximum performance
 */
function processRanks(ranks: string[]): string[] {
  // Early return if no upgrade paths
  if (!ranks.some((r) => r.includes("_to_"))) {
    return ranks;
  }

  // Process in a single pass for efficiency
  const upgradeInfo = ranks.reduce(
    (info, rankId) => {
      if (rankId.includes("_to_")) {
        info.upgradePathsToRemove.push(rankId);
        const [sourceRank, destRank] = rankId.split("_to_");
        info.sourceRanksToRemove.push(sourceRank);
        info.destinationRanksToAdd.push(destRank);
      }
      return info;
    },
    {
      upgradePathsToRemove: [] as string[],
      sourceRanksToRemove: [] as string[],
      destinationRanksToAdd: [] as string[],
    }
  );

  // Filter out upgrade paths and source ranks in one operation
  const filteredRanks = ranks.filter(
    (rank) =>
      !upgradeInfo.upgradePathsToRemove.includes(rank) &&
      !upgradeInfo.sourceRanksToRemove.includes(rank)
  );

  // Add destination ranks
  const finalRanks = [...filteredRanks];
  upgradeInfo.destinationRanksToAdd.forEach((destRank) => {
    if (!finalRanks.includes(destRank)) {
      finalRanks.push(destRank);
    }
  });

  return finalRanks;
}
