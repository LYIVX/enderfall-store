import { NextResponse } from "next/server";
import { get, updateEdgeConfig } from "@/lib/edge-config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get current data
    const currentAccounts = await get("minecraft-accounts");
    console.log("Current accounts:", currentAccounts);

    // Create a test account
    const testAccount = {
      id: `test-${Date.now()}`,
      username: "TestUser",
      uuid: "test-uuid-12345",
      added: new Date().toISOString(),
    };

    // Attempt to update (will return instructions rather than performing update)
    const result = await updateEdgeConfig("minecraft-accounts", [
      ...(Array.isArray(currentAccounts) ? currentAccounts : []),
      testAccount,
    ]);

    // Return details about what happened
    return NextResponse.json({
      current: currentAccounts,
      updateAttempt: result,
      manual_instructions:
        "Copy the value from the server logs and update it in the Vercel Dashboard",
      new_account: testAccount,
    });
  } catch (error) {
    console.error("Error in test endpoint:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
