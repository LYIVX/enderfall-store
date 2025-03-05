import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";

interface PendingRank {
  username: string;
  rank_id: string;
  created_at: string;
}

export async function POST(req: Request) {
  const correlationId = uuidv4().substring(0, 8);
  console.log(`[${correlationId}][Pending Ranks] Request received`);

  try {
    // Verify API key
    const authHeader = req.headers.get("authorization");
    const apiKey = process.env.MINECRAFT_SERVER_API_KEY;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ") ||
      authHeader.substring(7) !== apiKey
    ) {
      console.error(`[${correlationId}][Pending Ranks] Invalid API key`);
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the username from the request body
    const body = await req.json();
    const username = body.username?.toLowerCase();

    if (!username) {
      console.error(`[${correlationId}][Pending Ranks] Missing username`);
      return NextResponse.json(
        { success: false, message: "Missing username" },
        { status: 400 }
      );
    }

    console.log(
      `[${correlationId}][Pending Ranks] Checking pending ranks for ${username}`
    );

    // Get pending ranks from Supabase
    const pendingRanks: PendingRank[] = [];

    // 1. First check pending_ranks_backup table
    const { data: pendingRanksData, error: pendingRanksError } = await supabase
      .from("pending_ranks_backup")
      .select("*")
      .eq("username", username);

    if (pendingRanksError) {
      console.error(
        `[${correlationId}][Pending Ranks] Error querying pending_ranks_backup:`,
        pendingRanksError
      );
    } else if (pendingRanksData && pendingRanksData.length > 0) {
      console.log(
        `[${correlationId}][Pending Ranks] Found ${pendingRanksData.length} pending ranks in pending_ranks_backup for ${username}`
      );

      // Add these ranks to the response
      pendingRanksData.forEach((rank) => {
        pendingRanks.push({
          username: rank.username,
          rank_id: rank.rank_id,
          created_at: rank.created_at,
        });
      });

      // Delete the ranks we've found from pending_ranks_backup
      const { error: deleteError } = await supabase
        .from("pending_ranks_backup")
        .delete()
        .eq("username", username);

      if (deleteError) {
        console.error(
          `[${correlationId}][Pending Ranks] Error deleting from pending_ranks_backup:`,
          deleteError
        );
      } else {
        console.log(
          `[${correlationId}][Pending Ranks] Successfully cleaned up pending ranks from pending_ranks_backup for ${username}`
        );
      }
    }

    // 2. Check pending_purchases table
    const { data: pendingPurchases, error: purchasesError } = await supabase
      .from("pending_purchases")
      .select("*")
      .eq("minecraft_username", username);

    if (purchasesError) {
      console.error(
        `[${correlationId}][Pending Ranks] Error querying pending_purchases:`,
        purchasesError
      );
    } else if (pendingPurchases && pendingPurchases.length > 0) {
      console.log(
        `[${correlationId}][Pending Ranks] Found ${pendingPurchases.length} pending purchases for ${username}`
      );

      // Add these purchases to the response
      pendingPurchases.forEach((purchase) => {
        pendingRanks.push({
          username: purchase.minecraft_username,
          rank_id: purchase.rank_id,
          created_at: purchase.created_at || new Date().toISOString(),
        });
      });

      // Delete the pending purchases we've processed
      const { error: deleteError } = await supabase
        .from("pending_purchases")
        .delete()
        .eq("minecraft_username", username);

      if (deleteError) {
        console.error(
          `[${correlationId}][Pending Ranks] Error deleting from pending_purchases:`,
          deleteError
        );
      } else {
        console.log(
          `[${correlationId}][Pending Ranks] Successfully cleaned up pending purchases for ${username}`
        );
      }
    }

    // 3. Check user_ranks table for ranks that haven't been applied yet
    const { data: userRanks, error: userRanksError } = await supabase
      .from("user_ranks")
      .select("*")
      .eq("minecraft_username", username);

    const { data: appliedRanks, error: appliedRanksError } = await supabase
      .from("applied_ranks")
      .select("rank_id")
      .eq("minecraft_username", username);

    if (!userRanksError && !appliedRanksError && userRanks) {
      const appliedRankIds = appliedRanks
        ? appliedRanks.map((r) => r.rank_id)
        : [];

      // Find ranks that haven't been applied yet
      const unappliedRanks = userRanks.filter(
        (rank) => !appliedRankIds.includes(rank.rank_id)
      );

      if (unappliedRanks.length > 0) {
        console.log(
          `[${correlationId}][Pending Ranks] Found ${unappliedRanks.length} unapplied ranks in user_ranks for ${username}`
        );

        // Add unapplied ranks to the response
        unappliedRanks.forEach((rank) => {
          pendingRanks.push({
            username: rank.minecraft_username,
            rank_id: rank.rank_id,
            created_at: rank.created_at,
          });

          // Mark this rank as applied
          supabase
            .from("applied_ranks")
            .insert({
              minecraft_username: username,
              rank_id: rank.rank_id,
              applied_at: new Date().toISOString(),
            })
            .then(({ error }) => {
              if (error) {
                console.error(
                  `[${correlationId}][Pending Ranks] Error marking rank ${rank.rank_id} as applied:`,
                  error
                );
              }
            });
        });
      }
    }

    return NextResponse.json({
      success: true,
      pendingRanks,
    });
  } catch (error: any) {
    console.error(`[${correlationId}][Pending Ranks] Error:`, error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
