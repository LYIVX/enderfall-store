import { NextResponse } from "next/server";

const initialData = {
  "minecraft-accounts": {},
  "user-data": { users: {} },
  "pending-purchases": { pendingPurchases: [] },
  resets: {},
};

export async function GET() {
  try {
    // Get Edge Config ID and token from environment variables
    const edgeConfigId = process.env.EDGE_CONFIG_ID;
    const token = process.env.EDGE_CONFIG_TOKEN;

    if (!edgeConfigId || !token) {
      throw new Error(
        "Edge Config ID or token is missing in environment variables"
      );
    }

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
