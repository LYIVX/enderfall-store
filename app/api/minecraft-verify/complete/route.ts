import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";

interface VerificationData {
  userId: string;
  username: string;
  code: string;
  createdAt: string;
  verified: boolean;
  verifiedAt?: string;
}

interface VerificationsData {
  verifications: VerificationData[];
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

    // Load verification data
    const dataDir = path.join(process.cwd(), "data");
    const verificationsPath = path.join(
      dataDir,
      "minecraft-verifications.json"
    );
    const profilesPath = path.join(dataDir, "minecraft-profiles.json");

    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Load verifications data
    if (!fs.existsSync(verificationsPath)) {
      return NextResponse.json(
        { error: "No verification in progress" },
        { status: 400 }
      );
    }

    const verificationsJson = fs.readFileSync(verificationsPath, "utf8");
    let verificationsData: VerificationsData;

    try {
      verificationsData = JSON.parse(verificationsJson);
    } catch (error) {
      console.error("Error parsing verifications data:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    // Find the user's verification
    const verificationIndex = verificationsData.verifications.findIndex(
      (v) => v.userId === session.user.id && v.username === username
    );

    if (verificationIndex === -1) {
      return NextResponse.json(
        { error: "No verification found for this username" },
        { status: 400 }
      );
    }

    // In a real scenario, we would check against the game server to confirm the verification
    // For now, we'll simulate a successful verification

    // Update verification status
    verificationsData.verifications[verificationIndex].verified = true;
    verificationsData.verifications[verificationIndex].verifiedAt =
      new Date().toISOString();

    // Save verifications data
    fs.writeFileSync(
      verificationsPath,
      JSON.stringify(verificationsData, null, 2),
      "utf8"
    );

    // Update profile data
    if (!fs.existsSync(profilesPath)) {
      return NextResponse.json(
        { error: "Profile data not found" },
        { status: 500 }
      );
    }

    const profilesJson = fs.readFileSync(profilesPath, "utf8");
    let profilesData: { profiles: any[] };

    try {
      profilesData = JSON.parse(profilesJson);
    } catch (error) {
      console.error("Error parsing profiles data:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    // Find the user's profile
    const profileIndex = profilesData.profiles.findIndex(
      (p) => p.userId === session.user.id
    );

    if (profileIndex === -1) {
      // Create profile if doesn't exist
      profilesData.profiles.push({
        userId: session.user.id,
        username,
        verified: true,
        verifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Update existing profile
      profilesData.profiles[profileIndex].username = username;
      profilesData.profiles[profileIndex].verified = true;
      profilesData.profiles[profileIndex].verifiedAt = new Date().toISOString();
      profilesData.profiles[profileIndex].updatedAt = new Date().toISOString();
    }

    // Save profiles data
    fs.writeFileSync(
      profilesPath,
      JSON.stringify(profilesData, null, 2),
      "utf8"
    );

    console.log(
      `Minecraft verification completed for user ${session.user.id}, username ${username}`
    );

    return NextResponse.json({
      message: "Verification successful",
      username,
      verified: true,
      verifiedAt: new Date().toISOString(),
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
