import { NextResponse } from "next/server";
import { createClient } from "@vercel/edge-config";

const initialData = {
  "minecraft-accounts": {},
  "user-data": { users: {} },
  "pending-purchases": { pendingPurchases: [] },
  resets: {},
};

export async function GET() {
  try {
    // Parse the Edge Config connection string
    const edgeConfigString = process.env.EDGE_CONFIG;

    console.log("Edge Config Connection String:", edgeConfigString);

    if (!edgeConfigString) {
      throw new Error("EDGE_CONFIG environment variable is missing");
    }

    // Remove @ prefix if present
    const cleanConfigString = edgeConfigString.startsWith("@")
      ? edgeConfigString.substring(1)
      : edgeConfigString;

    // Extract Edge Config ID and token from the connection string
    // Format: https://edge-config.vercel.com/ecfg_xxx?token=yyy
    const match = cleanConfigString.match(
      /edge-config\.vercel\.com\/([^?]+)\?token=([^&]+)/
    );

    if (!match || match.length < 3) {
      console.error("Failed to parse Edge Config URL:", cleanConfigString);
      throw new Error("Invalid EDGE_CONFIG format");
    }

    const edgeConfigId = match[1];
    const token = match[2];

    // For GET requests, we can use the token in the URL
    const baseUrlWithToken = `https://edge-config.vercel.com/${edgeConfigId}?token=${token}`;

    console.log("Extracted Edge Config ID:", edgeConfigId);
    console.log("Using Edge Config URL for GET:", baseUrlWithToken);

    // First, verify we can read Edge Config data
    try {
      // Try using the SDK to test read access
      console.log("Testing read access with SDK");
      const edgeConfig = createClient(process.env.EDGE_CONFIG || "");

      // See if at least one of our keys exists
      const testKey = "test-read-access";
      const hasTestKey = await edgeConfig.has(testKey);
      console.log(
        `Test key existence check: ${testKey} exists = ${hasTestKey}`
      );
    } catch (readError) {
      console.error("Error reading from Edge Config with SDK:", readError);
    }

    // Let's try a simple GET request to verify we can read the Edge Config
    const testResponse = await fetch(baseUrlWithToken, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("Test GET response status:", testResponse.status);
    if (!testResponse.ok) {
      const testErrorText = await testResponse.text();
      console.error("Edge Config test error:", testErrorText);
      throw new Error(`Cannot read Edge Config: Status ${testResponse.status}`);
    } else {
      const testData = await testResponse.json();
      console.log("Current Edge Config data:", JSON.stringify(testData));
    }

    // Now try to initialize all the required keys
    const results = [];

    for (const [key, value] of Object.entries(initialData)) {
      console.log(`Initializing key: ${key}`);

      // Try to update the Edge Config using direct API call
      const response = await fetch(
        `https://edge-config.vercel.com/${edgeConfigId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ [key]: value }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error initializing key ${key}:`, errorText);
        console.error("Response status:", response.status);

        results.push({
          key,
          success: false,
          status: response.status,
          error: response.status === 403 ? "No write permission" : errorText,
        });
      } else {
        console.log(`Successfully initialized key: ${key}`);
        results.push({ key, success: true });
      }
    }

    // Check if any operations failed
    const anyFailed = results.some((result) => !result.success);

    if (anyFailed) {
      // If we have a 403 error, provide clear instructions
      if (results.some((result) => result.status === 403)) {
        throw new Error(
          "Your Edge Config token doesn't have write permissions. Please follow these steps:\n" +
            "1. Run 'vercel env pull' to get a token with write access\n" +
            "2. Make sure you're logged in with 'vercel login'\n" +
            "3. Check that your Edge Config is properly linked to your project"
        );
      }

      const failedResults = results.filter((result) => !result.success);
      throw new Error(
        `Failed to initialize some Edge Config keys: ${JSON.stringify(failedResults)}`
      );
    }

    // Verify the data was set correctly
    const verifyResponse = await fetch(baseUrlWithToken, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log(
        "Edge Config after initialization:",
        JSON.stringify(verifyData)
      );
    }

    return NextResponse.json({
      success: true,
      message: "Edge Config initialized successfully",
      initializedKeys: Object.keys(initialData),
      note: "If initialization failed with permission errors, make sure to run 'vercel env pull' to get updated environment variables with proper write access.",
    });
  } catch (error) {
    console.error("Error initializing Edge Config:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize Edge Config",
        status: "error",
        helpMessage:
          "To fix permission issues, run 'vercel env pull' to update your environment variables with write access.",
      },
      { status: 500 }
    );
  }
}
