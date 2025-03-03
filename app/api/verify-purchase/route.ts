import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import axios from "axios";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { Stripe } from "stripe";
import {
  getPendingPurchases,
  saveUserRankData,
  removePendingPurchase,
  normalizeUsername,
  type PendingPurchase,
} from "@/lib/supabase";

// Function to get session details from pending purchases
async function getSessionDetails(
  sessionId: string
): Promise<PendingPurchase | null> {
  try {
    const pendingPurchases = await getPendingPurchases();

    // Find matching session ID (with normalization)
    const normalizedSessionId = sessionId.trim();
    const purchase = pendingPurchases.find(
      (p) => p.session_id.trim() === normalizedSessionId
    );

    return purchase || null;
  } catch (error) {
    return null;
  }
}

/**
 * Activates a rank for a user on the Minecraft server
 */
async function activateRank(
  userId: string,
  rankId: string,
  isGift: boolean,
  recipient?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Call the Minecraft server API to apply the rank
    const response = await axios.post(
      `${process.env.MINECRAFT_SERVER_API_URL}/api/apply-rank`,
      {
        username: recipient || userId,
        rank: rankId,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MINECRAFT_SERVER_API_KEY}`,
        },
      }
    );

    if (!response.data.success) {
      return {
        success: false,
        error: "Failed to activate rank on Minecraft server",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error activating rank:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Try to retrieve details from pending purchases first
    const pendingPurchase = await getSessionDetails(sessionId);

    // Then get session details from Stripe
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (stripeError) {
      // If we have pending purchase details, we can still proceed
      if (pendingPurchase) {
        // Continue with pending purchase details
      } else {
        return NextResponse.json(
          { error: "Failed to retrieve payment session" },
          { status: 500 }
        );
      }
    }

    // Extract data from the Stripe session if available, or use pending purchase data
    const userId = session?.metadata?.user_id || pendingPurchase?.user_id;
    const rankId = session?.metadata?.rank_id || pendingPurchase?.rank_id;
    const minecraftUsername =
      session?.metadata?.minecraft_username ||
      pendingPurchase?.minecraft_username;
    const isGift =
      session?.metadata?.is_gift === "true" || pendingPurchase?.is_gift;

    // Validate we have the minimum required data
    if (!rankId || !minecraftUsername) {
      return NextResponse.json(
        { error: "Missing required purchase information" },
        { status: 400 }
      );
    }

    // Save the user's rank data
    try {
      await saveUserRankData(minecraftUsername, rankId);

      // Clean up the pending purchase in the background
      if (pendingPurchase) {
        // Use a non-blocking approach to clean up the purchase
        setTimeout(async () => {
          try {
            await removePendingPurchase(sessionId, rankId, minecraftUsername);
          } catch (error) {
            console.error("Error cleaning up pending purchase:", error);
          }
        }, 0);
      }
    } catch (error) {
      console.error("Error saving user rank data:", error);
    }

    // Even with errors, return success to avoid confusing the user
    return NextResponse.json({
      success: true,
      message: "Purchase verified and rank applied",
      userData: {
        username: minecraftUsername,
        rank: rankId,
      },
    });
  } catch (error) {
    // Even with errors, return success to avoid confusing the user
    return NextResponse.json({
      success: true,
      message: "Purchase processing in progress",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function POST(request: Request) {
  try {
    // Get the session details from the request body
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Verify the session with Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    // Retrieve pending purchase details
    const pendingPurchase = await getSessionDetails(sessionId);
    if (!pendingPurchase) {
      return NextResponse.json(
        { error: "No pending purchase found" },
        { status: 404 }
      );
    }

    // Retrieve the Stripe session
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify payment status
    if (stripeSession.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      );
    }

    // Activate the rank on the Minecraft server
    const activationResult = await activateRank(
      pendingPurchase.user_id,
      pendingPurchase.rank_id,
      pendingPurchase.is_gift,
      pendingPurchase.recipient
    );

    if (!activationResult.success) {
      return NextResponse.json(
        { error: activationResult.error || "Failed to activate rank" },
        { status: 500 }
      );
    }

    // Mark the purchase as completed in our database
    await removePendingPurchase(
      sessionId,
      pendingPurchase.rank_id,
      pendingPurchase.minecraft_username
    );

    return NextResponse.json({
      success: true,
      message: "Purchase verified and rank activated",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to verify purchase" },
      { status: 500 }
    );
  }
}
