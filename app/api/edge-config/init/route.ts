import { NextResponse } from "next/server";
import { createClient } from "@vercel/edge-config";

const initialData = {
  "minecraft-accounts": {},
  "user-data": { users: {} },
  "pending-purchases": { pendingPurchases: [] },
  resets: {},
};

export async function GET() {
  try {
    // Parse the Edge Config connection string
    const edgeConfigString = process.env.EDGE_CONFIG;

    console.log("Edge Config Connection String:", edgeConfigString);

    if (!edgeConfigString) {
      return NextResponse.json(
        {
          success: false,
          error: "EDGE_CONFIG environment variable is missing",
          helpMessage:
            "Please add the EDGE_CONFIG variable to your environment",
        },
        { status: 500 }
      );
    }

    // Remove @ prefix if present
    const cleanConfigString = edgeConfigString.startsWith("@")
      ? edgeConfigString.substring(1)
      : edgeConfigString;

    // Extract Edge Config ID and token from the connection string
    // Format: https://edge-config.vercel.com/ecfg_xxx?token=yyy
    const match = cleanConfigString.match(
      /edge-config\.vercel\.com\/([^?]+)\?token=([^&]+)/
    );

    if (!match || match.length < 3) {
      console.error("Failed to parse Edge Config URL:", cleanConfigString);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid EDGE_CONFIG format",
          helpMessage:
            "The EDGE_CONFIG environment variable has an invalid format",
        },
        { status: 500 }
      );
    }

    const edgeConfigId = match[1];
    const token = match[2];

    console.log("Extracted Edge Config ID:", edgeConfigId);

    // First try to use the SDK client to check keys
    try {
      const edgeConfig = createClient(cleanConfigString);
      console.log("Checking Edge Config keys via SDK...");

      // Check each key
      let existingKeys = [];
      let missingKeys = [];

      for (const key of Object.keys(initialData)) {
        try {
          const exists = await edgeConfig.has(key);
          if (exists) {
            existingKeys.push(key);
            console.log(`Key '${key}' exists in Edge Config`);
          } else {
            missingKeys.push(key);
            console.log(`Key '${key}' doesn't exist in Edge Config`);
          }
        } catch (error) {
          console.error(`Error checking key '${key}':`, error);
        }
      }

      // If all keys exist, we're done
      if (existingKeys.length === Object.keys(initialData).length) {
        return NextResponse.json({
          success: true,
          message: "Edge Config is already initialized with all required keys",
          keys: existingKeys,
        });
      }

      // Some keys are missing
      return NextResponse.json(
        {
          success: false,
          error: "Some keys are missing from Edge Config",
          helpMessage: `Please add the following keys through the Vercel Dashboard: ${missingKeys.join(", ")}`,
          missingKeys,
          existingKeys,
          code: "missing_keys",
        },
        { status: 400 }
      );
    } catch (error) {
      console.error("Error using SDK to check keys:", error);

      // Try a direct API call as backup
      try {
        console.log("Using direct API call as fallback...");
        // Make a GET request to Edge Config
        const response = await fetch(
          `https://edge-config.vercel.com/${edgeConfigId}?token=${token}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            return NextResponse.json(
              {
                success: false,
                error: "Edge Config token unauthorized",
                helpMessage:
                  "Your Edge Config token doesn't have the proper permissions.",
                code: "unauthorized",
              },
              { status: 401 }
            );
          }

          throw new Error(
            `Edge Config API responded with status ${response.status}`
          );
        }

        // If we got here, we can read from Edge Config
        const data = await response.json();
        console.log("Edge Config data:", JSON.stringify(data));

        // Success case - we have access to Edge Config
        return NextResponse.json({
          success: true,
          message: "Edge Config connection successful",
          keysExist: Object.keys(data).filter((key) =>
            Object.keys(initialData).includes(key)
          ),
          keysNeeded: Object.keys(initialData),
        });
      } catch (apiError) {
        console.error("Error using direct API call:", apiError);
        return NextResponse.json(
          {
            success: false,
            error: "Cannot access Edge Config",
            helpMessage: "Please check your Edge Config token and permissions",
            details:
              apiError instanceof Error ? apiError.message : String(apiError),
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error("Error initializing Edge Config:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error initializing Edge Config",
        helpMessage: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
