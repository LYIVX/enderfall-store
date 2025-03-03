import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Test Supabase connection and operations
    console.log("Testing Supabase connection...");

    // 1. Create a test account
    const testAccount = {
      user_id: `test-user-${Date.now()}`,
      username: `TestUser-${Date.now()}`,
      added_at: new Date().toISOString(),
    };

    // 2. Insert test data
    const { data: insertData, error: insertError } = await supabase
      .from("minecraft_accounts")
      .insert(testAccount)
      .select();

    if (insertError) {
      console.error("Error inserting test data:", insertError);
      return NextResponse.json(
        {
          success: false,
          error: insertError.message,
          message: "Failed to insert test data into Supabase",
        },
        { status: 500 }
      );
    }

    // 3. Query the inserted data
    const { data: queryData, error: queryError } = await supabase
      .from("minecraft_accounts")
      .select("*")
      .eq("user_id", testAccount.user_id)
      .limit(1);

    if (queryError) {
      console.error("Error querying test data:", queryError);
      return NextResponse.json(
        {
          success: false,
          error: queryError.message,
          message: "Failed to query test data from Supabase",
        },
        { status: 500 }
      );
    }

    // 4. Delete the test data
    const { error: deleteError } = await supabase
      .from("minecraft_accounts")
      .delete()
      .eq("user_id", testAccount.user_id);

    if (deleteError) {
      console.error("Error deleting test data:", deleteError);
      return NextResponse.json(
        {
          success: false,
          error: deleteError.message,
          message: "Failed to delete test data from Supabase",
        },
        { status: 500 }
      );
    }

    // Return success response with test results
    return NextResponse.json({
      success: true,
      message: "Supabase test completed successfully",
      inserted: insertData,
      queried: queryData,
      testAccount: testAccount,
    });
  } catch (error) {
    console.error("Error in test endpoint:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
