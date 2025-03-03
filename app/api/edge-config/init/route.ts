import { NextResponse } from "next/server";

const initialData = {
  "minecraft-accounts": {},
  "user-data": { users: {} },
  "pending-purchases": { pendingPurchases: [] },
  resets: {},
};

export async function GET() {
  try {
    const response = await fetch(
      `https://edge-config.vercel.com/v1/edge-config/ecfg_0yqbzfkjkifmcbj5w8wxytxvnomp/items`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer cdb28656-fbd2-4a36-94fc-27c117c000c2`,
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
