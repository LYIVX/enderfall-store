import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";
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

    // Generate a random verification code
    const verificationCode = crypto.randomBytes(4).toString("hex");

    // Store verification data in Supabase
    const verificationData: VerificationData = {
      userId: session.user.id,
      username,
      code: verificationCode,
      createdAt: new Date().toISOString(),
      verified: false,
    };

    // Check if a verification already exists and update it
    const { data: existingVerification, error: lookupError } = await supabase
      .from("minecraft_verifications")
      .select("*")
      .eq("userId", session.user.id)
      .single();

    if (lookupError && lookupError.code !== "PGRST116") {
      // PGRST116 is "No rows returned" error
      console.error("Error checking for existing verification:", lookupError);
    }

    let saveResult;

    if (existingVerification) {
      // Update existing verification
      saveResult = await supabase
        .from("minecraft_verifications")
        .update(verificationData)
        .eq("userId", session.user.id);
    } else {
      // Insert new verification
      saveResult = await supabase
        .from("minecraft_verifications")
        .insert(verificationData);
    }

    if (saveResult.error) {
      console.error("Error saving verification data:", saveResult.error);
      return NextResponse.json(
        { error: "Failed to save verification data" },
        { status: 500 }
      );
    }

    // Update the minecraft_profiles table to show username but not verified yet
    const profileData = {
      userId: session.user.id,
      username,
      verified: false,
      updatedAt: new Date().toISOString(),
    };

    const { data: existingProfile, error: profileLookupError } = await supabase
      .from("minecraft_profiles")
      .select("*")
      .eq("userId", session.user.id)
      .single();

    if (profileLookupError && profileLookupError.code !== "PGRST116") {
      console.error("Error checking for existing profile:", profileLookupError);
    }

    let profileResult;

    if (existingProfile) {
      // Update existing profile
      profileResult = await supabase
        .from("minecraft_profiles")
        .update(profileData)
        .eq("userId", session.user.id);
    } else {
      // Insert new profile
      profileResult = await supabase
        .from("minecraft_profiles")
        .insert(profileData);
    }

    if (profileResult.error) {
      console.error("Error saving profile data:", profileResult.error);
    }

    console.log(
      `Minecraft verification initiated for ${username} with code ${verificationCode}`
    );

    return NextResponse.json({
      message: "Verification initiated",
      verificationCode,
    });
  } catch (error) {
    console.error("Error initiating Minecraft verification:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
