import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { stripe } from "@/lib/stripe";
import { authOptions } from "@/lib/auth";
import { getResetData, updateResetData } from "@/lib/edge-config";

interface ResetRecord {
  resetAt: string;
  sessionIds: string[];
  active: boolean;
}

interface ResetData {
  [userId: string]: ResetRecord;
}

/**
 * This endpoint is for development and testing purposes only.
 * It allows toggling a user's purchase history visibility for testing.
 * In a production environment, this would be dangerous and should be removed.
 */
export async function POST(req: Request) {
  try {
    // Only allow in development environment
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "This endpoint is not available in production" },
        { status: 403 }
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse request body to get the toggle state
    const requestData = await req.json();
    const resetActive = !!requestData.active; // Convert to boolean

    // Get the user's Stripe checkout sessions
    const checkouts = await stripe.checkout.sessions.list({
      limit: 100,
      created: {
        gte: Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000), // Last 90 days
      },
    });

    // Filter to get only this user's checkout sessions
    const userCheckouts = checkouts.data.filter(
      (checkout) =>
        checkout.metadata?.user_id === session.user.id &&
        checkout.metadata?.type === "rank_purchase"
    );

    console.log(
      `Found ${userCheckouts.length} purchases to ${resetActive ? "hide" : "show"} for user ${session.user.id}`
    );

    // Update reset data
    await updateResetData(
      session.user.id,
      resetActive,
      resetActive ? userCheckouts.map((checkout) => checkout.id) : []
    );

    return NextResponse.json({
      success: true,
      active: resetActive,
      message: resetActive
        ? `Hidden ${userCheckouts.length} purchases for testing`
        : "Purchases are now visible again",
    });
  } catch (error) {
    console.error("Failed to toggle purchase visibility:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to toggle purchase visibility",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check current reset status
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get reset data
    const resets = await getResetData();
    const userReset = resets[session.user.id];

    return NextResponse.json({
      active: userReset?.active === true,
    });
  } catch (error) {
    console.error("Failed to check reset status:", error);
    return NextResponse.json(
      { error: "Failed to check reset status" },
      { status: 500 }
    );
  }
}
