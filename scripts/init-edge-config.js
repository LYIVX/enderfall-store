require("dotenv").config();
const { createClient } = require("@vercel/edge-config");

// Initial data for Edge Config
const initialData = {
  "minecraft-accounts": {},
  "user-data": { users: {} },
  "pending-purchases": { pendingPurchases: [] },
  resets: {},
};

async function initializeEdgeConfig() {
  console.log("Starting Edge Config initialization...");

  // Get Edge Config URL from environment
  const edgeConfigString = process.env.EDGE_CONFIG;

  if (!edgeConfigString) {
    console.error("EDGE_CONFIG environment variable is missing");
    process.exit(1);
  }

  console.log("Using Edge Config URL:", edgeConfigString);

  // Create Edge Config client
  try {
    const edgeConfig = createClient(edgeConfigString);
    console.log("Edge Config client created");

    // Check what keys already exist
    let existingKeys = [];
    let missingKeys = [];

    for (const key of Object.keys(initialData)) {
      try {
        const exists = await edgeConfig.has(key);
        if (exists) {
          existingKeys.push(key);
          console.log(`Key '${key}' already exists in Edge Config`);
        } else {
          missingKeys.push(key);
          console.log(`Key '${key}' doesn't exist in Edge Config`);
        }
      } catch (error) {
        console.error(`Error checking key '${key}':`, error);
        missingKeys.push(key);
      }
    }

    // Initialize missing keys
    if (missingKeys.length > 0) {
      console.log(`Initializing ${missingKeys.length} missing keys...`);

      for (const key of missingKeys) {
        try {
          await edgeConfig.set(key, initialData[key]);
          console.log(`Successfully initialized key '${key}'`);
        } catch (error) {
          console.error(`Error initializing key '${key}':`, error);
        }
      }
    }

    console.log("Edge Config initialization complete!");
    console.log("Existing keys:", existingKeys);
    console.log("Initialized keys:", missingKeys);
  } catch (error) {
    console.error("Error creating Edge Config client:", error);
    process.exit(1);
  }
}

// Run the initialization
initializeEdgeConfig().catch((error) => {
  console.error("Unhandled error during initialization:", error);
  process.exit(1);
});
