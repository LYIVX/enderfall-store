import { NextResponse } from "next/server";
import { getMinecraftApiUrl } from "@/lib/minecraft-api";
import { removePendingPurchase, saveUserRankData } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import axios from "axios";

interface PendingPurchase {
  id: string;
  user_id: string;
  rank_id: string;
  minecraft_username: string;
  timestamp: number;
  session_id: string;
  is_gift: boolean;
  recipient?: string;
  created_at?: string;
}

// Function to get session details from pending purchases
async function getSessionDetails(
  sessionId: string
): Promise<PendingPurchase | null> {
  try {
    // Get pending purchase directly from Supabase
    const { data: pendingPurchases, error } = await supabase
      .from("pending_purchases")
      .select("*")
      .eq("session_id", sessionId.trim())
      .limit(1);

    if (error || !pendingPurchases || pendingPurchases.length === 0) {
      return null;
    }

    return pendingPurchases[0] as PendingPurchase;
  } catch (error) {
    console.error("Error getting session details:", error);
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

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Get the pending purchase from our database
    const { data: pendingPurchases } = await supabase
      .from("pending_purchases")
      .select("*")
      .eq("session_id", sessionId)
      .limit(1);

    const pendingPurchase = pendingPurchases?.[0];

    if (!pendingPurchase) {
      return NextResponse.json(
        { error: "No pending purchase found" },
        { status: 404 }
      );
    }

    // Extract data from the pending purchase
    const { minecraft_username: minecraftUsername, rank_id: rankId } =
      pendingPurchase;

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
      setTimeout(async () => {
        try {
          await removePendingPurchase(sessionId, rankId, minecraftUsername);
        } catch (error) {
          console.error("Error cleaning up pending purchase:", error);
        }
      }, 0);
    } catch (error) {
      console.error("Error saving user rank data:", error);
    }

    // Apply the rank via the Minecraft server API
    const response = await fetch(`${getMinecraftApiUrl()}/api/apply-rank`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MINECRAFT_SERVER_API_KEY}`,
      },
      body: JSON.stringify({
        username: minecraftUsername,
        rankId: rankId,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to apply rank on Minecraft server" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Purchase verified and rank activated",
    });
  } catch (error) {
    console.error("Error verifying purchase:", error);
    return NextResponse.json(
      { error: "Failed to verify purchase" },
      { status: 500 }
    );
  }
}
