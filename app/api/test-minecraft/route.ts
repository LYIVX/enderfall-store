import { NextResponse } from "next/server";
import axios from "axios";

export async function GET() {
  try {
    console.log("Testing Minecraft server connection...");
    console.log("Environment variables:", {
      apiUrl: process.env.MINECRAFT_SERVER_API_URL,
      apiKeyExists: !!process.env.MINECRAFT_SERVER_API_KEY,
      apiKeyLength: process.env.MINECRAFT_SERVER_API_KEY?.length,
    });

    const response = await axios.post(
      `${process.env.MINECRAFT_SERVER_API_URL}/api/apply-rank`,
      {
        username: "test_user",
        rank: "test_rank",
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MINECRAFT_SERVER_API_KEY}`,
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Connection test successful",
      response: response.data,
    });
  } catch (error: any) {
    console.error("Connection test failed:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      },
      { status: 500 }
    );
  }
}
