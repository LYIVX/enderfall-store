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

    // For GET requests, we can use the token in the URL
    const baseUrlWithToken = `https://edge-config.vercel.com/${edgeConfigId}?token=${token}`;

    console.log("Extracted Edge Config ID:", edgeConfigId);
    console.log("Using Edge Config URL for GET:", baseUrlWithToken);

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
    } else {
      const testData = await testResponse.json();
      console.log("Current Edge Config data:", JSON.stringify(testData));
    }

    console.log("Creating a single item to test write permission");

    // Try directly using the Vercel REST API
    // https://vercel.com/docs/api/edge-config/introduction
    const testItemResponse = await fetch(
      `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: [
            {
              operation: "update",
              key: "test-write",
              value: { initialized: true, timestamp: Date.now() },
            },
          ],
        }),
      }
    );

    console.log("Test write response status:", testItemResponse.status);

    if (!testItemResponse.ok) {
      const writeErrorText = await testItemResponse.text();
      console.error("Edge Config write test error:", writeErrorText);
      console.error(
        "Response headers:",
        Object.fromEntries(testItemResponse.headers.entries())
      );
      throw new Error(
        `Cannot write to Edge Config. Status: ${testItemResponse.status}. You may need a token with write permissions.`
      );
    }

    // Since we can write, now attempt to update with our initial data
    const results = [];

    // Prepare all items for a batch update
    const itemsToUpdate = Object.entries(initialData).map(([key, value]) => ({
      operation: "update",
      key,
      value,
    }));

    console.log("Initializing all Edge Config keys in a single request");

    const response = await fetch(
      `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: itemsToUpdate,
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
