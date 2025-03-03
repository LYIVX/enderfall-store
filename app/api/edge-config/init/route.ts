import { NextResponse } from "next/server";
import { createClient } from "@vercel/edge-config";

const edgeConfig = createClient(process.env.EDGE_CONFIG);

const initialData = {
  "minecraft-accounts": {},
  "user-data": { users: {} },
  "pending-purchases": { pendingPurchases: [] },
  resets: {},
};

export async function GET() {
  try {
    // Initialize each key in Edge Config
    for (const [key, value] of Object.entries(initialData)) {
      // @ts-ignore - Edge Config's set method exists but TypeScript doesn't recognize it
      await edgeConfig.set(key, value);
    }

    return NextResponse.json({
      success: true,
      message: "Edge Config initialized successfully",
      initializedKeys: Object.keys(initialData),
    });
  } catch (error) {
    console.error("Error initializing Edge Config:", error);
    return NextResponse.json(
      { error: "Failed to initialize Edge Config" },
      { status: 500 }
    );
  }
}
