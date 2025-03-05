import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface VerificationData {
  userId: string;
  username: string;
  code: string;
  createdAt: string;
  verified: boolean;
  verifiedAt?: string;
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
    const { username } = body;

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "Valid Minecraft username is required" },
        { status: 400 }
      );
    }

    // Load verification data from Supabase
    const { data: verification, error: verificationError } = await supabase
      .from("minecraft_verifications")
      .select("*")
      .eq("userId", session.user.id)
      .eq("username", username)
      .single();

    if (verificationError) {
      if (verificationError.code === "PGRST116") {
        // No rows found
        return NextResponse.json(
          { error: "No verification found for this username" },
          { status: 400 }
        );
      }

      console.error("Error fetching verification data:", verificationError);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    if (!verification) {
      return NextResponse.json(
        { error: "No verification found for this username" },
        { status: 400 }
      );
    }

    // In a real scenario, we would check against the game server to confirm the verification
    // For now, we'll simulate a successful verification

    // Update verification status in Supabase
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("minecraft_verifications")
      .update({
        verified: true,
        verifiedAt: now,
      })
      .eq("userId", session.user.id)
      .eq("username", username);

    if (updateError) {
      console.error("Error updating verification status:", updateError);
      return NextResponse.json(
        { error: "Failed to update verification status" },
        { status: 500 }
      );
    }

    // Update profile data in Supabase
    const { data: existingProfile, error: profileLookupError } = await supabase
      .from("minecraft_profiles")
      .select("*")
      .eq("userId", session.user.id)
      .single();

    const profileData = {
      userId: session.user.id,
      username,
      verified: true,
      verifiedAt: now,
      updatedAt: now,
    };

    let profileResult;

    if (!profileLookupError && existingProfile) {
      // Update existing profile
      profileResult = await supabase
        .from("minecraft_profiles")
        .update(profileData)
        .eq("userId", session.user.id);
    } else {
      // Create new profile
      profileResult = await supabase
        .from("minecraft_profiles")
        .insert(profileData);
    }

    if (profileResult?.error) {
      console.error("Error updating profile data:", profileResult.error);
      // Continue despite error
    }

    console.log(
      `Minecraft verification completed for user ${session.user.id}, username ${username}`
    );

    return NextResponse.json({
      message: "Verification successful",
      username,
      verified: true,
      verifiedAt: now,
    });
  } catch (error) {
    console.error("Error completing Minecraft verification:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
