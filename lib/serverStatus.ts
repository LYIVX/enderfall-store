/**
 * Utility function to check if the Minecraft server is online
 */

// Default server IP if none provided
const DEFAULT_SERVER_IP = "localhost:25565";

/**
 * Checks if the Minecraft server is currently online
 *
 * @param serverIp - The server IP address to check
 * @returns Promise that resolves to a boolean indicating if the server is online
 */
export async function isServerOnline(
  serverIp: string = DEFAULT_SERVER_IP
): Promise<boolean> {
  // For localhost servers, assume they are online for testing purposes
  if (serverIp.includes("localhost") || serverIp.includes("127.0.0.1")) {
    return true;
  }

  // For non-localhost servers, use the mcsrvstat API as before
  try {
    // Using https://api.mcsrvstat.us/ to get server status
    const response = await fetch(`https://api.mcsrvstat.us/2/${serverIp}`);

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data && data.online === true;
  } catch (error) {
    return false;
  }
}

/**
 * Gets detailed information about the server status
 *
 * @param serverIp - The server IP address to check
 * @returns Promise that resolves to server status data
 */
export async function getServerStatus(
  serverIp: string = DEFAULT_SERVER_IP
): Promise<{
  online: boolean;
  version?: string;
  players?: {
    online?: number;
    max?: number;
  };
  error?: string;
}> {
  // For localhost servers, provide static test data
  if (serverIp.includes("localhost") || serverIp.includes("127.0.0.1")) {
    return {
      online: true,
      version: "Local Server",
      players: { online: 1, max: 20 },
    };
  }

  try {
    const response = await fetch(`https://api.mcsrvstat.us/2/${serverIp}`);

    if (!response.ok) {
      return {
        online: false,
        error: `API responded with status: ${response.status}`,
      };
    }

    const data = await response.json();

    if (!data) {
      return {
        online: false,
        error: "Empty response from server status API",
      };
    }

    return {
      online: data.online === true,
      version: data.version,
      players: data.players
        ? {
            online: data.players.online,
            max: data.players.max,
          }
        : undefined,
    };
  } catch (error) {
    return {
      online: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error checking server status",
    };
  }
}

export async function checkServerStatus(): Promise<boolean> {
  try {
    // Local development mode - assume server is online
    if (process.env.NODE_ENV === "development") {
      return true;
    }

    // Get the Minecraft server status endpoint
    const serverUrl =
      process.env.NEXT_PUBLIC_MINECRAFT_SERVER_URL || "http://localhost:8080";
    const statusEndpoint = `${serverUrl}/status`;

    // Make a request to the server status endpoint
    const response = await fetch(statusEndpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.online === true;
  } catch (error) {
    return false;
  }
}
