import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { stripe } from "@/lib/stripe";
import { authOptions } from "@/lib/auth";
import { ranksConfig, type Rank } from "@/lib/ranks";
import { isServerOnline } from "@/lib/serverStatus";
import fs from "fs";
import path from "path";
import Stripe from "stripe";

// Define pending purchase type
interface PendingPurchase {
  userId: string;
  rankId: string;
  minecraftUsername: string;
  timestamp: string;
  sessionId: string;
  isGift: boolean;
}

// Interface for pending purchases data
interface PendingPurchasesData {
  pendingPurchases: PendingPurchase[];
}

// Interface for user data
interface UserData {
  users: {
    [username: string]: {
      ranks: string[];
    };
  };
}

// Helper function to normalize Minecraft usernames for consistent storage and lookup
function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

// Function to check if a Minecraft username already has a specific rank
async function checkExistingRank(
  username: string,
  rankId: string
): Promise<boolean> {
  try {
    const dataFilePath = path.join(process.cwd(), "data", "user-data.json");

    // If the file doesn't exist, the user definitely doesn't have the rank
    if (!fs.existsSync(dataFilePath)) {
      return false;
    }

    // Read existing data
    const data = fs.readFileSync(dataFilePath, "utf8");
    const userData: UserData = JSON.parse(data) as UserData;

    // Normalize username for consistency
    const normalizedUsername = normalizeUsername(username);

    // Check if the user exists and has the rank
    return userData.users[normalizedUsername]?.ranks?.includes(rankId) || false;
  } catch (error) {
    return false;
  }
}

// Function to check if a user has a higher rank in the same category
async function checkHigherRank(
  username: string,
  rankId: string
): Promise<{
  hasHigherRank: boolean;
  suggestedUpgrade?: string;
  currentRank?: string;
}> {
  try {
    // Get the rank details to understand its category and order
    const rank = ranksConfig.getRankById(rankId);
    if (!rank) {
      return { hasHigherRank: false };
    }

    // Get user data
    const userData = await getUserData(username);
    if (!userData?.ranks || userData.ranks.length === 0) {
      return { hasHigherRank: false };
    }

    // Normalize username for consistency
    const normalizedUsername = normalizeUsername(username);

    // Find the highest rank in the same category
    let highestRank: Rank | undefined;
    let currentRankId: string | undefined;

    userData.ranks.forEach((existingRankId) => {
      const existingRank = ranksConfig.getRankById(existingRankId);
      if (
        existingRank &&
        existingRank.categoryId === rank.categoryId &&
        (!highestRank || existingRank.order > highestRank.order)
      ) {
        highestRank = existingRank;
        currentRankId = existingRankId;
      }
    });

    // If user has a higher rank, try to find an appropriate upgrade
    if (highestRank && highestRank.order >= rank.order) {
      // Find possible upgrades for the highest rank
      let suggestedUpgrade: string | undefined;

      // Look for a direct upgrade from current rank
      // Use the ranks array from ranksConfig instead of getAllRanks
      const upgrades = ranksConfig.ranks.filter(
        (r: Rank) =>
          r.categoryId === "upgrade" && r.requiredRank === currentRankId
      );

      if (upgrades.length > 0) {
        // Sort by order and pick the first one
        upgrades.sort((a: Rank, b: Rank) => a.order - b.order);
        suggestedUpgrade = upgrades[0].id;
      }

      return {
        hasHigherRank: true,
        suggestedUpgrade,
        currentRank: highestRank.id,
      };
    }

    return { hasHigherRank: false };
  } catch (error) {
    return { hasHigherRank: false };
  }
}

// Function to record a pending purchase
async function recordPendingPurchase(
  userId: string,
  rankId: string,
  minecraftUsername: string,
  sessionId: string,
  isGift: boolean
) {
  try {
    // Normalize the username
    const normalizedUsername = normalizeUsername(minecraftUsername);

    const dataFilePath = path.join(
      process.cwd(),
      "data",
      "pending-purchases.json"
    );

    // Read existing data or create new structure
    let purchasesData: PendingPurchasesData = { pendingPurchases: [] };
    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath, "utf8");
      purchasesData = JSON.parse(data) as PendingPurchasesData;
    }

    // Create new pending purchase record
    const pendingPurchase: PendingPurchase = {
      userId,
      rankId,
      minecraftUsername: normalizedUsername,
      timestamp: new Date().toISOString(),
      sessionId,
      isGift,
    };

    // Add to array
    purchasesData.pendingPurchases.push(pendingPurchase);

    // Write back to file
    fs.writeFileSync(
      dataFilePath,
      JSON.stringify(purchasesData, null, 2),
      "utf8"
    );

    return true;
  } catch (error) {
    return false;
  }
}

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

    // Check if the server is online before proceeding with purchase
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

    // We no longer require verification, just ensure a Minecraft username is provided
    if (!minecraftUsername) {
      return NextResponse.json(
        { error: "Please enter a valid Minecraft username" },
        { status: 400 }
      );
    }

    const rank = ranksConfig.getRankById(rankId);
    const stripePriceId = ranksConfig.getStripePriceId(rankId);

    if (!rank || !stripePriceId) {
      return NextResponse.json(
        { error: "Invalid rank selected" },
        { status: 400 }
      );
    }

    // Normalize username right at the beginning
    const normalizedUsername = normalizeUsername(minecraftUsername);

    // Check if this username already has this rank (skip for gifts)
    if (!isGift) {
      const alreadyHasRank = await checkExistingRank(
        normalizedUsername,
        rankId
      );

      if (alreadyHasRank) {
        return NextResponse.json(
          {
            error: `${normalizedUsername} already has this rank. Each player can only have one of each rank.`,
          },
          { status: 400 }
        );
      }

      // Check if the user has a higher rank in the same category
      const { hasHigherRank, suggestedUpgrade, currentRank } =
        await checkHigherRank(normalizedUsername, rankId);

      if (hasHigherRank) {
        // Get details for current rank and suggested upgrade
        const currentRankDetails = currentRank
          ? ranksConfig.getRankById(currentRank)
          : undefined;
        const suggestedUpgradeDetails = suggestedUpgrade
          ? ranksConfig.getRankById(suggestedUpgrade)
          : undefined;

        return NextResponse.json(
          {
            error: `${normalizedUsername} already has a higher rank in this category.`,
            currentRank: currentRankDetails,
            suggestedUpgrade: suggestedUpgradeDetails,
          },
          { status: 400 }
        );
      }
    } else {
      // For gifts, check if recipient already has the rank or a higher rank
      // This allows the gift to proceed, but warns the purchaser
      const alreadyHasRank = await checkExistingRank(
        normalizedUsername,
        rankId
      );

      if (alreadyHasRank) {
        // Removed console.log statement
      } else {
        // Check for higher ranks even for gifts (but don't block, just warn)
        const { hasHigherRank, currentRank } = await checkHigherRank(
          normalizedUsername,
          rankId
        );

        if (hasHigherRank && currentRank) {
          const currentRankObj = ranksConfig.getRankById(currentRank);
          // Removed console.log statement
        }
      }
    }

    // Format metadata for Stripe
    const metadata = {
      user_id: session.user.id,
      rank_id: rankId,
      minecraft_username: normalizedUsername,
      is_gift: isGift ? "true" : "false",
      type: "rank_purchase",
    };

    // Set up Stripe checkout session
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
    await recordPendingPurchase(
      session.user.id,
      rankId,
      normalizedUsername,
      stripeSession.id,
      isGift
    );

    return NextResponse.json({ sessionId: stripeSession.id });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

// Helper function to get user data (ranks, etc.) by username
async function getUserData(username: string) {
  try {
    const dataFilePath = path.join(process.cwd(), "data", "user-data.json");

    // If the file doesn't exist, the user definitely doesn't have the rank
    if (!fs.existsSync(dataFilePath)) {
      return null;
    }

    // Read existing data
    const data = fs.readFileSync(dataFilePath, "utf8");
    const userData: UserData = JSON.parse(data) as UserData;

    // Normalize username for consistency
    const normalizedUsername = normalizeUsername(username);

    // Return the user's data if it exists
    if (userData.users[normalizedUsername]) {
      return {
        username: normalizedUsername,
        ranks: userData.users[normalizedUsername].ranks || [],
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}
