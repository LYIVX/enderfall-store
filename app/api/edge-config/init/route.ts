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

    // Now prepare all items for a single request to the items endpoint
    const itemsToUpsert = Object.entries(initialData).map(([key, value]) => ({
      operation: "upsert",
      key,
      value,
    }));

    console.log("Initializing all Edge Config keys in a single request");
    console.log(
      `Using correct API endpoint: https://edge-config.vercel.com/${edgeConfigId}/items?token=${token}`
    );

    // Make a single POST request with all items to be upserted
    const response = await fetch(
      `https://edge-config.vercel.com/${edgeConfigId}/items?token=${token}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: itemsToUpsert,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error initializing Edge Config:", errorText);
      console.error("Response status:", response.status);
      console.error(
        "Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      throw new Error(
        `Failed to initialize Edge Config: Status ${response.status}`
      );
    }

    const responseData = await response.json();
    console.log(
      "Edge Config initialization response:",
      JSON.stringify(responseData)
    );

    return NextResponse.json({
      success: true,
      message: "Edge Config initialized successfully",
      initializedKeys: Object.keys(initialData),
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
