#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Path to user data file - correctly uses the project root
const userDataPath = path.join(process.cwd(), "data", "user-data.json");

console.log("Rank Cleanup Utility - Fast Version");
console.log("-----------------------------------");
console.log(`Looking for user data at: ${userDataPath}`);

// Function to clean up rank data
function cleanupRanks() {
  try {
    // Check if the file exists
    if (!fs.existsSync(userDataPath)) {
      console.error(`Error: User data file not found at ${userDataPath}`);
      return;
    }

    // Read the user data
    const data = fs.readFileSync(userDataPath, "utf8");
    let userData;

    try {
      userData = JSON.parse(data);
    } catch (parseError) {
      console.error("Error parsing user data:", parseError);
      return;
    }

    // Stats
    let totalUsers = 0;
    let usersFixed = 0;
    let dataModified = false;

    // Process each user
    Object.keys(userData.users).forEach((username) => {
      totalUsers++;

      // Process ranks for this user
      const currentRanks = userData.users[username].ranks || [];
      const newRanks = processRanks(currentRanks);

      // Check if changes were made
      const hasChanges =
        currentRanks.length !== newRanks.length ||
        !currentRanks.every((rank) => newRanks.includes(rank));

      if (hasChanges) {
        userData.users[username].ranks = newRanks;
        usersFixed++;
        dataModified = true;
      }
    });

    // Save the data if changes were made
    if (dataModified) {
      fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2), "utf8");
      console.log(
        `✅ Fixed ranks for ${usersFixed} out of ${totalUsers} users`
      );
    } else {
      console.log(
        `✅ No changes needed - all ${totalUsers} users have correct ranks`
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

/**
 * Efficiently process ranks to clean up upgrade paths
 */
function processRanks(ranks) {
  // Quick check - if no ranks contain "_to_", we can skip processing
  if (!ranks.some((r) => r.includes("_to_"))) {
    return ranks;
  }

  // Process the ranks
  let cleanedRanks = [...ranks];

  // First, gather all upgrade info
  const upgradePathsToRemove = [];
  const sourceRanksToRemove = [];
  const destinationRanksToAdd = [];

  cleanedRanks.forEach((rankId) => {
    if (rankId.includes("_to_")) {
      upgradePathsToRemove.push(rankId);
      const [sourceRank, destRank] = rankId.split("_to_");
      sourceRanksToRemove.push(sourceRank);
      destinationRanksToAdd.push(destRank);
    }
  });

  // Remove upgrade paths
  cleanedRanks = cleanedRanks.filter((r) => !upgradePathsToRemove.includes(r));

  // Remove source ranks
  cleanedRanks = cleanedRanks.filter((r) => !sourceRanksToRemove.includes(r));

  // Add destination ranks
  destinationRanksToAdd.forEach((destRank) => {
    if (!cleanedRanks.includes(destRank)) {
      cleanedRanks.push(destRank);
    }
  });

  return cleanedRanks;
}

// Run the function
cleanupRanks();
