import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { stripe } from "@/lib/stripe";
import { authOptions } from "@/lib/auth";
import { ranks } from "@/lib/ranks";

export async function GET(request: Request) {
  try {
    // Get the session from the server component
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        {
          status: 401,
        }
      );
    }

    // Get checkouts from Stripe API
    const checkouts = await stripe.checkout.sessions.list({
      limit: 100,
    });

    // Filter out checkouts that don't belong to the user
    let filteredCheckouts = checkouts.data.filter((checkout) => {
      // Check if this checkout belongs to the user
      const userIdMatch = checkout.metadata?.user_id === session.user.id;
      const typeMatch = checkout.metadata?.type === "rank_purchase";

      // Only include completed payments
      return userIdMatch && typeMatch && checkout.payment_status === "paid";
    });

    // Format purchases for the frontend
    const purchases = filteredCheckouts.map((checkout) => {
      const timestamp = new Date(checkout.created * 1000);
      const formattedDate = timestamp.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const formattedTime = timestamp.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Get rank name from metadata or look it up from the rank ID
      const rankId = checkout.metadata?.rank_id || "";
      let rankName = checkout.metadata?.rank_name || "";

      // If rank name not in metadata, try to find it from the rank ID
      if (!rankName && rankId) {
        const rank = ranks.find((r) => r.id === rankId);
        rankName = rank?.name || "Unknown Rank";
      }

      return {
        id: checkout.id,
        amount: checkout.amount_total ? checkout.amount_total / 100 : 0,
        currency: checkout.currency,
        status: checkout.payment_status,
        timestamp: timestamp.toISOString(),
        formattedDate,
        formattedTime,
        rankId: rankId,
        rankName: rankName,
        minecraftUsername: checkout.metadata?.minecraft_username || "",
        isGift: checkout.metadata?.is_gift === "true",
        recipient: checkout.metadata?.gift_recipient || null,
      };
    });

    return NextResponse.json({
      purchases: purchases.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    });
  } catch (error) {
    console.error("Failed to load purchases:", error);
    return NextResponse.json(
      { error: "Failed to load purchases" },
      {
        status: 500,
      }
    );
  }
}
