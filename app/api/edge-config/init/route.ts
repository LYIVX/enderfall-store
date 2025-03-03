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

    const baseUrl = `https://edge-config.vercel.com/${edgeConfigId}`;
    const baseUrlWithToken = `${baseUrl}?token=${token}`;

    console.log("Extracted Edge Config ID:", edgeConfigId);
    console.log("Using Edge Config URL:", baseUrlWithToken);

    // Let's try a simple GET request first to verify the connection
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
    } else {
      const testData = await testResponse.json();
      console.log("Current Edge Config data:", JSON.stringify(testData));
    }

    // Initialize keys - try direct PUT for each key
    const results = [];

    for (const [key, value] of Object.entries(initialData)) {
      console.log(`Initializing key: ${key}`);
      console.log(
        `Using direct PUT to: ${baseUrl}/items/${key}?token=${token}`
      );

      // Use PUT request to set each key directly
      const response = await fetch(`${baseUrl}/items/${key}?token=${token}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(value),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error initializing key ${key}:`, errorText);
        console.error("Response status:", response.status);
        console.error(
          "Response headers:",
          Object.fromEntries(response.headers.entries())
        );
        results.push({
          key,
          success: false,
          status: response.status,
          error: errorText,
        });
      } else {
        console.log(`Successfully initialized key: ${key}`);
        results.push({ key, success: true });
      }
    }

    // Check if any operations failed
    const anyFailed = results.some((result) => !result.success);

    if (anyFailed) {
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
