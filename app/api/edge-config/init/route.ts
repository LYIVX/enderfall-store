import { NextResponse } from "next/server";

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

    console.log("Extracted Edge Config ID:", edgeConfigId);
    console.log(
      "Using Edge Config URL:",
      `https://edge-config.vercel.com/${edgeConfigId}?token=${token}`
    );

    // Let's try a simple GET request first to verify the connection
    const testResponse = await fetch(
      `https://edge-config.vercel.com/${edgeConfigId}?token=${token}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Test GET response status:", testResponse.status);
    if (!testResponse.ok) {
      const testErrorText = await testResponse.text();
      console.error("Edge Config test error:", testErrorText);
    } else {
      const testData = await testResponse.json();
      console.log("Current Edge Config data:", JSON.stringify(testData));
    }

    // Now attempt to update each key individually using POST
    const results = [];

    for (const [key, value] of Object.entries(initialData)) {
      console.log(`Initializing key: ${key}`);

      // Create a single key-value pair for this update
      const requestBody: Record<string, any> = {};
      requestBody[key] = value;

      const response = await fetch(
        `https://edge-config.vercel.com/${edgeConfigId}?token=${token}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error initializing key ${key}:`, errorText);
        console.error("Response status:", response.status);
        results.push({ key, success: false, status: response.status });
      } else {
        console.log(`Successfully initialized key: ${key}`);
        results.push({ key, success: true });
      }
    }

    // Check if any of the operations failed
    const anyFailed = results.some((result) => !result.success);

    if (anyFailed) {
      const failedResults = results.filter((result) => !result.success);
      throw new Error(
        `Failed to initialize some Edge Config keys: ${JSON.stringify(failedResults)}`
      );
    }

    return NextResponse.json({
      success: true,
      message: "Edge Config initialized successfully",
      initializedKeys: Object.keys(initialData),
      results,
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
      },
      { status: 500 }
    );
  }
}
