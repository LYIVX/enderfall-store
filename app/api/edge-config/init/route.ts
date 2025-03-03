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

    if (!edgeConfigString) {
      throw new Error("EDGE_CONFIG environment variable is missing");
    }

    // Extract Edge Config ID and token from the connection string
    // Format: @https://edge-config.vercel.com/ecfg_xxx?token=yyy
    const match = edgeConfigString.match(
      /edge-config\.vercel\.com\/([^?]+)\?token=([^&]+)/
    );

    if (!match || match.length < 3) {
      throw new Error("Invalid EDGE_CONFIG format");
    }

    const edgeConfigId = match[1];
    const token = match[2];

    const response = await fetch(
      `https://edge-config.vercel.com/${edgeConfigId}/items?token=${token}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: Object.entries(initialData).map(([key, value]) => ({
            operation: "upsert",
            key,
            value,
          })),
        }),
      }
    );

    // Check if the response is ok but don't try to parse it as JSON
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Edge Config initialization error:", errorText);
      throw new Error(
        `Failed to initialize Edge Config: Status ${response.status}`
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
