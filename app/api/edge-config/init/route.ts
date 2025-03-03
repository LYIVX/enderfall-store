import { NextResponse } from "next/server";

const initialData = {
  "minecraft-accounts": {},
  "user-data": { users: {} },
  "pending-purchases": { pendingPurchases: [] },
  resets: {},
};

export async function GET() {
  try {
    const response = await fetch(`https://edge-config.vercel.com/v1/items`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${process.env.EDGE_CONFIG}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: Object.entries(initialData).map(([key, value]) => ({
          operation: "upsert",
          key,
          value,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Failed to initialize Edge Config: ${JSON.stringify(error)}`
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
      },
      { status: 500 }
    );
  }
}
