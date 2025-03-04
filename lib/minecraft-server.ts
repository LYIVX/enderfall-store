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

interface PlayerResponse {
  exists: boolean;
  username?: string;
  error?: string;
}

interface PlayersResponse {
  players: Array<{ username: string }>;
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
  // First try environment variable path
  if (process.env.MINECRAFT_PLUGIN_PATH) {
    const envPath = path.join(process.env.MINECRAFT_PLUGIN_PATH, "users.json");
    if (fs.existsSync(envPath)) {
      return envPath;
    }
  }

  // Try common production paths
  const productionPaths = [
    "/var/www/minecraft/plugins/WebsitePlugin/users.json",
    "/var/minecraft/plugins/WebsitePlugin/users.json",
    "/minecraft/plugins/WebsitePlugin/users.json",
  ];

  for (const prodPath of productionPaths) {
    if (fs.existsSync(prodPath)) {
      return prodPath;
    }
  }

  // Try development paths
  const devPaths = [
    path.join(process.cwd(), "data", "users.json"),
    path.join(process.cwd(), "public", "data", "users.json"),
    path.join(process.cwd(), "plugins", "WebsitePlugin", "users.json"),
  ];

  for (const devPath of devPaths) {
    if (fs.existsSync(devPath)) {
      return devPath;
    }
  }

  // If no file is found, return a default path in the data directory
  const defaultPath = path.join(process.cwd(), "data", "users.json");

  // Ensure the data directory exists
  const dataDir = path.dirname(defaultPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return defaultPath;
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
  if (!username) {
    return false;
  }

  const normalizedUsername = username.toLowerCase();
  const proxyApiUrl = process.env.MINECRAFT_PROXY_API_URL;

  if (!proxyApiUrl) {
    console.log("No proxy API URL configured");
    return false;
  }

  try {
    // First check if player exists via proxy API
    const proxyUrl = `${proxyApiUrl}/api/player/${normalizedUsername}`;
    console.log(`Checking player existence at proxy: ${proxyUrl}`);

    const proxyResponse = await fetch(proxyUrl, {
      headers: {
        Authorization: `Bearer ${process.env.MINECRAFT_SERVER_API_KEY}`,
        "Cache-Control": "no-cache",
      },
    });

    if (!proxyResponse.ok) {
      console.log(
        `Proxy API error response (${proxyResponse.status}): ${await proxyResponse.text()}`
      );
      return false;
    }

    const proxyData = await proxyResponse.json();
    console.log("Proxy API response:", proxyData);

    // If the proxy API gives us a definitive answer, return it
    return proxyData.exists;
  } catch (error) {
    console.error("Error checking player existence:", error);
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
    if (!process.env.MINECRAFT_PROXY_API_URL) {
      console.error("No MINECRAFT_PROXY_API_URL configured");
      return [];
    }

    const apiUrl = `${process.env.MINECRAFT_PROXY_API_URL}/api/player/${username.toLowerCase()}/ranks`;
    console.log(`Getting player ranks from proxy: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Minecraft Shop API/1.0",
        Authorization: `Bearer ${process.env.MINECRAFT_SERVER_API_KEY || ""}`,
      },
      next: { revalidate: 0 }, // Disable cache
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Proxy API ranks response:", data);
      return data.ranks || [];
    } else {
      const errorText = await response.text();
      console.error(
        `Proxy API error response (${response.status}):`,
        errorText
      );
    }

    return [];
  } catch (error) {
    console.error("Error getting player ranks:", error);
    return [];
  }
}
