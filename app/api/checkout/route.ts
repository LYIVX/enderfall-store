import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { stripe } from "@/lib/stripe";
import { authOptions } from "@/lib/auth";
import { ranksConfig, type Rank } from "@/lib/ranks";
import { isServerOnline } from "@/lib/serverStatus";
import { addPendingPurchase } from "@/lib/supabase";
import Stripe from "stripe";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse request body
    const requestData = await req.json();
    const { rankId, minecraftUsername, isGift, recipient } = requestData;

    // Validate required fields
    if (!rankId || !minecraftUsername) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate rank exists
    const rank = ranksConfig.ranks.find((r: Rank) => r.id === rankId);
    if (!rank) {
      return NextResponse.json({ error: "Invalid rank ID" }, { status: 400 });
    }

    // Check if server is online before proceeding
    const serverStatus = await isServerOnline();
    if (!serverStatus) {
      return NextResponse.json(
        { error: "Server is currently offline" },
        { status: 503 }
      );
    }

    // Get the price ID based on the rank
    const stripePriceId = rank.stripePriceId;
    if (!stripePriceId) {
      return NextResponse.json(
        { error: "Price not configured for this rank" },
        { status: 400 }
      );
    }

    // Prepare metadata for the session
    const metadata: Record<string, string> = {
      type: "rank_purchase",
      user_id: session.user.id,
      rank_id: rankId,
      minecraft_username: minecraftUsername.trim().toLowerCase(),
      is_gift: isGift ? "true" : "false",
    };

    if (isGift && recipient) {
      metadata.recipient = recipient;
    }

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

    // Record the pending purchase
    try {
      await addPendingPurchase({
        user_id: session.user.id,
        rank_id: rankId,
        minecraft_username: minecraftUsername.trim().toLowerCase(),
        timestamp: Date.now(),
        session_id: stripeSession.id,
        is_gift: !!isGift,
        recipient: recipient,
      });
    } catch (error) {
      console.error("Error recording pending purchase:", error);
      // Continue with checkout even if recording fails
    }

    return NextResponse.json({
      sessionId: stripeSession.id,
      url: stripeSession.url,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create checkout",
      },
      { status: 500 }
    );
  }
}
