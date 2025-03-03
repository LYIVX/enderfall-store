#!/usr/bin/env node

/**
 * Test script to verify the performance of rank processing functions
 * This script benchmarks different rank processing implementations
 */

const fs = require("fs");
const path = require("path");

// Path to user data file
const userDataPath = path.join(process.cwd(), "data", "user-data.json");

// Utility function to normalize username
function normalizeUsername(username) {
  return username.toLowerCase().trim();
}

// Original process ranks function
function processRanksOriginal(ranks) {
  let cleanedRanks = [...ranks];

  // Extract information from upgrade paths
  const upgradePathsToRemove = [];
  const sourceRanksToRemove = [];
  const destinationRanksToAdd = [];

  // First pass: identify all upgrades
  cleanedRanks.forEach((rankId) => {
    if (rankId.includes("_to_")) {
      upgradePathsToRemove.push(rankId);
      const [sourceRank, destRank] = rankId.split("_to_");
      sourceRanksToRemove.push(sourceRank);
      destinationRanksToAdd.push(destRank);
    }
  });

  // Second pass: filter out upgrade paths and source ranks
  if (upgradePathsToRemove.length > 0) {
    // Remove upgrade paths
    cleanedRanks = cleanedRanks.filter(
      (r) => !upgradePathsToRemove.includes(r)
    );

    // Remove source ranks
    cleanedRanks = cleanedRanks.filter((r) => !sourceRanksToRemove.includes(r));

    // Add destination ranks
    destinationRanksToAdd.forEach((destRank) => {
      if (!cleanedRanks.includes(destRank)) {
        cleanedRanks.push(destRank);
      }
    });
  }

  return cleanedRanks;
}

// Optimized process ranks function
function processRanksOptimized(ranks) {
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
      upgradePathsToRemove: [],
      sourceRanksToRemove: [],
      destinationRanksToAdd: [],
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

// Function to run benchmark with different test datasets
function runBenchmark() {
  console.log("Rank Processing Performance Test");
  console.log("--------------------------------");

  // Test data
  const testCases = [
    {
      name: "No ranks",
      data: [],
    },
    {
      name: "Regular ranks only",
      data: ["vip", "mvp", "noble"],
    },
    {
      name: "Single upgrade path",
      data: ["vip", "vip_to_mvp"],
    },
    {
      name: "Multiple upgrade paths",
      data: ["vip", "mvp", "vip_to_mvp", "mvp_to_noble"],
    },
    {
      name: "Large dataset with upgrades",
      data: Array(50)
        .fill()
        .map((_, i) =>
          i % 3 === 0
            ? `rank${i}`
            : i % 3 === 1
              ? `rank${i - 1}_to_rank${i + 1}`
              : `rank${i + 5}`
        ),
    },
  ];

  // Run tests for each case
  testCases.forEach((testCase) => {
    console.log(`\nTest case: ${testCase.name}`);
    console.log(
      `Input ranks: ${JSON.stringify(testCase.data).slice(0, 80)}${testCase.data.length > 10 ? "..." : ""}`
    );

    // Original implementation
    const startTimeOriginal = process.hrtime();
    const resultOriginal = processRanksOriginal(testCase.data);
    const endTimeOriginal = process.hrtime(startTimeOriginal);
    const durationOriginal =
      endTimeOriginal[0] * 1000 + endTimeOriginal[1] / 1000000;

    // Optimized implementation
    const startTimeOptimized = process.hrtime();
    const resultOptimized = processRanksOptimized(testCase.data);
    const endTimeOptimized = process.hrtime(startTimeOptimized);
    const durationOptimized =
      endTimeOptimized[0] * 1000 + endTimeOptimized[1] / 1000000;

    // Output results
    console.log(
      `Original result: ${JSON.stringify(resultOriginal).slice(0, 80)}${resultOriginal.length > 10 ? "..." : ""}`
    );
    console.log(
      `Optimized result: ${JSON.stringify(resultOptimized).slice(0, 80)}${resultOptimized.length > 10 ? "..." : ""}`
    );
    console.log(`Original execution time: ${durationOriginal.toFixed(4)} ms`);
    console.log(`Optimized execution time: ${durationOptimized.toFixed(4)} ms`);
    console.log(
      `Speed improvement: ${(durationOriginal / durationOptimized).toFixed(2)}x faster`
    );

    // Verify results match
    const resultsMatch =
      JSON.stringify(resultOriginal) === JSON.stringify(resultOptimized);
    console.log(`Results match: ${resultsMatch ? "✅ Yes" : "❌ No"}`);
  });

  // Test with real user data if available
  try {
    if (fs.existsSync(userDataPath)) {
      const userData = JSON.parse(fs.readFileSync(userDataPath, "utf8"));
      console.log("\nBenchmarking with real user data:");
      console.log(`Total users: ${Object.keys(userData.users).length}`);

      const startTimeOriginal = process.hrtime();
      Object.keys(userData.users).forEach((username) => {
        const ranks = userData.users[username].ranks || [];
        processRanksOriginal(ranks);
      });
      const endTimeOriginal = process.hrtime(startTimeOriginal);
      const durationOriginal =
        endTimeOriginal[0] * 1000 + endTimeOriginal[1] / 1000000;

      const startTimeOptimized = process.hrtime();
      Object.keys(userData.users).forEach((username) => {
        const ranks = userData.users[username].ranks || [];
        processRanksOptimized(ranks);
      });
      const endTimeOptimized = process.hrtime(startTimeOptimized);
      const durationOptimized =
        endTimeOptimized[0] * 1000 + endTimeOptimized[1] / 1000000;

      console.log(
        `Original processing time: ${durationOriginal.toFixed(4)} ms`
      );
      console.log(
        `Optimized processing time: ${durationOptimized.toFixed(4)} ms`
      );
      console.log(
        `Speed improvement: ${(durationOriginal / durationOptimized).toFixed(2)}x faster`
      );
    }
  } catch (error) {
    console.log("Could not test with real user data:", error.message);
  }
}

// Run the benchmark
runBenchmark();
