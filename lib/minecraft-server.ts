import fs from "fs";
import path from "path";

// Define types for user data
interface PlayerData {
  username: string;
  [key: string]: any;
}

interface UsersData {
  players: PlayerData[];
}

/**
 * Resolves the path to the Minecraft plugin data directory
 */
export function resolvePluginPath(): string {
  // First try to get path from environment variable
  const configuredPath = process.env.MINECRAFT_PLUGIN_PATH;

  // If configured path exists, use it
  if (configuredPath) {
    const resolvedPath = path.resolve(configuredPath);
    return resolvedPath;
  }

  // Default path - uses 'data/plugin' in the project directory
  return path.join(process.cwd(), "data", "plugin");
}

/**
 * Gets the path to the users.json file
 */
export function getUsersFilePath(): string {
  const pluginPath = resolvePluginPath();
  const usersFilePath = path.join(pluginPath, "users.json");

  // If the file exists, return the path
  if (fs.existsSync(usersFilePath)) {
    return usersFilePath;
  }

  // If the file doesn't exist, check alternative locations
  const altLocations = [
    path.join(process.cwd(), "data", "users.json"),
    path.join(process.cwd(), "public", "data", "users.json"),
  ];

  for (const altPath of altLocations) {
    if (fs.existsSync(altPath)) {
      return altPath;
    }
  }

  // If no file is found, use the default location
  return usersFilePath;
}

/**
 * Read the users file from the Minecraft server plugin
 * @returns An array of known player usernames
 */
export async function getKnownPlayers(): Promise<string[]> {
  try {
    const usersFilePath = getUsersFilePath();

    // Read and parse the JSON file
    const userData: UsersData = JSON.parse(
      fs.readFileSync(usersFilePath, "utf-8")
    );

    if (!userData.players || !Array.isArray(userData.players)) {
      console.warn("Invalid users file format, expected players array");
      return [];
    }

    // Extract usernames from the players array
    return userData.players
      .filter((player: PlayerData) => player.username)
      .map((player: PlayerData) => player.username.toLowerCase());
  } catch (error) {
    console.error("Error reading Minecraft users file:", error);
    return [];
  }
}

/**
 * Check if a player exists in the Minecraft server's data
 * @param username The username to check
 * @returns True if the player exists, false otherwise
 */
export async function checkPlayerExists(username: string): Promise<boolean> {
  if (!username) return false;

  try {
    // First try the proxy server API
    if (process.env.MINECRAFT_PROXY_API_URL) {
      try {
        const apiUrl = `${process.env.MINECRAFT_PROXY_API_URL}/player/${username.toLowerCase()}`;
        console.log(`Checking player existence at proxy: ${apiUrl}`);
        const response = await fetch(apiUrl, {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Minecraft Shop API/1.0",
            Authorization: `Bearer ${process.env.MINECRAFT_PROXY_API_KEY || ""}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (!data.error && data.exists) {
            return true;
          }
        }
      } catch (error) {
        console.error("Error connecting to proxy API:", error);
        // Fall through to next check if proxy is unavailable
      }
    }

    // Then try the server API
    if (process.env.MINECRAFT_SERVER_API_URL) {
      try {
        const apiUrl = `${process.env.MINECRAFT_SERVER_API_URL}/player/${username.toLowerCase()}`;
        console.log(`Checking player existence at server: ${apiUrl}`);
        const response = await fetch(apiUrl, {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Minecraft Shop API/1.0",
            Authorization: `Bearer ${process.env.MINECRAFT_SERVER_API_KEY || ""}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (!data.error) {
            return true;
          }
        }
      } catch (error) {
        console.error("Error connecting to server API:", error);
        // Fall back to local check if API is unavailable
      }
    } else {
      console.log("No MINECRAFT_SERVER_API_URL configured, using fallback");
    }

    // Fall back to checking local player data if APIs are not available
    const knownPlayers = await getKnownPlayers();

    // For development, consider the player exists if no players are found locally
    if (knownPlayers.length === 0 && process.env.NODE_ENV === "development") {
      console.log(
        "Development mode: Assuming player exists for testing purposes"
      );
      return true;
    }

    return knownPlayers.includes(username.toLowerCase());
  } catch (error) {
    console.error("Error checking player existence:", error);
    // For development only, return true to avoid blocking user flows
    if (process.env.NODE_ENV === "development") {
      console.log("Development fallback: Assuming player exists");
      return true;
    }
    return false;
  }
}

/**
 * Get player ranks from the Minecraft server's data
 * @param username The username to get ranks for
 * @returns An array of rank IDs
 */
export async function getPlayerRanks(username: string): Promise<string[]> {
  if (!username) return [];

  try {
    // We would need to read from the ranks.yml file
    // This is a placeholder - you would need to implement proper YAML parsing
    // or another solution based on your plugin's data storage
    return [];
  } catch (error) {
    console.error("Error getting player ranks:", error);
    return [];
  }
}
