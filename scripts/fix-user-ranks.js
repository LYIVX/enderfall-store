const fs = require("fs");
const path = require("path");

// Path to user data file - fix the path to go up from scripts directory
const userDataPath = path.join(__dirname, "..", "data", "user-data.json");

// Function to fix ranks
function fixUserRanks() {
  console.log("Starting user ranks cleanup...");
  console.log(`Looking for user data at: ${userDataPath}`);

  // Read the current user data
  let userData;
  try {
    const data = fs.readFileSync(userDataPath, "utf8");
    userData = JSON.parse(data);
    console.log(
      `Successfully read user data with ${Object.keys(userData.users).length} users`
    );
  } catch (error) {
    console.error("Error reading user data:", error);
    return;
  }

  let fixedCount = 0;

  // Process each user
  Object.keys(userData.users).forEach((username) => {
    const userRanks = userData.users[username].ranks || [];

    // Track the ranks to keep
    const cleanedRanks = [];

    // Track rank categories
    const highestRankByCategory = {};
    const upgradeInfo = [];

    // First, identify all upgrades and get information about them
    userRanks.forEach((rankId) => {
      if (rankId.includes("_to_")) {
        const [sourceRankId, destRankId] = rankId.split("_to_");
        upgradeInfo.push({
          upgradeId: rankId,
          sourceId: sourceRankId,
          destId: destRankId,
          // Assume ranks with same prefix are in the same category
          category: sourceRankId.split("_")[0],
        });
      }
    });

    // Then process all ranks
    userRanks.forEach((rankId) => {
      // Skip upgrade paths
      if (rankId.includes("_to_")) {
        return;
      }

      // Get category (simplified approach using prefix)
      const category = rankId.split("_")[0];

      // Check if this rank has been superseded by an upgrade
      const isSuperseded = upgradeInfo.some(
        (upgrade) => upgrade.sourceId === rankId
      );

      // If not superseded, keep it
      if (!isSuperseded) {
        // Check if we've seen this category before
        if (!highestRankByCategory[category]) {
          highestRankByCategory[category] = rankId;
          cleanedRanks.push(rankId);
        } else {
          // For simplicity, we'll keep the last rank in this category
          // In a full implementation, you'd compare rank levels
          highestRankByCategory[category] = rankId;

          // Find and remove the previous rank from this category
          const indexToRemove = cleanedRanks.findIndex(
            (r) => r.split("_")[0] === category
          );
          if (indexToRemove >= 0) {
            cleanedRanks.splice(indexToRemove, 1);
          }

          cleanedRanks.push(rankId);
        }
      }
    });

    // Add destination ranks from upgrades if not already included
    upgradeInfo.forEach((upgrade) => {
      if (!cleanedRanks.includes(upgrade.destId)) {
        cleanedRanks.push(upgrade.destId);
      }

      // If we have another rank in this category, remove it
      const category = upgrade.destId.split("_")[0];
      highestRankByCategory[category] = upgrade.destId;

      // Remove any other ranks in this category
      const ranksToRemove = cleanedRanks.filter(
        (r) => r.split("_")[0] === category && r !== upgrade.destId
      );

      ranksToRemove.forEach((r) => {
        const index = cleanedRanks.indexOf(r);
        if (index >= 0) {
          cleanedRanks.splice(index, 1);
        }
      });
    });

    // Compare old and new ranks
    const hasChanges =
      userRanks.length !== cleanedRanks.length ||
      !userRanks.every((rank) => cleanedRanks.includes(rank));

    if (hasChanges) {
      console.log(`Fixing ranks for user ${username}:`);
      console.log(`  Before: ${userRanks.join(", ")}`);
      console.log(`  After: ${cleanedRanks.join(", ")}`);

      // Update the user's ranks
      userData.users[username].ranks = cleanedRanks;
      fixedCount++;
    }
  });

  // Save the updated data
  if (fixedCount > 0) {
    try {
      fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2), "utf8");
      console.log(`Fixed ranks for ${fixedCount} users and saved data`);
    } catch (error) {
      console.error("Error saving user data:", error);
    }
  } else {
    console.log("No users needed rank fixes");
  }
}

// Run the function
fixUserRanks();
