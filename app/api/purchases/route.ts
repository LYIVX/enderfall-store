import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { stripe } from "@/lib/stripe";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";

const RANK_NAMES = {
  vip: "VIP",
  mvp: "MVP",
  elite: "Elite",
};

interface ResetRecord {
  resetAt: string;
  sessionIds: string[];
  active: boolean;
}

// Function to check if a user has reset their purchases
function hasResetPurchases(
  userId: string
): { resetAt: string; sessionIds: string[]; active: boolean } | null {
  try {
    const resetsPath = path.join(process.cwd(), "data", "resets.json");
    if (!fs.existsSync(resetsPath)) {
      return null;
    }

    const fileContent = fs.readFileSync(resetsPath, "utf8");
    const resets = JSON.parse(fileContent);

    return resets[userId] || null;
  } catch (error) {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reset = searchParams.get("reset");

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

    // Process reset parameter
    let resetRequested = false;
    if (reset === "true") {
      resetRequested = true;
    }

    // Filter out checkouts that don't belong to the user
    let filteredCheckouts = checkouts.data.filter((checkout) => {
      // Check if this checkout belongs to the user
      const userIdMatch = checkout.metadata?.user_id === session.user.id;
      const typeMatch = checkout.metadata?.type === "rank_purchase";
      const notReset = !resetRequested;

      // Only include completed payments
      return (
        userIdMatch &&
        typeMatch &&
        notReset &&
        checkout.payment_status === "paid"
      );
    });

    // Format purchases for the frontend
    const purchases = filteredCheckouts.map((checkout) => {
      return {
        id: checkout.id,
        amount: checkout.amount_total ? checkout.amount_total / 100 : 0,
        currency: checkout.currency,
        status: checkout.payment_status,
        date: new Date(checkout.created * 1000).toISOString(),
        rankId: checkout.metadata?.rank_id || "unknown",
        minecraftUsername: checkout.metadata?.minecraft_username || "unknown",
      };
    });

    return NextResponse.json({ purchases });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load purchases" },
      {
        status: 500,
      }
    );
  }
}
