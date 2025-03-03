import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";
import crypto from "crypto";

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

    // Generate a random verification code
    const verificationCode = crypto.randomBytes(4).toString("hex");

    // Store verification data
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

    // Load or initialize verifications data
    let verificationsData: VerificationsData = { verifications: [] };
    if (fs.existsSync(verificationsPath)) {
      const data = fs.readFileSync(verificationsPath, "utf8");
      try {
        verificationsData = JSON.parse(data);
      } catch (error) {
        console.error("Error parsing verifications data:", error);
      }
    }

    // Check if a verification already exists and update it
    const existingIndex = verificationsData.verifications.findIndex(
      (v) => v.userId === session.user.id
    );

    const verificationData: VerificationData = {
      userId: session.user.id,
      username,
      code: verificationCode,
      createdAt: new Date().toISOString(),
      verified: false,
    };

    if (existingIndex >= 0) {
      verificationsData.verifications[existingIndex] = verificationData;
    } else {
      verificationsData.verifications.push(verificationData);
    }

    // Save verifications data
    fs.writeFileSync(
      verificationsPath,
      JSON.stringify(verificationsData, null, 2),
      "utf8"
    );

    // Now update the profiles JSON to show username but not verified yet
    let profilesData: { profiles: any[] } = { profiles: [] };
    if (fs.existsSync(profilesPath)) {
      const data = fs.readFileSync(profilesPath, "utf8");
      try {
        profilesData = JSON.parse(data);
      } catch (error) {
        console.error("Error parsing profiles data:", error);
      }
    }

    // Check if a profile already exists
    const existingProfileIndex = profilesData.profiles.findIndex(
      (p) => p.userId === session.user.id
    );

    const profileData = {
      userId: session.user.id,
      username,
      verified: false,
      updatedAt: new Date().toISOString(),
    };

    if (existingProfileIndex >= 0) {
      profilesData.profiles[existingProfileIndex] = profileData;
    } else {
      profilesData.profiles.push(profileData);
    }

    // Save profiles data
    fs.writeFileSync(
      profilesPath,
      JSON.stringify(profilesData, null, 2),
      "utf8"
    );

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
