import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { stripe } from "@/lib/stripe";
import { authOptions } from "@/lib/auth";
import { ranksConfig } from "@/lib/ranks";
import { isServerOnline } from "@/lib/serverStatus";
import { addPendingPurchase } from "@/lib/supabase";

/**
 * API Route: POST /api/create-checkout-session
 * Creates a Stripe checkout session for purchasing ranks
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { rankId, minecraftUsername, isGift } = body;

    // Validate inputs
    if (!rankId || !minecraftUsername) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if the server is online
    const serverOnline = await isServerOnline();
    if (!serverOnline) {
      return NextResponse.json(
        {
          error:
            "The Minecraft server is currently offline. Purchases cannot be processed until the server is back online.",
          serverOffline: true,
        },
        { status: 503 }
      );
    }

    // Get rank details
    const rank = ranksConfig.getRankById(rankId);
    const stripePriceId = ranksConfig.getStripePriceId(rankId);

    if (!rank || !stripePriceId) {
      return NextResponse.json(
        { error: "Invalid rank selected" },
        { status: 400 }
      );
    }

    // Format metadata for Stripe
    const metadata = {
      user_id: session.user.id,
      rank_id: rankId,
      rank_name: rank.name,
      minecraft_username: minecraftUsername.trim().toLowerCase(),
      is_gift: isGift ? "true" : "false",
      type: "rank_purchase",
    };

    // Create Stripe checkout session
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/shop`,
      metadata: metadata,
    });

    // Record the pending purchase in Supabase instead of local filesystem
    try {
      const success = await addPendingPurchase({
        user_id: session.user.id,
        rank_id: rankId,
        minecraft_username: minecraftUsername.trim().toLowerCase(),
        timestamp: Date.now(),
        session_id: stripeSession.id,
        is_gift: !!isGift,
      });

      if (!success) {
        console.error("Failed to record pending purchase in Supabase");
      }
    } catch (error) {
      console.error("Failed to record pending purchase:", error);
      // Continue even if recording fails - don't block the checkout
    }

    // Return the checkout URL for redirection
    return NextResponse.json({ url: stripeSession.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
