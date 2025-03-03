import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import path from "path";
import fs from "fs";

/**
 * Debug endpoint to check environment variables and file paths
 * Only accessible to authenticated users for security
 */
export async function GET(request: Request) {
  // Check if the user is authenticated
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "You must be logged in to access this endpoint" },
      { status: 401 }
    );
  }

  // Get the Minecraft plugin path from environment variables
  const pluginPath = process.env.MINECRAFT_PLUGIN_PATH || "(not set)";
  const resolvedPath =
    pluginPath !== "(not set)" ? path.resolve(pluginPath) : "(not available)";

  // Get the potential users.json file paths
  const usersFilePath =
    resolvedPath !== "(not available)"
      ? path.join(resolvedPath, "users.json")
      : "(not available)";

  // Check alternative locations
  const altLocations = [
    path.resolve("./plugins/WebsitePlugin/users.json"),
    path.resolve("../plugins/WebsitePlugin/users.json"),
    path.resolve("../../plugins/WebsitePlugin/users.json"),
    path.resolve(process.cwd(), "plugins/WebsitePlugin/users.json"),
  ];

  // Check which paths exist
  const fileExists =
    usersFilePath !== "(not available)" ? fs.existsSync(usersFilePath) : false;
  const altLocationsExist = altLocations.map((location) => ({
    path: location,
    exists: fs.existsSync(location),
  }));

  // Check current working directory and available directories
  const cwd = process.cwd();
  const cwdContents = fs.existsSync(cwd) ? fs.readdirSync(cwd) : [];

  // Return debugging information
  return NextResponse.json({
    environmentVariables: {
      MINECRAFT_PLUGIN_PATH: pluginPath,
      MINECRAFT_API_URL: process.env.MINECRAFT_API_URL || "(not set)",
      MINECRAFT_API_KEY: process.env.MINECRAFT_API_KEY
        ? "(set but not shown)"
        : "(not set)",
    },
    paths: {
      resolvedPluginPath: resolvedPath,
      usersFilePath: usersFilePath,
      fileExists: fileExists,
      currentWorkingDirectory: cwd,
      cwdContents: cwdContents,
    },
    alternativeLocations: altLocationsExist,
  });
}
