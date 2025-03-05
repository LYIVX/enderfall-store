/**
 * Utility function to check if the Minecraft server is online
 */

// Get server configuration
function getServerConfig() {
  const env = process.env.NODE_ENV || "development";
  const useLocalServers =
    env === "development" && process.env.USE_LOCAL_SERVERS === "true";

  // Base configuration using proxy IP and ports
  const proxyIp = useLocalServers
    ? "localhost"
    : process.env.MINECRAFT_PROXY_IP || "localhost";
  const proxyPort = parseInt(process.env.MINECRAFT_PROXY_PORT || "25674");
  const proxyApiPort = parseInt(process.env.MINECRAFT_PROXY_API_PORT || "8113");

  return {
    proxy: {
      ip: proxyIp,
      port: proxyPort,
      apiPort: proxyApiPort,
      apiUrl: useLocalServers
        ? `http://localhost:${proxyApiPort}`
        : `http://${proxyIp}:${proxyApiPort}`,
    },
    lobby: {
      ip: useLocalServers
        ? "localhost"
        : process.env.MINECRAFT_LOBBY_IP || proxyIp,
      port: parseInt(process.env.MINECRAFT_LOBBY_PORT || "25610"),
    },
    survival: {
      ip: useLocalServers
        ? "localhost"
        : process.env.MINECRAFT_SURVIVAL_IP || proxyIp,
      port: parseInt(process.env.MINECRAFT_SURVIVAL_PORT || "25579"),
    },
  };
}

/**
 * Checks if the Minecraft server is currently online
 * @returns Promise that resolves to a boolean indicating if the server is online
 */
export async function isServerOnline(): Promise<boolean> {
  const config = getServerConfig();

  // For localhost servers, assume they are online for testing purposes
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  try {
    // Check proxy server first
    const proxyStatus = await getServerStatus(
      `${config.proxy.ip}:${config.proxy.port}`
    );
    if (proxyStatus.online) {
      return true;
    }

    // Check individual servers
    const [lobbyStatus, survivalStatus] = await Promise.all([
      getServerStatus(`${config.lobby.ip}:${config.lobby.port}`),
      getServerStatus(`${config.survival.ip}:${config.survival.port}`),
    ]);

    return lobbyStatus.online || survivalStatus.online;
  } catch (error) {
    console.error("Error checking server status:", error);
    return false;
  }
}

/**
 * Gets detailed information about the server status
 * @param serverIp - The server IP address to check
 * @returns Promise that resolves to server status data
 */
export async function getServerStatus(serverIp: string): Promise<{
  online: boolean;
  version?: string;
  players?: {
    online?: number;
    max?: number;
  };
  error?: string;
}> {
  // For localhost servers, provide static test data
  if (process.env.NODE_ENV === "development") {
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

    const config = getServerConfig();
    const statusEndpoint = `${config.proxy.apiUrl}/api/status`;

    // Make a request to the server status endpoint
    const response = await fetch(statusEndpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MINECRAFT_SERVER_API_KEY}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.online === true;
  } catch (error) {
    console.error("Error checking server status:", error);
    return false;
  }
}
